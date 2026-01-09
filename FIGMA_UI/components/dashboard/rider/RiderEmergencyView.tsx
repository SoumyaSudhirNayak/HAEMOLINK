import { useEffect, useMemo, useState } from 'react';
import { Siren, Phone, Navigation, MessageSquare, Radio } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

export function RiderEmergencyView() {
  const { refreshTick } = useAutoRefresh();
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [requestRow, setRequestRow] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);

  const isEmergency = !!requestRow?.is_emergency;
  const emergencyStartedAt = requestRow?.emergency_activated_at
    ? new Date(requestRow.emergency_activated_at as any)
    : null;

  const timeElapsedLabel = useMemo(() => {
    if (!isEmergency || !emergencyStartedAt) return 'No emergency active';
    const diffMs = Date.now() - emergencyStartedAt.getTime();
    const totalSec = Math.max(0, Math.floor(diffMs / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${sec}s`;
  }, [isEmergency, emergencyStartedAt?.getTime()]);

  const load = async () => {
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'rider') {
        setActiveRequestId(null);
        setRequestRow(null);
        return;
      }

      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('request_id, created_at, status')
        .eq('rider_id', session.user.id)
        .in('status', ['assigned', 'dispatched', 'in_transit'])
        .order('created_at', { ascending: false })
        .limit(1);

      const requestId =
        Array.isArray(deliveries) && deliveries[0] && typeof (deliveries[0] as any).request_id === 'string'
          ? (deliveries[0] as any).request_id
          : null;

      setActiveRequestId(requestId);
      if (!requestId) {
        setRequestRow(null);
        return;
      }

      const { data: br } = await supabase
        .from('blood_requests')
        .select('id, blood_group, component, quantity_units, urgency, is_emergency, emergency_activated_at')
        .eq('id', requestId)
        .maybeSingle();
      setRequestRow(br || null);
    } catch {
      setActiveRequestId(null);
      setRequestRow(null);
    }
  };

  useEffect(() => {
    load();
  }, [refreshTick]);

  const toggleEmergency = async () => {
    if (!activeRequestId || updating) return;
    setUpdating(true);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'rider') return;
      const next = !isEmergency;
      const { data, error } = await supabase.rpc('set_request_emergency', {
        p_request_id: activeRequestId,
        p_is_emergency: next,
      } as any);
      if (error) throw error;
      if (data && (data as any).ok) {
        setRequestRow((prev: any) => ({
          ...(prev || {}),
          id: activeRequestId,
          is_emergency: next,
          emergency_activated_at: next ? new Date().toISOString() : null,
        }));
      } else {
        await load();
      }
    } catch {
      await load();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="bg-red-600 rounded-lg p-8 mb-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <Siren className="w-12 h-12 animate-pulse" />
          <div>
            <h2 className="mb-2">Emergency Mode for Riders</h2>
            <p className="opacity-90">Critical delivery protocols and SOS systems</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-red-700 rounded-lg p-4">
            <div className="text-red-200 mb-1">Emergency</div>
            <div style={{ fontSize: '1.5rem' }}>{isEmergency ? timeElapsedLabel : 'Inactive'}</div>
          </div>
          <div className="bg-red-700 rounded-lg p-4">
            <div className="text-red-200 mb-1">Request</div>
            <div style={{ fontSize: '1.5rem' }}>{activeRequestId ? 'Active' : 'None'}</div>
          </div>
          <div className="bg-red-700 rounded-lg p-4">
            <div className="text-red-200 mb-1">Priority</div>
            <div style={{ fontSize: '1.5rem' }}>{isEmergency ? 'Emergency' : requestRow?.urgency || 'Normal'}</div>
          </div>
        </div>

        <button
          disabled={!activeRequestId || updating}
          onClick={toggleEmergency}
          className="w-full py-4 bg-white text-red-600 rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontSize: '1.25rem' }}
        >
          <Radio className="w-6 h-6" />
          {activeRequestId
            ? updating
              ? 'UPDATING...'
              : isEmergency
                ? 'DEACTIVATE EMERGENCY'
                : 'ACTIVATE EMERGENCY'
            : 'NO ACTIVE DELIVERY'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* SOS Button */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-6 h-6 text-red-600" />
            <h3 className="text-gray-900">Emergency SOS</h3>
          </div>
          <p className="text-gray-600 mb-4">
            {requestRow?.blood_group || requestRow?.component
              ? `${requestRow?.blood_group || '—'} • ${requestRow?.component || '—'}`
              : 'No active request'}
          </p>
          <button className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
            Call Hospital Emergency
          </button>
        </div>

        {/* Instant Re-routing */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="w-6 h-6 text-orange-600" />
            <h3 className="text-gray-900">Express Routing</h3>
          </div>
          <p className="text-gray-600 mb-4">Shortest path with traffic override</p>
          <button className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
            Activate Express Route
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* SMS Fallback */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <h3 className="text-gray-900">SMS Fallback</h3>
          </div>
          <p className="text-gray-600 mb-4">No data available yet</p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="text-blue-900 mb-2">No records found</div>
          </div>

          <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Send Status Update
          </button>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Emergency Contacts</h3>
          
          <div className="space-y-2">
            <div className="w-full py-3 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg flex items-center justify-center">
              <span>No contacts available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Protocols */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
        <h3 className="text-gray-900 mb-4">Emergency Protocols</h3>
        
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-gray-600">No data available yet</div>
        </div>
      </div>
    </div>
  );
}
