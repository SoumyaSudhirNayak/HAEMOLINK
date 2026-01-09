import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
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

export function RequestsView() {
  const { refreshTick } = useAutoRefresh();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const reloadRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    const fn = reloadRef.current;
    if (fn) fn();
  }, [refreshTick]);

  useEffect(() => {
    let active = true;
    let inboxChannel: any = null;
    let bloodChannel: any = null;
    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'hospital') {
          if (active) {
            setRequests([]);
          }
          return;
        }
        const hospitalId = session.user.id;
        const loadPending = async () => {
          const { data, error } = await supabase
            .from('hospital_request_inbox')
            .select('id, status, created_at, request_id, blood_requests(*)')
            .eq('hospital_id', hospitalId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });
          if (!error && active && Array.isArray(data)) {
            const mapped: BloodRequest[] = data.map((entry: any) => {
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
            });
            const priority = { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>;
            mapped.sort((a, b) => {
              const pa = priority[(a.urgency || '').toLowerCase()] || 0;
              const pb = priority[(b.urgency || '').toLowerCase()] || 0;
              if (pb !== pa) return pb - pa;
              const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
              const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
              return ta - tb;
            });
            setRequests(mapped);
          }
        };
        reloadRef.current = () => {
          loadPending();
        };
        await loadPending();
        inboxChannel = supabase
          .channel('hospital_request_inbox_feed')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'hospital_request_inbox', filter: `hospital_id=eq.${session.user.id}` },
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
          .channel('hospital_blood_requests_status_feed')
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
      reloadRef.current = null;
      if (inboxChannel) {
        inboxChannel.unsubscribe();
      }
      if (bloodChannel) {
        bloodChannel.unsubscribe();
      }
    };
  }, []);

  const handleAccept = async (inboxId: string, requestId: string) => {
    if (acceptingId) return;
    setAcceptingId(inboxId);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const [{ getBestDeviceFix }] = await Promise.all([
        import('../../../utils/geo'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') {
        setAcceptingId(null);
        return;
      }

      const reqLocal = requests.find((r) => r.inbox_id === inboxId) || requests.find((r) => r.id === requestId) || null;
      let bloodGroup = reqLocal?.blood_group ?? null;
      let component = reqLocal?.component ?? null;
      let unitsRequired = typeof reqLocal?.units_required === 'number' ? reqLocal.units_required : null;

      const normalizeBloodGroup = (v: string) => v.replace(/−/g, '-').trim().toUpperCase();
      const normalizeComponent = (v: string) => {
        const raw = v.trim();
        const k = raw.toLowerCase();
        if (k === 'rbc' || k.includes('red blood')) return 'RBC';
        if (k === 'plasma') return 'Plasma';
        if (k === 'platelet' || k === 'platelets') return 'Platelets';
        if (k === 'whole blood' || k === 'whole') return 'Whole Blood';
        if (k === 'cryoprecipitate' || k === 'cryo') return 'Cryoprecipitate';
        return raw;
      };

      if (!bloodGroup || !component || !unitsRequired || unitsRequired <= 0) {
        const { data: br } = await supabase
          .from('blood_requests')
          .select('blood_group, component, quantity_units, units_required')
          .eq('id', requestId)
          .maybeSingle();
        bloodGroup = bloodGroup ?? ((br as any)?.blood_group ?? null);
        component = component ?? ((br as any)?.component ?? null);
        const q = (br as any)?.units_required ?? (br as any)?.quantity_units ?? null;
        unitsRequired = typeof q === 'number' ? q : unitsRequired;
      }

      if (!bloodGroup || !component || !unitsRequired || unitsRequired <= 0) {
        window.alert('Request is missing blood group, component, or units.');
        setAcceptingId(null);
        return;
      }

      bloodGroup = normalizeBloodGroup(bloodGroup);
      component = normalizeComponent(component);

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const { count: availableCount, error: stockErr } = await supabase
        .from('hospital_inventory_units')
        .select('id', { count: 'exact', head: true })
        .eq('hospital_id', session.user.id)
        .ilike('blood_group', bloodGroup)
        .ilike('component_type', component)
        .eq('status', 'available')
        .gte('expiry_date', todayStr);
      if (stockErr) {
        window.alert('Unable to verify stock. Try again.');
        setAcceptingId(null);
        return;
      }
      if (availableCount === null || availableCount < unitsRequired) {
        window.alert(`Not enough stock. Needed ${unitsRequired}, available ${availableCount ?? 0}.`);
        setAcceptingId(null);
        return;
      }

      // Capture hospital device location before acceptance
      let hLat: number | null = null;
      let hLng: number | null = null;
      let hAcc: number | null = null;
      const bestFix: any = await getBestDeviceFix(20000, 10);
      if (bestFix && bestFix.coords) {
        hLat = typeof bestFix.coords.latitude === 'number' ? bestFix.coords.latitude : null;
        hLng = typeof bestFix.coords.longitude === 'number' ? bestFix.coords.longitude : null;
        hAcc = typeof bestFix.coords.accuracy === 'number' ? bestFix.coords.accuracy : null;
      }
      if ((hLat === null || hLng === null)) {
        const { data: existing } = await supabase
          .from('hospital_profiles')
          .select('latitude, longitude')
          .eq('user_id', session.user.id)
          .maybeSingle();
        const eLat = typeof existing?.latitude === 'number' ? existing.latitude : null;
        const eLng = typeof existing?.longitude === 'number' ? existing.longitude : null;
        hLat = hLat ?? eLat;
        hLng = hLng ?? eLng;
      }
      if (hLat !== null && hLng !== null && (hAcc === null || hAcc <= 10)) {
        await supabase
          .from('hospital_profiles')
          .update({ latitude: hLat, longitude: hLng })
          .eq('user_id', session.user.id);
        await supabase
          .from('request_waypoints')
          .insert({ request_id: requestId, actor_type: 'hospital', actor_id: session.user.id, latitude: hLat, longitude: hLng, accuracy: hAcc });
      }
      const { data: result, error } = await supabase.rpc('accept_blood_request', {
        p_request_id: requestId,
        p_actor_type: 'hospital',
      });
      if (error || !(result && result.accepted)) {
        setAcceptingId(null);
        return;
      }

      const { data: unitsToReserve, error: unitsErr } = await supabase
        .from('hospital_inventory_units')
        .select('id')
        .eq('hospital_id', session.user.id)
        .ilike('blood_group', bloodGroup)
        .ilike('component_type', component)
        .eq('status', 'available')
        .gte('expiry_date', todayStr)
        .order('expiry_date', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(unitsRequired);
      if (unitsErr) {
        window.alert('Accepted request, but failed to reserve inventory.');
      } else {
        const ids = (Array.isArray(unitsToReserve) ? unitsToReserve : [])
          .map((u: any) => u?.id)
          .filter((id: any) => typeof id === 'string');
        if (ids.length < unitsRequired) {
          window.alert(`Accepted request, but only reserved ${ids.length} of ${unitsRequired} units.`);
        }
        if (ids.length > 0) {
          const { error: reserveErr } = await supabase
            .from('hospital_inventory_units')
            .update({ status: 'reserved' })
            .in('id', ids);
          if (reserveErr) {
            window.alert('Accepted request, but failed to reserve inventory.');
          }
        }
      }

      setRequests((prev) => prev.filter((r) => r.inbox_id !== inboxId));
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (inboxId: string) => {
    if (rejectingId) return;
    setRejectingId(inboxId);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') {
        setRejectingId(null);
        return;
      }
      await supabase.rpc('reject_hospital_inbox_entry', { p_inbox_id: inboxId });
      setRequests((prev) => prev.filter((r) => r.inbox_id !== inboxId));
    } finally {
      setRejectingId(null);
    }
  };

  const statsAvailable = requests.length > 0;
  const emergencyCount = requests.filter((r) => r.urgency === 'critical').length;
  const highCount = requests.filter((r) => r.urgency === 'high').length;
  const otherCount = requests.filter((r) => r.urgency === 'medium' || r.urgency === 'low').length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Request Handling</h2>
        <p className="text-gray-600">Process incoming blood requests from patients</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-red-700" style={{ fontSize: '1.75rem' }}>{statsAvailable ? emergencyCount : '-'}</div>
          <p className="text-red-600">Critical</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-orange-700" style={{ fontSize: '1.75rem' }}>{statsAvailable ? highCount : '-'}</div>
          <p className="text-orange-600">High</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-blue-700" style={{ fontSize: '1.75rem' }}>{statsAvailable ? otherCount : '-'}</div>
          <p className="text-blue-600">Other</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-green-700" style={{ fontSize: '1.75rem' }}>{statsAvailable ? requests.length : '-'}</div>
          <p className="text-green-600">Total</p>
        </div>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg border-2 p-6 border-gray-200">
            <div className="flex items-center gap-2 text-gray-600">
              <AlertCircle className="w-5 h-5" />
              <span>No active requests</span>
            </div>
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className={`bg-white rounded-lg border-2 p-6 ${
                req.urgency === 'critical'
                  ? 'border-red-200 bg-red-50'
                  : req.urgency === 'high'
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`px-4 py-2 rounded-full ${
                      req.urgency === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : req.urgency === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {(req.request_type || 'Request') + ' • ' + (req.urgency || 'unknown')}
                  </div>
                  <div>
                    <div className="text-gray-900 mb-1">
                      {req.id} • {req.blood_group || 'Unknown group'}
                    </div>
                    <p className="text-gray-600">
                      {req.component || 'Component'} • {req.units_required ?? '?'} units
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => req.inbox_id && handleAccept(req.inbox_id, req.id)}
                    disabled={!req.inbox_id || acceptingId === req.inbox_id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-60"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {acceptingId === req.inbox_id ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => req.inbox_id && handleReject(req.inbox_id)}
                    disabled={!req.inbox_id || rejectingId === req.inbox_id}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    Defer
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    Created:{' '}
                    {req.created_at
                      ? new Date(req.created_at).toLocaleString()
                      : 'Not recorded'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>First-accept wins. Once accepted, this request will disappear.</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
