import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface Assignment {
  id: string;
  request_id: string;
  status: string;
  created_at: string | null;
}

export function AssignmentsView({ onNavigate }: { onNavigate?: (v: any) => void }) {
  const { refreshTick } = useAutoRefresh();
  const [incoming, setIncoming] = useState<Assignment[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const currentDeliveryRef = useRef<string | null>(null);
  const reloadRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    let active = true;
    let inboxChannel: any = null;
    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'rider') {
          if (active) setIncoming([]);
          return;
        }
        const uid = session.user.id;
        const load = async () => {
          const { data } = await supabase
            .from('rider_request_inbox')
            .select('id, status, created_at, request_id')
            .eq('rider_id', uid)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });
          if (Array.isArray(data) && active) setIncoming(data as any);
        };
        reloadRef.current = () => {
          void load();
        };
        await load();
        inboxChannel = supabase
          .channel('rider_inbox_feed')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_request_inbox', filter: `rider_id=eq.${uid}` }, (payload: any) => {
            if (!active) return;
            const row = payload.new as any;
            setIncoming((prev) => {
              let next = [...prev];
              const idx = row ? next.findIndex((r) => r.id === row.id) : -1;
              if (payload.eventType === 'INSERT' && row && row.status === 'pending') {
                if (idx === -1) next.unshift(row);
              } else if (payload.eventType === 'UPDATE' && row) {
                const still = row.status === 'pending';
                if (!still) {
                  next = next.filter((r) => r.id !== row.id);
                } else if (idx !== -1) {
                  next[idx] = { ...next[idx], ...row };
                }
              } else if (payload.eventType === 'DELETE' && payload.old) {
                next = next.filter((r) => r.id !== (payload.old as any).id);
              }
              return next;
            });
          })
          .subscribe();
      } catch {
        if (active) {
          setIncoming([]);
          reloadRef.current = null;
        }
      }
    })();
    return () => {
      active = false;
      if (inboxChannel) inboxChannel.unsubscribe();
      reloadRef.current = null;
      if (watchIdRef.current && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (reloadRef.current) reloadRef.current();
  }, [refreshTick]);

  const startTracking = async (deliveryId: string) => {
    const [{ supabase }, { getSessionAndRole }] = await Promise.all([
      import('../../../supabase/client'),
      import('../../../services/auth'),
    ]);
    const { session, role } = await getSessionAndRole();
    if (!session || role !== 'rider') return;
    currentDeliveryRef.current = deliveryId;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = typeof pos.coords.latitude === 'number' ? pos.coords.latitude : null;
          const lng = typeof pos.coords.longitude === 'number' ? pos.coords.longitude : null;
          const acc = typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : null;
          if (lat !== null && lng !== null && currentDeliveryRef.current && (acc === null || acc <= 15)) {
            await supabase.from('rider_positions').insert({
              delivery_id: currentDeliveryRef.current,
              rider_id: session.user.id,
              latitude: lat,
              longitude: lng,
              accuracy: acc,
            });
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      ) as any;
    }
  };

  const handleAccept = async (assignmentId: string, requestId: string) => {
    setAccepting(assignmentId);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'rider') {
        setAccepting(null);
        return;
      }
      const tryAccept = async (rpcName: string) => {
        const { data, error } = await supabase.rpc(rpcName, { p_request_id: requestId });
        const accepted = !error && !!(data && (data as any).accepted);
        return { accepted, data, error };
      };

      const hospitalAttempt = await tryAccept('accept_delivery_request');
      const donorAttempt = hospitalAttempt.accepted ? hospitalAttempt : await tryAccept('accept_delivery_request_by_donor');
      if (!donorAttempt.accepted) {
        setAccepting(null);
        return;
      }

      setIncoming((prev) => prev.filter((i) => i.id !== assignmentId));
      if (onNavigate) onNavigate('navigation');

      let deliveryId = (donorAttempt.data as any)?.delivery_id as string | undefined;
      if (!deliveryId) {
        const { data: recent } = await supabase
          .from('deliveries')
          .select('id')
          .eq('rider_id', session.user.id)
          .eq('request_id', requestId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (Array.isArray(recent) && recent[0]) {
          deliveryId = (recent[0] as any).id as string;
        }
      }

      if (deliveryId) {
        await startTracking(deliveryId);
      }
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Assignment & Dispatch System</h2>
        <p className="text-gray-600">Accept or reject incoming delivery tasks</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-gray-900">Incoming Tasks</h3>
        {incoming.length === 0 ? (
          <div className="bg-white rounded-lg border-2 p-6 border-gray-200">
            <div className="text-gray-600">No assignments yet</div>
          </div>
        ) : (
          incoming.map((a) => (
            <div key={a.id} className="bg-white rounded-lg border-2 p-6 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-900">Request {a.request_id.slice(0,8)}</div>
                  <div className="text-gray-600 flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4" />
                    <span>{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAccept(a.id, a.request_id)}
                    disabled={accepting === a.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-60"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {accepting === a.id ? 'Accepting...' : 'Accept'}
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
