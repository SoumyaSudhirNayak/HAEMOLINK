import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Circle, Package, Bike, MapPin, Clock, Copy, Phone } from 'lucide-react';
import { listPatientBloodRequests } from '../../../services/patientRequests';
import { supabase } from '../../../supabase/client';
import { projectId, publicAnonKey } from '../../../supabase/info';
import { computeFareInr, getOsrmRoute } from '../../../utils/geo';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icons
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
});

const MarkerAny = Marker as any;

interface PatientBloodRequestItem {
  id: string;
  status: string | null;
  component: string | null;
  units_required: number | null;
  blood_group: string | null;
  urgency: string | null;
  hospital_preference?: string | null;
  created_at: string | null;
}

interface TrackingData {
  delivery_id: string;
  status: string;
  rider: {
    name: string;
    phone: string;
    vehicle_number: string;
    vehicle_type: string;
    lat: number | null;
    lng: number | null;
  } | null;
  pickup: { lat: number; lng: number };
  drop: { lat: number; lng: number };
  otp: string;
  distance_km?: number | null;
  fare_amount?: number | null;
  currency?: string | null;
  otp_verified?: boolean | null;
  payment_status?: string | null;
}

export function OrderTrackingView() {
  const [requests, setRequests] = useState<PatientBloodRequestItem[] | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  const [routeSteps, setRouteSteps] = useState<Array<{ instruction: string; distance: number }>>([]);
  const [routeStats, setRouteStats] = useState<{ distanceKm: number; durationMin: number; fareInr: number } | null>(null);
  const [payStatus, setPayStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [upiVpa, setUpiVpa] = useState<string>('');
  const [upiPayeeName, setUpiPayeeName] = useState<string>('HAEMOLINK');
  const [showUpiQr, setShowUpiQr] = useState<boolean>(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const trackingArgKeyRef = useRef<'p_request_id' | 'request_id' | 'id' | 'p_id'>('p_request_id');
  const nextTrackingRetryAtRef = useRef<number>(0);
  const { refreshTick } = useAutoRefresh();

  const isUuid = (value: string | null) => {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
  };

  const fetchTracking = useCallback(async (requestId: string) => {
    const normalizedRequestId = requestId.trim();
    if (!isUuid(normalizedRequestId)) return null;
    const now = Date.now();
    if (now < nextTrackingRetryAtRef.current) return null;

    const argKeys: Array<'p_request_id' | 'request_id' | 'id' | 'p_id'> = [
      trackingArgKeyRef.current,
      'p_request_id',
      'request_id',
      'id',
      'p_id',
    ];
    const uniqueKeys = Array.from(new Set(argKeys));

    const trySupabaseRpc = async (argKey: (typeof uniqueKeys)[number]) => {
      const { data, error } = await supabase.rpc('get_patient_tracking', { [argKey]: normalizedRequestId } as any);
      if (error) {
        throw error;
      }
      trackingArgKeyRef.current = argKey;
      return data as any;
    };

    let lastErr: any = null;
    for (const argKey of uniqueKeys) {
      try {
        return await trySupabaseRpc(argKey);
      } catch (e: any) {
        lastErr = e;
        const msg = typeof e?.message === 'string' ? e.message : '';
        const code = typeof e?.code === 'string' ? e.code : '';
        const shouldTryOtherKey =
          code === 'PGRST202' ||
          msg.toLowerCase().includes('could not find the function') ||
          msg.toLowerCase().includes('function public.get_patient_tracking') ||
          msg.toLowerCase().includes('missing required parameter') ||
          msg.toLowerCase().includes('invalid parameters');
        if (!shouldTryOtherKey) break;
      }
    }

    const msg = typeof lastErr?.message === 'string' ? lastErr.message : '';
    const shouldTryRestRpc = msg.toLowerCase().includes('no api key found') || msg.toLowerCase().includes('failed to fetch');
    if (shouldTryRestRpc) {
      for (const argKey of uniqueKeys) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token ?? null;
          const res = await fetch(`https://${projectId}.supabase.co/rest/v1/rpc/get_patient_tracking`, {
            method: 'POST',
            headers: {
              apikey: publicAnonKey,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ [argKey]: normalizedRequestId }),
          });

          const body = await res.json().catch(() => null);
          if (!res.ok) {
            const message = typeof (body as any)?.message === 'string' ? (body as any).message : `Tracking RPC failed (${res.status})`;
            throw new Error(message);
          }
          trackingArgKeyRef.current = argKey;
          return body as any;
        } catch (e: any) {
          lastErr = e;
        }
      }
    }

    nextTrackingRetryAtRef.current = Date.now() + 15000;
    console.error('get_patient_tracking failed', lastErr);
    return null;
  }, []);

  const fetchRoute = useCallback(async (data: TrackingData) => {
    const pLat = data.pickup?.lat;
    const pLng = data.pickup?.lng;
    const dLat = data.drop?.lat;
    const dLng = data.drop?.lng;

    const isValid = (v: any) => (typeof v === 'number') || (typeof v === 'string' && !isNaN(parseFloat(v)));
    if (!isValid(pLat) || !isValid(pLng) || !isValid(dLat) || !isValid(dLng)) {
      setRouteStats(null);
      return;
    }

    try {
      const route = await getOsrmRoute(
        { lat: Number(pLat), lng: Number(pLng) },
        { lat: Number(dLat), lng: Number(dLng) },
      );
      if (!route) return;
      setRouteCoords(route.coordsLatLng);
      setRouteSteps(route.steps);
      setRouteStats({ distanceKm: route.distanceKm, durationMin: route.durationMin, fareInr: computeFareInr(route.distanceKm) });
    } catch (e) {
      console.error('Route fetch failed', e);
      setRouteStats(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await listPatientBloodRequests();
        if (active) {
          setRequests(data as any);
          const reqId = Array.isArray(data) && data[0] && typeof (data[0] as any).id === 'string' ? (data[0] as any).id : null;
          setActiveRequestId(isUuid(reqId) ? reqId : null);
          // If there is an active request, fetch tracking
          if (data && data.length > 0 && isUuid(reqId)) {
            const trackData = await fetchTracking(reqId);
            if (trackData && active) {
              setTracking(trackData);
              fetchRoute(trackData);
            }
          }
        }
      } catch {
        if (active) setRequests([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [fetchRoute, fetchTracking, refreshTick]);

  useEffect(() => {
    if (!isUuid(activeRequestId)) return;
    let active = true;
    const refresh = async () => {
      const requestId = activeRequestId;
      if (!requestId || !isUuid(requestId)) return;
      const trackData = await fetchTracking(requestId);
      if (trackData && active) {
        setTracking(trackData);
        fetchRoute(trackData);
      }
    };

    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [activeRequestId, fetchRoute, fetchTracking, refreshTick]);

  const activeRequest = requests && requests[0] ? requests[0] : null;

  // Calculate timeline status
  const getStepStatus = (stepIdx: number) => {
      if (!activeRequest) return 'pending';
      // Map request/delivery status to steps
      // 0: Request Created (always completed if activeRequest exists)
      // 1: Packet Prepared (accepted by hospital)
      // 2: Rider Assigned (delivery exists)
      // 3: Out for Delivery (delivery in_transit)
      // 4: Ready (delivered?)
      
      if (stepIdx === 0) return 'completed';
      if (stepIdx === 1) return activeRequest.status === 'accepted' || tracking ? 'completed' : 'pending';
      if (stepIdx === 2) return tracking?.rider ? 'completed' : 'pending';
      if (stepIdx === 3) return tracking?.status === 'in_transit' || tracking?.status === 'picked_up' ? 'completed' : 'pending'; // Or 'in_progress'
      return 'pending';
  };

  const isValidCoord = (val: any) => {
      if (typeof val === 'number') return true;
      if (typeof val === 'string' && !isNaN(parseFloat(val))) return true;
      return false;
  };

  const hasPickup = tracking?.pickup && isValidCoord(tracking.pickup.lat) && isValidCoord(tracking.pickup.lng);
  const hasDrop = tracking?.drop && isValidCoord(tracking.drop.lat) && isValidCoord(tracking.drop.lng);
  const hasRider = tracking?.rider && isValidCoord(tracking.rider.lat) && isValidCoord(tracking.rider.lng);
  
  const centerLat = hasRider ? Number(tracking!.rider!.lat) : (hasPickup ? Number(tracking!.pickup.lat) : (hasDrop ? Number(tracking!.drop.lat) : 20.5937));
  const centerLng = hasRider ? Number(tracking!.rider!.lng) : (hasPickup ? Number(tracking!.pickup.lng) : (hasDrop ? Number(tracking!.drop.lng) : 78.9629));
  
  const showMap = hasPickup || hasDrop || hasRider;

  const canPay = Boolean(tracking?.delivery_id) && tracking?.otp_verified === true && (tracking?.payment_status || '').toLowerCase() !== 'paid';
  const displayedDistanceKm =
    (tracking?.distance_km != null && Number.isFinite(tracking.distance_km as any) ? Number(tracking.distance_km) : null) ??
    (routeStats ? routeStats.distanceKm : null);
  const displayedFare =
    (tracking?.fare_amount != null && Number.isFinite(tracking.fare_amount as any) ? Number(tracking.fare_amount) : null) ??
    (routeStats ? routeStats.fareInr : (displayedDistanceKm != null ? computeFareInr(displayedDistanceKm) : null));

  useEffect(() => {
    try {
      const vpa = typeof window !== 'undefined' ? window.localStorage.getItem('hl_upi_vpa') : null;
      const name = typeof window !== 'undefined' ? window.localStorage.getItem('hl_upi_name') : null;
      if (typeof vpa === 'string') setUpiVpa(vpa);
      if (typeof name === 'string' && name.trim()) setUpiPayeeName(name);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('hl_upi_vpa', upiVpa);
        window.localStorage.setItem('hl_upi_name', upiPayeeName);
      }
    } catch {}
  }, [upiPayeeName, upiVpa]);

  const buildUpiUri = () => {
    const pa = upiVpa.trim();
    const pn = upiPayeeName.trim() || 'HAEMOLINK';
    const amt = displayedFare != null && Number.isFinite(displayedFare as any) ? Math.max(0, Math.round(Number(displayedFare))) : null;
    const deliveryId = tracking?.delivery_id ? tracking.delivery_id : '';
    const tr = deliveryId ? deliveryId.slice(0, 18) : String(Date.now());
    const params = new URLSearchParams();
    params.set('pa', pa);
    params.set('pn', pn);
    if (amt != null) params.set('am', String(amt));
    params.set('cu', 'INR');
    params.set('tn', `Blood delivery fare ${tr}`);
    params.set('tr', tr);
    return `upi://pay?${params.toString()}`;
  };

  const isLikelyUpiVpa = (value: string) => {
    const v = value.trim();
    if (!v) return false;
    if (v.length < 3 || v.length > 80) return false;
    const at = v.indexOf('@');
    if (at <= 0 || at === v.length - 1) return false;
    return true;
  };

  const pay = async (method: string) => {
    setPayStatus(null);
    if (!tracking?.delivery_id) {
      setPayStatus({ ok: false, message: 'No delivery linked yet' });
      return;
    }
    if (!isUuid(tracking.delivery_id)) {
      setPayStatus({ ok: false, message: 'Invalid delivery id' });
      return;
    }
    if (!canPay) {
      setPayStatus({ ok: false, message: 'Payment unlocks after delivery OTP verification' });
      return;
    }
    const describeError = (e: any) => {
      const msg =
        typeof e?.message === 'string'
          ? e.message
          : typeof e?.error_description === 'string'
            ? e.error_description
            : typeof e === 'string'
              ? e
              : '';
      const code = typeof e?.code === 'string' ? e.code : '';
      const details = typeof e?.details === 'string' ? e.details : '';
      const hint = typeof e?.hint === 'string' ? e.hint : '';
      const parts = [msg, code ? `code: ${code}` : '', details, hint].filter(Boolean);
      return parts.join(' • ') || 'Payment failed';
    };

    try {
      const tryRpc = async () => {
        const { data, error } = await supabase.rpc('create_delivery_payment', { p_delivery_id: tracking.delivery_id, p_payment_method: method });
        if (error) throw error;
        if (!(data as any)?.ok) {
          const reason = (data as any)?.reason;
          const message = (data as any)?.message;
          throw new Error(
            typeof message === 'string' && message.trim()
              ? message
              : typeof reason === 'string' && reason.trim()
                ? `Payment failed: ${reason}`
                : 'Payment failed',
          );
        }
        return data as any;
      };

      const tryRestRpc = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? null;
        const res = await fetch(
          `https://${projectId}.supabase.co/rest/v1/rpc/create_delivery_payment?apikey=${encodeURIComponent(publicAnonKey)}`,
          {
            method: 'POST',
            headers: {
              apikey: publicAnonKey,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_delivery_id: tracking.delivery_id, p_payment_method: method }),
          },
        );
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const message = typeof (body as any)?.message === 'string' ? (body as any).message : `Payment failed (${res.status})`;
          throw new Error(message);
        }
        if (!(body as any)?.ok) {
          const reason = (body as any)?.reason;
          const message = (body as any)?.message;
          throw new Error(
            typeof message === 'string' && message.trim()
              ? message
              : typeof reason === 'string' && reason.trim()
                ? `Payment failed: ${reason}`
                : 'Payment failed',
          );
        }
        return body as any;
      };

      let data: any;
      try {
        data = await tryRpc();
      } catch (e: any) {
        const msg = typeof e?.message === 'string' ? e.message : String(e ?? '');
        const hint = typeof e?.hint === 'string' ? e.hint : '';
        const details = typeof e?.details === 'string' ? e.details : '';
        const status = typeof e?.status === 'number' ? e.status : null;
        const blob = `${msg}\n${hint}\n${details}`.toLowerCase();
        if (blob.includes('no api key found') || status === 400) {
          data = await tryRestRpc();
        } else {
          throw e;
        }
      }

      setTracking((prev) => (prev ? { ...prev, payment_status: 'paid' } : prev));
      setShowUpiQr(false);
      setPayStatus({ ok: true, message: `Payment recorded: ₹${Number((data as any)?.amount || 0).toLocaleString()}` });
    } catch (e: any) {
      console.error('create_delivery_payment failed', e);
      setPayStatus({ ok: false, message: describeError(e) });
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Track Orders</h2>
        <p className="text-gray-600">Monitor your blood delivery in real-time</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          {activeRequest ? (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-gray-900 mb-1">
                      Request {activeRequest.id}
                    </div>
                    <p className="text-gray-600">
                      Status: {activeRequest.status || 'Not recorded'}
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full">
                    {activeRequest.status || 'Unknown'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-1">Last Updated</div>
                    <div className="text-gray-900">
                      {tracking ? 'Just now' : 'Not recorded'}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-1">Created</div>
                    <div className="text-gray-900">
                      {activeRequest.created_at
                        ? new Date(activeRequest.created_at).toLocaleString()
                        : 'Not recorded'}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-1">Details</div>
                    <div className="text-gray-900">
                      {(activeRequest.component || '—') + ' • ' + (activeRequest.units_required ?? '—') + ' units'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-gray-900 mb-6">Delivery Timeline</h3>

                <div className="space-y-6">
                  {[
                    {
                      title: 'Request Created',
                      desc: 'Blood request submitted successfully',
                      status: getStepStatus(0),
                      icon: CheckCircle,
                    },
                    {
                      title: 'Packet Prepared',
                      desc: 'Blood units prepared and quality checked',
                      status: getStepStatus(1),
                      icon: Package,
                    },
                    {
                      title: 'Rider Assigned',
                      desc: tracking?.rider ? `Rider ${tracking.rider.name} assigned` : 'Delivery partner will be assigned in the next phase',
                      status: getStepStatus(2),
                      icon: Bike,
                    },
                    {
                      title: 'Out for Delivery',
                      desc: 'Real-time tracking is active',
                      status: getStepStatus(3),
                      icon: MapPin,
                    },
                    {
                      title: 'Ready for Transfusion',
                      desc: 'Final confirmation and OTP verification',
                      status: getStepStatus(4),
                      icon: Circle,
                    },
                  ].map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.title} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              step.status === 'completed'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          {idx < 4 && (
                            <div
                              className={`w-0.5 h-12 ${
                                step.status === 'completed'
                                  ? 'bg-green-300'
                                  : 'bg-gray-200'
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center justify-between mb-1">
                            <div
                              className={`${
                                step.status === 'pending'
                                  ? 'text-gray-500'
                                  : 'text-gray-900'
                              }`}
                            >
                              {step.title}
                            </div>
                            {step.status === 'completed' && <span className="text-green-600 text-sm">Completed</span>}
                          </div>
                          <p className="text-gray-600">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-2 bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
              <p className="text-gray-900 mb-2">No blood requests yet.</p>
              <p className="text-gray-500">
                When you create a blood request, its status and history will appear here.
              </p>
            </div>
          )}
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Live Location</h3>
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative mb-4">
              {showMap ? (
                 <MapContainer 
                    center={[centerLat, centerLng]} 
                    zoom={12} 
                    style={{ height: '100%', width: '100%' }}
                 >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {/* Pickup (Hospital) */}
                    {hasPickup && (
                        <MarkerAny position={[Number(tracking!.pickup.lat), Number(tracking!.pickup.lng)]} icon={L.divIcon({ html: '🏥', className: 'text-2xl', iconSize: [30, 30] })} />
                    )}
                    
                    {/* Drop (Patient) */}
                    {hasDrop && (
                        <MarkerAny position={[Number(tracking!.drop.lat), Number(tracking!.drop.lng)]} icon={L.divIcon({ html: '📍', className: 'text-2xl', iconSize: [30, 30] })} />
                    )}
                    
                    {/* Rider */}
                    {hasRider && (
                        <MarkerAny position={[Number(tracking!.rider!.lat), Number(tracking!.rider!.lng)]} icon={L.divIcon({ html: '🛵', className: 'text-2xl', iconSize: [30, 30] })} />
                    )}

                    {/* Simple Line or Route */}
                    {routeCoords.length > 0 ? (
                        <Polyline positions={routeCoords} pathOptions={{ color: '#2563eb', weight: 6 }} />
                    ) : (hasPickup && hasDrop && (
                        <Polyline positions={[
                            [Number(tracking!.pickup.lat), Number(tracking!.pickup.lng)],
                            ...(hasRider
                                ? [[Number(tracking!.rider!.lat), Number(tracking!.rider!.lng)] as [number, number]] 
                                : []),
                            [Number(tracking!.drop.lat), Number(tracking!.drop.lng)]
                        ]} pathOptions={{ color: '#2563eb', weight: 6 }} />
                    ))}
                 </MapContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                    <MapPin className="w-12 h-12 text-gray-400" />
                    <p className="absolute bottom-4 text-xs text-gray-500">Map unavailable</p>
                </div>
              )}
            </div>
            <div className="text-gray-600 text-center text-sm">
              {showMap ? 'Tracking active' : 'Real-time tracking map will be connected in a later phase.'}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Turn-by-Turn Directions</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {routeSteps.length === 0 ? (
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="text-gray-600">Directions will appear here</span>
                </div>
              ) : (
                routeSteps.slice(0, 5).map((s, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-gray-50 flex items-center justify-between">
                    <span className="text-gray-700 text-sm">{s.instruction}</span>
                    <span className="text-gray-500 text-xs">{Math.round(s.distance)} m</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Delivery OTP</h3>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-3">
              <div className="text-gray-600 mb-2 text-center">Your OTP</div>
              <div className="text-blue-600 text-center mb-2" style={{ fontSize: '2rem' }}>
                {tracking?.otp ? tracking.otp : '— — — —'}
              </div>
              <p className="text-gray-500 text-center">
                {tracking?.otp ? 'Share this with the rider upon arrival.' : 'OTP will appear here once delivery is enabled.'}
              </p>
            </div>
            <button 
                onClick={() => tracking?.otp && navigator.clipboard.writeText(tracking.otp)}
                className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy OTP
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Ride Fare</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Distance</span>
                <span className="text-gray-700">{displayedDistanceKm != null ? `${displayedDistanceKm.toFixed(1)} km` : '—'}</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Fare</span>
                <span className="text-gray-700">{displayedFare != null ? `₹${Math.round(displayedFare).toLocaleString()}` : '—'}</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Payment</span>
                <span className="text-gray-700">{tracking?.payment_status || (canPay ? 'unpaid' : 'locked')}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                disabled={!canPay}
                onClick={() => setShowUpiQr(true)}
                className="py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-60"
              >
                Pay via UPI
              </button>
              <button
                disabled={!canPay}
                onClick={() => pay('cash')}
                className="py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
              >
                Pay Cash
              </button>
            </div>
            {showUpiQr && canPay && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-gray-900 mb-3">UPI QR</div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">UPI ID</div>
                      <input
                        value={upiVpa}
                        onChange={(e) => setUpiVpa(e.target.value)}
                        placeholder="example@upi"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Payee name</div>
                      <input
                        value={upiPayeeName}
                        onChange={(e) => setUpiPayeeName(e.target.value)}
                        placeholder="HAEMOLINK"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {isLikelyUpiVpa(upiVpa) ? (
                    <>
                      <div className="flex items-center justify-center">
                        <img
                          alt="UPI QR"
                          className="w-44 h-44 bg-white rounded-lg border border-gray-200"
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(buildUpiUri())}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(buildUpiUri());
                              setPayStatus({ ok: true, message: 'UPI link copied' });
                            } catch {
                              setPayStatus({ ok: false, message: 'Copy failed' });
                            }
                          }}
                          className="py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                        >
                          Copy UPI link
                        </button>
                        <a
                          href={buildUpiUri()}
                          className="py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center"
                        >
                          Open UPI app
                        </a>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setShowUpiQr(false)}
                          className="py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => pay('upi')}
                          className="py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          I&apos;ve paid
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-600">
                      Enter a valid UPI ID to generate the QR.
                    </div>
                  )}
                </div>
              </div>
            )}
            {payStatus && <div className={`mt-3 text-sm ${payStatus.ok ? 'text-green-700' : 'text-red-700'}`}>{payStatus.message}</div>}
            {!canPay && <div className="mt-3 text-xs text-gray-500">Payment options unlock after rider verifies delivery OTP.</div>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Delivery Agent</h3>
            {tracking?.rider ? (
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <Bike className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">{tracking.rider.name}</div>
                            <div className="text-sm text-gray-500">{tracking.rider.vehicle_number} • {tracking.rider.vehicle_type}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2 rounded-lg">
                        <Phone className="w-4 h-4" />
                        <span>{tracking.rider.phone}</span>
                    </div>
                </div>
            ) : (
                <div className="text-gray-600">
                Rider details will be shown here once delivery assignments are implemented.
                </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Cold Chain Status</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Current Temp</span>
                <span className="text-gray-900">4.2°C</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Required Range</span>
                <span className="text-gray-900">2-6°C</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-600">Temperature is optimal.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-gray-900 mb-4">Other Active Orders</h3>
        {requests && requests.length > 1 ? (
          <div className="grid grid-cols-3 gap-4">
            {requests.slice(1).map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-900">{req.id}</div>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    {req.status || 'Unknown'}
                  </span>
                </div>
                <p className="text-gray-600 mb-1">
                  {(req.component || '—') + ' • ' + (req.units_required ?? '—') + ' units'}
                </p>
                <p className="text-gray-500">
                  Created:{' '}
                  {req.created_at
                    ? new Date(req.created_at).toLocaleString()
                    : 'Not recorded'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
            No other active orders.
          </div>
        )}
      </div>
    </div>
  );
}
