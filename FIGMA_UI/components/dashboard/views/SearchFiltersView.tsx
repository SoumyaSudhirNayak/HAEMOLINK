import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Droplet, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { DashboardView } from '../../PatientDashboard';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface SearchFiltersViewProps {
  onNavigate: (view: DashboardView) => void;
}

type SortOption = 'distance' | 'freshness' | 'units';

type HospitalMatch = {
  hospital_id: string;
  name: string;
  address: string;
  contact: string;
  units: number;
  freshness_days: number | null;
  distance_km: number | null;
  verified: boolean;
  components: string[];
  compatibility: 'perfect' | 'good';
};

export function SearchFiltersView({ onNavigate }: SearchFiltersViewProps) {
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [component, setComponent] = useState<string>('Whole Blood');
  const [location, setLocation] = useState<string>('');
  const [urgency, setUrgency] = useState<'emergency' | 'scheduled'>('emergency');
  const [minUnits, setMinUnits] = useState<number>(1);
  const [sort, setSort] = useState<SortOption>('units');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<HospitalMatch[]>([]);
  const [applyNonce, setApplyNonce] = useState(0);
  const [patientPos, setPatientPos] = useState<{ lat: number; lng: number } | null>(null);
  const { refreshTick } = useAutoRefresh();

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem('patient_search_filters');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.blood_group === 'string') setBloodGroup(parsed.blood_group);
      if (typeof parsed?.component_type === 'string') setComponent(parsed.component_type);
      if (typeof parsed?.location === 'string') setLocation(parsed.location);
      if (parsed?.urgency === 'scheduled' || parsed?.urgency === 'emergency') setUrgency(parsed.urgency);
      setApplyNonce((n) => n + 1);
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ getSessionAndRole, getProfile }, { getBestDeviceFix }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../utils/geo'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'patient') return;
        try {
          const profile: any = await getProfile('patient');
          const lat = typeof profile?.latitude === 'number' ? profile.latitude : null;
          const lng = typeof profile?.longitude === 'number' ? profile.longitude : null;
          if (active && lat != null && lng != null) setPatientPos({ lat, lng });
        } catch {}
        try {
          const bestFix = await getBestDeviceFix(10000, 8);
          const lat = bestFix && bestFix.coords && typeof bestFix.coords.latitude === 'number' ? bestFix.coords.latitude : null;
          const lng = bestFix && bestFix.coords && typeof bestFix.coords.longitude === 'number' ? bestFix.coords.longitude : null;
          if (active && lat != null && lng != null) setPatientPos({ lat, lng });
        } catch {}
      } catch {}
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

  const loadMatches = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'patient') {
        setMatches([]);
        return;
      }
      const { data, error: rpcError } = await supabase.rpc('find_matching_hospitals', {
        p_blood_group: bloodGroup.trim() || null,
        p_component: component.trim() || null,
        p_location: location.trim() || null,
        p_urgency: urgency,
        p_patient_lat: patientPos ? patientPos.lat : null,
        p_patient_lng: patientPos ? patientPos.lng : null,
        p_radius_km: 25,
        p_min_units: Math.max(1, minUnits || 1),
      } as any);
      if (rpcError) throw rpcError;

      const rows = Array.isArray(data) ? (data as any[]) : [];
      const compiled: HospitalMatch[] = rows.map((r) => {
        const distance_km = typeof r?.distance_km === 'number' ? r.distance_km : null;
        const compatibility: HospitalMatch['compatibility'] = bloodGroup.trim() && component.trim() ? 'perfect' : 'good';
        return {
          hospital_id: typeof r?.hospital_id === 'string' ? r.hospital_id : '',
          name: typeof r?.name === 'string' ? r.name : 'Hospital',
          address: typeof r?.address === 'string' ? r.address : '',
          contact: typeof r?.contact === 'string' ? r.contact : '',
          units: typeof r?.units === 'number' ? r.units : 0,
          freshness_days: typeof r?.freshness_days === 'number' ? r.freshness_days : null,
          distance_km,
          verified: !!r?.verified,
          components: Array.isArray(r?.components) ? r.components : [],
          compatibility,
        };
      });

      setMatches(compiled);
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : 'Failed to load hospitals';
      setError(msg);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [bloodGroup, component, location, minUnits, patientPos]);

  useEffect(() => {
    if (applyNonce <= 0) return;
    loadMatches();
  }, [applyNonce, loadMatches, refreshTick]);

  const sortedMatches = useMemo(() => {
    const items = [...matches];
    if (sort === 'freshness') {
      items.sort((a, b) => {
        const av = typeof a.freshness_days === 'number' ? a.freshness_days : Number.POSITIVE_INFINITY;
        const bv = typeof b.freshness_days === 'number' ? b.freshness_days : Number.POSITIVE_INFINITY;
        if (av !== bv) return av - bv;
        return b.units - a.units;
      });
      return items;
    }
    if (sort === 'units') {
      items.sort((a, b) => b.units - a.units);
      return items;
    }
    if (sort === 'distance') {
      items.sort((a, b) => {
        const av = typeof a.distance_km === 'number' ? a.distance_km : Number.POSITIVE_INFINITY;
        const bv = typeof b.distance_km === 'number' ? b.distance_km : Number.POSITIVE_INFINITY;
        if (av !== bv) return av - bv;
        return b.units - a.units;
      });
      return items;
    }
    return items;
  }, [matches, sort]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Search Blood Availability</h2>
        <p className="text-gray-600">Filter and find the best match for your requirements</p>
      </div>

      <div className="grid grid-cols-4 gap-8">
        {/* Filter Panel */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Filters</h3>

            {/* Blood Group */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-3">Blood Group</label>
              <div className="grid grid-cols-4 gap-2">
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setBloodGroup(type)}
                    className={`px-3 py-2 border rounded-lg transition ${
                      bloodGroup === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Component */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-3">Component</label>
              <div className="space-y-2">
                {['Whole Blood', 'RBC', 'Plasma', 'Platelets', 'Cryoprecipitate'].map((comp) => (
                  <label key={comp} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="component"
                      className="text-blue-600"
                      checked={component === comp}
                      onChange={() => setComponent(comp)}
                    />
                    <span className="text-gray-600">{comp}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-3">Urgency</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="urgency" className="text-blue-600" checked={urgency === 'emergency'} onChange={() => setUrgency('emergency')} />
                  <span className="text-gray-600">Emergency</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="urgency" className="text-blue-600" checked={urgency === 'scheduled'} onChange={() => setUrgency('scheduled')} />
                  <span className="text-gray-600">Scheduled</span>
                </label>
              </div>
            </div>

            {/* Location */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-3">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Stock Units */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-3">Minimum Units</label>
              <input
                type="number"
                min="1"
                value={minUnits}
                onChange={(e) => setMinUnits(Number(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => setApplyNonce((n) => n + 1)}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-gray-900">
                {loading
                  ? 'Searching…'
                  : `Found ${sortedMatches.length} hospital${sortedMatches.length === 1 ? '' : 's'}${bloodGroup ? ` with ${bloodGroup}` : ''} availability`}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="units">Sort by Units Available</option>
                <option value="freshness">Sort by Freshness</option>
                <option value="distance">Sort by Distance</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && sortedMatches.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
                No matching hospitals found.
              </div>
            )}

            {sortedMatches.map((bank) => (
              <div
                key={bank.hospital_id}
                className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-300 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-gray-900 mb-2">{bank.name}</div>
                    <p className="text-gray-500 mb-3">{bank.address}</p>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <span className="flex items-center gap-1 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {typeof bank.distance_km === 'number'
                          ? `${bank.distance_km.toFixed(1)} km`
                          : location.trim()
                            ? 'Location match'
                            : 'Nearby'}
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <Droplet className="w-4 h-4" />
                        {bank.units} units available
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        {typeof bank.freshness_days === 'number' ? `${bank.freshness_days} days old` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {bank.components.map((comp) => (
                        <span key={comp} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                      bank.compatibility === 'perfect' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {bank.compatibility === 'perfect' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {bank.compatibility === 'perfect' ? 'Perfect Match' : 'Good Match'}
                    </div>

                    <button
                      onClick={() => onNavigate('request-blood')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Select
                    </button>
                  </div>
                </div>

                <div className={`mt-4 pt-4 border-t ${
                  typeof bank.freshness_days === 'number' && bank.freshness_days <= 3 ? 'border-green-200' : 'border-orange-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${
                      typeof bank.freshness_days === 'number' && bank.freshness_days <= 3 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        typeof bank.freshness_days === 'number' && bank.freshness_days <= 3 ? 'bg-green-500' : 'bg-orange-500'
                      }`} />
                      <span>{typeof bank.freshness_days === 'number' && bank.freshness_days <= 3 ? 'Fresh - Recommended' : 'Available - Moderate Age'}</span>
                    </div>
                    <span className="text-gray-500">{bank.verified ? 'Verified' : 'Unverified'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
