import { useEffect, useState } from 'react';
import { Heart, CheckCircle, AlertCircle, Calendar, Activity, Thermometer, MapPin, FileText, Sparkles } from 'lucide-react';

type DonorProfile = {
  last_donation_date: string | null;
  eligibility_status: string | null;
};

export function EligibilityView() {
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ getSessionAndRole, getProfile }] = await Promise.all([
          import('../../../services/auth'),
        ]);
        const { role } = await getSessionAndRole();
        if (!active || role !== 'donor') {
          if (active) {
            setProfile(null);
          }
          return;
        }
        const data = (await getProfile('donor')) as DonorProfile | null;
        if (!active) {
          return;
        }
        setProfile(data);
      } catch {
        if (active) {
          setProfile(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const lastDonationDate = profile?.last_donation_date
    ? new Date(profile.last_donation_date).toLocaleDateString()
    : null;
  const lastDonationDateObject = profile?.last_donation_date
    ? new Date(profile.last_donation_date)
    : null;
  const daysSinceLastDonation =
    lastDonationDateObject && !Number.isNaN(lastDonationDateObject.getTime())
      ? Math.max(0, Math.floor((Date.now() - lastDonationDateObject.getTime()) / (1000 * 60 * 60 * 24)))
      : null;
  const eligibilityStatus = profile?.eligibility_status || null;

  const showData = !loading && !!profile;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Eligibility Management</h2>
        <p className="text-gray-600">Track your health status and donation eligibility</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-8 h-8" />
                  <h3>
                    {showData
                      ? eligibilityStatus || 'Eligibility status not available'
                      : 'Eligibility status will appear once your profile is set up'}
                  </h3>
                </div>
                <p className="opacity-90">
                  {showData
                    ? 'This information reflects your current donor profile.'
                    : 'No data available yet. This information will appear once activity begins.'}
                </p>
              </div>
              <div className="text-right">
                <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                  <div style={{ fontSize: '2rem' }}>{showData && eligibilityStatus ? '✓' : '–'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                <div className="opacity-90 mb-1">Last Donation</div>
                <div>{showData && lastDonationDate ? lastDonationDate : 'Not recorded yet'}</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                <div className="opacity-90 mb-1">Next Eligible</div>
                <div>
                  {showData && lastDonationDate
                    ? 'Calculated by your care team'
                    : 'Will be calculated after your first donation'}
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                <div className="opacity-90 mb-1">Eligibility Notes</div>
                <div>{showData && eligibilityStatus ? eligibilityStatus : 'No notes yet'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Health Parameters</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                    <Activity className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-gray-900 mb-1">Key health indicators</div>
                    <p className="text-gray-500">
                      Actual values will be shown here once connected to your medical reports.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-900">
                    {showData ? 'Awaiting clinical data' : 'No records yet'}
                  </span>
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Health Questionnaire */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Health Questionnaire</h3>

            <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
              No data available yet. This information will appear once activity begins.
            </div>
          </div>

          {/* Travel History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Travel History</h3>

            <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
              No data available yet. This information will appear once activity begins.
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* AI Eligibility Indicator */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6" />
              <h3>AI Eligibility Insights</h3>
            </div>

            <div className="text-center mb-4">
              <div style={{ fontSize: '3rem' }} className="mb-2">—</div>
              <div className="bg-white/20 backdrop-blur rounded-lg py-2">
                Insights not available yet
              </div>
            </div>

            <p className="opacity-90">
              AI-based health insights will appear here once connected to your medical reports.
            </p>
          </div>

          {/* Next Eligible Date */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Donation Timeline</h3>


            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-green-700">
                    {showData && eligibilityStatus ? eligibilityStatus : 'Eligibility status not available'}
                  </div>
                  <p className="text-green-600">
                    {showData
                      ? 'This status is based on your donor profile.'
                      : 'Status will appear once your profile is set up.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-700 mb-1">Last Donation</div>
                <p className="text-gray-900">
                  {lastDonationDate || 'No donations recorded yet'}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-700 mb-1">Days Since Last Donation</div>
                <p className="text-gray-900">
                  {daysSinceLastDonation != null ? `${daysSinceLastDonation} days` : 'Not available'}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700">
                You can donate whole blood every 90 days
              </p>
            </div>
          </div>

          {/* Reminders */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Reminders</h3>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Eligibility check reminder</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Health parameter updates</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-700">Pre-donation preparation tips</span>
              </label>
            </div>
          </div>

          {/* Upload Reports */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Medical Reports</h3>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No records found</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
