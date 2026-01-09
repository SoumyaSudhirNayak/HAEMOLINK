import { useEffect, useMemo, useState } from 'react';
import { MapPin, Calendar, CheckCircle, Car, Clock, Share2, Phone, Navigation, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
});

const MarkerAny = Marker as any;
const campPinIcon = L.divIcon({
  html: '📍',
  className: 'bg-transparent border-0 text-2xl',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

type PublishedCamp = {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  parking_details: string | null;
  latitude: number | null;
  longitude: number | null;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  carpool_enabled: boolean | null;
  organizer_id: string;
  organizer_name: string | null;
  organizer_phone: string | null;
  is_verified: boolean | null;
  distance_km: number | null;
};

type CampSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  booked_count: number;
  available: number;
};

type CarpoolOffer = {
  id: string;
  camp_id: string;
  donor_id: string;
  seats: number;
  note: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  status: string;
  created_at: string;
};

type CampPublicDetails = {
  ok: boolean;
  camp?: {
    id: string;
    title: string;
    description: string | null;
    address: string | null;
    parking_details?: string | null;
    latitude: number | null;
    longitude: number | null;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    carpool_enabled: boolean | null;
    organizer_id: string;
    organizer_name: string | null;
    organizer_phone: string | null;
    organizer_verified: boolean | null;
  };
  slots?: CampSlot[];
  my_booking?: any;
  reason?: string;
};

type UpcomingBooking = {
  booking_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  camp_id: string;
  title: string;
  address: string | null;
  parking_details: string | null;
  latitude: number | null;
  longitude: number | null;
  carpool_enabled: boolean | null;
  organizer_id: string;
  organizer_name: string | null;
  organizer_phone: string | null;
  organizer_verified: boolean | null;
} | null;

function dateToYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function CampsView() {
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [daysSinceLastDonation, setDaysSinceLastDonation] = useState<number | null>(null);
  const [donorId, setDonorId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [datePreset, setDatePreset] = useState<'week' | 'month' | 'three'>('month');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [carpoolOnly, setCarpoolOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const [camps, setCamps] = useState<PublishedCamp[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const [details, setDetails] = useState<CampPublicDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [bookingBusy, setBookingBusy] = useState<string | null>(null);
  const [myBooking, setMyBooking] = useState<UpcomingBooking>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [carpoolOffers, setCarpoolOffers] = useState<CarpoolOffer[]>([]);
  const [carpoolLoading, setCarpoolLoading] = useState(false);
  const [carpoolBusy, setCarpoolBusy] = useState(false);
  const [carpoolSeats, setCarpoolSeats] = useState(1);
  const [carpoolNote, setCarpoolNote] = useState('');
  const { refreshTick } = useAutoRefresh();

  const dateRange = useMemo(() => {
    const from = new Date();
    const to = new Date();
    if (datePreset === 'week') to.setDate(to.getDate() + 7);
    if (datePreset === 'month') to.setDate(to.getDate() + 30);
    if (datePreset === 'three') to.setDate(to.getDate() + 90);
    return { from: dateToYmd(from), to: dateToYmd(to) };
  }, [datePreset]);

  const filteredCamps = useMemo(() => {
    return camps.filter((c) => {
      if (verifiedOnly && !c.is_verified) return false;
      if (carpoolOnly && !c.carpool_enabled) return false;
      return true;
    });
  }, [camps, verifiedOnly, carpoolOnly]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng];
    const first = filteredCamps.find((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number');
    if (first && typeof first.latitude === 'number' && typeof first.longitude === 'number') return [first.latitude, first.longitude];
    return [20.5937, 78.9629];
  }, [filteredCamps, lat, lng]);

  const loadCampDetails = async (campId: string) => {
    const [{ supabase }, { getSessionAndRole }] = await Promise.all([
      import('../../../supabase/client'),
      import('../../../services/auth'),
    ]);
    const { session, role } = await getSessionAndRole();
    if (!session || role !== 'donor') {
      return { ok: false, reason: 'not_authenticated' } as CampPublicDetails;
    }

    const listCamp = camps.find((c) => c.id === campId) ?? null;
    const campResult = await supabase
      .from('camps')
      .select('id, title, description, address, parking_details, latitude, longitude, start_date, end_date, start_time, end_time, carpool_enabled, organizer_id')
      .eq('id', campId)
      .eq('is_published', true)
      .maybeSingle();
    if (campResult.error || !campResult.data) {
      return {
        ok: false,
        reason: campResult.error?.message || 'not_found',
      } as CampPublicDetails;
    }

    const slotsFrom = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const slotsResult = await supabase
      .from('camp_slots')
      .select('id, starts_at, ends_at, capacity, booked_count')
      .eq('camp_id', campId)
      .gte('starts_at', slotsFrom)
      .order('starts_at', { ascending: true });
    const slots: CampSlot[] = Array.isArray(slotsResult.data)
      ? (slotsResult.data as any[]).map((s) => ({
          id: String(s.id),
          starts_at: String(s.starts_at),
          ends_at: String(s.ends_at),
          capacity: Number(s.capacity) || 0,
          booked_count: Number(s.booked_count) || 0,
          available: Math.max((Number(s.capacity) || 0) - (Number(s.booked_count) || 0), 0),
        }))
      : [];

    const myBookingResult = await supabase
      .from('camp_bookings')
      .select('id, camp_id, slot_id, status, created_at')
      .eq('camp_id', campId)
      .eq('donor_id', session.user.id)
      .eq('status', 'booked')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      ok: true,
      camp: {
        ...(campResult.data as any),
        organizer_name: listCamp?.organizer_name ?? 'Blood Bank',
        organizer_phone: listCamp?.organizer_phone ?? null,
        organizer_verified: listCamp?.is_verified ?? null,
      },
      slots,
      my_booking: myBookingResult.data ?? null,
    } as CampPublicDetails;
  };

  const loadEligibilityAndLocation = async () => {
    const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
      import('../../../services/auth'),
      import('../../../supabase/client'),
    ]);
    const { session, role } = await getSessionAndRole();
    if (!session || role !== 'donor') {
      setEligible(null);
      setCamps([]);
      setMyBooking(null);
      setDonorId(null);
      return;
    }
    setDonorId(session.user.id);
    const profile: any = await getProfile('donor');
    const lastDonationDate: string | null = profile?.last_donation_date ?? null;
    let days: number | null = null;
    if (lastDonationDate) {
      const date = new Date(lastDonationDate);
      if (!Number.isNaN(date.getTime())) {
        days = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }
    setDaysSinceLastDonation(days);
    setEligible(days == null || days >= 60);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const p = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
        });
        const la = p?.coords?.latitude;
        const lo = p?.coords?.longitude;
        if (typeof la === 'number' && typeof lo === 'number') {
          setLat(la);
          setLng(lo);
        }
      } catch {}
    }

    const { data, error } = await supabase.rpc('get_my_upcoming_camp_booking');
    if (error) {
      setMyBooking(null);
      return;
    }
    const ok = (data as any)?.ok === true;
    const row = ok ? ((data as any)?.booking as any) : null;
    setMyBooking(row && row !== null ? (row as UpcomingBooking) : null);
  };

  const formatSlotLabel = (s: CampSlot) => {
    const start = new Date(s.starts_at);
    const end = new Date(s.ends_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return s.starts_at;
    const date = start.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const startTime = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${date} • ${startTime} - ${endTime}`;
  };

  const loadCamps = async () => {
    const [{ supabase }, { getSessionAndRole }] = await Promise.all([
      import('../../../supabase/client'),
      import('../../../services/auth'),
    ]);
    const { session, role } = await getSessionAndRole();
    if (!session || role !== 'donor') {
      setCamps([]);
      return;
    }
    const { data } = await supabase.rpc('list_published_camps', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_from: dateRange.from,
      p_to: dateRange.to,
    } as any);
    setCamps(Array.isArray(data) ? ((data as any[]) as PublishedCamp[]) : []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        await loadEligibilityAndLocation();
        if (!active) return;
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadCamps();
      } catch {
        if (active) setCamps([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [eligible, lat, lng, radiusKm, dateRange.from, dateRange.to, refreshTick]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedCampId) {
        if (active) setDetails(null);
        return;
      }
      setDetailsLoading(true);
      try {
        const next = await loadCampDetails(selectedCampId);
        if (!active) return;
        setDetails(next);
      } catch {
        if (active) setDetails(null);
      } finally {
        if (active) setDetailsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedCampId, camps, refreshTick]);

  useEffect(() => {
    const slots = Array.isArray(details?.slots) ? details!.slots! : [];
    if (!details?.ok || !details.camp || slots.length === 0) return;
    const firstAvailableIndex = slots.findIndex((s) => s.available > 0);
    setSelectedSlotIndex(firstAvailableIndex >= 0 ? firstAvailableIndex : 0);
  }, [details?.camp?.id, detailsLoading]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedCampId || !details?.ok || !details.camp) {
        if (active) setCarpoolOffers([]);
        return;
      }
      if (!details.camp.carpool_enabled) {
        if (active) setCarpoolOffers([]);
        return;
      }
      setCarpoolLoading(true);
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'donor') {
          if (active) setCarpoolOffers([]);
          return;
        }
        const { data, error } = await supabase
          .from('camp_carpool_offers')
          .select('id, camp_id, donor_id, seats, note, start_latitude, start_longitude, status, created_at')
          .eq('camp_id', selectedCampId)
          .eq('status', 'open')
          .order('created_at', { ascending: false });
        if (!active) return;
        if (error) {
          setCarpoolOffers([]);
          return;
        }
        setCarpoolOffers(Array.isArray(data) ? (data as any as CarpoolOffer[]) : []);
      } catch {
        if (active) setCarpoolOffers([]);
      } finally {
        if (active) setCarpoolLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedCampId, details?.ok, details?.camp?.carpool_enabled, refreshTick]);

  const createCarpoolOffer = async () => {
    if (!selectedCampId || donorId == null) return;
    if (!details?.ok || !details.camp || !details.camp.carpool_enabled) return;
    setActionError(null);
    setCarpoolBusy(true);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'donor') return;
      const payload: any = {
        camp_id: selectedCampId,
        donor_id: session.user.id,
        seats: Math.max(1, Math.min(4, Number(carpoolSeats) || 1)),
        note: carpoolNote.trim() ? carpoolNote.trim() : null,
        start_latitude: typeof lat === 'number' ? lat : null,
        start_longitude: typeof lng === 'number' ? lng : null,
        status: 'open',
      };
      const { error } = await supabase.from('camp_carpool_offers').insert(payload);
      if (error) {
        setActionError(error.message || 'Failed to create carpool offer');
        return;
      }
      setCarpoolNote('');
      setCarpoolSeats(1);
      const { data } = await supabase
        .from('camp_carpool_offers')
        .select('id, camp_id, donor_id, seats, note, start_latitude, start_longitude, status, created_at')
        .eq('camp_id', selectedCampId)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      setCarpoolOffers(Array.isArray(data) ? (data as any as CarpoolOffer[]) : []);
    } finally {
      setCarpoolBusy(false);
    }
  };

  const closeMyCarpoolOffer = async (offerId: string) => {
    if (!donorId) return;
    setActionError(null);
    setCarpoolBusy(true);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'donor') return;
      const { error } = await supabase.from('camp_carpool_offers').update({ status: 'closed' }).eq('id', offerId).eq('donor_id', donorId);
      if (error) {
        setActionError(error.message || 'Failed to close offer');
        return;
      }
      setCarpoolOffers((prev) => prev.filter((o) => o.id !== offerId));
    } finally {
      setCarpoolBusy(false);
    }
  };

  const shareCamp = async (camp: PublishedCamp) => {
    const la = camp.latitude;
    const lo = camp.longitude;
    const url = la != null && lo != null ? `https://www.google.com/maps?q=${la},${lo}` : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: camp.title, text: camp.address || camp.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {}
  };

  const openDirections = (camp: { latitude: number | null; longitude: number | null; address?: string | null }) => {
    const la = camp.latitude;
    const lo = camp.longitude;
    const destination = la != null && lo != null ? `${la},${lo}` : camp.address ? encodeURIComponent(camp.address) : null;
    if (!destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const bookSlot = async (slotId: string) => {
    setActionError(null);
    setBookingBusy(slotId);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'donor') return;
      if (eligible !== true) {
        setActionError('You are not eligible to book a camp slot yet.');
        return;
      }
      if (myBooking?.booking_id) {
        setActionError('You already have an upcoming booking.');
        return;
      }
      const { data } = await supabase.rpc('book_camp_slot', { p_slot_id: slotId });
      const ok = (data as any)?.ok === true;
      if (!ok) {
        const reason = (data as any)?.reason;
        setActionError(typeof reason === 'string' ? reason : 'Failed to book slot');
        return;
      }
      if (ok) {
        await loadCamps();
        await loadEligibilityAndLocation();
        if (selectedCampId) {
          const refreshed = await loadCampDetails(selectedCampId);
          setDetails(refreshed);
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('donor_booking_updated'));
      }
    } finally {
      setBookingBusy(null);
    }
  };

  const cancelBooking = async () => {
    if (!myBooking?.booking_id) return;
    setActionError(null);
    setCancelBusy(true);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'donor') return;
      const { data } = await supabase.rpc('cancel_camp_booking', { p_booking_id: myBooking.booking_id });
      const ok = (data as any)?.ok === true;
      if (!ok) {
        const reason = (data as any)?.reason;
        setActionError(typeof reason === 'string' ? reason : 'Failed to cancel booking');
        return;
      }
      await loadEligibilityAndLocation();
      if (selectedCampId) {
        const refreshed = await loadCampDetails(selectedCampId);
        setDetails(refreshed);
      }
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('donor_booking_updated'));
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Blood Donation Camps & Drives</h2>
        <p className="text-gray-600">Find nearby camps and book your slot</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Map View */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="aspect-video rounded-lg overflow-hidden mb-4 border border-gray-200">
              <MapContainer center={mapCenter} zoom={12} className="w-full h-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {filteredCamps
                  .filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number')
                  .map((c) => (
                    <MarkerAny
                      key={c.id}
                      position={[c.latitude as number, c.longitude as number]}
                      icon={campPinIcon}
                      eventHandlers={{
                        click: () => setSelectedCampId(c.id),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[200px]">
                          <div className="font-medium">{c.title}</div>
                          <div className="text-sm">{c.address || 'No address'}</div>
                          <button
                            className="mt-2 px-3 py-1 bg-green-600 text-white rounded-lg"
                            onClick={() => setSelectedCampId(c.id)}
                          >
                            View Details
                          </button>
                        </div>
                      </Popup>
                    </MarkerAny>
                  ))}
              </MapContainer>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg ${viewMode === 'map' ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Map View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg ${viewMode === 'list' ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                List View
              </button>
              <button
                onClick={() => setDatePreset('week')}
                className={`px-4 py-2 rounded-lg ${datePreset === 'week' ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                This Week
              </button>
              <button
                onClick={() => setDatePreset('month')}
                className={`px-4 py-2 rounded-lg ${datePreset === 'month' ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                This Month
              </button>
            </div>
          </div>

          {eligible === false ? (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-orange-700">
              You are not eligible to donate yet. {daysSinceLastDonation != null ? `Days since last donation: ${daysSinceLastDonation}` : ''}
            </div>
          ) : null}

          {selectedCampId ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">Camp Details</h3>
                <button onClick={() => setSelectedCampId(null)} className="p-2 rounded-lg hover:bg-gray-50" aria-label="Close">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {detailsLoading ? (
                <div className="text-gray-600">Loading…</div>
              ) : details?.ok && details.camp ? (
                <div className="space-y-4">
                  {actionError ? <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{actionError}</div> : null}
                  <div>
                    <div className="text-gray-900 mb-1">{details.camp.title}</div>
                    <div className="text-gray-600">{details.camp.address || 'No address provided'}</div>
                    {details.camp.parking_details ? <div className="text-gray-600 mt-1">Parking: {details.camp.parking_details}</div> : null}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-gray-500 mb-1">Date</div>
                      <div className="text-gray-900">
                        {details.camp.start_date} → {details.camp.end_date}
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-gray-500 mb-1">Time</div>
                      <div className="text-gray-900">
                        {details.camp.start_time} → {details.camp.end_time}
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-gray-500 mb-1">Organizer</div>
                      <div className="text-gray-900 flex items-center gap-2">
                        {details.camp.organizer_verified ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                        <span>{details.camp.organizer_name || 'Blood Bank'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {details.camp.organizer_phone ? (
                      <a
                        href={`tel:${details.camp.organizer_phone}`}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Call Blood Bank
                      </a>
                    ) : null}
                    <button
                      onClick={() =>
                        openDirections({
                          latitude: details.camp?.latitude ?? null,
                          longitude: details.camp?.longitude ?? null,
                          address: details.camp?.address ?? null,
                        })
                      }
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      Directions
                    </button>
                    <button
                      onClick={() =>
                        shareCamp(
                          (filteredCamps.find((c) => c.id === selectedCampId) as any) ||
                            ({ id: selectedCampId, title: details.camp?.title ?? 'Camp' } as any),
                        )
                      }
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Location
                    </button>
                    <div className="text-gray-600 flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      <span>{details.camp.carpool_enabled ? 'Carpool available' : 'Carpool not available'}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-900 mb-2">Slots</div>
                    {Array.isArray(details.slots) && details.slots.length > 0 ? (
                      <div className="p-4 border border-gray-200 rounded-lg">
                        {(() => {
                          const slots = details.slots || [];
                          const idx = Math.max(0, Math.min(selectedSlotIndex, slots.length - 1));
                          const selected = slots[idx];
                          if (!selected) return null;
                          return (
                            <div>
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="text-gray-900">{formatSlotLabel(selected)}</div>
                                <div className={`text-sm ${selected.available > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                  {selected.available} left
                                </div>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={Math.max(slots.length - 1, 0)}
                                step={1}
                                value={idx}
                                onChange={(e) => setSelectedSlotIndex(Number(e.target.value))}
                                className="w-full"
                              />
                              <div className="mt-2 text-xs text-gray-500">Use the slider to pick a 30-minute time slot</div>
                              <button
                                disabled={
                                  selected.available <= 0 || bookingBusy === selected.id || !!myBooking?.booking_id || eligible !== true
                                }
                                onClick={() => bookSlot(selected.id)}
                                className="w-full mt-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-60"
                              >
                                {bookingBusy === selected.id ? 'Booking…' : 'Book Slot'}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-gray-600">No available slots</div>
                    )}
                  </div>

                  {details.camp.carpool_enabled ? (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="text-gray-900">Carpool</div>
                        <div className="text-sm text-gray-600">{carpoolLoading ? 'Loading…' : `${carpoolOffers.length} offers`}</div>
                      </div>

                      {donorId && carpoolOffers.find((o) => o.donor_id === donorId) ? (
                        (() => {
                          const mine = carpoolOffers.find((o) => o.donor_id === donorId)!;
                          return (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-gray-900">Your offer</div>
                                <button
                                  disabled={carpoolBusy}
                                  onClick={() => closeMyCarpoolOffer(mine.id)}
                                  className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-60"
                                >
                                  {carpoolBusy ? 'Closing…' : 'Close'}
                                </button>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">{mine.seats} seat(s)</div>
                              {mine.note ? <div className="text-sm text-gray-600 mt-1">{mine.note}</div> : null}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="col-span-1">
                            <label className="block text-gray-700 mb-2">Seats</label>
                            <select
                              value={carpoolSeats}
                              onChange={(e) => setCarpoolSeats(Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-gray-700 mb-2">Note</label>
                            <input
                              value={carpoolNote}
                              onChange={(e) => setCarpoolNote(e.target.value)}
                              placeholder="Pickup area, landmark, etc."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div className="col-span-3">
                            <button
                              disabled={carpoolBusy || donorId == null}
                              onClick={createCarpoolOffer}
                              className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
                            >
                              {carpoolBusy ? 'Saving…' : 'Offer a carpool'}
                            </button>
                          </div>
                        </div>
                      )}

                      {carpoolOffers.length > 0 ? (
                        <div className="space-y-2">
                          {carpoolOffers
                            .filter((o) => !donorId || o.donor_id !== donorId)
                            .slice(0, 6)
                            .map((o) => (
                              <div key={o.id} className="p-3 border border-gray-200 rounded-lg flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-gray-900">{o.seats} seat(s) available</div>
                                  {o.note ? <div className="text-sm text-gray-600">{o.note}</div> : null}
                                </div>
                                <div className="text-sm text-gray-500">{new Date(o.created_at).toLocaleString()}</div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-gray-600">No active carpool offers yet</div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : details ? (
                <div className="text-gray-600">{details.reason ? `Unable to load details: ${details.reason}` : 'Unable to load camp details'}</div>
              ) : (
                <div className="text-gray-600">Select a camp to view details</div>
              )}
            </div>
          ) : null}

          {/* Camp Cards */}
          {viewMode === 'list' ? (
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-600">Loading…</div>
              ) : filteredCamps.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-600">No camps found for the selected filters</div>
              ) : (
                filteredCamps.map((camp) => (
                  <div key={camp.id} className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-gray-900">{camp.title}</div>
                          {camp.is_verified ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
                        </div>
                        <div className="text-gray-600 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {camp.start_date} {camp.start_time} → {camp.end_date} {camp.end_time}
                          </span>
                        </div>
                        <div className="text-gray-600 flex items-center gap-2 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{camp.address || 'No address provided'}</span>
                        </div>
                        {camp.parking_details ? <div className="text-gray-600 mt-1">Parking: {camp.parking_details}</div> : null}
                        <div className="text-gray-600 flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4" />
                          <span>{camp.distance_km != null ? `${camp.distance_km.toFixed(1)} km away` : 'Distance unavailable'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-gray-600 flex items-center gap-2">
                          <Car className="w-4 h-4" />
                          <span>{camp.carpool_enabled ? 'Carpool' : 'No carpool'}</span>
                        </div>
                        <button
                          onClick={() => setSelectedCampId(camp.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => shareCamp(camp)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Filter */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Filters</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Distance</label>
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value={5}>Within 5 km</option>
                  <option value={10}>Within 10 km</option>
                  <option value={25}>Within 25 km</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Date Range</label>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="three">Next 3 Months</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="rounded" />
                  <span className="text-gray-700">Verified organizers only</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={carpoolOnly} onChange={(e) => setCarpoolOnly(e.target.checked)} className="rounded" />
                  <span className="text-gray-700">Carpool available</span>
                </label>
              </div>
            </div>
          </div>

          {/* Upcoming Booked Camps */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Your Bookings</h3>

            {myBooking ? (
              <div className="space-y-3">
                {actionError ? <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{actionError}</div> : null}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-gray-900 mb-1">{myBooking.title}</div>
                  <div className="text-gray-600 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(myBooking.starts_at).toLocaleString()}</span>
                  </div>
                  {myBooking.address ? (
                    <div className="text-gray-600 flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{myBooking.address}</span>
                    </div>
                  ) : null}
                  {myBooking.parking_details ? <div className="text-gray-600 mt-1">Parking: {myBooking.parking_details}</div> : null}
                  {myBooking.organizer_phone ? (
                    <div className="text-gray-600 flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4" />
                      <a className="underline" href={`tel:${myBooking.organizer_phone}`}>
                        {myBooking.organizer_phone}
                      </a>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => openDirections({ latitude: myBooking.latitude, longitude: myBooking.longitude, address: myBooking.address })}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      Directions
                    </button>
                    <button
                      disabled={cancelBusy}
                      onClick={cancelBooking}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
                    >
                      {cancelBusy ? 'Cancelling…' : 'Cancel'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg text-gray-600">No records found</div>
            )}
          </div>

          {/* Carpool Options */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Carpool Options</h3>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Car className="w-5 h-5" />
                <span>Share Your Ride</span>
              </div>
              <p className="text-blue-600">Help other donors reach the camp</p>
            </div>

            <button className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
              Find Carpool
            </button>
          </div>

          {/* NGO Partners */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Verified Organizers</h3>

            <div className="p-3 bg-gray-50 rounded-lg text-gray-600">
              No data available yet
            </div>
          </div>

          {/* Camp Stats */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
            <h3 className="mb-4">This Month</h3>

            <div className="space-y-3">
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <div className="opacity-90 mb-1">Active Camps</div>
                <div style={{ fontSize: '1.5rem' }}>{filteredCamps.length}</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <div className="opacity-90 mb-1">Total Donors</div>
                <div style={{ fontSize: '1.5rem' }}>—</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
