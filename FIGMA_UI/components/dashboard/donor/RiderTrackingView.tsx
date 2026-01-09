import { useEffect, useState } from 'react';
import { Truck, MapPin, Thermometer, CheckCircle, Clock, Phone, AlertTriangle, Heart, Package, Navigation } from 'lucide-react';
import { BackButton } from '../navigation/BackButton';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { DonorDashboardView } from '../../DonorDashboard';

interface RiderTrackingViewProps {
  onNavigate?: (view: DonorDashboardView) => void;
}

interface RiderDelivery {
  orderId: string | null;
  riderName: string | null;
  riderPhone: string | null;
  bloodType: string | null;
  units: number | null;
  pickupTime: string | null;
  estimatedDelivery: string | null;
  currentTemp: string | null;
  distance: string | null;
  status: string | null;
  patientName: string | null;
  hospitalName: string | null;
}

interface RiderTrackingViewWithDataProps extends RiderTrackingViewProps {
  delivery?: RiderDelivery | null;
}

interface NavData {
  delivery_id: string;
  pickup?: { lat: number | null; lng: number | null };
  drop?: { lat: number | null; lng: number | null };
  otp?: string | null;
}

export function RiderTrackingView({ onNavigate, delivery }: RiderTrackingViewWithDataProps) {
  const [localDelivery, setLocalDelivery] = useState<RiderDelivery | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: string | null; etaMins: string | null } | null>(null);
  const [nav, setNav] = useState<NavData | null>(null);
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [riderPath, setRiderPath] = useState<Array<[number, number]>>([]);
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  const [routeSteps, setRouteSteps] = useState<Array<{ instruction: string; distance: number }>>([]);
  const { refreshTick } = useAutoRefresh();
  const hasDelivery = !!(delivery || localDelivery);

  const trackingSteps = hasDelivery
    ? [
        { label: 'Blood Collected', status: 'completed' as const, icon: Package },
        { label: 'Picked Up', status: 'completed' as const, icon: CheckCircle },
        { label: 'In Transit', status: 'active' as const, icon: Truck },
        { label: 'Delivered', status: 'pending' as const, icon: MapPin },
      ]
    : [];

  useEffect(() => {
    let active = true;
    let deliveryChannel: any = null;
    let positionChannel: any = null;
    let currentDeliveryId: string | null = null;
    let currentRiderId: string | null = null;

    const detachPositionChannel = () => {
      try {
        if (positionChannel) positionChannel.unsubscribe();
      } catch {}
      positionChannel = null;
      currentDeliveryId = null;
      currentRiderId = null;
    };

    const fetchRoute = async (pickup: { lat: number; lng: number }, drop: { lat: number; lng: number }) => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson&steps=true`;
        const resp = await fetch(url);
        if (!resp.ok) return { distanceKm: null, etaMins: null };
        const json = await resp.json();
        const route = ((json.routes || [])[0] || {});
        const distanceKm = typeof route.distance === 'number' ? (route.distance / 1000).toFixed(1) : null;
        const etaMins = typeof route.duration === 'number' ? Math.round(route.duration / 60).toString() : null;
        const coords = (route.geometry || {}).coordinates || [];
        const legs = route.legs || [];
        const steps: Array<{ instruction: string; distance: number }> = [];
        legs.forEach((leg: any) => {
          (leg.steps || []).forEach((s: any) => {
            steps.push({ instruction: s.maneuver?.instruction || s.name || 'Continue', distance: s.distance || 0 });
          });
        });
        if (active) {
          setRouteCoords(coords.map((c: any) => [c[1], c[0]]));
          setRouteSteps(steps);
        }
        return { distanceKm, etaMins };
      } catch {
        return { distanceKm: null, etaMins: null };
      }
    };

    const loadDeliveryDetails = async (supabase: any, current: any) => {
      const { data: navData } = await supabase.rpc('get_delivery_navigation', { p_delivery_id: current.id });
      if (active) {
        setNav(navData || { delivery_id: current.id });
        setRouteCoords([]);
        setRouteSteps([]);
        setRouteInfo(null);
      }

      const [{ data: donorTracking }, { data: br }, riderProf, { data: lastPosRows }] = await Promise.all([
        supabase.rpc('get_donor_delivery_tracking', { p_delivery_id: current.id }),
        supabase
          .from('blood_requests')
          .select('blood_group, quantity_units, patient_id')
          .eq('id', current.request_id)
          .maybeSingle(),
        current.rider_id
          ? supabase.from('rider_profiles').select('full_name, phone, latitude, longitude').eq('user_id', current.rider_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase
          .from('rider_positions')
          .select('latitude, longitude')
          .eq('delivery_id', current.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const trackingRider = (donorTracking as any)?.rider || null;
      const trackingPatient = (donorTracking as any)?.patient || null;

      const rData = (riderProf as any)?.data || riderProf;
      const lastRow = Array.isArray(lastPosRows) && lastPosRows[0] ? (lastPosRows[0] as any) : null;
      const fallbackLat = typeof rData?.latitude === 'number' ? rData.latitude : null;
      const fallbackLng = typeof rData?.longitude === 'number' ? rData.longitude : null;
      const rpLat = typeof lastRow?.latitude === 'number' ? lastRow.latitude : fallbackLat;
      const rpLng = typeof lastRow?.longitude === 'number' ? lastRow.longitude : fallbackLng;
      if (active && typeof rpLat === 'number' && typeof rpLng === 'number') {
        setRiderPos({ lat: rpLat, lng: rpLng });
        setRiderPath([[rpLat, rpLng]]);
      }

      let computedRoute: { distanceKm: string | null; etaMins: string | null } = { distanceKm: null, etaMins: null };
      const pickLat = typeof (navData as any)?.pickup?.lat === 'number' ? (navData as any).pickup.lat : null;
      const pickLng = typeof (navData as any)?.pickup?.lng === 'number' ? (navData as any).pickup.lng : null;
      const dropLat = typeof (navData as any)?.drop?.lat === 'number' ? (navData as any).drop.lat : null;
      const dropLng = typeof (navData as any)?.drop?.lng === 'number' ? (navData as any).drop.lng : null;
      if (pickLat !== null && pickLng !== null && dropLat !== null && dropLng !== null) {
        computedRoute = await fetchRoute({ lat: pickLat, lng: pickLng }, { lat: dropLat, lng: dropLng });
        if (active) setRouteInfo(computedRoute);
      }

      if (active) {
        setLocalDelivery({
          orderId: current.id,
          riderName: trackingRider?.name ?? rData?.full_name ?? null,
          riderPhone: trackingRider?.phone ?? rData?.phone ?? null,
          bloodType: (donorTracking as any)?.blood_group ?? (br as any)?.blood_group ?? null,
          units: (donorTracking as any)?.quantity_units ?? (br as any)?.quantity_units ?? null,
          pickupTime: null,
          estimatedDelivery: computedRoute.etaMins ? `${computedRoute.etaMins} mins` : null,
          currentTemp: null,
          distance: computedRoute.distanceKm ? `${computedRoute.distanceKm} km` : null,
          status: current.status ?? null,
          patientName: trackingPatient?.name ?? null,
          hospitalName: 'Patient Location',
        });
      }
    };

    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'donor') return;

        const { data: deliveries } = await supabase
          .from('deliveries')
          .select('id, request_id, status, rider_id')
          .eq('hospital_id', session.user.id)
          .in('status', ['assigned', 'in_transit'])
          .order('created_at', { ascending: false })
          .limit(1);

        const current = Array.isArray(deliveries) && deliveries[0] ? deliveries[0] : null;
        if (current && active) {
          await loadDeliveryDetails(supabase, current);
          currentDeliveryId = current.id;
          currentRiderId = current.rider_id ?? null;
        }

        if (current && active) {
          positionChannel = supabase
            .channel(`donor_rider_positions_${current.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rider_positions', filter: `delivery_id=eq.${current.id}` }, (payload: any) => {
              if (!active) return;
              const p = payload.new as any;
              if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
                setRiderPos({ lat: p.latitude, lng: p.longitude });
                setRiderPath((prev) => [...prev, [p.latitude, p.longitude] as [number, number]].slice(-500));
              }
            })
            .subscribe();
        }

        deliveryChannel = supabase
          .channel('donor_deliveries_feed')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `hospital_id=eq.${session.user.id}` }, async (payload: any) => {
            if (!active) return;
            const row = payload.new as any;
            if (!row?.id) return;
            if (!['assigned', 'in_transit'].includes(row.status)) return;
            if (currentDeliveryId === row.id) {
              setLocalDelivery((prev) => {
                if (!prev) return prev;
                const next = { ...prev, status: row.status ?? prev.status };
                return next;
              });
              if ((row.rider_id ?? null) !== currentRiderId) {
                await loadDeliveryDetails(supabase, row);
                currentRiderId = row.rider_id ?? null;
              }
              return;
            }
            detachPositionChannel();
            setNav(null);
            setRiderPos(null);
            setRiderPath([]);
            setRouteCoords([]);
            setRouteSteps([]);
            setRouteInfo(null);
            await loadDeliveryDetails(supabase, row);
            currentDeliveryId = row.id;
            currentRiderId = row.rider_id ?? null;
            positionChannel = supabase
              .channel(`donor_rider_positions_${row.id}`)
              .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rider_positions', filter: `delivery_id=eq.${row.id}` }, (posPayload: any) => {
                if (!active) return;
                const p = posPayload.new as any;
                if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
                  setRiderPos({ lat: p.latitude, lng: p.longitude });
                  setRiderPath((prev) => [...prev, [p.latitude, p.longitude] as [number, number]].slice(-500));
                }
              })
              .subscribe();
          })
          .subscribe();
      } catch {}
    })();

    return () => {
      active = false;
      try {
        if (deliveryChannel) deliveryChannel.unsubscribe();
      } catch {}
      detachPositionChannel();
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const deliveryId = delivery?.orderId ?? localDelivery?.orderId ?? null;
      if (!deliveryId) return;
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'donor') return;

        const [{ data: navData }, { data: deliveryRow }, { data: lastPosRows }] = await Promise.all([
          supabase.rpc('get_delivery_navigation', { p_delivery_id: deliveryId }),
          supabase.from('deliveries').select('status').eq('id', deliveryId).maybeSingle(),
          supabase
            .from('rider_positions')
            .select('latitude, longitude')
            .eq('delivery_id', deliveryId)
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        if (!active) return;

        setNav(navData || { delivery_id: deliveryId });

        const status = typeof (deliveryRow as any)?.status === 'string' ? (deliveryRow as any).status : null;
        if (status) {
          setLocalDelivery((prev) => (prev ? { ...prev, status } : prev));
        }

        const lastRow = Array.isArray(lastPosRows) && lastPosRows[0] ? (lastPosRows[0] as any) : null;
        const rpLat = typeof lastRow?.latitude === 'number' ? lastRow.latitude : null;
        const rpLng = typeof lastRow?.longitude === 'number' ? lastRow.longitude : null;
        if (typeof rpLat === 'number' && typeof rpLng === 'number') {
          setRiderPos({ lat: rpLat, lng: rpLng });
          setRiderPath((prev) => {
            const last = prev.length > 0 ? prev[prev.length - 1] : null;
            if (last && last[0] === rpLat && last[1] === rpLng) return prev;
            return [...prev, [rpLat, rpLng] as [number, number]].slice(-500);
          });
        }

        const pickLat = typeof (navData as any)?.pickup?.lat === 'number' ? (navData as any).pickup.lat : null;
        const pickLng = typeof (navData as any)?.pickup?.lng === 'number' ? (navData as any).pickup.lng : null;
        const dropLat = typeof (navData as any)?.drop?.lat === 'number' ? (navData as any).drop.lat : null;
        const dropLng = typeof (navData as any)?.drop?.lng === 'number' ? (navData as any).drop.lng : null;
        if (pickLat !== null && pickLng !== null && dropLat !== null && dropLng !== null) {
          const url = `https://router.project-osrm.org/route/v1/driving/${pickLng},${pickLat};${dropLng},${dropLat}?overview=full&geometries=geojson&steps=true`;
          const resp = await fetch(url);
          if (!resp.ok) return;
          const json = await resp.json();
          const route = ((json.routes || [])[0] || {});
          const distanceKm = typeof route.distance === 'number' ? (route.distance / 1000).toFixed(1) : null;
          const etaMins = typeof route.duration === 'number' ? Math.round(route.duration / 60).toString() : null;
          const coords = (route.geometry || {}).coordinates || [];
          const legs = route.legs || [];
          const steps: Array<{ instruction: string; distance: number }> = [];
          legs.forEach((leg: any) => {
            (leg.steps || []).forEach((s: any) => {
              steps.push({ instruction: s.maneuver?.instruction || s.name || 'Continue', distance: s.distance || 0 });
            });
          });
          if (!active) return;
          setRouteCoords(coords.map((c: any) => [c[1], c[0]]));
          setRouteSteps(steps);
          setRouteInfo({ distanceKm, etaMins });
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [delivery?.orderId, localDelivery?.orderId, refreshTick]);

  const pickLat = typeof nav?.pickup?.lat === 'number' ? nav!.pickup!.lat! : null;
  const pickLng = typeof nav?.pickup?.lng === 'number' ? nav!.pickup!.lng! : null;
  const dropLat = typeof nav?.drop?.lat === 'number' ? nav!.drop!.lat! : null;
  const dropLng = typeof nav?.drop?.lng === 'number' ? nav!.drop!.lng! : null;
  const showMap =
    (typeof pickLat === 'number' && typeof pickLng === 'number') ||
    (typeof dropLat === 'number' && typeof dropLng === 'number') ||
    (typeof riderPos?.lat === 'number' && typeof riderPos?.lng === 'number');

  const center: [number, number] =
    typeof riderPos?.lat === 'number' && typeof riderPos?.lng === 'number'
      ? [riderPos.lat, riderPos.lng]
      : typeof pickLat === 'number' && typeof pickLng === 'number'
        ? [pickLat, pickLng]
        : typeof dropLat === 'number' && typeof dropLng === 'number'
          ? [dropLat, dropLng]
          : [12.9716, 77.5946];

  return (
    <div className="p-8">
      {/* Navigation */}
      <BackButton onClick={() => onNavigate?.('home')} />
      <Breadcrumbs items={[
        { label: 'Home', onClick: () => onNavigate?.('home') },
        { label: 'Rider Tracking' }
      ]} />

      {/* Emotional Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8 mb-8 border border-green-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-gray-900 mb-1">
              {hasDelivery ? 'Your Donation is On The Way' : 'Delivery Tracking'}
            </h1>
            <p className="text-gray-600">
              {hasDelivery
                ? 'Thank you for saving a life today. Track your blood donation in real-time.'
                : 'When a donation is being transported, you will be able to track its journey here.'}
            </p>
          </div>
        </div>
        <div className="bg-white/50 backdrop-blur rounded-lg p-4 inline-block">
          {hasDelivery && (delivery || localDelivery)?.orderId ? (
            <span className="text-green-700">
              Order ID: <strong>{(delivery || localDelivery)?.orderId}</strong>
            </span>
          ) : (
            <span className="text-green-700">
              There is no active delivery to track right now.
            </span>
          )}
        </div>
      </div>

      {/* Live Map Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
        <div className="relative h-96 bg-gradient-to-br from-blue-100 to-violet-100">
          {showMap ? (
            <MapContainer style={{ height: '100%', width: '100%' }} center={center} zoom={13}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {typeof pickLat === 'number' && typeof pickLng === 'number' && (
                <Marker position={[pickLat, pickLng]} icon={L.divIcon({ html: '<div style="font-size:20px;line-height:20px">🩸</div>', iconSize: [24, 24], iconAnchor: [12, 12] })} zIndexOffset={200} />
              )}
              {typeof dropLat === 'number' && typeof dropLng === 'number' && (
                <Marker position={[dropLat, dropLng]} icon={L.divIcon({ html: '<div style="font-size:20px;line-height:20px">🎯</div>', iconSize: [24, 24], iconAnchor: [12, 12] })} zIndexOffset={300} />
              )}
              {typeof riderPos?.lat === 'number' && typeof riderPos?.lng === 'number' && (
                <>
                  <Marker position={[riderPos.lat, riderPos.lng]} icon={L.divIcon({ html: '<div style="font-size:20px;line-height:20px">🛵</div>', iconSize: [24, 24], iconAnchor: [12, 12] })} zIndexOffset={500} />
                  <CircleMarker center={[riderPos.lat, riderPos.lng]} radius={8} color="#7c3aed" fillColor="#7c3aed" fillOpacity={0.3} />
                </>
              )}
              {routeCoords.length >= 2 ? (
                <Polyline positions={routeCoords} pathOptions={{ color: '#2563eb', weight: 6 }} />
              ) : (
                typeof pickLat === 'number' &&
                typeof pickLng === 'number' &&
                typeof dropLat === 'number' &&
                typeof dropLng === 'number' && (
                  <Polyline positions={[[pickLat, pickLng], [dropLat, dropLng]]} pathOptions={{ color: '#2563eb', weight: 5 }} />
                )
              )}
              {riderPath.length >= 2 && <Polyline positions={riderPath} pathOptions={{ color: '#7c3aed', weight: 6 }} />}
              <FitDonorTrackingMap pickup={nav?.pickup} drop={nav?.drop} rider={riderPos} />
            </MapContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Navigation className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
                <div className="text-gray-900 mb-2">{hasDelivery ? 'Live Tracking Active' : 'Tracking will appear here'}</div>
                <div className="text-gray-600">
                  {hasDelivery && (delivery || localDelivery)?.distance ? `Rider is ${(delivery || localDelivery)?.distance} away` : 'Once a delivery starts, you will see its live progress.'}
                </div>
              </div>
            </div>
          )}

          <div className="absolute top-4 left-4 bg-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-gray-600">ETA</div>
                <div className="text-gray-900">{hasDelivery && (delivery || localDelivery)?.estimatedDelivery ? (delivery || localDelivery)?.estimatedDelivery : 'Not available'}</div>
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 bg-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <Thermometer className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-gray-600">Cold Chain</div>
                <div className="text-green-600">{hasDelivery && delivery?.currentTemp ? delivery.currentTemp : 'Not available'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Delivery Info */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-gray-900 mb-6">Delivery Progress</h3>
            
            {/* Timeline */}
            <div className="space-y-4">
              {hasDelivery && trackingSteps.length > 0 ? (
                trackingSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex items-center gap-4">
                      <div
                        className={`
                      w-12 h-12 rounded-xl flex items-center justify-center
                      ${step.status === 'completed' ? 'bg-green-100' :
                          step.status === 'active' ? 'bg-blue-100' :
                          'bg-gray-100'}
                    `}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            step.status === 'completed'
                              ? 'text-green-600'
                              : step.status === 'active'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div
                          className={`${
                            step.status === 'completed' || step.status === 'active'
                              ? 'text-gray-900'
                              : 'text-gray-500'
                          }`}
                        >
                          {step.label}
                        </div>
                      </div>
                      {step.status === 'completed' && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                      {step.status === 'active' && (
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
                  No active delivery timeline to show yet. When a donation is in transit,
                  its progress will appear here.
                </div>
              )}
            </div>

            {/* Rider Info */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-gray-900 mb-4">Rider Details</h4>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 mb-1">Assigned Rider</div>
                  <div className="text-gray-900">
                    {hasDelivery && (delivery || localDelivery)?.riderName ? (delivery || localDelivery)?.riderName : 'No rider assigned yet'}
                  </div>
                </div>
                {hasDelivery && (delivery || localDelivery)?.riderPhone ? (
                  <button
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                    onClick={() => {
                      const phone = (delivery || localDelivery)?.riderPhone;
                      if (phone) window.location.href = `tel:${phone}`;
                    }}
                  >
                    <Phone className="w-4 h-4" />
                    Contact Rider
                  </button>
                ) : (
                  <div className="text-gray-500 text-sm">
                    Rider contact details will appear when a delivery is active.
                  </div>
                )}
              </div>
            </div>
            {routeSteps.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-gray-900 mb-4">Route Directions</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
                  {routeSteps.slice(0, 5).map((s, i) => (
                    <div key={i} className="text-xs text-gray-600 flex justify-between">
                      <span>{s.instruction}</span>
                      <span>{Math.round(s.distance)}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Info */}
        <div className="space-y-6">
          {/* Donation Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h4 className="text-gray-900 mb-4">Donation Details</h4>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">Blood Type</span>
                <div className="text-gray-900">
                  {hasDelivery && (delivery || localDelivery)?.bloodType ? (delivery || localDelivery)?.bloodType : 'Not available'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Units</span>
                <div className="text-gray-900">
                  {hasDelivery && (delivery || localDelivery)?.units != null ? `${(delivery || localDelivery)?.units} units` : 'Not available'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Patient</span>
                <div className="text-gray-900">
                  {hasDelivery && (delivery || localDelivery)?.patientName ? (delivery || localDelivery)?.patientName : 'Not assigned yet'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Destination</span>
                <div className="text-gray-900">
                  {hasDelivery && (delivery || localDelivery)?.hospitalName ? (delivery || localDelivery)?.hospitalName : 'Not assigned yet'}
                </div>
              </div>
            </div>
          </div>

          {/* Cold Chain Status */}
          <div className="bg-green-50 rounded-xl border border-green-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-green-900">Cold Chain</div>
                <div className="text-green-600">
                  {hasDelivery ? 'Optimal' : 'Not available'}
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Current Temp:</span>
                <strong className="text-green-900">
                  {hasDelivery && (delivery || localDelivery)?.currentTemp ? (delivery || localDelivery)?.currentTemp : 'Not available'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Safe Range:</span>
                <strong className="text-green-900">2-6°C</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Status:</span>
                <strong className="text-green-900">
                  {hasDelivery ? 'Compliant ✓' : 'Not available'}
                </strong>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div className="text-red-900">Emergency Support</div>
            </div>
            <p className="text-red-700 text-sm mb-4">
              Report any issues with the delivery immediately
            </p>
            <button className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              Report Issue
            </button>
          </div>
        </div>
      </div>

      {/* Impact Message */}
      <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl p-6 border border-violet-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h4 className="text-gray-900 mb-1">You're Making a Difference</h4>
            <p className="text-gray-600">
              {hasDelivery && (delivery || localDelivery)?.patientName && (delivery || localDelivery)?.hospitalName && (delivery || localDelivery)?.estimatedDelivery
                ? `Your donation will reach ${(delivery || localDelivery)?.patientName} at ${(delivery || localDelivery)?.hospitalName} by ${(delivery || localDelivery)?.estimatedDelivery}.`
                : 'Once a delivery is active, you will see who your donation is helping and when it is expected to arrive.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FitDonorTrackingMap({
  pickup,
  drop,
  rider,
}: {
  pickup?: { lat: number | null; lng: number | null };
  drop?: { lat: number | null; lng: number | null };
  rider: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    const points: Array<[number, number]> = [];
    if (typeof pickup?.lat === 'number' && typeof pickup?.lng === 'number') points.push([pickup.lat, pickup.lng]);
    if (typeof drop?.lat === 'number' && typeof drop?.lng === 'number') points.push([drop.lat, drop.lng]);
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, map]);
  useEffect(() => {
    if (typeof rider?.lat === 'number' && typeof rider?.lng === 'number') {
      map.panTo(L.latLng(rider.lat, rider.lng), { animate: true });
    }
  }, [rider?.lat, rider?.lng, map]);
  return null;
}
