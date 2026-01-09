import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertTriangle, Clock, Phone } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { computeFareInr, getOsrmRoute } from '../../../utils/geo';
import { projectId, publicAnonKey } from '../../../supabase/info';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
});

interface NavData {
  delivery_id: string;
  pickup?: { lat: number | null; lng: number | null; name?: string | null };
  drop?: { lat: number | null; lng: number | null; name?: string | null };
  otp?: string | null;
}

export function NavigationView() {
  const { refreshTick } = useAutoRefresh();
  const [nav, setNav] = useState<NavData | null>(null);
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const posChannelRef = useRef<any>(null);
  const subscribedDeliveryIdRef = useRef<string | null>(null);
  const reloadRef = useRef<null | (() => void)>(null);
  const [riderPath, setRiderPath] = useState<Array<[number, number]>>([]);
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  const [routeSteps, setRouteSteps] = useState<Array<{ name: string; distance: number; instruction: string }>>([]);
  const [routeStats, setRouteStats] = useState<{ distanceKm: number; durationMin: number; fareInr: number } | null>(null);
  const [recalcKey, setRecalcKey] = useState(0);
  const [contact, setContact] = useState<{ hospital?: { name?: string; phone?: string }; patient?: { name?: string; phone?: string } }>({});
  const [donorPos, setDonorPos] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [otpStatus, setOtpStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const lastUpdateRef = useRef<number>(0);

  const isUuid = (value: string | null) => {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
  };

  // Continuous Geolocation Tracking
  useEffect(() => {
    let watchId: number;
    let active = true;

    (async () => {
      if (!('geolocation' in navigator)) return;
      
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session } = await getSessionAndRole();
      if (!session) return;

      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          if (!active) return;
          const { latitude, longitude, accuracy, heading, speed } = pos.coords;
          
          // Update local state immediately
          setRiderPos({ lat: latitude, lng: longitude });
          setRiderPath((prev) => [...prev, [latitude, longitude] as [number, number]].slice(-500));

          // Throttle DB updates to every 5 seconds
          const now = Date.now();
          if (now - lastUpdateRef.current < 5000) return;
          lastUpdateRef.current = now;

          // Update rider_profiles (latest known location)
          await supabase
            .from('rider_profiles')
            .update({ latitude, longitude })
            .eq('user_id', session.user.id);

          // Insert into rider_positions history if we have an active delivery
          if (nav?.delivery_id) {
            await supabase
              .from('rider_positions')
              .insert({
                delivery_id: nav.delivery_id,
                rider_id: session.user.id,
                latitude,
                longitude,
                accuracy
              });
          }
        },
        (err) => console.error('Geo error:', err),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    })();

    return () => {
      active = false;
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [nav?.delivery_id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);

        const load = async () => {
          const { session, role } = await getSessionAndRole();
          if (!session || role !== 'rider') {
            if (active) {
              setNav(null);
              setContact({});
              setDonorPos(null);
            }
            if (posChannelRef.current) posChannelRef.current.unsubscribe();
            posChannelRef.current = null;
            subscribedDeliveryIdRef.current = null;
            return;
          }

          const { data: deliveries } = await supabase
            .from('deliveries')
            .select('id, request_id, status, hospital_id')
            .eq('rider_id', session.user.id)
            .in('status', ['in_transit', 'assigned'])
            .order('created_at', { ascending: false })
            .limit(1);

          const current = Array.isArray(deliveries) && deliveries[0] ? deliveries[0] : null;
          if (!current) {
            if (active) {
              setNav(null);
              setContact({});
              setDonorPos(null);
            }
            if (posChannelRef.current) posChannelRef.current.unsubscribe();
            posChannelRef.current = null;
            subscribedDeliveryIdRef.current = null;
            return;
          }

          const deliveryId = typeof (current as any).id === 'string' ? (current as any).id : null;
          const requestId = typeof (current as any).request_id === 'string' ? (current as any).request_id : null;
          const hospitalId = typeof (current as any).hospital_id === 'string' ? (current as any).hospital_id : null;
          if (!deliveryId || !requestId) return;

          const { data: brRow } = await supabase
            .from('blood_requests')
            .select('patient_id, accepted_by_type, accepted_by_id, patient_latitude, patient_longitude')
            .eq('id', requestId)
            .maybeSingle();

          const { data: navData } = await supabase.rpc('get_delivery_navigation', { p_delivery_id: deliveryId });
          if (navData && active) {
            setNav({
              delivery_id: deliveryId,
              pickup: { lat: (navData as any)?.pickup?.lat ?? null, lng: (navData as any)?.pickup?.lng ?? null },
              drop: { lat: (navData as any)?.drop?.lat ?? null, lng: (navData as any)?.drop?.lng ?? null },
              otp: typeof (navData as any)?.otp === 'string' ? (navData as any).otp : null,
            });
          }

          try {
            const patientId = (brRow as any)?.patient_id as string | undefined;
            const acceptedType = (brRow as any)?.accepted_by_type ?? null;
            const acceptedById = (brRow as any)?.accepted_by_id ?? null;
            const pickupId = acceptedType === 'donor' ? acceptedById : hospitalId;
            const [pickupProfile, pProf] = await Promise.all([
              pickupId
                ? acceptedType === 'donor'
                  ? supabase.from('donor_profiles').select('user_id, full_name, phone').eq('user_id', pickupId as any).maybeSingle()
                  : supabase.from('hospital_profiles').select('user_id, organization_name, admin_contact').eq('user_id', pickupId as any).maybeSingle()
                : Promise.resolve({ data: null } as any),
              patientId
                ? supabase.from('patient_profiles').select('user_id, full_name, emergency_contact').eq('user_id', patientId).maybeSingle()
                : Promise.resolve({ data: null } as any),
            ]);
            const pickData = (pickupProfile as any)?.data || pickupProfile;
            const pData = (pProf as any)?.data || pProf;
            if (active)
              setContact({
                hospital:
                  acceptedType === 'donor'
                    ? { name: pickData?.full_name, phone: (pickData as any)?.phone }
                    : { name: pickData?.organization_name, phone: pickData?.admin_contact },
                patient: { name: pData?.full_name, phone: pData?.emergency_contact },
              });
          } catch {}

          try {
            const acceptedType = (brRow as any)?.accepted_by_type ?? null;
            if (acceptedType === 'donor') {
              const { data: donorWps } = await supabase
                .from('request_waypoints')
                .select('latitude, longitude')
                .eq('request_id', requestId)
                .eq('actor_type', 'donor')
                .order('accuracy', { ascending: true })
                .order('created_at', { ascending: false })
                .limit(1);
              const donorWp = Array.isArray(donorWps) && donorWps[0] ? (donorWps[0] as any) : null;
              if (donorWp && active) setDonorPos({ lat: donorWp.latitude, lng: donorWp.longitude });
            } else if (active) {
              setDonorPos(null);
            }
          } catch {}

          if (subscribedDeliveryIdRef.current !== deliveryId) {
            if (posChannelRef.current) posChannelRef.current.unsubscribe();
            subscribedDeliveryIdRef.current = deliveryId;
            posChannelRef.current = supabase
              .channel(`rider_nav_positions_${deliveryId}`)
              .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'rider_positions', filter: `delivery_id=eq.${deliveryId}` },
                (payload: any) => {
                  if (!active) return;
                  const p = payload.new as any;
                  if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
                    setRiderPos({ lat: p.latitude, lng: p.longitude });
                    setRiderPath((prev) => [...prev, [p.latitude, p.longitude] as [number, number]].slice(-500));
                  }
                },
              )
              .subscribe();
          }
        };

        reloadRef.current = () => {
          void load();
        };

        await load();
      } catch {
        reloadRef.current = null;
      }
    })();
    return () => {
      active = false;
      if (posChannelRef.current) posChannelRef.current.unsubscribe();
      posChannelRef.current = null;
      subscribedDeliveryIdRef.current = null;
      reloadRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (reloadRef.current) reloadRef.current();
  }, [refreshTick]);

  useEffect(() => {
    (async () => {
      const pickLat = typeof nav?.pickup?.lat === 'number' ? nav!.pickup!.lat! : null;
      const pickLng = typeof nav?.pickup?.lng === 'number' ? nav!.pickup!.lng! : null;
      const dropLat = typeof nav?.drop?.lat === 'number' ? nav!.drop!.lat! : null;
      const dropLng = typeof nav?.drop?.lng === 'number' ? nav!.drop!.lng! : null;
      if (pickLat === null || pickLng === null || dropLat === null || dropLng === null) {
        setRouteCoords([]);
        setRouteSteps([]);
        setRouteStats(null);
        return;
      }
      try {
        const route = await getOsrmRoute({ lat: pickLat, lng: pickLng }, { lat: dropLat, lng: dropLng });
        if (!route) throw new Error('route_fetch_failed');
        setRouteCoords(route.coordsLatLng);
        setRouteSteps(route.steps.map((s) => ({ name: '', distance: s.distance, instruction: s.instruction })));
        setRouteStats({ distanceKm: route.distanceKm, durationMin: route.durationMin, fareInr: computeFareInr(route.distanceKm) });
      } catch {
        setRouteCoords([[pickLat, pickLng], [dropLat, dropLng]]);
        setRouteSteps([]);
        const dx = (pickLat - dropLat) ** 2 + (pickLng - dropLng) ** 2;
        if (Number.isFinite(dx)) setRouteStats(null);
      }
    })();
  }, [nav?.pickup?.lat, nav?.pickup?.lng, nav?.drop?.lat, nav?.drop?.lng, recalcKey]);

  const verifyDeliveryOtp = async () => {
    const code = deliveryOtp.trim();
    const deliveryId = nav?.delivery_id ? nav.delivery_id.trim() : null;
    if (!deliveryId || !isUuid(deliveryId) || code.length !== 6) {
      setOtpStatus({ ok: false, message: 'Enter a 6-digit OTP' });
      return;
    }
    try {
      const [{ supabase }] = await Promise.all([import('../../../supabase/client')]);
      const { data, error } = await supabase.rpc('verify_delivery_otp', { p_delivery_id: deliveryId, p_otp: code });
      if (error) {
        const msg = typeof (error as any)?.message === 'string' ? String((error as any).message) : '';
        const needsManual = msg.toLowerCase().includes('no api key found');
        if (!needsManual) {
          setOtpStatus({ ok: false, message: msg || 'OTP verification failed' });
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? null;
        const res = await fetch(`https://${projectId}.supabase.co/rest/v1/rpc/verify_delivery_otp`, {
          method: 'POST',
          headers: {
            apikey: publicAnonKey,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_delivery_id: deliveryId, p_otp: code }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !(body as any)?.ok) {
          const message = typeof (body as any)?.message === 'string' ? (body as any).message : 'OTP verification failed';
          setOtpStatus({ ok: false, message });
          return;
        }
        setOtpStatus({ ok: true, message: 'Delivery OTP verified. Patient can pay now.' });
        return;
      }

      if (!(data as any)?.ok) {
        setOtpStatus({ ok: false, message: 'OTP verification failed' });
        return;
      }

      setOtpStatus({ ok: true, message: 'Delivery OTP verified. Patient can pay now.' });
    } catch {
      setOtpStatus({ ok: false, message: 'OTP verification failed' });
    }
  };

function FitAndFollow({ nav, riderPos, donorPos }: { nav: NavData | null; riderPos: { lat: number; lng: number } | null, donorPos: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (nav && typeof nav.pickup?.lat === 'number' && typeof nav.pickup?.lng === 'number' && typeof nav.drop?.lat === 'number' && typeof nav.drop?.lng === 'number') {
      const pts: Array<[number, number]> = [[nav.pickup.lat!, nav.pickup.lng!], [nav.drop.lat!, nav.drop.lng!]];
      if (donorPos) pts.push([donorPos.lat, donorPos.lng]);
      const bounds = L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [nav, donorPos, map]);
  useEffect(() => {
    if (riderPos) {
      map.panTo(L.latLng(riderPos.lat, riderPos.lng), { animate: true });
    }
  }, [riderPos, map]);
  return null;
}

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Navigation & Routing</h2>
        <p className="text-gray-600">GPS navigation with live tracking</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Map - 2/3 */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Live Navigation</h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition" onClick={() => setRecalcKey((k) => k + 1)}>Recalculate Route</button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Emergency Route</button>
              </div>
            </div>

            {/* Real Map */}
            <div className="aspect-[4/3] rounded-lg border border-blue-200 mb-4 overflow-hidden">
              {nav ? (
                <MapContainer
                  style={{ height: '100%', width: '100%' }}
                  center={
                    riderPos
                      ? [riderPos.lat, riderPos.lng]
                      : typeof nav?.pickup?.lat === 'number' && typeof nav?.pickup?.lng === 'number'
                        ? [nav.pickup.lat!, nav.pickup.lng!]
                        : typeof nav?.drop?.lat === 'number' && typeof nav?.drop?.lng === 'number'
                          ? [nav.drop.lat!, nav.drop.lng!]
                          : [12.9716, 77.5946]
                  }
                  zoom={13}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {typeof nav?.pickup?.lat === 'number' && typeof nav?.pickup?.lng === 'number' && (
                    <Marker
                      position={[nav.pickup.lat!, nav.pickup.lng!]}
                      icon={L.divIcon({
                        html: '<div style="font-size:20px;line-height:20px">🏥</div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                      })}
                      zIndexOffset={200}
                    />
                  )}
                  {typeof nav?.drop?.lat === 'number' && typeof nav?.drop?.lng === 'number' && (
                    <Marker
                      position={[nav.drop.lat!, nav.drop.lng!]}
                      icon={L.divIcon({
                        html: '<div style="font-size:20px;line-height:20px">🎯</div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                      })}
                      zIndexOffset={300}
                    />
                  )}
                  {donorPos && (
                    <Marker
                      position={[donorPos.lat, donorPos.lng]}
                      icon={L.divIcon({
                        html: '<div style="font-size:20px;line-height:20px">🩸</div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                      })}
                      zIndexOffset={250}
                    />
                  )}
                  {riderPos && (
                    <>
                      <Marker
                        position={[riderPos.lat, riderPos.lng]}
                        icon={L.divIcon({
                          html: '<div style="font-size:20px;line-height:20px">🛵</div>',
                          iconSize: [24, 24],
                          iconAnchor: [12, 12],
                        })}
                        zIndexOffset={500}
                      />
                      <CircleMarker center={[riderPos.lat, riderPos.lng]} radius={8} color="#7c3aed" fillColor="#7c3aed" fillOpacity={0.3} />
                    </>
                  )}
                  {routeCoords.length >= 2 && (
                    <Polyline positions={routeCoords} pathOptions={{ color: '#2563eb', weight: 6 }} />
                  )}
                  {riderPath.length >= 2 && (
                    <Polyline positions={riderPath} pathOptions={{ color: '#7c3aed', weight: 6 }} />
                  )}
                  <FitAndFollow nav={nav} riderPos={riderPos} donorPos={donorPos} />
                </MapContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
                  <div className="text-center">
                    <MapPin className="w-24 h-24 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Waiting for active delivery</p>
                  </div>
                </div>
              )}
            </div>

            {/* Route Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <div className="text-gray-900">{contact.hospital?.name || 'Pickup'}</div>
                <p className="text-gray-600">Pickup</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <div className="text-gray-900">{contact.patient?.name || 'Drop'}</div>
                <p className="text-gray-600">Drop</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <div className="text-gray-900">{nav?.otp || '—'}</div>
                <p className="text-gray-600">Pickup OTP</p>
              </div>
              <div className="p-3 bg-violet-50 rounded-lg text-center">
                <div className="text-gray-900">{riderPos ? `${riderPos.lat.toFixed(5)}, ${riderPos.lng.toFixed(5)}` : '—'}</div>
                <p className="text-gray-600">Tracking</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-gray-900">{routeStats ? `${routeStats.distanceKm.toFixed(1)} km` : '—'}</div>
                <p className="text-gray-600">Distance</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-gray-900">{routeStats ? `₹${routeStats.fareInr.toLocaleString()}` : '—'}</div>
                <p className="text-gray-600">Fare</p>
              </div>
            </div>
          </div>

          {/* Turn-by-Turn */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
            <h3 className="text-gray-900 mb-4">Turn-by-Turn Directions</h3>
            <div className="space-y-2">
              {routeSteps.length === 0 ? (
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="text-gray-600">Directions will appear here</span>
                </div>
              ) : (
                routeSteps.slice(0, 12).map((s, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-gray-50 flex items-center justify-between">
                    <span className="text-gray-700">{s.instruction || s.name || 'Continue'}</span>
                    <span className="text-gray-500 text-sm">{Math.round(s.distance)} m</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - 1/3 */}
        <div className="col-span-1 space-y-6">
          {/* Current Delivery */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Current Delivery</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-900">{nav?.delivery_id ? `Delivery #${(nav.delivery_id || '').slice(0,8)}` : 'No active delivery'}</div>
                <div className="text-gray-600 text-sm">Pickup: {contact.hospital?.name || '—'}</div>
                <div className="text-gray-600 text-sm">Drop: {contact.patient?.name || '—'}</div>
              </div>
            </div>
          </div>

          {/* Traffic Alert */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center gap-2 text-orange-700 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <h3>Traffic Alert</h3>
            </div>
            <p className="text-gray-700 mb-3">No data available yet</p>
            <button className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">View Alternate Route</button>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Quick Contact</h3>
            <div className="space-y-2">
              <a href={contact.hospital?.phone ? `tel:${contact.hospital.phone}` : undefined} className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                Call Hospital
              </a>
              <a href={contact.patient?.phone ? `tel:${contact.patient.phone}` : undefined} className="w-full py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                Call Patient
              </a>
            </div>
          </div>

          {/* Offline Fallback */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-6">
            <h3 className="text-gray-900 mb-2">Offline Mode</h3>
            <p className="text-gray-600 mb-4">Route cached for offline navigation</p>
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>Offline route available</span>
            </div>
          </div>

          {/* ETA Updates */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">ETA Updates</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Original ETA</span>
                <span className="text-gray-600">{routeStats ? `${Math.round(routeStats.durationMin)} min` : '—'}</span>
              </div>
              <div className="flex justify-between p-2 bg-green-50 rounded">
                <span className="text-green-600">Current ETA</span>
                <span className="text-gray-600">{routeStats ? `${Math.round(routeStats.durationMin)} min` : '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Delivery OTP</h3>
            <div className="space-y-3">
              <input
                value={deliveryOtp}
                onChange={(e) => {
                  setDeliveryOtp(e.target.value);
                  if (otpStatus) setOtpStatus(null);
                }}
                inputMode="numeric"
                placeholder="Enter 6-digit OTP"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={verifyDeliveryOtp}
                disabled={!nav?.delivery_id}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
              >
                Verify OTP
              </button>
              {otpStatus && (
                <div className={`text-sm ${otpStatus.ok ? 'text-green-700' : 'text-red-700'}`}>{otpStatus.message}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
