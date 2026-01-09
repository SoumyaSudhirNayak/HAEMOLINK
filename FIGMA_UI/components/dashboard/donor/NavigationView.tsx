import { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, Download, Phone } from 'lucide-react';
import { computeFareInr, getOsrmRoute } from '../../../utils/geo';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';

const donorIcon = L.divIcon({
  html: '🧍',
  className: 'bg-transparent border-0 text-xl',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

const campIcon = L.divIcon({
  html: '📍',
  className: 'bg-transparent border-0 text-2xl',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function FitBounds({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
}

interface DonorNavData {
  drop?: { lat: number | null; lng: number | null };
  booking_id: string;
  camp_id: string;
  title: string | null;
  address: string | null;
  organizer_phone: string | null;
}

export function NavigationView() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [nav, setNav] = useState<DonorNavData | null>(null);
  const [routeStats, setRouteStats] = useState<{ distanceKm: number; durationMin: number; fareInr: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const { refreshTick } = useAutoRefresh();
  useEffect(() => {
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const la = typeof pos.coords.latitude === 'number' ? pos.coords.latitude : null;
          const lo = typeof pos.coords.longitude === 'number' ? pos.coords.longitude : null;
          setLat(la);
          setLng(lo);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      ) as any;
    }
    return () => {
      if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'donor') {
          if (active) {
            setNav(null);
            setRouteStats(null);
          }
          return;
        }
        const { data, error } = await supabase.rpc('get_my_upcoming_camp_booking');
        if (error) {
          if (active) {
            setNav(null);
            setRouteStats(null);
          }
          return;
        }
        const ok = (data as any)?.ok === true;
        const booking = ok ? ((data as any)?.booking as any) : null;
        if (!booking) {
          if (active) {
            setNav(null);
            setRouteStats(null);
          }
          return;
        }
        const next: DonorNavData = {
          booking_id: String(booking.booking_id || ''),
          camp_id: String(booking.camp_id || ''),
          title: typeof booking.title === 'string' ? booking.title : null,
          address: typeof booking.address === 'string' ? booking.address : null,
          organizer_phone: typeof booking.organizer_phone === 'string' ? booking.organizer_phone : null,
          drop: { lat: (booking as any)?.latitude ?? null, lng: (booking as any)?.longitude ?? null },
        };
        if (active) setNav(next);
      } catch {
        if (active) {
          setNav(null);
          setRouteStats(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshKey, refreshTick]);

  useEffect(() => {
    const onBookingUpdated = () => setRefreshKey((k) => k + 1);
    window.addEventListener('donor_booking_updated', onBookingUpdated);
    return () => {
      window.removeEventListener('donor_booking_updated', onBookingUpdated);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const pickLat = typeof lat === 'number' ? lat : null;
      const pickLng = typeof lng === 'number' ? lng : null;
      const dropLat = typeof nav?.drop?.lat === 'number' ? nav.drop.lat : null;
      const dropLng = typeof nav?.drop?.lng === 'number' ? nav.drop.lng : null;
      if (pickLat == null || pickLng == null || dropLat == null || dropLng == null) {
        if (active) setRouteStats(null);
        if (active) setRouteCoords([]);
        return;
      }
      try {
        const route = await getOsrmRoute({ lat: pickLat, lng: pickLng }, { lat: dropLat, lng: dropLng });
        if (!active) return;
        if (route) {
          setRouteStats({ distanceKm: route.distanceKm, durationMin: route.durationMin, fareInr: computeFareInr(route.distanceKm) });
          setRouteCoords(Array.isArray(route.coordsLatLng) ? route.coordsLatLng : []);
        } else {
          setRouteStats(null);
          setRouteCoords([]);
        }
      } catch {
        if (active) setRouteStats(null);
        if (active) setRouteCoords([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [lat, lng, nav?.drop?.lat, nav?.drop?.lng]);

  const startNavigation = () => {
    const dropLat = nav?.drop?.lat ?? null;
    const dropLng = nav?.drop?.lng ?? null;
    const destination =
      typeof dropLat === 'number' && typeof dropLng === 'number'
        ? `${dropLat},${dropLng}`
        : nav?.address
          ? encodeURIComponent(nav.address)
          : null;
    if (!destination) return;
    const origin = typeof lat === 'number' && typeof lng === 'number' ? `${lat},${lng}` : null;
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Navigation to Camp</h2>
        <p className="text-gray-600">Get directions to your upcoming booking</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="aspect-video rounded-lg overflow-hidden mb-4 border border-gray-200">
              {typeof lat === 'number' && typeof lng === 'number' && typeof nav?.drop?.lat === 'number' && typeof nav?.drop?.lng === 'number' ? (
                <MapContainer center={[lat, lng]} zoom={13} className="w-full h-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[lat, lng]} icon={donorIcon} />
                  <Marker position={[nav.drop.lat, nav.drop.lng]} icon={campIcon} />
                  <FitBounds bounds={[[lat, lng], [nav.drop.lat, nav.drop.lng]]} />
                  {routeCoords.length > 1 ? <Polyline positions={routeCoords} pathOptions={{ color: '#16a34a', weight: 4 }} /> : null}
                </MapContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-green-600 mx-auto mb-3" />
                    <p className="text-gray-700">Waiting for live location and camp location…</p>
                    <p className="text-gray-500">Enable location permission to show the route</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-blue-600 mb-1">{routeStats ? `${routeStats.distanceKm.toFixed(1)} km` : '—'}</div>
                <p className="text-gray-600">Distance</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-green-600 mb-1">{routeStats ? `${Math.round(routeStats.durationMin)} min` : '—'}</div>
                <p className="text-gray-600">ETA</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                <div className="text-orange-600 mb-1">{routeStats ? `₹${routeStats.fareInr.toLocaleString()}` : '—'}</div>
                <p className="text-gray-600">Traffic status</p>
              </div>
            </div>
          </div>

          {/* Route Options */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Route Options</h3>

            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
                When navigation is connected, you will be able to choose between different
                route options based on time, distance, and traffic.
              </div>
            </div>

            <button
              onClick={startNavigation}
              disabled={!nav}
              className="w-full mt-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Navigation className="w-5 h-5" />
              Start Navigation
            </button>
          </div>

          {/* Turn-by-Turn Directions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Turn-by-Turn Directions</h3>

            <p className="text-gray-600">
              Step-by-step directions will appear here once a route is selected and navigation
              is enabled.
            </p>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Destination Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Destination</h3>

            <div className="space-y-3 mb-4">
              <div>
                <div className="text-gray-500 mb-1">Camp</div>
                <div className="text-gray-900">{nav?.title || 'No upcoming booking'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Address</div>
                <div className="text-gray-900">{nav?.address || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">ETA</div>
                <div className="text-green-600">{routeStats ? `${Math.round(routeStats.durationMin)} min` : '—'}</div>
              </div>
            </div>

            {nav?.organizer_phone ? (
              <a
                className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                href={`tel:${nav.organizer_phone}`}
              >
                <Phone className="w-4 h-4" />
                Call Organizer
              </a>
            ) : (
              <button
                disabled
                className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg transition flex items-center justify-center gap-2 opacity-60"
              >
                <Phone className="w-4 h-4" />
                Call Organizer
              </button>
            )}
          </div>

          {/* Traffic Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Traffic Status</h3>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Clock className="w-5 h-5" />
                <span>Traffic data not connected yet</span>
              </div>
              <p className="text-green-600">
                Live traffic conditions will appear here once navigation services are enabled.
              </p>
            </div>
          </div>

          {/* Parking Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Parking Information</h3>

            <p className="text-gray-600">
              Parking availability and guidance will be displayed here once integrated with
              hospital and blood bank systems.
            </p>
          </div>

          {/* Offline Map */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Offline Access</h3>

            <p className="text-gray-600 mb-4">
              Download map for offline navigation in case of poor connectivity
            </p>

            <button className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download Map
            </button>
          </div>

          {/* Public Transport */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Public Transport</h3>

            <p className="text-gray-600">
              Bus and metro options to your selected blood bank will be listed here once
              public transport data is connected.
            </p>
          </div>

          {/* Share Location */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Share Location</h3>

            <button className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              Share Live Location
            </button>
            <p className="text-gray-500 text-center mt-2">
              Let the blood bank know you're on the way
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
