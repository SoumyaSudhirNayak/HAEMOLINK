import { MapPin, Droplet, CheckCircle, Phone, MessageCircle, Radio, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

type DonorRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  blood_group: string | null;
  location: string | null;
  eligibility_status: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function DonorSearchView() {
  const [bloodGroup, setBloodGroup] = useState<string>('A+');
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [availability, setAvailability] = useState<'now' | '24h' | '7d' | 'any'>('any');

  const [loading, setLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
  const [donors, setDonors] = useState<Array<DonorRow & { distance_km: number | null; donation_count: number | null; ready: boolean }>>([]);
  const [patientPos, setPatientPos] = useState<{ lat: number; lng: number } | null>(null);
  const { refreshTick } = useAutoRefresh();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'patient') {
          if (active) setDonors([]);
          return;
        }

        try {
          const profile: any = await getProfile('patient');
          if (active) {
            if (typeof profile?.blood_group === 'string' && profile.blood_group) setBloodGroup(profile.blood_group);
            const lat = typeof profile?.latitude === 'number' ? profile.latitude : null;
            const lng = typeof profile?.longitude === 'number' ? profile.longitude : null;
            if (lat != null && lng != null) setPatientPos({ lat, lng });
          }
        } catch {}

        try {
          const { getBestDeviceFix } = await import('../../../utils/geo');
          const bestFix = await getBestDeviceFix(10000, 8);
          if (!active) return;
          const lat = bestFix && bestFix.coords && typeof bestFix.coords.latitude === 'number' ? bestFix.coords.latitude : null;
          const lng = bestFix && bestFix.coords && typeof bestFix.coords.longitude === 'number' ? bestFix.coords.longitude : null;
          if (lat != null && lng != null) setPatientPos({ lat, lng });
        } catch {}
      } catch {
        if (active) setDonors([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  const loadDonors = useCallback(async () => {
    setError(null);
    setBroadcastStatus(null);
    setLoading(true);
    try {
      const [{ getSessionAndRole }, { supabase }] = await Promise.all([
        import('../../../services/auth'),
        import('../../../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'patient') {
        setDonors([]);
        return;
      }
      const { data, error: rpcError } = await supabase.rpc('search_donors_for_patient', {
        p_blood_group: bloodGroup,
        p_patient_lat: patientPos ? patientPos.lat : null,
        p_patient_lng: patientPos ? patientPos.lng : null,
        p_radius_km: radiusKm,
        p_only_ready: availability === 'now',
      } as any);
      if (rpcError) throw rpcError;

      const rows = Array.isArray(data) ? (data as any[]) : [];
      const compiled = rows
        .map((d) => {
          const uid = typeof d?.user_id === 'string' ? d.user_id : '';
          const lat = typeof d?.latitude === 'number' ? d.latitude : null;
          const lng = typeof d?.longitude === 'number' ? d.longitude : null;
          const status = typeof d?.eligibility_status === 'string' ? d.eligibility_status : null;
          const ready = status ? status.toLowerCase().includes('eligible') : false;

          const rpcDistance = typeof d?.distance_km === 'number' ? d.distance_km : null;
          const fallbackDistance =
            !rpcDistance && patientPos && lat != null && lng != null ? haversineKm(patientPos, { lat, lng }) : null;
          const distance_km = rpcDistance ?? fallbackDistance;

          const donation_count = typeof d?.donation_count === 'number' ? d.donation_count : null;

          return {
            user_id: uid,
            full_name: typeof d?.full_name === 'string' ? d.full_name : null,
            phone: typeof d?.phone === 'string' ? d.phone : null,
            blood_group: typeof d?.blood_group === 'string' ? d.blood_group : null,
            location: typeof d?.location === 'string' ? d.location : null,
            eligibility_status: status,
            latitude: lat,
            longitude: lng,
            distance_km: typeof distance_km === 'number' ? distance_km : null,
            donation_count,
            ready,
          };
        })
        .filter((d) => (availability === 'any' ? true : availability === 'now' ? d.ready : true))
        .filter((d) => (typeof d.distance_km === 'number' ? d.distance_km <= radiusKm : true))
        .sort((a, b) => {
          const ad = typeof a.distance_km === 'number' ? a.distance_km : Number.POSITIVE_INFINITY;
          const bd = typeof b.distance_km === 'number' ? b.distance_km : Number.POSITIVE_INFINITY;
          if (ad !== bd) return ad - bd;
          const ac = typeof a.donation_count === 'number' ? a.donation_count : -1;
          const bc = typeof b.donation_count === 'number' ? b.donation_count : -1;
          return bc - ac;
        });

      setDonors(compiled);
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : 'Failed to load donors';
      setError(msg);
      setDonors([]);
    } finally {
      setLoading(false);
    }
  }, [availability, bloodGroup, patientPos, radiusKm]);

  useEffect(() => {
    loadDonors();
  }, [loadDonors, refreshTick]);

  const totals = useMemo(() => {
    const total = donors.length;
    const ready = donors.filter((d) => d.ready).length;
    const withDistance = donors.filter((d) => typeof d.distance_km === 'number') as Array<
      DonorRow & { distance_km: number; donation_count: number | null; ready: boolean }
    >;
    const avgDistance =
      withDistance.length > 0
        ? withDistance.reduce((s, d) => s + d.distance_km, 0) / withDistance.length
        : null;
    return { total, ready, avgDistance };
  }, [donors]);

  const broadcastRequest = useCallback(async () => {
    if (broadcasting) return;
    setError(null);
    setBroadcastStatus(null);
    setBroadcasting(true);
    try {
      const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
        import('../../../services/auth'),
        import('../../../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'patient') throw new Error('Not signed in');

      let latitude: number | null = null;
      let longitude: number | null = null;
      if (patientPos) {
        latitude = patientPos.lat;
        longitude = patientPos.lng;
      }
      if (latitude == null || longitude == null) {
        try {
          const profile: any = await getProfile('patient');
          const lat = typeof profile?.latitude === 'number' ? profile.latitude : null;
          const lng = typeof profile?.longitude === 'number' ? profile.longitude : null;
          latitude = lat ?? latitude;
          longitude = lng ?? longitude;
        } catch {}
      }

      const { data: br, error: brErr } = await supabase
        .from('blood_requests')
        .insert({
          patient_id: session.user.id,
          request_type: 'emergency',
          blood_group: bloodGroup,
          component: 'Whole Blood',
          quantity_units: 1,
          urgency: 'critical',
          status: 'pending',
          patient_latitude: latitude,
          patient_longitude: longitude,
        })
        .select('id')
        .maybeSingle();
      if (brErr) throw brErr;
      const requestId = (br as any)?.id as string | undefined;
      if (!requestId) throw new Error('Request creation failed');

      try {
        await supabase.from('donor_search_requests').insert({
          patient_id: session.user.id,
          blood_group: bloodGroup,
          component: 'Whole Blood',
          radius_km: radiusKm,
        } as any);
      } catch {}

      const { error: rpcError } = await supabase.rpc('broadcast_blood_request', {
        p_request_id: requestId,
        p_patient_lat: latitude,
        p_patient_lng: longitude,
        p_blood_group: bloodGroup,
        p_radius_km: radiusKm,
      } as any);
      if (rpcError) throw rpcError;

      setBroadcastStatus('Broadcast sent to matching donors.');
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : 'Broadcast failed';
      setError(msg);
    } finally {
      setBroadcasting(false);
    }
  }, [bloodGroup, broadcasting, patientPos, radiusKm]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Search Donors</h2>
        <p className="text-gray-600">Find and connect with verified blood donors nearby</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Distance (km)</label>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value) || 10)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={25}>Within 25 km</option>
              <option value={50}>Within 50 km</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="now">Available Now</option>
              <option value="24h">Within 24 hours</option>
              <option value="7d">Within 7 days</option>
              <option value="any">Any</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadDonors}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Search
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={broadcastRequest}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2"
          >
            <Radio className="w-5 h-5" />
            {broadcasting ? 'Broadcasting…' : 'Broadcast Request to Nearby Donors'}
          </button>
          <p className="text-gray-500 text-center mt-2">Send emergency request to all matching donors within {radiusKm}km</p>
          {broadcastStatus ? <div className="mt-3 text-center text-green-700">{broadcastStatus}</div> : null}
          {error ? <div className="mt-3 text-center text-red-700">{error}</div> : null}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-gray-500 mb-1">Total Donors</div>
          <div className="text-gray-900">
            {loading ? '—' : totals.total}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-gray-500 mb-1">Avg Distance</div>
          <div className="text-gray-900">
            {typeof totals.avgDistance === 'number' ? `${totals.avgDistance.toFixed(1)} km` : '—'}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-gray-500 mb-1">Ready Now</div>
          <div className="text-gray-900">
            {loading ? '—' : totals.ready}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-gray-500 mb-1">Your Location</div>
          <div className="text-gray-900">
            {patientPos ? `${patientPos.lat.toFixed(4)}, ${patientPos.lng.toFixed(4)}` : 'Not available'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {donors.length > 0 ? (
          donors.slice(0, 30).map((d) => {
            const name = d.full_name || 'Donor';
            const phone = d.phone || '';
            const readiness = d.ready ? 'Ready' : d.eligibility_status || 'Status unknown';
            const distanceLabel = typeof d.distance_km === 'number' ? `${d.distance_km.toFixed(1)} km` : '—';
            const canCall = !!phone;
            const canChat = !!phone;
            const phoneDigits = phone.replace(/[^\d+]/g, '');
            return (
              <div key={d.user_id} className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                      <Droplet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-gray-900">{name}</div>
                        <CheckCircle className={`w-4 h-4 ${d.ready ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="text-gray-500">{d.blood_group || 'Blood group not set'}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">Distance</div>
                    <div className="text-gray-900 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {distanceLabel}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">Donations</div>
                    <div className="text-gray-900">{d.donation_count != null ? d.donation_count : '—'}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-gray-500 mb-1">Readiness</div>
                  <div className="text-gray-900">{readiness}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={!canCall}
                    onClick={() => window.open(`tel:${phoneDigits}`)}
                    className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                      canCall ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </button>
                  <button
                    disabled={!canChat}
                    onClick={() => window.open(`https://wa.me/${phoneDigits.replace(/^\+/, '')}`, '_blank')}
                    className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                      canChat ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
            <p className="text-gray-900 mb-2">{loading ? 'Searching donors…' : 'No donors found'}</p>
            <p className="text-gray-500">
              Adjust blood group, radius, or availability and try again.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-6 h-6" />
              <h3>Join Donor Community</h3>
            </div>
            <p className="mb-4 opacity-90">
              Connect with a network of verified donors. Get priority access during emergencies.
            </p>
            <button className="px-6 py-2.5 bg-white text-violet-600 rounded-lg hover:bg-gray-100 transition">
              Become a Donor
            </button>
          </div>
          <div className="text-right">
            <div className="mb-1" style={{ fontSize: '2.5rem' }}>{totals.total}</div>
            <p className="opacity-90">Active Donors</p>
          </div>
        </div>
      </div>
    </div>
  );
}
