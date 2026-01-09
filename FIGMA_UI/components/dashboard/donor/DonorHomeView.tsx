import { useEffect, useState } from 'react';
import { AlertCircle, Heart, TrendingUp, Calendar, MapPin, Clock, Droplet, Award } from 'lucide-react';
import { DonorDashboardView } from '../../DonorDashboard';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface DonorHomeViewProps {
  onNavigate: (view: DonorDashboardView) => void;
}

interface DonorDashboardData {
  name: string;
  eligibilityStatus: string | null;
  lastDonationDate: string | null;
  daysSinceLastDonation: number | null;
  totalDonations: number;
  totalPoints: number;
  nextDonationDate: string | null;
  pendingRequests: number;
  previewRequests: Array<{
    id: string;
    blood_group: string | null;
    component: string | null;
    units_required: number | null;
    urgency: string | null;
    created_at: string | null;
  }>;
}

export function DonorHomeView({ onNavigate }: DonorHomeViewProps) {
  const [data, setData] = useState<DonorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshTick } = useAutoRefresh();

  useEffect(() => {
    let active = true;
    let inboxChannel: any = null;
    let donationsChannel: any = null;
    let rewardsChannel: any = null;
    let reloadTimer: any = null;
    const load = async () => {
      try {
        const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'donor') {
          if (active) {
            setData(null);
            setLoading(false);
          }
          return;
        }
        const uid = session.user.id;
        const profile: any = await getProfile(role);
        const lastDonationDate: string | null = profile?.last_donation_date ?? null;
        let daysSinceLastDonation: number | null = null;
        if (lastDonationDate) {
          const donationDate = new Date(lastDonationDate);
          if (!Number.isNaN(donationDate.getTime())) {
            const diffMs = Date.now() - donationDate.getTime();
            daysSinceLastDonation = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          }
        }

        const now = new Date();
        const [donationsResult, rewardsResult, pendingCountResult, previewResult] = await Promise.all([
          supabase
            .from('donor_donations')
            .select('donation_date')
            .eq('donor_id', uid)
            .order('donation_date', { ascending: true }),
          supabase.from('donor_rewards').select('points').eq('donor_id', uid),
          supabase
            .from('donor_request_inbox')
            .select('id', { count: 'exact', head: true })
            .eq('donor_id', uid)
            .eq('status', 'pending'),
          supabase
            .from('donor_request_inbox')
            .select('id, created_at, request_id, blood_requests(id, blood_group, component, quantity_units, urgency, created_at)')
            .eq('donor_id', uid)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(3),
        ]);

        const donations = Array.isArray(donationsResult.data) ? donationsResult.data : [];
        const rewards = Array.isArray(rewardsResult.data) ? rewardsResult.data : [];

        const totalDonations = donations.length;
        const upcomingDonations = donations.filter((d: any) => {
          if (!d.donation_date) return false;
          const date = new Date(d.donation_date);
          return !Number.isNaN(date.getTime()) && date.getTime() > now.getTime();
        });
        const nextDonationDate =
          upcomingDonations.length > 0 ? upcomingDonations[0].donation_date ?? null : null;

        const totalPoints = rewards.reduce((sum: number, r: any) => {
          const points = typeof r.points === 'number' ? r.points : 0;
          return sum + points;
        }, 0);

        const pendingRequests = pendingCountResult.count ?? 0;
        const previewRequests = Array.isArray(previewResult.data)
          ? (previewResult.data as any[]).map((row: any) => {
              const br = row?.blood_requests || {};
              return {
                id: br.id ?? row.request_id,
                blood_group: br.blood_group ?? null,
                component: br.component ?? null,
                units_required: (br as any).units_required ?? (br as any).quantity_units ?? null,
                urgency: br.urgency ?? null,
                created_at: br.created_at ?? row.created_at ?? null,
              };
            })
          : [];

        if (active) {
          setData({
            name: profile?.full_name || 'Donor',
            eligibilityStatus: profile?.eligibility_status ?? null,
            lastDonationDate,
            daysSinceLastDonation,
            totalDonations,
            totalPoints,
            nextDonationDate,
            pendingRequests,
            previewRequests,
          });
          setLoading(false);
        }

        if (!inboxChannel) {
          const scheduleReload = () => {
            if (!active) return;
            if (reloadTimer) return;
            reloadTimer = setTimeout(() => {
              reloadTimer = null;
              load();
            }, 250);
          };
          inboxChannel = supabase
            .channel(`donor_home_inbox_${uid}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'donor_request_inbox', filter: `donor_id=eq.${uid}` },
              () => scheduleReload(),
            )
            .subscribe();
          donationsChannel = supabase
            .channel(`donor_home_donations_${uid}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'donor_donations', filter: `donor_id=eq.${uid}` },
              () => scheduleReload(),
            )
            .subscribe();
          rewardsChannel = supabase
            .channel(`donor_home_rewards_${uid}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'donor_rewards', filter: `donor_id=eq.${uid}` },
              () => scheduleReload(),
            )
            .subscribe();
        }
      } catch {
        if (active) {
          setData(null);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
      if (reloadTimer) {
        clearTimeout(reloadTimer);
      }
      if (inboxChannel) {
        inboxChannel.unsubscribe();
      }
      if (donationsChannel) {
        donationsChannel.unsubscribe();
      }
      if (rewardsChannel) {
        rewardsChannel.unsubscribe();
      }
    };
  }, [refreshTick]);

  const formattedLastDonation = data?.lastDonationDate
    ? new Date(data.lastDonationDate).toLocaleDateString()
    : null;

  const formattedNextDonation = data?.nextDonationDate
    ? new Date(data.nextDonationDate).toLocaleString()
    : null;

  const livesSaved = data ? data.totalDonations * 3 : null;

  return (
    <div className="p-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="mb-2">
              {loading ? 'Welcome back' : `Welcome back, ${data?.name || 'Donor'}! 🎉`}
            </h2>
            <p className="opacity-90 mb-4">
              {data?.eligibilityStatus
                ? `You are currently ${data.eligibilityStatus.toLowerCase()} to donate.`
                : 'Your donation eligibility will appear here once available.'}
            </p>
            <button 
              onClick={() => onNavigate('schedule')}
              className="px-6 py-3 bg-white text-green-600 rounded-xl hover:bg-gray-100 transition"
            >
              Schedule Donation
            </button>
          </div>
          <div className="text-right">
            <div className="mb-2">Last Donation</div>
            <div style={{ fontSize: '2.5rem' }}>
              {data?.daysSinceLastDonation != null ? `${data.daysSinceLastDonation} days` : '—'}
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg mt-3">
              {formattedLastDonation || 'No donations recorded yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Droplet className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-red-600">Total</span>
          </div>
          <div className="text-gray-900 mb-1">
            {data && data.totalDonations > 0
              ? `${data.totalDonations} donation${data.totalDonations === 1 ? '' : 's'}`
              : 'No donation history yet'}
          </div>
          <p className="text-gray-500">
            {data && data.totalDonations > 0
              ? 'Thank you for your life-saving contributions'
              : 'Your future donations will appear here'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-green-600">Impact</span>
          </div>
          <div className="text-gray-900 mb-1">
            {data && data.totalDonations > 0
              ? `${data.totalDonations * 3} lives potentially impacted`
              : 'No impact data yet'}
          </div>
          <p className="text-gray-500">
            {data && data.totalDonations > 0
              ? 'Based on an estimate of 3 lives per donation'
              : 'Impact will appear after your first donation'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-orange-600">Requests</span>
          </div>
          <div className="text-gray-900 mb-1">
            {loading
              ? 'Loading requests...'
              : data && data.pendingRequests > 0
                ? `${data.pendingRequests} pending request${data.pendingRequests === 1 ? '' : 's'}`
                : 'No pending requests'}
          </div>
          <p className="text-gray-500">
            {data && data.pendingRequests > 0
              ? 'View and respond in Live Requests'
              : 'Matching requests will appear here'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-violet-600" />
            </div>
            <span className="text-violet-600">Points</span>
          </div>
          <div className="text-gray-900 mb-1">
            {data && data.totalPoints > 0 ? `${data.totalPoints} points earned` : 'No rewards yet'}
          </div>
          <p className="text-gray-500">
            {data && data.totalPoints > 0
              ? 'Keep donating to unlock more rewards'
              : 'Rewards will appear as you donate'}
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-8">
        {/* Live Emergency Requests */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Live Emergency Requests</h3>
            <button
              onClick={() => onNavigate('live-requests')}
              className="text-green-600 hover:text-green-700"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
                Loading requests...
              </div>
            ) : !data || data.previewRequests.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                No live requests right now. New requests will appear here.
              </div>
            ) : (
              data.previewRequests.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-gray-900">
                        {(r.blood_group || '—') + ' • ' + (r.component || '—')}
                      </div>
                      <div className="text-gray-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                        </span>
                        <span>•</span>
                        <span>
                          {r.units_required != null ? `${r.units_required} unit${r.units_required === 1 ? '' : 's'}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('live-requests')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Respond
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Eligibility Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Eligibility Status</h3>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Heart className="w-5 h-5" />
                <span>
                  {data?.eligibilityStatus || 'Eligibility status not set'}
                </span>
              </div>
              <p className="text-green-600">
                Eligibility status is based on your donor profile.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Last Donation</span>
                <span className="text-gray-900">
                  {formattedLastDonation || 'No donations yet'}
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('eligibility')}
              className="w-full mt-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              View Full Status
            </button>
          </div>

          {/* Upcoming Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Upcoming Schedule</h3>
            
            <div className="space-y-3">
              {formattedNextDonation ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Next donation booked</span>
                  </div>
                  <p className="text-green-700">{formattedNextDonation}</p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-700 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>No upcoming donations scheduled</span>
                  </div>
                  <p className="text-gray-600">
                    Scheduled donations will appear here once you create them.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Impact */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              <h3>Your Impact</h3>
            </div>

            <div className="bg-white/20 backdrop-blur rounded-lg p-4 mb-3">
              <div className="mb-2">Lives Saved</div>
              <div style={{ fontSize: '2rem' }}>{livesSaved != null ? livesSaved : '—'}</div>
            </div>

            <p className="opacity-90">
              {livesSaved && livesSaved > 0
                ? 'Based on an estimate of 3 lives per donation'
                : 'Impact metrics will appear here after your first donation.'}
            </p>
          </div>

          {/* Nearby Camps */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Nearby Camps</h3>
              <button
                onClick={() => onNavigate('camps')}
                className="text-green-600 hover:text-green-700"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg text-gray-600">
                No nearby camps available right now.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
