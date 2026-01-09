import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Radio, Users, Truck } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

export function EmergencyModeView() {
  const { refreshTick } = useAutoRefresh();
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [requestRow, setRequestRow] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);

  const isEmergency = !!requestRow?.is_emergency;
  const emergencyStartedAt = requestRow?.emergency_activated_at
    ? new Date(requestRow.emergency_activated_at as any)
    : null;

  const timeElapsedLabel = useMemo(() => {
    if (!isEmergency || !emergencyStartedAt) return 'No broadcast active';
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
      if (!session || role !== 'hospital') {
        setActiveRequestId(null);
        setRequestRow(null);
        return;
      }
      const { data: inbox } = await supabase
        .from('hospital_request_inbox')
        .select('request_id, created_at')
        .eq('hospital_id', session.user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1);
      const requestId =
        Array.isArray(inbox) && inbox[0] && typeof (inbox[0] as any).request_id === 'string'
          ? (inbox[0] as any).request_id
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
      if (!session || role !== 'hospital') return;
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
          <AlertCircle className="w-12 h-12 animate-pulse" />
          <div>
            <h2 className="mb-2">Emergency Mode</h2>
            <p className="opacity-90">Broadcast critical blood need to ecosystem</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-red-700 rounded-lg p-4">
            <div className="text-red-200 mb-1">Time Elapsed</div>
            <div className="opacity-90" style={{ fontSize: '1.25rem' }}>{timeElapsedLabel}</div>
          </div>
          <div className="bg-red-700 rounded-lg p-4">
            <div className="text-red-200 mb-1">Donors Notified</div>
            <div className="opacity-90" style={{ fontSize: '1.25rem' }}>{isEmergency ? 'Broadcasting' : 'No data yet'}</div>
          </div>
          <div className="bg-red-700 rounded-lg p-4">
            <div className="text-red-200 mb-1">Blood Banks Alerted</div>
            <div className="opacity-90" style={{ fontSize: '1.25rem' }}>{isEmergency ? 'Broadcasting' : 'No data yet'}</div>
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
                ? 'DEACTIVATE EMERGENCY BROADCAST'
                : 'ACTIVATE EMERGENCY BROADCAST'
            : 'NO ACTIVE REQUEST'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-6 h-6 text-green-600" />
            <h3 className="text-gray-900">Notify Nearby Donors</h3>
          </div>
          <p className="text-gray-600 mb-4">Alert compatible donors within 10km radius</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" disabled={!isEmergency} />
            <span className="text-gray-700">Include in broadcast</span>
          </label>
          {requestRow?.blood_group || requestRow?.component ? (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-gray-900">
                {(requestRow?.blood_group || '—') + ' • ' + (requestRow?.component || '—')}
              </div>
              <div className="text-gray-600">
                {typeof requestRow?.quantity_units === 'number' ? `${requestRow.quantity_units} units` : 'Units —'}
                {requestRow?.urgency ? ` • ${requestRow.urgency}` : ''}
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-6 h-6 text-orange-600" />
            <h3 className="text-gray-900">Express Delivery Routing</h3>
          </div>
          <p className="text-gray-600 mb-4">Activate priority delivery protocols</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" disabled={!isEmergency} />
            <span className="text-gray-700">Enable express mode</span>
          </label>
        </div>
      </div>
    </div>
  );
}
