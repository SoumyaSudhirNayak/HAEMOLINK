import { useEffect, useRef, useState } from 'react';
import { AlertCircle, MapPin, Clock, Droplet, Search, TrendingUp } from 'lucide-react';
import { DashboardView } from '../../PatientDashboard';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface HomeViewProps {
  onNavigate: (view: DashboardView) => void;
}

interface HomeStats {
  activeRequests: number;
  totalTransfusions: number;
  recentRequests: Array<{
    id: string;
    status: string | null;
    component: string | null;
    blood_group: string | null;
    urgency: string | null;
    units_required: number | null;
    created_at: string | null;
    accepted_by_type?: string | null;
  }>;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [searchBloodGroup, setSearchBloodGroup] = useState<string>('');
  const [searchComponent, setSearchComponent] = useState<string>('Whole Blood');
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [searchUrgency, setSearchUrgency] = useState<'emergency' | 'scheduled'>('emergency');
  const { refreshTick } = useAutoRefresh();
  const reloadRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    let active = true;
    let channelRequests: any = null;
    let channelTransfusions: any = null;
    (async () => {
      try {
        const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'patient') {
          if (active) {
            setStats({ activeRequests: 0, totalTransfusions: 0, recentRequests: [] });
          }
          return;
        }

        try {
          const profile = await getProfile('patient');
          if (active) {
            setSearchBloodGroup(profile?.blood_group || '');
            setSearchLocation(profile?.location || '');
          }
        } catch {}

        const load = async () => {
          const [requestsResult, transfusionsResult, recentRequestsResult] = await Promise.all([
            supabase
              .from('blood_requests')
              .select('id, status', { count: 'exact', head: true })
              .eq('patient_id', session.user.id)
              .in('status', ['open', 'pending', 'accepted', 'preparing', 'dispatched', 'assigned', 'in_transit']),
            supabase
              .from('patient_transfusions')
              .select('id', { count: 'exact', head: true })
              .eq('patient_id', session.user.id),
            supabase
              .from('blood_requests')
              .select('id, status, component, blood_group, urgency, quantity_units, created_at, accepted_by_type')
              .eq('patient_id', session.user.id)
              .order('created_at', { ascending: false })
              .limit(3),
          ]);
          if (!active) return;
          const activeRequests = requestsResult.count ?? 0;
          const totalTransfusions = transfusionsResult.count ?? 0;
          const recentRows = Array.isArray(recentRequestsResult.data) ? recentRequestsResult.data : [];
          const recentRequests = recentRows.map((r: any) => ({
            id: r.id,
            status: r.status ?? null,
            component: r.component ?? null,
            blood_group: r.blood_group ?? null,
            urgency: r.urgency ?? null,
            units_required: (r as any).units_required ?? (r as any).quantity_units ?? null,
            created_at: r.created_at ?? null,
            accepted_by_type: (r as any).accepted_by_type ?? null,
          }));
          setStats({ activeRequests, totalTransfusions, recentRequests });
        };

        reloadRef.current = () => {
          void load();
        };
        await load();

        channelRequests = supabase
          .channel(`patient_home_requests_${session.user.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'blood_requests', filter: `patient_id=eq.${session.user.id}` },
            () => {
              load();
            },
          )
          .subscribe();

        channelTransfusions = supabase
          .channel(`patient_home_transfusions_${session.user.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'patient_transfusions', filter: `patient_id=eq.${session.user.id}` },
            () => {
              load();
            },
          )
          .subscribe();
      } catch {
        if (active) {
          setStats({ activeRequests: 0, totalTransfusions: 0, recentRequests: [] });
        }
      }
    })();
    return () => {
      active = false;
      reloadRef.current = null;
      if (channelRequests) {
        channelRequests.unsubscribe();
      }
      if (channelTransfusions) {
        channelTransfusions.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (reloadRef.current) reloadRef.current();
  }, [refreshTick]);

  const latestRequest = stats?.recentRequests?.[0] ?? null;
  const availabilityTitle = (() => {
    if (!stats) return 'Loading availability...';
    if (!latestRequest) return 'No requests yet';
    const s = (latestRequest.status || '').toLowerCase();
    if (s === 'open' || s === 'pending') return 'Searching nearby matches';
    if (s === 'accepted' || s === 'preparing') return 'Match found';
    if (s === 'assigned' || s === 'dispatched' || s === 'in_transit') return 'Delivery in progress';
    if (s === 'delivered' || s === 'completed') return 'Last delivery completed';
    return 'Request in progress';
  })();
  const availabilitySubtitle = (() => {
    if (!stats) return 'Checking your recent activity';
    if (!latestRequest) return 'Create a blood request to start matching';
    const s = (latestRequest.status || '').toLowerCase();
    if (s === 'open' || s === 'pending') return 'Tracking will update once a donor or hospital accepts';
    if (s === 'accepted' || s === 'preparing') return 'Prepare to track pickup and delivery';
    if (s === 'assigned' || s === 'dispatched' || s === 'in_transit') return 'Open Track Orders for live navigation';
    if (s === 'delivered' || s === 'completed') return 'View details in History';
    return 'Check Track Orders for updates';
  })();

  return (
    <div className="p-8">
      {/* Emergency Search Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 mb-8">
        <h2 className="text-white mb-6">Find Blood Now</h2>
        
        {/* Search Bar */}
        <div className="bg-white rounded-xl p-6 mb-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2">Blood Type</label>
              <select
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchBloodGroup}
                onChange={(e) => setSearchBloodGroup(e.target.value)}
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Component</label>
              <select
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchComponent}
                onChange={(e) => setSearchComponent(e.target.value)}
              >
                <option value="Whole Blood">Whole Blood</option>
                <option value="RBC">RBC</option>
                <option value="Plasma">Plasma</option>
                <option value="Platelets">Platelets</option>
                <option value="Cryoprecipitate">Cryoprecipitate</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Location</label>
              <input
                type="text"
                placeholder="Enter location"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="urgency"
                  value="emergency"
                  className="text-red-600"
                  checked={searchUrgency === 'emergency'}
                  onChange={() => setSearchUrgency('emergency')}
                />
                <span className="text-gray-700">Emergency</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="urgency"
                  value="scheduled"
                  className="text-blue-600"
                  checked={searchUrgency === 'scheduled'}
                  onChange={() => setSearchUrgency('scheduled')}
                />
                <span className="text-gray-700">Scheduled</span>
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            try {
              const payload = {
                blood_group: searchBloodGroup,
                component_type: searchComponent,
                location: searchLocation,
                urgency: searchUrgency,
              };
              window.sessionStorage.setItem('patient_search_filters', JSON.stringify(payload));
            } catch {}
            onNavigate('search-filters');
          }}
          className="w-full py-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2"
        >
          <AlertCircle className="w-5 h-5" />
          Need Blood Now
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Droplet className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-green-600">Availability</span>
          </div>
          <div className="text-gray-900 mb-1">{availabilityTitle}</div>
          <p className="text-gray-500">{availabilitySubtitle}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-blue-600">Requests</span>
          </div>
          <div className="text-gray-900 mb-1">
            {stats
              ? stats.activeRequests > 0
                ? `${stats.activeRequests} active request${stats.activeRequests === 1 ? '' : 's'}`
                : 'No active requests'
              : 'Loading requests...'}
          </div>
          <p className="text-gray-500">
            {stats && stats.activeRequests > 0
              ? 'Track your requests in the Track Orders section'
              : 'You have not made any requests yet'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-violet-600" />
            </div>
            <span className="text-violet-600">History</span>
          </div>
          <div className="text-gray-900 mb-1">
            {stats
              ? stats.totalTransfusions > 0
                ? `${stats.totalTransfusions} transfusion${stats.totalTransfusions === 1 ? '' : 's'} recorded`
                : 'No transfusions recorded'
              : 'Loading history...'}
          </div>
          <p className="text-gray-500">
            {stats && stats.totalTransfusions > 0
              ? 'View full details in the Transfusion History section'
              : 'History will appear after your first transfusion'}
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-8">
        {/* Nearby Availability */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Nearby Availability</h3>
            <button
              onClick={() => onNavigate('search-filters')}
              className="text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {stats === null ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
                Loading availability...
              </div>
            ) : stats.recentRequests.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
                No recent requests yet.
              </div>
            ) : (
              stats.recentRequests.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-gray-900">
                      {(r.blood_group || '—') + ' • ' + (r.component || '—')}
                    </div>
                    <div className="text-gray-600">
                      {r.units_required != null ? `${r.units_required} unit${r.units_required === 1 ? '' : 's'}` : '—'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <div>
                      Status: {r.status || 'Not recorded'}
                    </div>
                    <div>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity & Notifications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Recent Activity</h3>
            <button
              onClick={() => onNavigate('notifications')}
              className="text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {stats === null ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
                Loading activity...
              </div>
            ) : stats.recentRequests.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
                No recent activity yet.
              </div>
            ) : (
              stats.recentRequests.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-gray-900">
                        Request {r.id.slice(0, 8)}
                      </div>
                      <div className="text-gray-600">
                        {r.urgency ? `Urgency: ${r.urgency}` : 'Urgency not set'}
                      </div>
                    </div>
                    <div className="text-gray-600">
                      {r.status || 'Unknown'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
