import { useEffect, useState } from 'react';
import { TrendingUp, Download, Sparkles } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface DonorHistoryDonation {
  donation_id: string;
  donation_date: string | null;
  component: string | null;
  hospital_name: string | null;
  patient_label: string | null;
  reward_points: number | null;
  cycle_number: number | null;
}

interface DonorHistoryData {
  lastDonationDate: string | null;
  eligibilityStatus: string | null;
  donations: DonorHistoryDonation[];
}

export function DonorHistoryView() {
  const [data, setData] = useState<DonorHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
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
        if (!session || role !== 'donor') {
          if (active) {
            setData(null);
            setLoading(false);
          }
          return;
        }
        const profile: any = await getProfile(role);
        const lastDonationDate: string | null = profile?.last_donation_date ?? null;
        const { data: donationsData } = await supabase.rpc('donor_list_donation_history', {
          p_limit: 200,
        } as any);
        const rawRows = Array.isArray(donationsData) ? (donationsData as any[]) : [];
        const donations: DonorHistoryDonation[] = rawRows
          .map((r) => ({
            donation_id: typeof r?.donation_id === 'string' ? r.donation_id : '',
            donation_date: typeof r?.donation_date === 'string' ? r.donation_date : null,
            component: typeof r?.component === 'string' ? r.component : null,
            hospital_name: typeof r?.hospital_name === 'string' ? r.hospital_name : null,
            patient_label: typeof r?.patient_label === 'string' ? r.patient_label : null,
            reward_points: typeof r?.reward_points === 'number' ? r.reward_points : null,
            cycle_number: typeof r?.cycle_number === 'number' ? r.cycle_number : null,
          }))
          .filter((r) => r.donation_id);
        if (active) {
          setData({
            lastDonationDate,
            eligibilityStatus: profile?.eligibility_status ?? null,
            donations,
          });
          setLoading(false);
        }
      } catch {
        if (active) {
          setData(null);
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const formattedLastDonation = data?.lastDonationDate
    ? new Date(data.lastDonationDate).toLocaleDateString()
    : null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Donation History</h2>
        <p className="text-gray-600">Track all your blood donations and their impact</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-gray-500 mb-1">Last Donation</div>
              <div className="text-gray-900">
                {formattedLastDonation || 'No donations recorded yet'}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-gray-500 mb-1">Eligibility</div>
              <div className="text-gray-900">
                {data?.eligibilityStatus || 'Eligibility status not set'}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-gray-500 mb-1">Donation History</div>
              <div className="text-gray-900">
                {data && data.donations.length > 0
                  ? `${data.donations.length} recorded donation${
                      data.donations.length === 1 ? '' : 's'
                    }`
                  : 'No donation history yet'}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-gray-500 mb-1">Certificates</div>
              <div className="text-gray-900">
                {data && data.donations.length > 0
                  ? 'Certificates available for your donations'
                  : 'Certificates will appear once donations are logged'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <select className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>All Time</option>
                <option>Last 6 Months</option>
                <option>Last Year</option>
                <option>Last 2 Years</option>
              </select>
              <select className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>All Types</option>
                <option>Whole Blood</option>
                <option>Platelets</option>
                <option>Plasma</option>
              </select>
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                Filter
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
                <p className="text-gray-900 mb-2">Loading your donation history...</p>
              </div>
            ) : data && data.donations.length > 0 ? (
              data.donations.map((donation) => {
                const formattedDate = donation.donation_date
                  ? new Date(donation.donation_date).toLocaleString()
                  : 'Unknown date';
                const componentLabel = donation.component || 'Donation';
                const subtitleParts = [
                  donation.patient_label ? `Patient: ${donation.patient_label}` : null,
                  donation.hospital_name ? `Hospital: ${donation.hospital_name}` : null,
                  typeof donation.reward_points === 'number' ? `Points: ${donation.reward_points}` : null,
                  typeof donation.cycle_number === 'number' ? `Cycle: ${donation.cycle_number}` : null,
                ].filter((v): v is string => typeof v === 'string' && v.length > 0);
                const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : null;
                return (
                  <div
                    key={donation.donation_id}
                    className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-gray-900 mb-1">{componentLabel}</div>
                      <div className="text-gray-600">{formattedDate}</div>
                      {subtitle ? <div className="text-gray-600">{subtitle}</div> : null}
                    </div>
                    <div className="text-green-600 font-medium">Completed</div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
                <p className="text-gray-900 mb-2">No donation history yet</p>
                <p className="text-gray-500">
                  When your donations are recorded, they will appear in this timeline.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Previous
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg">1</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">2</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">3</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6" />
              <h3>AI Insights</h3>
            </div>
            <p className="opacity-90">
              Analytics will appear here once your donation history is connected.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Donation Types</h3>
            <p className="text-gray-600">
              Donation type breakdown will be available once history data is stored.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Most Visited</h3>
            <p className="text-gray-600">
              Locations will appear here after your first recorded donations.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Recovery Stats</h3>
            <p className="text-gray-600">
              Recovery information will appear here once donation data is available.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Certificates</h3>
            <div className="space-y-2">
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex items-center justify-between">
                <span className="text-gray-700">Download All (PDF)</span>
                <Download className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex items-center justify-between">
                <span className="text-gray-700">Share via Email</span>
              </button>
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex items-center justify-between">
                <span className="text-gray-700">Tax Certificate</span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              <h3>Milestones</h3>
            </div>
            <p className="opacity-90">
              Milestones will appear here after your donation history is connected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
