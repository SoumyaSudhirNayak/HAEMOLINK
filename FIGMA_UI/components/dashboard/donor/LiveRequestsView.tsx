import { useEffect, useState } from 'react';
import { AlertCircle, MapPin, Clock, Phone, MessageCircle, ChevronRight } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface BloodRequest {
  id: string;
  request_type: string | null;
  blood_group: string | null;
  component: string | null;
  units_required: number | null;
  urgency: string | null;
  status: string | null;
  created_at: string | null;
  inbox_id?: string;
}

export function LiveRequestsView() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donorGroup, setDonorGroup] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [calling, setCalling] = useState<string | null>(null);
  const { refreshTick } = useAutoRefresh();

  useEffect(() => {
    let active = true;
    let channel: any = null;
    let bloodChannel: any = null;
    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole, getProfile, upsertProfile }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'donor') {
          if (active) {
            setRequests([]);
          }
          return;
        }
        const profile: any = await getProfile('donor');
        const group: string | null = profile?.blood_group ?? null;
        let dlat: number | null = profile?.latitude ?? null;
        let dlng: number | null = profile?.longitude ?? null;
        if (active) {
          setDonorGroup(group);
        }
        if (!group) {
          if (active) setRequests([]);
          return;
        }
        if ((dlat === null || dlng === null) && typeof navigator !== 'undefined' && navigator.geolocation) {
          try {
            const position: any = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
            });
            if (position && position.coords) {
              dlat = typeof position.coords.latitude === 'number' ? position.coords.latitude : dlat;
              dlng = typeof position.coords.longitude === 'number' ? position.coords.longitude : dlng;
              if (dlat !== null && dlng !== null) {
                await upsertProfile('donor', { latitude: dlat, longitude: dlng });
              }
            }
          } catch {}
        }
        const { data, error } = await supabase
          .from('donor_request_inbox')
          .select('id, status, created_at, request_id, blood_requests(*)')
          .eq('donor_id', session.user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: true });
        if (!error && active && Array.isArray(data)) {
          const mappedFromInbox: BloodRequest[] = data
            .map((entry: any) => {
              const br = entry?.blood_requests || {};
              return {
                id: br.id,
                request_type: br.request_type ?? null,
                blood_group: br.blood_group ?? null,
                component: br.component ?? null,
                units_required:
                  (br as any).units_required ??
                  (br as any).quantity_units ??
                  null,
                urgency: br.urgency ?? null,
                status: entry.status ?? br.status ?? null,
                created_at: br.created_at ?? entry.created_at ?? null,
                inbox_id: entry.id,
              } as BloodRequest;
            })
            .filter((r: BloodRequest) => r.blood_group === group);
          const priority = { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>;
          mappedFromInbox.sort((a, b) => {
            const pa = priority[(a.urgency || '').toLowerCase()] || 0;
            const pb = priority[(b.urgency || '').toLowerCase()] || 0;
            if (pb !== pa) return pb - pa;
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return ta - tb;
          });
          setRequests(mappedFromInbox);

          if (mappedFromInbox.length === 0) {
            const { data: direct, error: directError } = await supabase
              .from('blood_requests')
              .select('id, request_type, blood_group, component, quantity_units, urgency, status, created_at')
              .eq('blood_group', group)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(50);
            if (!directError && active && Array.isArray(direct)) {
              const directMapped: BloodRequest[] = direct.map((br: any) => ({
                id: br.id,
                request_type: br.request_type ?? null,
                blood_group: br.blood_group ?? null,
                component: br.component ?? null,
                units_required: (br as any).units_required ?? (br as any).quantity_units ?? null,
                urgency: br.urgency ?? null,
                status: br.status ?? null,
                created_at: br.created_at ?? null,
              }));
              directMapped.sort((a, b) => {
                const pa = priority[(a.urgency || '').toLowerCase()] || 0;
                const pb = priority[(b.urgency || '').toLowerCase()] || 0;
                if (pb !== pa) return pb - pa;
                const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                return ta - tb;
              });
              setRequests(directMapped);
            }
          }
        }
        channel = supabase
          .channel('donor_request_inbox_feed')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'donor_request_inbox', filter: `donor_id=eq.${session.user.id}` },
            (payload: any) => {
              if (!active) return;
              const newRow = payload.new as any;
              const oldRow = payload.old as any;
              setRequests((prev) => {
                let next = [...prev];
                if (payload.eventType === 'INSERT' && newRow) {
                  if (newRow.status === 'pending') {
                    (async () => {
                      const { data: br } = await supabase
                        .from('blood_requests')
                        .select('id, request_type, blood_group, component, quantity_units, urgency, status, created_at')
                        .eq('id', newRow.request_id)
                        .maybeSingle();
                      if (!active || !br) return;
                      const mapped: BloodRequest = {
                        id: br.id,
                        request_type: br.request_type ?? null,
                        blood_group: br.blood_group ?? null,
                        component: br.component ?? null,
                        units_required:
                          (br as any).units_required ??
                          (br as any).quantity_units ??
                          null,
                        urgency: br.urgency ?? null,
                        status: newRow.status ?? br.status ?? null,
                        created_at: br.created_at ?? newRow.created_at ?? null,
                        inbox_id: newRow.id,
                      };
                      setRequests((prev2) => {
                        const exists = prev2.find((r) => r.inbox_id === mapped.inbox_id);
                        if (exists) return prev2;
                        const next2 = [mapped, ...prev2];
                        const priority = { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>;
                        next2.sort((a, b) => {
                          const pa = priority[(a.urgency || '').toLowerCase()] || 0;
                          const pb = priority[(b.urgency || '').toLowerCase()] || 0;
                          if (pb !== pa) return pb - pa;
                          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                          return ta - tb;
                        });
                        return next2;
                      });
                    })();
                  }
                } else if (payload.eventType === 'UPDATE' && newRow) {
                  const idx = next.findIndex((r) => r.inbox_id === newRow.id);
                  const stillVisible = newRow.status === 'pending';
                  if (!stillVisible) {
                    if (idx !== -1) {
                      next.splice(idx, 1);
                    }
                  } else {
                    if (idx !== -1) {
                      (async () => {
                        const { data: br } = await supabase
                          .from('blood_requests')
                          .select('id, request_type, blood_group, component, quantity_units, urgency, status, created_at')
                          .eq('id', newRow.request_id)
                          .maybeSingle();
                        if (!active || !br) return;
                        setRequests((prev2) => {
                          const next2 = [...prev2];
                          next2[idx] = {
                            id: br.id,
                            request_type: br.request_type ?? null,
                            blood_group: br.blood_group ?? null,
                            component: br.component ?? null,
                            units_required:
                              (br as any).units_required ??
                              (br as any).quantity_units ??
                              null,
                            urgency: br.urgency ?? null,
                            status: newRow.status ?? br.status ?? null,
                            created_at: br.created_at ?? newRow.created_at ?? null,
                            inbox_id: newRow.id,
                          };
                          const priority = { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>;
                          next2.sort((a, b) => {
                            const pa = priority[(a.urgency || '').toLowerCase()] || 0;
                            const pb = priority[(b.urgency || '').toLowerCase()] || 0;
                            if (pb !== pa) return pb - pa;
                            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                            return ta - tb;
                          });
                          return next2;
                        });
                      })();
                    }
                  }
                } else if (payload.eventType === 'DELETE' && oldRow) {
                  next = next.filter((r) => r.inbox_id !== oldRow.id);
                }
                const priority = { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>;
                next.sort((a, b) => {
                  const pa = priority[(a.urgency || '').toLowerCase()] || 0;
                  const pb = priority[(b.urgency || '').toLowerCase()] || 0;
                  if (pb !== pa) return pb - pa;
                  const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                  const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                  return ta - tb;
                });
                return next;
              });
            },
          )
          .subscribe();
        bloodChannel = supabase
          .channel('blood_requests_status_feed')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'blood_requests' },
            (payload: any) => {
              if (!active) return;
              const newRow = payload.new as any;
              if (!newRow) return;
              if (newRow.status && newRow.status !== 'open' && newRow.status !== 'pending') {
                setRequests((prev) => prev.filter((r) => r.id !== newRow.id));
              }
            },
          )
          .subscribe();
      } catch {
        if (active) {
          setRequests([]);
        }
      }
    })();
    return () => {
      active = false;
      if (channel) {
        channel.unsubscribe();
      }
      if (bloodChannel) {
        bloodChannel.unsubscribe();
      }
    };
  }, [refreshTick]);

  const handleAccept = async (request: BloodRequest) => {
    const acceptingKey = request.inbox_id ?? request.id;
    setAccepting(acceptingKey);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'donor') {
        setAccepting(null);
        return;
      }
      // Capture donor location at acceptance
      let dlat: number | null = null;
      let dlng: number | null = null;
      let dacc: number | null = null;
      const [{ getBestDeviceFix }] = await Promise.all([
        import('../../../utils/geo'),
      ]);
      const bestFix: any = await getBestDeviceFix(20000, 10);
      if (bestFix && bestFix.coords) {
        dlat = typeof bestFix.coords.latitude === 'number' ? bestFix.coords.latitude : null;
        dlng = typeof bestFix.coords.longitude === 'number' ? bestFix.coords.longitude : null;
        dacc = typeof bestFix.coords.accuracy === 'number' ? bestFix.coords.accuracy : null;
      }
      if (dlat !== null && dlng !== null && (dacc === null || dacc <= 10)) {
        await supabase.from('donor_profiles').update({ latitude: dlat, longitude: dlng }).eq('user_id', session.user.id);
        await supabase.from('request_waypoints').insert({ request_id: request.id, actor_type: 'donor', actor_id: session.user.id, latitude: dlat, longitude: dlng, accuracy: dacc });
      }
      const { data: result, error } = await supabase.rpc('accept_blood_request', {
        p_request_id: request.id,
        p_actor_type: 'donor',
      });
      if (error || !(result && result.accepted)) {
        setAccepting(null);
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } finally {
      setAccepting(null);
    }
  };


  const handleReject = async (inboxId: string) => {
    setRejecting(inboxId);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'donor') {
        setRejecting(null);
        return;
      }
      await supabase.rpc('reject_donor_inbox_entry', { p_inbox_id: inboxId });
      setRequests((prev) => prev.filter((r) => r.inbox_id !== inboxId));
    } finally {
      setRejecting(null);
    }
  };

  const handleCall = async (requestId: string) => {
    setCalling(requestId);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'donor') {
        setCalling(null);
        return;
      }
      const { data: phone, error } = await supabase.rpc('get_patient_contact_for_request', { p_request_id: requestId });
      if (error) {
        setCalling(null);
        return;
      }
      const num = typeof phone === 'string' ? phone.trim() : '';
      if (!num) {
        setCalling(null);
        return;
      }
      window.location.href = `tel:${num}`;
    } finally {
      setCalling(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Live Blood Requests</h2>
        <p className="text-gray-600">Respond to nearby requests and save lives</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-5 gap-4">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
            <option>All Priorities</option>
            <option>Critical Only</option>
            <option>High</option>
            <option>Others</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
            <option>Distance: All</option>
            <option>Within 5 km</option>
            <option>Within 10 km</option>
            <option>Within 25 km</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
            <option>Blood Type: Any</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
            <option>Sort: Time Posted</option>
            <option>Sort: Priority</option>
          </select>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            Apply Filters
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-gray-900">No matching blood requests available right now</p>
            <p className="text-gray-500 max-w-md">New requests that match your blood group will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className={`bg-white rounded-xl border-2 p-6 hover:shadow-lg transition ${
                request.urgency === 'critical'
                  ? 'border-red-200 bg-red-50'
                  : request.urgency === 'high'
                  ? 'border-orange-200'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`px-4 py-1.5 rounded-full flex items-center gap-2 ${
                        request.urgency === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : request.urgency === 'high'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {request.urgency === 'critical' && <AlertCircle className="w-4 h-4" />}
                      {(request.request_type || 'Request') + ' • ' + (request.urgency || 'unknown')}
                    </div>
                    <div className="px-3 py-1 bg-gray-900 text-white rounded-full">
                      {request.blood_group || 'Unknown'}
                    </div>
                    <span className="text-gray-500">Request #{request.id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-gray-500 mb-1">Component & Units</div>
                      <div className="text-gray-900">
                        {(request.component || 'Component') + ' • ' + (request.units_required ?? '?') + ' Units'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Patient Condition</div>
                      <div className="text-gray-900">Details will be shared after acceptance.</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-gray-600 mb-4">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location will be shared after acceptance
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Created{' '}
                      {request.created_at
                        ? new Date(request.created_at).toLocaleString()
                        : 'Not recorded'}
                    </span>
                  </div>

                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                      request.urgency === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : request.urgency === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Time Window: Not configured
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-6">
                  <button
                    onClick={() => handleAccept(request)}
                    disabled={accepting === (request.inbox_id ?? request.id)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 whitespace-nowrap disabled:opacity-60"
                  >
                    Accept Request
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCall(request.id)}
                    disabled={calling === request.id}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Phone className="w-4 h-4" />
                    {calling === request.id ? 'Calling...' : 'Call'}
                  </button>
                  <button
                    onClick={() => request.inbox_id && handleReject(request.inbox_id)}
                    disabled={!request.inbox_id || rejecting === request.inbox_id}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>

              {request.urgency === 'critical' && (
                <div className="mt-4 pt-4 border-t border-red-200">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span>Critical: Immediate response needed • Lives at stake</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
