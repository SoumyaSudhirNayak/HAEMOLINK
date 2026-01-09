import { useEffect, useMemo, useRef, useState } from 'react';
import { Package, MapPin, TrendingUp, AlertCircle, Clock, DollarSign, Heart } from 'lucide-react';
import { RiderDashboardView } from '../../RiderDashboard';
import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface RiderOverviewViewProps {
  onNavigate: (view: RiderDashboardView) => void;
}

export function RiderOverviewView({ onNavigate }: RiderOverviewViewProps) {
  const { refreshTick } = useAutoRefresh();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    todayPickups: number;
    pending: number;
    emergency: number;
    earningsToday: number;
    successRate: number;
  } | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<
    Array<{
      id: string;
      request_id: string;
      status: string;
      created_at: string | null;
      urgency: string | null;
      component: string | null;
      units: number | null;
      pickup_label: string | null;
      drop_label: string | null;
      pickup_lat: number | null;
      pickup_lng: number | null;
      drop_lat: number | null;
      drop_lng: number | null;
    }>
  >([]);
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [heatPoints, setHeatPoints] = useState<Array<{ id: string; lat: number; lng: number; kind: 'pending' | 'active' }>>([]);
  const reloadRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    let active = true;
    let inboxChannel: any = null;
    let deliveryChannel: any = null;
    let earningsChannel: any = null;
    let reloadTimer: any = null;

    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'rider') {
          if (active) {
            setStats({ todayPickups: 0, pending: 0, emergency: 0, earningsToday: 0, successRate: 0 });
            setActiveDeliveries([]);
            setLoading(false);
          }
          return;
        }
        const uid = session.user.id;

        const scheduleReload = () => {
          if (!active) return;
          if (reloadTimer) return;
          reloadTimer = setTimeout(() => {
            reloadTimer = null;
            load();
          }, 250);
        };
        reloadRef.current = scheduleReload;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startIso = startOfDay.toISOString();

        const load = async () => {
          const [
            pendingCountResult,
            pendingListResult,
            todayPickupsResult,
            totalDeliveriesResult,
            successDeliveriesResult,
            earningsTodayResult,
            activeDeliveriesResult,
          ] = await Promise.all([
            supabase
              .from('rider_request_inbox')
              .select('id', { count: 'exact', head: true })
              .eq('rider_id', uid)
              .eq('status', 'pending'),
            supabase
              .from('rider_request_inbox')
              .select('request_id')
              .eq('rider_id', uid)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(50),
            supabase
              .from('deliveries')
              .select('id', { count: 'exact', head: true })
              .eq('rider_id', uid)
              .gte('created_at', startIso),
            supabase
              .from('deliveries')
              .select('id', { count: 'exact', head: true })
              .eq('rider_id', uid),
            supabase
              .from('deliveries')
              .select('id', { count: 'exact', head: true })
              .eq('rider_id', uid)
              .in('status', ['delivered', 'completed']),
            supabase
              .from('rider_earnings')
              .select('amount, created_at')
              .eq('rider_id', uid)
              .gte('created_at', startIso)
              .limit(200),
            supabase
              .from('deliveries')
              .select('id, request_id, status, created_at')
              .eq('rider_id', uid)
              .in('status', ['assigned', 'in_transit'])
              .order('created_at', { ascending: false })
              .limit(3),
          ]);

          const pending = pendingCountResult.count ?? 0;
          const todayPickups = todayPickupsResult.count ?? 0;

          const totalDeliveries = totalDeliveriesResult.count ?? 0;
          const successDeliveries = successDeliveriesResult.count ?? 0;
          const successRate =
            totalDeliveries > 0 ? Math.round((successDeliveries / totalDeliveries) * 100) : 0;

          const earningsRows = Array.isArray(earningsTodayResult.data) ? earningsTodayResult.data : [];
          const earningsToday = earningsRows.reduce((sum: number, row: any) => {
            const v = row?.amount;
            if (typeof v === 'number' && Number.isFinite(v)) return sum + v;
            if (typeof v === 'string') {
              const n = Number(v);
              if (Number.isFinite(n)) return sum + n;
            }
            return sum;
          }, 0);

          const requestIds = Array.isArray(pendingListResult.data)
            ? (pendingListResult.data as any[])
                .map((r) => r?.request_id)
                .filter(Boolean)
                .slice(0, 50)
            : [];

          let emergency = 0;
          if (requestIds.length > 0) {
            const { data: brs } = await supabase
              .from('blood_requests')
              .select('id, urgency, request_type, patient_latitude, patient_longitude')
              .in('id', requestIds as any);
            const list = Array.isArray(brs) ? brs : [];
            emergency = list.filter((r: any) => {
              const u = (r?.urgency || '').toString().toLowerCase();
              const t = (r?.request_type || '').toString().toLowerCase();
              return u === 'emergency' || u === 'critical' || u === 'high' || t === 'emergency';
            }).length;

            if (active) {
              const pendingPoints = list
                .map((r: any) => {
                  const lat = typeof r?.patient_latitude === 'number' ? r.patient_latitude : null;
                  const lng = typeof r?.patient_longitude === 'number' ? r.patient_longitude : null;
                  if (lat === null || lng === null) return null;
                  return { id: String(r.id), lat, lng, kind: 'pending' as const };
                })
                .filter(Boolean) as Array<{ id: string; lat: number; lng: number; kind: 'pending' }>;
              setHeatPoints((prev) => {
                const activePoints = prev.filter((p) => p.kind === 'active');
                return [...activePoints, ...pendingPoints].slice(0, 200);
              });
            }
          }

          const activeRows = Array.isArray(activeDeliveriesResult.data) ? activeDeliveriesResult.data : [];
          const activeRequestIds = Array.from(
            new Set(activeRows.map((d: any) => d?.request_id).filter((v: any) => typeof v === 'string' && v.length > 0)),
          );
          const allRequestIds = Array.from(new Set([...requestIds, ...activeRequestIds].filter(Boolean)));

          let riderPos: { lat: number; lng: number } | null = null;
          try {
            const { data: rp } = await supabase
              .from('rider_profiles')
              .select('latitude, longitude')
              .eq('user_id', uid)
              .maybeSingle();
            const lat = typeof (rp as any)?.latitude === 'number' ? (rp as any).latitude : null;
            const lng = typeof (rp as any)?.longitude === 'number' ? (rp as any).longitude : null;
            if (lat !== null && lng !== null) riderPos = { lat, lng };
          } catch {}

          const requestById = new Map<string, any>();
          if (allRequestIds.length > 0) {
            try {
              const { data: brs } = await supabase
                .from('blood_requests')
                .select('id, urgency, request_type, component, quantity_units, accepted_by_type, accepted_by_id, hospital_id, patient_id, patient_latitude, patient_longitude')
                .in('id', allRequestIds as any);
              (Array.isArray(brs) ? brs : []).forEach((r: any) => {
                if (r?.id) requestById.set(String(r.id), r);
              });
            } catch {}
          }

          const hospitalIds = Array.from(
            new Set(
              Array.from(requestById.values())
                .map((r: any) => r?.hospital_id)
                .filter((v: any) => typeof v === 'string' && v.length > 0),
            ),
          );
          const patientIds = Array.from(
            new Set(
              Array.from(requestById.values())
                .map((r: any) => r?.patient_id)
                .filter((v: any) => typeof v === 'string' && v.length > 0),
            ),
          );
          const donorIds = Array.from(
            new Set(
              Array.from(requestById.values())
                .filter((r: any) => (r?.accepted_by_type || '').toString() === 'donor')
                .map((r: any) => r?.accepted_by_id)
                .filter((v: any) => typeof v === 'string' && v.length > 0),
            ),
          );

          const hospitalById = new Map<string, any>();
          const patientById = new Map<string, any>();
          const donorById = new Map<string, any>();

          await Promise.all([
            (async () => {
              if (hospitalIds.length === 0) return;
              try {
                const { data } = await supabase
                  .from('hospital_profiles')
                  .select('user_id, organization_name, admin_contact, latitude, longitude')
                  .in('user_id', hospitalIds as any);
                (Array.isArray(data) ? data : []).forEach((p: any) => {
                  if (p?.user_id) hospitalById.set(String(p.user_id), p);
                });
              } catch {}
            })(),
            (async () => {
              if (patientIds.length === 0) return;
              try {
                const { data } = await supabase
                  .from('patient_profiles')
                  .select('user_id, full_name, phone, latitude, longitude')
                  .in('user_id', patientIds as any);
                (Array.isArray(data) ? data : []).forEach((p: any) => {
                  if (p?.user_id) patientById.set(String(p.user_id), p);
                });
              } catch {}
            })(),
            (async () => {
              if (donorIds.length === 0) return;
              try {
                const { data } = await supabase
                  .from('donor_profiles')
                  .select('user_id, full_name, phone, latitude, longitude')
                  .in('user_id', donorIds as any);
                (Array.isArray(data) ? data : []).forEach((p: any) => {
                  if (p?.user_id) donorById.set(String(p.user_id), p);
                });
              } catch {}
            })(),
          ]);

          const activeCards = activeRows.map((d: any) => {
            const requestId = typeof d?.request_id === 'string' ? d.request_id : '';
            const br = requestById.get(requestId) || {};
            const acceptedByType = (br?.accepted_by_type || '').toString();
            const pickupProfile =
              acceptedByType === 'donor'
                ? donorById.get(String(br?.accepted_by_id || '')) || null
                : hospitalById.get(String(br?.hospital_id || '')) || null;
            const patientProfile = patientById.get(String(br?.patient_id || '')) || null;
            const pickupLabel =
              acceptedByType === 'donor'
                ? (pickupProfile?.full_name || 'Donor')
                : (pickupProfile?.organization_name || 'Hospital');
            const dropLabel = patientProfile?.full_name || 'Patient';
            const pickupLat = typeof pickupProfile?.latitude === 'number' ? pickupProfile.latitude : null;
            const pickupLng = typeof pickupProfile?.longitude === 'number' ? pickupProfile.longitude : null;
            const dropLat =
              typeof patientProfile?.latitude === 'number'
                ? patientProfile.latitude
                : typeof br?.patient_latitude === 'number'
                  ? br.patient_latitude
                  : null;
            const dropLng =
              typeof patientProfile?.longitude === 'number'
                ? patientProfile.longitude
                : typeof br?.patient_longitude === 'number'
                  ? br.patient_longitude
                  : null;
            const units = typeof br?.quantity_units === 'number' ? br.quantity_units : null;
            return {
              id: String(d.id),
              request_id: requestId,
              status: String(d.status || ''),
              created_at: d.created_at ?? null,
              urgency: typeof br?.urgency === 'string' ? br.urgency : null,
              component: typeof br?.component === 'string' ? br.component : null,
              units,
              pickup_label: pickupLabel,
              drop_label: dropLabel,
              pickup_lat: pickupLat,
              pickup_lng: pickupLng,
              drop_lat: dropLat,
              drop_lng: dropLng,
            };
          });

          if (active) {
            setStats({ todayPickups, pending, emergency, earningsToday, successRate });
            setActiveDeliveries(activeCards);
            setRiderPos(riderPos);
            setHeatPoints((prev) => {
              const pendingPoints = prev.filter((p) => p.kind === 'pending');
              const nextActivePoints = activeCards
                .flatMap((c) => {
                  const points: Array<{ id: string; lat: number; lng: number; kind: 'active' }> = [];
                  if (typeof c.pickup_lat === 'number' && typeof c.pickup_lng === 'number') {
                    points.push({ id: `${c.id}_pick`, lat: c.pickup_lat, lng: c.pickup_lng, kind: 'active' });
                  }
                  if (typeof c.drop_lat === 'number' && typeof c.drop_lng === 'number') {
                    points.push({ id: `${c.id}_drop`, lat: c.drop_lat, lng: c.drop_lng, kind: 'active' });
                  }
                  return points;
                })
                .slice(0, 200);
              return [...nextActivePoints, ...pendingPoints].slice(0, 200);
            });
            setLoading(false);
          }
        };

        await load();

        inboxChannel = supabase
          .channel(`rider_overview_inbox_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rider_request_inbox', filter: `rider_id=eq.${uid}` },
            () => scheduleReload(),
          )
          .subscribe();
        deliveryChannel = supabase
          .channel(`rider_overview_deliveries_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'deliveries', filter: `rider_id=eq.${uid}` },
            () => scheduleReload(),
          )
          .subscribe();
        earningsChannel = supabase
          .channel(`rider_overview_earnings_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rider_earnings', filter: `rider_id=eq.${uid}` },
            () => scheduleReload(),
          )
          .subscribe();
      } catch {
        if (active) {
          setStats({ todayPickups: 0, pending: 0, emergency: 0, earningsToday: 0, successRate: 0 });
          setActiveDeliveries([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      if (reloadTimer) clearTimeout(reloadTimer);
      if (inboxChannel) inboxChannel.unsubscribe();
      if (deliveryChannel) deliveryChannel.unsubscribe();
      if (earningsChannel) earningsChannel.unsubscribe();
      reloadRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (reloadRef.current) reloadRef.current();
  }, [refreshTick]);

  return (
    <div className="p-8">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Today's Pickups</span>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-gray-600">
            {loading ? 'Loading...' : stats ? stats.todayPickups : 0}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Pending</span>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-gray-600">
            {loading ? 'Loading...' : stats ? stats.pending : 0}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Emergency</span>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-gray-600">
            {loading ? 'Loading...' : stats ? stats.emergency : 0}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Today's Earnings</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-gray-600">
            {loading ? 'Loading...' : stats ? stats.earningsToday.toFixed(0) : 0}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Success Rate</span>
            <TrendingUp className="w-5 h-5 text-violet-600" />
          </div>
          <div className="text-gray-600">
            {loading ? 'Loading...' : stats ? `${stats.successRate}%` : '0%'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="col-span-2 space-y-6">
          {/* Today's Assigned Pickups */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">Assigned Pickups</h3>
              <button 
                onClick={() => onNavigate('assignments')}
                className="text-orange-600 hover:text-orange-700"
              >
                View All →
              </button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="p-4 rounded-lg border-2 bg-gray-50 border-gray-200">
                  <div className="text-gray-600">Loading assignments...</div>
                </div>
              ) : activeDeliveries.length === 0 ? (
                <div className="p-4 rounded-lg border-2 bg-gray-50 border-gray-200">
                  <div className="text-gray-600">No assignments yet</div>
                </div>
              ) : (
                activeDeliveries.map((d) => (
                  <div key={d.id} className="p-4 rounded-lg border border-gray-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="text-gray-900">Request {d.request_id.slice(0, 8)}</div>
                      <div className="text-gray-600 mt-1">
                        {(d.pickup_label || 'Pickup')} → {(d.drop_label || 'Drop')}
                        {(typeof d.component === 'string' && d.component.trim()) || typeof d.units === 'number' ? (
                          <span>
                            {typeof d.component === 'string' && d.component.trim() ? ` • ${d.component}` : ''}
                            {typeof d.units === 'number' ? ` • ${d.units} unit${d.units === 1 ? '' : 's'}` : ''}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-gray-600 flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" />
                        <span>{d.created_at ? new Date(d.created_at).toLocaleString() : ''}</span>
                        <span>•</span>
                        <span>{d.status}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('navigation')}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                    >
                      Navigate
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Requests Heatmap */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Nearby Requests Heatmap</h3>
            <div className="aspect-[2/1] rounded-lg overflow-hidden border border-blue-200 bg-blue-50">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-gray-600">Loading...</div>
                </div>
              ) : heatPoints.length === 0 && !riderPos ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-3" />
                    <p className="text-gray-600">
                      {stats ? `${stats.pending} pending task${stats.pending === 1 ? '' : 's'}` : '0 pending tasks'}
                    </p>
                  </div>
                </div>
              ) : (
                <MapContainer
                  style={{ height: '100%', width: '100%' }}
                  center={
                    riderPos
                      ? [riderPos.lat, riderPos.lng]
                      : heatPoints.length
                        ? [heatPoints[0].lat, heatPoints[0].lng]
                        : [20.5937, 78.9629]
                  }
                  zoom={12}
                  scrollWheelZoom={false}
                >
                  <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {riderPos ? (
                    <Marker
                      position={[riderPos.lat, riderPos.lng]}
                      icon={L.divIcon({ html: '<div style="font-size:20px;line-height:20px">🏍️</div>', iconSize: [24, 24], iconAnchor: [12, 12] })}
                      zIndexOffset={500}
                    />
                  ) : null}
                  {heatPoints.map((p) => (
                    <CircleMarker
                      key={p.id}
                      center={[p.lat, p.lng]}
                      radius={p.kind === 'active' ? 12 : 10}
                      pathOptions={{
                        color: p.kind === 'active' ? '#f97316' : '#2563eb',
                        fillColor: p.kind === 'active' ? '#fb923c' : '#60a5fa',
                        fillOpacity: 0.35,
                        weight: 1,
                      }}
                    />
                  ))}
                  <FitRiderOverviewMap
                    points={heatPoints.map((p) => [p.lat, p.lng] as [number, number])}
                    rider={riderPos}
                  />
                </MapContainer>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 */}
        <div className="col-span-1 space-y-6">
          {/* Emergency Priority */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-2 text-red-700 mb-4">
              <AlertCircle className="w-6 h-6 animate-pulse" />
              <h3>Emergency Task</h3>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="text-gray-600">
                {loading ? 'Loading...' : stats && stats.emergency > 0 ? `${stats.emergency} emergency task${stats.emergency === 1 ? '' : 's'}` : 'No emergency tasks'}
              </div>
            </div>

            <button 
              onClick={() => onNavigate('emergency')}
              className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Activate Siren Mode
            </button>
          </div>

          {/* Cold Chain Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Cold Box Status</h3>
              <button 
                onClick={() => onNavigate('coldchain')}
                className="text-orange-600 hover:text-orange-700"
              >
                Monitor →
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-gray-600">No data available yet</div>
              </div>
            </div>
          </div>

          {/* Today's Impact */}
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-6 h-6" fill="white" />
              <h3>Today's Impact</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <div className="text-white">No data available yet</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Quick Actions</h3>

            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('pickup')}
                className="w-full py-2 text-left px-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                Scan Pickup QR
              </button>
              <button 
                onClick={() => onNavigate('coldchain')}
                className="w-full py-2 text-left px-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
              >
                Check Cold Chain
              </button>
              <button 
                onClick={() => onNavigate('earnings')}
                className="w-full py-2 text-left px-4 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition"
              >
                View Earnings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FitRiderOverviewMap({
  points,
  rider,
}: {
  points: Array<[number, number]>;
  rider: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const boundsPoints = useMemo(() => {
    const pts = [...points];
    if (rider) pts.push([rider.lat, rider.lng]);
    return pts;
  }, [points, rider]);

  useEffect(() => {
    if (boundsPoints.length === 0) return;
    const bounds = L.latLngBounds(boundsPoints.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [boundsPoints, map]);

  return null;
}
