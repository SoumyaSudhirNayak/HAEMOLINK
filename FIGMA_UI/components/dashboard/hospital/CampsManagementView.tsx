import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Users, CheckCircle, Award, MapPin, Plus, X, Phone } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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

type CampRow = {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  parking_details: string | null;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  capacity_per_slot: number;
  carpool_enabled: boolean;
  is_published: boolean;
  created_at: string;
};

type CampBookingRow = {
  booking_id: string;
  donor_id: string;
  donor_name: string | null;
  donor_phone: string | null;
  slot_starts_at: string;
  slot_ends_at: string;
  status: string;
};

function LocationPicker({ onPick }: { onPick: (pos: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function CampsManagementView() {
  const { refreshTick } = useAutoRefresh();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [camps, setCamps] = useState<CampRow[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<CampBookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    parkingDetails: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    slotMinutes: 30,
    capacity: 10,
    carpoolEnabled: true,
    publishNow: true,
  });
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const pinIcon = useMemo(
    () =>
      L.divIcon({
        className: '',
        html: '<div style="font-size:28px; line-height:28px;">📍</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      }),
    [],
  );

  const selectedCamp = useMemo(
    () => (selectedCampId ? camps.find((c) => c.id === selectedCampId) ?? null : null),
    [camps, selectedCampId],
  );

  const reloadCamps = useCallback(async () => {
    const [{ getSessionAndRole }, { supabase }] = await Promise.all([
      import('../../../services/auth'),
      import('../../../supabase/client'),
    ]);
    const { session, role } = await getSessionAndRole();
    if (!session || role !== 'hospital') {
      setCamps([]);
      return;
    }
    const { data, error } = await supabase
      .from('camps')
      .select(
        'id, title, description, address, parking_details, latitude, longitude, start_date, end_date, start_time, end_time, slot_minutes, capacity_per_slot, carpool_enabled, is_published, created_at',
      )
      .eq('organizer_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setCamps((data as any[]) as CampRow[]);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ getSessionAndRole, getProfile }] = await Promise.all([import('../../../services/auth')]);
        const { role } = await getSessionAndRole();
        if (!active || role !== 'hospital') {
          if (active) setCamps([]);
          return;
        }
        const prof: any = await getProfile('hospital');
        const la = typeof prof?.latitude === 'number' ? prof.latitude : null;
        const lo = typeof prof?.longitude === 'number' ? prof.longitude : null;
        if (active && la != null && lo != null) setMapCenter([la, lo]);
        await reloadCamps();
      } catch (e: any) {
        if (active) {
          setError(typeof e?.message === 'string' ? e.message : 'Failed to load camps');
          setCamps([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await reloadCamps();
      } catch {}
    })();
  }, [reloadCamps, refreshTick]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedCampId) {
        if (active) setBookings([]);
        return;
      }
      setBookingsLoading(true);
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'hospital') {
          if (active) setBookings([]);
          return;
        }
        const { data } = await supabase.rpc('hospital_list_camp_bookings', { p_camp_id: selectedCampId });
        const rows = Array.isArray(data) ? (data as any[]) : [];
        if (active) setBookings(rows as CampBookingRow[]);
      } catch {
        if (active) setBookings([]);
      } finally {
        if (active) setBookingsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedCampId, refreshTick]);

  const togglePublish = async (camp: CampRow) => {
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') return;
      await supabase.rpc('set_camp_publish_status', { p_camp_id: camp.id, p_is_published: !camp.is_published });
      await reloadCamps();
    } catch {}
  };

  const markAttendance = async (bookingId: string, attended: boolean) => {
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') return;
      await supabase.rpc('hospital_mark_camp_attendance', { p_booking_id: bookingId, p_attended: attended });
      if (selectedCampId) {
        const { data } = await supabase.rpc('hospital_list_camp_bookings', { p_camp_id: selectedCampId });
        setBookings(Array.isArray(data) ? (data as any[]) : []);
      }
    } catch {}
  };

  const issueCertificate = async (bookingId: string) => {
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') return;
      await supabase.rpc('hospital_issue_camp_certificate', { p_booking_id: bookingId });
    } catch {}
  };

  const onCreateCamp = async () => {
    setError(null);
    setCreating(true);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') return;
      const loc = picked;
      if (!loc) {
        setError('Pick a camp location on the map');
        return;
      }
      const title = form.title.trim();
      if (!title) {
        setError('Camp title is required');
        return;
      }
      const startDate = form.startDate.trim();
      if (!startDate) {
        setError('Start date is required');
        return;
      }
      const startTime = form.startTime.trim();
      const endTime = form.endTime.trim();
      if (!startTime || !endTime) {
        setError('Start time and end time are required');
        return;
      }
      if (startTime >= endTime) {
        setError('End time must be after start time');
        return;
      }
      const endDate = form.endDate.trim() || startDate;
      if (endDate < startDate) {
        setError('End date must be on or after start date');
        return;
      }
      const payload = {
        p_title: title,
        p_description: form.description.trim() ? form.description.trim() : null,
        p_address: form.address.trim() ? form.address.trim() : null,
        p_lat: loc.lat,
        p_lng: loc.lng,
        p_start_date: startDate,
        p_end_date: endDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_slot_minutes: Number(form.slotMinutes) || 30,
        p_capacity: Number(form.capacity) || 10,
        p_is_published: !!form.publishNow,
        p_carpool_enabled: !!form.carpoolEnabled,
      };
      const { data, error: rpcError } = await supabase.rpc('create_camp_with_slots', payload as any);
      if (rpcError) {
        const messageParts = [rpcError.message, (rpcError as any).details, (rpcError as any).hint].filter(
          (v) => typeof v === 'string' && v.trim().length > 0,
        );
        setError(messageParts.length ? messageParts.join(' • ') : 'Failed to create camp');
        return;
      }
      const ok = (data as any)?.ok === true;
      const campId = (data as any)?.camp_id as string | undefined;
      if (!ok || !campId) {
        setError(typeof (data as any)?.reason === 'string' ? (data as any).reason : 'Failed to create camp');
        return;
      }
      if (form.parkingDetails.trim()) {
        await supabase
          .from('camps')
          .update({ parking_details: form.parkingDetails.trim() })
          .eq('id', campId);
      }
      setCreateOpen(false);
      setPicked(null);
      setForm({
        title: '',
        description: '',
        address: '',
        parkingDetails: '',
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '17:00',
        slotMinutes: 30,
        capacity: 10,
        carpoolEnabled: true,
        publishNow: true,
      });
      await reloadCamps();
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : 'Failed to create camp');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Camps & Drives Management</h2>
        <p className="text-gray-600">Organize and manage blood donation campaigns</p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setCreateOpen(true)}
          className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New Camp
        </button>
      </div>

      {createOpen ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Create Camp</h3>
            <button
              onClick={() => {
                setCreateOpen(false);
                setError(null);
              }}
              className="p-2 rounded-lg hover:bg-gray-50"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {error ? <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div> : null}

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Camp Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Parking Details</label>
                <input
                  value={form.parkingDetails}
                  onChange={(e) => setForm((p) => ({ ...p, parkingDetails: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Slot Minutes</label>
                  <input
                    type="number"
                    value={form.slotMinutes}
                    onChange={(e) => setForm((p) => ({ ...p, slotMinutes: Number(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Capacity / Slot</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.carpoolEnabled}
                      onChange={(e) => setForm((p) => ({ ...p, carpoolEnabled: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-gray-700">Carpool Enabled</span>
                  </label>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.publishNow}
                      onChange={(e) => setForm((p) => ({ ...p, publishNow: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-gray-700">Publish Now</span>
                  </label>
                </div>
              </div>

              <button
                disabled={creating}
                onClick={onCreateCamp}
                className="w-full py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Create Camp'}
              </button>
            </div>

            <div className="col-span-1 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>Pick Camp Location</span>
                </div>
                <div className="aspect-square rounded-lg overflow-hidden">
                  <MapContainer center={mapCenter} zoom={12} className="w-full h-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker onPick={setPicked} />
                    {picked ? <MarkerAny position={[picked.lat, picked.lng]} icon={pinIcon} /> : null}
                  </MapContainer>
                </div>
                <div className="mt-3 text-gray-600">
                  {picked ? `📍 ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}` : 'Click on the map to set location'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Your Camps</h3>
            {loading ? (
              <div className="text-gray-600">Loading…</div>
            ) : camps.length === 0 ? (
              <div className="text-gray-600">No camps or drives scheduled</div>
            ) : (
              <div className="space-y-3">
                {camps.map((camp) => (
                  <button
                    key={camp.id}
                    onClick={() => setSelectedCampId(camp.id)}
                    className={`w-full text-left p-4 rounded-lg border transition ${
                      selectedCampId === camp.id ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-gray-900 mb-1">{camp.title}</div>
                        <div className="text-gray-600 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {camp.start_date} {camp.start_time} → {camp.end_date} {camp.end_time}
                          </span>
                        </div>
                        {camp.address ? (
                          <div className="text-gray-600 flex items-center gap-2 mt-1">
                            <MapPin className="w-4 h-4" />
                            <span>{camp.address}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs ${camp.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {camp.is_published ? 'Published' : 'Draft'}
                        </div>
                        <div className="text-gray-500 text-xs">Capacity: {camp.capacity_per_slot}/slot</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCamp ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-gray-900 mb-1">{selectedCamp.title}</h3>
                  <div className="text-gray-600">{selectedCamp.address || 'No address provided'}</div>
                </div>
                <button
                  onClick={() => togglePublish(selectedCamp)}
                  className={`px-4 py-2 rounded-lg transition ${
                    selectedCamp.is_published ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-violet-600 text-white hover:bg-violet-700'
                  }`}
                >
                  {selectedCamp.is_published ? 'Unpublish' : 'Publish'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-gray-500 mb-1">Slots</div>
                  <div className="text-gray-900">{selectedCamp.slot_minutes} min</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-gray-500 mb-1">Capacity</div>
                  <div className="text-gray-900">{selectedCamp.capacity_per_slot} / slot</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-gray-500 mb-1">Carpool</div>
                  <div className="text-gray-900">{selectedCamp.carpool_enabled ? 'Enabled' : 'Disabled'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-700 mb-3">
                <Users className="w-4 h-4" />
                <span>Bookings</span>
              </div>

              {bookingsLoading ? (
                <div className="text-gray-600">Loading bookings…</div>
              ) : bookings.length === 0 ? (
                <div className="text-gray-600">No bookings yet</div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div key={b.booking_id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-gray-900 mb-1">{b.donor_name || b.donor_id.slice(0, 8)}</div>
                          <div className="text-gray-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(b.slot_starts_at).toLocaleString()} → {new Date(b.slot_ends_at).toLocaleTimeString()}
                            </span>
                          </div>
                          {b.donor_phone ? (
                            <div className="text-gray-600 flex items-center gap-2 mt-1">
                              <Phone className="w-4 h-4" />
                              <a className="underline" href={`tel:${b.donor_phone}`}>
                                {b.donor_phone}
                              </a>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full text-xs ${b.status === 'attended' ? 'bg-green-100 text-green-700' : b.status === 'cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                              {b.status}
                            </div>
                            {b.status !== 'cancelled' ? (
                              <button
                                onClick={() => markAttendance(b.booking_id, b.status !== 'attended')}
                                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                              >
                                {b.status === 'attended' ? 'Undo' : 'Mark Attended'}
                              </button>
                            ) : null}
                          </div>
                          <button
                            onClick={() => issueCertificate(b.booking_id)}
                            disabled={b.status !== 'attended'}
                            className="px-3 py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm disabled:opacity-60"
                          >
                            Issue Certificate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4 text-gray-700">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Publishing Checklist</span>
            </div>
            <div className="space-y-3 text-gray-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5" />
                <span>Set an accurate camp location</span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 mt-0.5" />
                <span>Provide dates, times, and slot capacity</span>
              </div>
              <div className="flex items-start gap-2">
                <Award className="w-4 h-4 mt-0.5" />
                <span>Issue certificates after attendance is marked</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>Overview</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <div className="opacity-90 mb-1">Total Camps</div>
                <div style={{ fontSize: '1.5rem' }}>{camps.length}</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <div className="opacity-90 mb-1">Published</div>
                <div style={{ fontSize: '1.5rem' }}>{camps.filter((c) => c.is_published).length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
