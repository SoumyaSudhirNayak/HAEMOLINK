import { useEffect, useRef, useState } from 'react';
import { Truck, MapPin, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { computeFareInr, getOsrmRoute } from '../../../utils/geo';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface Delivery {
  id: string;
  request_id: string;
  rider_id: string | null;
  status: string;
  created_at: string | null;
  rider_lat?: number | null;
  rider_lng?: number | null;
}

export function DeliveryView() {
  const { refreshTick } = useAutoRefresh();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<string[]>([]);
  const [riderCandidates, setRiderCandidates] = useState<Record<string, any[]>>({});
  const [riderInfo, setRiderInfo] = useState<Record<string, any>>({});
  const [navByDelivery, setNavByDelivery] = useState<Record<string, { pickup?: { lat: number|null; lng: number|null }, drop?: { lat: number|null; lng: number|null } }>>({});
  const [otpByDelivery, setOtpByDelivery] = useState<Record<string, string | null>>({});
  const [donorByDelivery, setDonorByDelivery] = useState<Record<string, { lat: number|null; lng: number|null }>>({});
  const [routeByDelivery, setRouteByDelivery] = useState<Record<string, Array<[number, number]>>>({});
  const [routeStepsByDelivery, setRouteStepsByDelivery] = useState<Record<string, Array<{ instruction: string; distance: number }>>>({});
  const [routeStatsByDelivery, setRouteStatsByDelivery] = useState<Record<string, { distanceKm: number; durationMin: number; fareInr: number }>>({});
  const [riderPaths, setRiderPaths] = useState<Record<string, Array<[number, number]>>>({});
  const reloadRef = useRef<(() => Promise<void>) | null>(null);
  const activeRequestIdsRef = useRef<string[]>([]);

  useEffect(() => {
    let active = true;
    let deliveryChannel: any = null;
    let positionChannel: any = null;
    let waypointsChannel: any = null;
    let candidatesChannel: any = null;
    reloadRef.current = null;
    activeRequestIdsRef.current = [];

    const fetchNav = async (d: Delivery) => {
      try {
        const [{ supabase }] = await Promise.all([import('../../../supabase/client')]);
        let { data: navData } = await supabase.rpc('get_delivery_navigation', { p_delivery_id: d.id });
        
        if (!navData) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const [hWp, pWp, br, hp] = await Promise.all([
              supabase.from('request_waypoints').select('latitude, longitude').eq('request_id', d.request_id).eq('actor_type', 'hospital').order('accuracy', {ascending:true}).order('created_at', {ascending:false}).limit(1).maybeSingle(),
              supabase.from('request_waypoints').select('latitude, longitude').eq('request_id', d.request_id).eq('actor_type', 'patient').order('accuracy', {ascending:true}).order('created_at', {ascending:false}).limit(1).maybeSingle(),
              supabase.from('blood_requests').select('patient_latitude, patient_longitude').eq('id', d.request_id).maybeSingle(),
              user ? supabase.from('hospital_profiles').select('latitude, longitude').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null })
            ]);
            
            let pickLat = (hWp.data as any)?.latitude;
            let pickLng = (hWp.data as any)?.longitude;
            if (pickLat == null) { pickLat = (hp.data as any)?.latitude; pickLng = (hp.data as any)?.longitude; }
            
            let dropLat = (pWp.data as any)?.latitude;
            let dropLng = (pWp.data as any)?.longitude;
            if (dropLat == null) { 
              const b = (br.data as any);
              dropLat = b?.patient_latitude; 
              dropLng = b?.patient_longitude; 
            }
            
            if (pickLat != null && dropLat != null) {
              navData = {
                  pickup: { lat: pickLat, lng: pickLng },
                  drop: { lat: dropLat, lng: dropLng }
              };
            }
          } catch {}
        }

        if (navData) {
          setNavByDelivery((prev) => ({ ...prev, [d.id]: { pickup: navData.pickup, drop: navData.drop } }));
          const otp = typeof (navData as any)?.otp === 'string' ? (navData as any).otp : null;
          setOtpByDelivery((prev) => ({ ...prev, [d.id]: otp }));
          const pLat = typeof navData?.pickup?.lat === 'number' ? navData.pickup.lat : null;
          const pLng = typeof navData?.pickup?.lng === 'number' ? navData.pickup.lng : null;
          const dLat = typeof navData?.drop?.lat === 'number' ? navData.drop.lat : null;
          const dLng = typeof navData?.drop?.lng === 'number' ? navData.drop.lng : null;
          
          try {
            const { data: donorWps } = await supabase
              .from('request_waypoints')
              .select('latitude, longitude')
              .eq('request_id', d.request_id)
              .eq('actor_type', 'donor')
              .order('accuracy', { ascending: true })
              .order('created_at', { ascending: false })
              .limit(1);
            const donorWp = Array.isArray(donorWps) && donorWps[0] ? donorWps[0] as any : null;
            if (donorWp) setDonorByDelivery((prev) => ({ ...prev, [d.id]: { lat: donorWp.latitude, lng: donorWp.longitude } }));
          } catch {}

          if (pLat !== null && pLng !== null && dLat !== null && dLng !== null) {
            try {
              const route = await getOsrmRoute({ lat: pLat, lng: pLng }, { lat: dLat, lng: dLng });
              if (route) {
                setRouteByDelivery((prev) => ({ ...prev, [d.id]: route.coordsLatLng }));
                setRouteStepsByDelivery((prev) => ({ ...prev, [d.id]: route.steps }));
                setRouteStatsByDelivery((prev) => ({ ...prev, [d.id]: { distanceKm: route.distanceKm, durationMin: route.durationMin, fareInr: computeFareInr(route.distanceKm) } }));
              }
            } catch {}
          }
        }
      } catch {}
    };

    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'hospital') {
          if (active) setDeliveries([]);
          return;
        }

        const uid = session.user.id;
        const reload = async () => {
          try {
            const { data, error } = await supabase
              .from('deliveries')
              .select('id, request_id, rider_id, status, created_at')
              .eq('hospital_id', uid)
              .in('status', ['assigned','in_transit'])
              .order('created_at', { ascending: false });

            const deliveryList = !error && Array.isArray(data) ? (data as any[]) : [];
            if (active) {
              setDeliveries(deliveryList as any);
            }

            const riderIds = Array.from(new Set(deliveryList.map((d) => d?.rider_id).filter(Boolean)));
            if (riderIds.length > 0) {
              const { data: profs } = await supabase
                .from('rider_profiles')
                .select('user_id, full_name, phone, vehicle_number, latitude, longitude')
                .in('user_id', riderIds);
              const map: Record<string, any> = {};
              (Array.isArray(profs) ? (profs as any[]) : []).forEach((p) => { map[p.user_id] = p; });
              if (active) {
                setRiderInfo(map);
                setDeliveries((prev) => prev.map(d => {
                  const p = map[d.rider_id || ''];
                  if (p && typeof p.latitude === 'number' && typeof p.longitude === 'number') {
                    return { ...d, rider_lat: p.latitude, rider_lng: p.longitude };
                  }
                  return d;
                }));
              }
            } else if (active) {
              setRiderInfo({});
            }

            deliveryList.forEach((d) => fetchNav(d));

            const { data: accepted } = await supabase
              .from('hospital_request_inbox')
              .select('request_id')
              .eq('hospital_id', uid)
              .eq('status','accepted');

            let reqIds = Array.isArray(accepted) ? (accepted as any[]).map((r) => r.request_id).filter(Boolean) : [];
            const deliveredReqs = deliveryList.map((d) => d.request_id);
            reqIds = reqIds.filter((rid) => !deliveredReqs.includes(rid));
            activeRequestIdsRef.current = reqIds;
            if (active) setAcceptedRequests(reqIds);

            if (reqIds.length > 0) {
              const { data: riders } = await supabase
                .from('rider_request_inbox')
                .select('id, rider_id, request_id, status, created_at')
                .in('request_id', reqIds)
                .eq('status','pending');
              const list = Array.isArray(riders) ? (riders as any[]) : [];
              const riderIds = Array.from(new Set(list.map((e) => e.rider_id).filter(Boolean)));
              let profiles: any[] = [];
              if (riderIds.length > 0) {
                const { data: profs } = await supabase
                  .from('rider_profiles')
                  .select('user_id, full_name, phone, vehicle_number, latitude, longitude')
                  .in('user_id', riderIds);
                profiles = Array.isArray(profs) ? (profs as any[]) : [];
              }
              const profMap: Record<string, any> = {};
              profiles.forEach((p) => { profMap[p.user_id] = p; });
              const grouped: Record<string, any[]> = {};
              list.forEach((entry) => {
                const rid = entry.request_id;
                if (!grouped[rid]) grouped[rid] = [];
                grouped[rid].push({ ...entry, rider_profiles: profMap[entry.rider_id] || {} });
              });
              if (active) setRiderCandidates(grouped);
            } else if (active) {
              setRiderCandidates({});
            }
          } catch {}
        };

        reloadRef.current = reload;
        await reload();

        deliveryChannel = supabase
          .channel('deliveries_feed')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `hospital_id=eq.${session.user.id}` }, (payload: any) => {
            if (!active) return;
            const row = payload.new as any;
            setDeliveries((prev) => {
              let next = [...prev];
              const idx = row ? next.findIndex((d) => d.id === row.id) : -1;
              if (payload.eventType === 'INSERT' && row) {
                if (idx === -1) {
                  next.unshift(row);
                  fetchNav(row); // Fetch nav for new delivery
                }
                if (row.request_id) {
                  setAcceptedRequests((prevReqs) => prevReqs.filter((rid) => rid !== row.request_id));
                }
              } else if (payload.eventType === 'UPDATE' && row) {
                if (idx !== -1) next[idx] = { ...next[idx], ...row };
                if (row.rider_id) {
                  (async () => {
                    try {
                      const [{ supabase }] = await Promise.all([import('../../../supabase/client')]);
                      const { data: p } = await supabase
                        .from('rider_profiles')
                        .select('user_id, full_name, phone, vehicle_number')
                        .eq('user_id', row.rider_id)
                        .maybeSingle();
                      if (p) setRiderInfo((prev) => ({ ...prev, [row.rider_id]: p }));
                    } catch {}
                  })();
                }
                if (row.request_id && row.status === 'in_transit') {
                  setAcceptedRequests((prevReqs) => prevReqs.filter((rid) => rid !== row.request_id));
                }
              } else if (payload.eventType === 'DELETE' && payload.old) {
                next = next.filter((d) => d.id !== (payload.old as any).id);
              }
              return next;
            });
          })
          .subscribe();

        positionChannel = supabase
          .channel('positions_feed')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rider_positions' }, (payload: any) => {
            if (!active) return;
            const pos = payload.new as any;
            setDeliveries((prev) => prev.map((d) => {
              if (d.id === pos.delivery_id) {
                return { ...d, rider_lat: pos.latitude, rider_lng: pos.longitude };
              }
              return d;
            }));
            if (pos.delivery_id && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
              setRiderPaths((prev) => {
                const path = prev[pos.delivery_id] ? [...prev[pos.delivery_id]] : [];
                path.push([pos.latitude, pos.longitude]);
                return { ...prev, [pos.delivery_id]: path.slice(-500) };
              });
            }
          })
          .subscribe();
          
        waypointsChannel = supabase
          .channel('waypoints_feed')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'request_waypoints' }, (payload: any) => {
            if (!active) return;
            const wp = payload.new as any;
            // Find delivery for this request
            setDeliveries((prev) => {
              const d = prev.find((del) => del.request_id === wp.request_id);
              if (d) fetchNav(d); // Re-fetch nav if a waypoint updates for an active delivery
              return prev;
            });
          })
          .subscribe();

        candidatesChannel = supabase
          .channel('rider_candidates_feed')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_request_inbox' }, (payload: any) => {
            if (!active) return;
            const row = payload.new as any;
            if (!row || !row.request_id) return;
            if (!activeRequestIdsRef.current.includes(row.request_id)) return;
            (async () => {
              let prof: any = {};
              try {
                const [{ supabase }] = await Promise.all([import('../../../supabase/client')]);
                const { data: p } = await supabase
                  .from('rider_profiles')
                  .select('user_id, full_name, phone, vehicle_number, latitude, longitude')
                  .eq('user_id', row.rider_id)
                  .maybeSingle();
                prof = p || {};
              } catch {}
              setRiderCandidates((prev) => {
                const next = { ...prev };
                const list = next[row.request_id] ? [...next[row.request_id]] : [];
                if (payload.eventType === 'INSERT') {
                  if (row.status === 'pending' && !list.find((e: any) => e.id === row.id)) list.unshift({ ...row, rider_profiles: prof });
                } else if (payload.eventType === 'UPDATE') {
                  const idx = list.findIndex((e: any) => e.id === row.id);
                  if (row.status !== 'pending' && idx !== -1) list.splice(idx,1);
                  else if (idx !== -1) list[idx] = { ...list[idx], ...row };
                } else if (payload.eventType === 'DELETE') {
                  const idx = list.findIndex((e: any) => e.id === (payload.old as any)?.id);
                  if (idx !== -1) list.splice(idx,1);
                }
                next[row.request_id] = list;
                return next;
              });
            })();
          })
          .subscribe();
      } catch {
        if (active) setDeliveries([]);
      }
    })();
    return () => {
      active = false;
      reloadRef.current = null;
      activeRequestIdsRef.current = [];
      if (deliveryChannel) deliveryChannel.unsubscribe();
      if (positionChannel) positionChannel.unsubscribe();
      if (waypointsChannel) waypointsChannel.unsubscribe();
      if (candidatesChannel) candidatesChannel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fn = reloadRef.current;
    if (fn) fn();
  }, [refreshTick]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Delivery & Rider Coordination</h2>
        <p className="text-gray-600">Track deliveries and coordinate with riders</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {deliveries.length === 0 ? (
              <div className="text-gray-600">No deliveries in progress</div>
            ) : (
              <div className="space-y-4">
                {deliveries.map((d) => (
                <div key={d.id} className="border-2 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-gray-700" />
                      <div className="text-gray-900">Delivery #{d.id.slice(0,8)} • Request {d.request_id.slice(0,8)}</div>
                    </div>
                    <div className="text-gray-700 capitalize">{d.status.replace('_',' ')}</div>
                  </div>
                  <div className="mt-3 text-gray-600 flex items-center gap-3">
                    <Clock className="w-4 h-4" />
                    <span>{d.created_at ? new Date(d.created_at).toLocaleString() : ''}</span>
                  </div>
                  {d.rider_id && riderInfo[d.rider_id] && (
                    <div className="mt-2 text-gray-700">
                      Rider: {riderInfo[d.rider_id]?.full_name || '—'} • Vehicle: {riderInfo[d.rider_id]?.vehicle_number || '—'} • Phone: {riderInfo[d.rider_id]?.phone || '—'}
                    </div>
                  )}
                  <div className="mt-2 text-gray-700 flex items-center gap-2">
                    <span>Pickup OTP:</span>
                    <span className="font-mono text-lg tracking-widest">{otpByDelivery[d.id] ?? '—'}</span>
                  </div>
                  <div className="mt-2 text-gray-700 flex items-center gap-2">
                    <span>Ride Fare:</span>
                    <span>{routeStatsByDelivery[d.id] ? `₹${routeStatsByDelivery[d.id]!.fareInr.toLocaleString()}` : '—'}</span>
                    <span className="text-gray-400">•</span>
                    <span>{routeStatsByDelivery[d.id] ? `${routeStatsByDelivery[d.id]!.distanceKm.toFixed(1)} km` : '—'}</span>
                  </div>
                  <div className="mt-3">
                    <div className="aspect-[4/3] rounded-lg border border-blue-200 overflow-hidden">
                      <MapContainer style={{ height: '100%', width: '100%' }} center={
                        typeof d.rider_lat === 'number' && typeof d.rider_lng === 'number'
                          ? [d.rider_lat!, d.rider_lng!]
                          : navByDelivery[d.id]?.pickup?.lat && navByDelivery[d.id]?.pickup?.lng
                            ? [navByDelivery[d.id]!.pickup!.lat!, navByDelivery[d.id]!.pickup!.lng!]
                            : [12.9716, 77.5946]
                      } zoom={13}>
                        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {navByDelivery[d.id]?.pickup?.lat && navByDelivery[d.id]?.pickup?.lng && (
                          <Marker position={[navByDelivery[d.id]!.pickup!.lat!, navByDelivery[d.id]!.pickup!.lng!]} icon={L.divIcon({ html: '<div style="font-size:20px;line-height:20px">🏥</div>', iconSize: [24,24], iconAnchor: [12,12] })} zIndexOffset={200} />
                        )}
                        {navByDelivery[d.id]?.drop?.lat && navByDelivery[d.id]?.drop?.lng && (
                          <Marker position={[navByDelivery[d.id]!.drop!.lat!, navByDelivery[d.id]!.drop!.lng!]} icon={L.divIcon({ html: '<div style="font-size:20px;line-height:20px">🎯</div>', iconSize: [24,24], iconAnchor: [12,12] })} zIndexOffset={300} />
                        )}
                        {donorByDelivery[d.id]?.lat && donorByDelivery[d.id]?.lng && (
                          <Marker position={[donorByDelivery[d.id]!.lat!, donorByDelivery[d.id]!.lng!]} icon={L.divIcon({ html: '<div style="font-size:20px;line-height:20px">🩸</div>', iconSize: [24,24], iconAnchor: [12,12] })} zIndexOffset={250} />
                        )}
                        {typeof d.rider_lat === 'number' && typeof d.rider_lng === 'number' && (
                          <>
                            <Marker position={[d.rider_lat!, d.rider_lng!]} icon={L.divIcon({ html: '<div style="font-size:20px;line-height:20px">🛵</div>', iconSize: [24,24], iconAnchor: [12,12] })} zIndexOffset={500} />
                            <CircleMarker center={[d.rider_lat!, d.rider_lng!]} radius={8} color="#7c3aed" fillColor="#7c3aed" fillOpacity={0.3} />
                          </>
                        )}
                        {routeByDelivery[d.id]?.length ? (
                          <Polyline positions={routeByDelivery[d.id]!} pathOptions={{ color: '#2563eb', weight: 6 }} />
                        ) : (
                          navByDelivery[d.id]?.pickup?.lat && navByDelivery[d.id]?.pickup?.lng && navByDelivery[d.id]?.drop?.lat && navByDelivery[d.id]?.drop?.lng && (
                            <Polyline positions={[[navByDelivery[d.id]!.pickup!.lat!, navByDelivery[d.id]!.pickup!.lng!], [navByDelivery[d.id]!.drop!.lat!, navByDelivery[d.id]!.drop!.lng!]]} pathOptions={{ color: '#2563eb', weight: 5 }} />
                          )
                        )}
                        {riderPaths[d.id] && riderPaths[d.id].length >= 2 && (
                          <Polyline positions={riderPaths[d.id]} pathOptions={{ color: '#7c3aed', weight: 6 }} />
                        )}
                        <FitDeliveryMap pickup={navByDelivery[d.id]?.pickup} drop={navByDelivery[d.id]?.drop} donor={donorByDelivery[d.id]} rider={{ lat: d.rider_lat, lng: d.rider_lng }} />
                      </MapContainer>

                    </div>
                  </div>
                  
                  <div className="mt-4 border-t pt-4">
                     <h4 className="text-sm font-medium text-gray-900 mb-2">Route Directions</h4>
                     <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
                        {routeStepsByDelivery[d.id]?.length ? (
                            routeStepsByDelivery[d.id]!.slice(0, 5).map((s, i) => (
                                <div key={i} className="text-xs text-gray-600 flex justify-between">
                                    <span>{s.instruction}</span>
                                    <span>{Math.round(s.distance)}m</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-gray-400 italic">No directions available</div>
                        )}
                     </div>
                  </div>

                </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Nearby Riders</h3>
            {acceptedRequests.length === 0 ? (
              <div className="text-gray-600">No accepted requests</div>
            ) : (
              acceptedRequests.map((reqId) => (
                (riderCandidates[reqId] || []).length === 0 ? null : (
                <div key={reqId} className="mb-4">
                  <div className="text-gray-700 mb-2">Request {reqId.slice(0,8)}</div>
                  <div className="grid grid-cols-2 gap-3">
                      {(riderCandidates[reqId] || []).map((entry: any) => {
                        const prof = entry?.rider_profiles || {};
                        return (
                          <div key={entry.id} className="border rounded p-3">
                            <div className="text-gray-900">{prof.full_name || 'Rider'}</div>
                            <div className="text-gray-600 text-sm">Vehicle: {prof.vehicle_number || 'N/A'}</div>
                            <div className="text-gray-600 text-sm">Phone: {prof.phone || 'N/A'}</div>
                            <div className="text-gray-600 text-sm">Lat/Lng: {prof.latitude ?? '-'}, {prof.longitude ?? '-'}</div>
                            <div className="text-gray-500 text-xs mt-1">Broadcast: {new Date(entry.created_at).toLocaleTimeString()}</div>
                          </div>
                        );
                      })}
                    </div>
                </div>
                )
              ))
            )}
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Live Tracking</h3>
            <div className="aspect-square bg-gray-100 rounded-lg relative overflow-hidden">
              {deliveries.filter((d) => typeof d.rider_lat === 'number' && typeof d.rider_lng === 'number').slice(0,1).map((d) => (
                <div key={d.id} className="absolute inset-0">
                  <div className="absolute w-4 h-4 bg-green-600 rounded-full animate-pulse" style={{ left: '50%', top: '50%' }} />
                </div>
              ))}
              {!deliveries.some((d) => typeof d.rider_lat === 'number') && (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
            <p className="text-gray-600 text-center mt-2">Updates in real-time</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Today's Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">In Progress</span>
                <span className="text-gray-600">{deliveries.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FitDeliveryMap({ pickup, drop, donor, rider }: { pickup?: { lat: number|null; lng: number|null }, drop?: { lat: number|null; lng: number|null }, donor?: { lat: number|null; lng: number|null }, rider: { lat?: number|null; lng?: number|null } }) {
  const map = useMap();
  useEffect(() => {
    const points: Array<[number, number]> = [];
    if (pickup?.lat && pickup?.lng) points.push([pickup.lat!, pickup.lng!]);
    if (drop?.lat && drop?.lng) points.push([drop.lat!, drop.lng!]);
    if (donor?.lat && donor?.lng) points.push([donor.lat!, donor.lng!]);
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, donor?.lat, donor?.lng, map]);
  useEffect(() => {
    if (typeof rider?.lat === 'number' && typeof rider?.lng === 'number') {
      map.panTo(L.latLng(rider.lat!, rider.lng!), { animate: true });
    }
  }, [rider?.lat, rider?.lng, map]);
  return null;
}
