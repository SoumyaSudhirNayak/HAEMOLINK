import { useEffect, useState } from 'react';
import { Gift, Award, Heart, TrendingUp, Download, Star, Zap } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

type DonorReward = {
  id: string;
  reward_type: string | null;
  points: number | null;
  issued_at: string | null;
  metadata?: Record<string, any> | null;
};

type DonorActivity = {
  id: string;
  activity_type: string | null;
  description: string | null;
  created_at: string | null;
};

type DonorDonation = {
  id: string;
  donation_date: string | null;
  component: string | null;
};

export function RewardsView() {
  const [rewards, setRewards] = useState<DonorReward[]>([]);
  const [activities, setActivities] = useState<DonorActivity[]>([]);
  const [donations, setDonations] = useState<DonorDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { refreshTick } = useAutoRefresh();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (active) setLoading(true);
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!active || !session || role !== 'donor') {
          if (active) {
            setRewards([]);
            setActivities([]);
            setDonations([]);
          }
          return;
        }
        const [rewardsResult, activitiesResult, donationsResult] = await Promise.all([
          supabase
            .from('donor_rewards')
            .select('id, reward_type, points, issued_at, metadata')
            .eq('donor_id', session.user.id)
            .order('issued_at', { ascending: false }),
          supabase
            .from('donor_activity_log')
            .select('id, activity_type, description, created_at')
            .eq('donor_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('donor_donations')
            .select('id, donation_date, component')
            .eq('donor_id', session.user.id)
            .order('donation_date', { ascending: false }),
        ]);
        if (!active) {
          return;
        }
        setRewards((rewardsResult.data || []) as DonorReward[]);
        setActivities((activitiesResult.data || []) as DonorActivity[]);
        setDonations((donationsResult.data || []) as DonorDonation[]);
      } catch {
        if (active) {
          setRewards([]);
          setActivities([]);
          setDonations([]);
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
  }, [refreshKey, refreshTick]);

  useEffect(() => {
    const onBookingUpdated = () => setRefreshKey((k) => k + 1);
    window.addEventListener('donor_booking_updated', onBookingUpdated);
    return () => {
      window.removeEventListener('donor_booking_updated', onBookingUpdated);
    };
  }, []);

  const totalPoints = rewards.reduce((sum, reward) => sum + (reward.points || 0), 0);
  const netPoints = totalPoints;
  const currentYear = new Date().getFullYear();
  const earnedThisYear = rewards.reduce((sum, reward) => {
    if (!reward.issued_at) {
      return sum;
    }
    const year = new Date(reward.issued_at).getFullYear();
    if (year !== currentYear) {
      return sum;
    }
    return sum + (reward.points || 0);
  }, 0);
  const redeemedPoints = rewards.reduce((sum, reward) => {
    const pts = reward.points || 0;
    if (pts < 0) {
      return sum + Math.abs(pts);
    }
    return sum;
  }, 0);
  const milestones = [500, 1000, 2500, 5000];
  const nextMilestone = milestones.find((value) => netPoints < value);
  const pointsToNext = nextMilestone ? Math.max(nextMilestone - netPoints, 0) : 0;
  const healthWalletValue = rewards.reduce((sum, reward) => {
    if (!reward.reward_type) {
      return sum;
    }
    const lower = reward.reward_type.toLowerCase();
    if (lower.includes('health')) {
      return sum + (reward.points || 0);
    }
    return sum;
  }, 0);
  const taxBenefitValue = rewards.reduce((sum, reward) => {
    if (!reward.reward_type) {
      return sum;
    }
    const lower = reward.reward_type.toLowerCase();
    if (lower.includes('tax')) {
      return sum + (reward.points || 0);
    }
    return sum;
  }, 0);
  const partnerRewards = rewards.filter((reward) => {
    if (!reward.reward_type) {
      return false;
    }
    const lower = reward.reward_type.toLowerCase();
    return lower.includes('partner') || lower.includes('discount');
  });
  const campCertificates = rewards.filter((reward) => {
    const t = reward.reward_type ? reward.reward_type.toLowerCase() : '';
    if (!t) return false;
    if (t === 'certificate_camp') return true;
    if (!t.includes('certificate')) return false;
    const meta = reward.metadata;
    return !!(meta && (meta.camp_id || meta.booking_id));
  });
  const transfusionCertificates = rewards.filter((reward) => {
    const t = reward.reward_type ? reward.reward_type.toLowerCase() : '';
    if (!t) return false;
    if (t === 'certificate_transfusion') return true;
    if (!t.includes('certificate')) return false;
    const meta = reward.metadata;
    return !!(meta && meta.schedule_id);
  });
  const certificates = [...campCertificates, ...transfusionCertificates].sort((a, b) => {
    const ad = a.issued_at ? new Date(a.issued_at).getTime() : 0;
    const bd = b.issued_at ? new Date(b.issued_at).getTime() : 0;
    return bd - ad;
  });
  const donationCount = donations.length;
  const badges = [
    { name: 'First Donation', icon: '🎉', earned: donationCount >= 1 },
    { name: '10 Donations', icon: '⭐', earned: donationCount >= 10 },
    { name: 'Emergency Hero', icon: '🚨', earned: false },
    { name: '25 Donations', icon: '🏆', earned: donationCount >= 25 },
    { name: 'Consistent Donor', icon: '📅', earned: false },
    { name: 'Cohort Member', icon: '👥', earned: false },
    { name: '50 Donations', icon: '💎', earned: donationCount >= 50 },
    { name: 'Lifetime Donor', icon: '👑', earned: false },
  ];
  const impactDonations = donations.slice(0, 3);
  const nextRewardProgress = nextMilestone
    ? Math.min(100, (netPoints / nextMilestone) * 100)
    : 100;

  const downloadCertificate = (reward: DonorReward) => {
    const meta = reward.metadata || {};
    const t = reward.reward_type ? reward.reward_type.toLowerCase() : '';
    const donorName = typeof meta.donor_name === 'string' ? meta.donor_name : 'Donor';
    const issuedAt = reward.issued_at ? new Date(reward.issued_at).toLocaleString() : new Date().toLocaleString();
    const isTransfusion = t === 'certificate_transfusion' || !!meta.schedule_id;
    const html = isTransfusion
      ? (() => {
          const hospitalName = typeof meta.hospital_name === 'string' ? meta.hospital_name : 'Hospital';
          const patientName = typeof meta.patient_name === 'string' ? meta.patient_name : 'Patient';
          const donationDateValue = meta.donation_date ? new Date(meta.donation_date as any) : null;
          const donationWhen =
            donationDateValue && !Number.isNaN(donationDateValue.getTime())
              ? donationDateValue.toLocaleString()
              : issuedAt;
          const safeDate = donationWhen.replace(/[^\w\-]+/g, '_').slice(0, 60) || 'donation';
          const filename = `donation-certificate-${safeDate}.html`;
          const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Donation Certificate</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: #f3f4f6; margin: 0; padding: 24px; }
      .card { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }
      .title { font-size: 28px; margin: 0 0 8px; color: #111827; }
      .sub { color: #4b5563; margin: 0 0 24px; }
      .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #f9fafb; }
      .row { display: flex; gap: 16px; flex-wrap: wrap; }
      .field { flex: 1; min-width: 240px; }
      .label { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
      .value { font-size: 16px; color: #111827; }
      .footer { margin-top: 24px; color: #6b7280; font-size: 12px; }
      .badge { display: inline-block; padding: 6px 10px; background: #ede9fe; color: #5b21b6; border-radius: 999px; font-size: 12px; }
      @media print {
        body { background: #ffffff; padding: 0; }
        .card { border: none; border-radius: 0; }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">Haemolink</div>
      <h1 class="title">Blood Donation Certificate</h1>
      <p class="sub">Issued to acknowledge a completed blood donation.</p>
      <div class="box">
        <div class="row">
          <div class="field">
            <div class="label">Donor</div>
            <div class="value">${donorName}</div>
          </div>
          <div class="field">
            <div class="label">Hospital</div>
            <div class="value">${hospitalName}</div>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <div class="field">
            <div class="label">Patient</div>
            <div class="value">${patientName}</div>
          </div>
          <div class="field">
            <div class="label">Donation Date</div>
            <div class="value">${donationWhen}</div>
          </div>
        </div>
      </div>
      <div class="footer">Issued at: ${issuedAt}</div>
    </div>
  </body>
</html>`;
          return { html, filename };
        })()
      : (() => {
          const organizerName = typeof meta.organizer_name === 'string' ? meta.organizer_name : 'Blood Bank';
          const campTitle = typeof meta.camp_title === 'string' ? meta.camp_title : 'Donation Camp';
          const campDate = typeof meta.camp_date === 'string' ? meta.camp_date : null;
          const safeTitle = campTitle.replace(/[^\w\-]+/g, '_').slice(0, 60) || 'camp';
          const filename = `camp-certificate-${safeTitle}.html`;
          const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Camp Certificate</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: #f3f4f6; margin: 0; padding: 24px; }
      .card { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }
      .title { font-size: 28px; margin: 0 0 8px; color: #111827; }
      .sub { color: #4b5563; margin: 0 0 24px; }
      .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #f9fafb; }
      .row { display: flex; gap: 16px; flex-wrap: wrap; }
      .field { flex: 1; min-width: 240px; }
      .label { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
      .value { font-size: 16px; color: #111827; }
      .footer { margin-top: 24px; color: #6b7280; font-size: 12px; }
      .badge { display: inline-block; padding: 6px 10px; background: #ede9fe; color: #5b21b6; border-radius: 999px; font-size: 12px; }
      @media print {
        body { background: #ffffff; padding: 0; }
        .card { border: none; border-radius: 0; }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">Haemolink</div>
      <h1 class="title">Donation Camp Certificate</h1>
      <p class="sub">Issued to acknowledge participation in a blood donation camp.</p>
      <div class="box">
        <div class="row">
          <div class="field">
            <div class="label">Donor</div>
            <div class="value">${donorName}</div>
          </div>
          <div class="field">
            <div class="label">Organizer</div>
            <div class="value">${organizerName}</div>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <div class="field">
            <div class="label">Camp</div>
            <div class="value">${campTitle}</div>
          </div>
          <div class="field">
            <div class="label">Camp Date</div>
            <div class="value">${campDate || '—'}</div>
          </div>
        </div>
      </div>
      <div class="footer">Issued at: ${issuedAt}</div>
    </div>
  </body>
</html>`;
          return { html, filename };
        })();
    const blob = new Blob([html.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = html.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Rewards & Incentives</h2>
        <p className="text-gray-600">Track your points, badges, and benefits</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="opacity-90 mb-2">Your Reward Points</p>
                <div style={{ fontSize: '3rem' }}>
                  {loading ? '–' : netPoints.toLocaleString('en-IN')}
                </div>
              </div>
              <Gift className="w-16 h-16 opacity-80" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                <div className="opacity-90 mb-1">Earned This Year</div>
                <div>{loading ? '–' : `${earnedThisYear} pts`}</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                <div className="opacity-90 mb-1">Redeemed</div>
                <div>{loading ? '–' : `${redeemedPoints} pts`}</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                <div className="opacity-90 mb-1">Next Milestone</div>
                <div>
                  {loading
                    ? '–'
                    : nextMilestone
                    ? `${pointsToNext} pts away`
                    : 'All milestones unlocked'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Health Credits</h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Heart className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-blue-900 mb-1">Health Wallet</div>
                    <p className="text-blue-600">
                      {loading ? '₹—' : `₹${Math.max(healthWalletValue, 0).toLocaleString('en-IN')}`}
                    </p>
                  </div>
                </div>
                <p className="text-blue-700 mb-4">
                  Available balance based on rewards assigned to your health wallet.
                </p>
                <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  View Wallet Details
                </button>
              </div>

              <div className="bg-violet-50 border border-violet-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-violet-900 mb-1">Tax Benefits</div>
                    <p className="text-violet-600">
                      {loading ? '₹—' : `₹${Math.max(taxBenefitValue, 0).toLocaleString('en-IN')}`}
                    </p>
                  </div>
                </div>
                <p className="text-violet-700 mb-4">
                  Eligible value based on rewards tagged for tax benefits.
                </p>
                <button className="w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Summary
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Partner Discounts & Offers</h3>

            {loading && <p className="text-gray-600">Loading partner rewards...</p>}

            {!loading && partnerRewards.length === 0 && (
              <p className="text-gray-600">
                Partner discounts will appear here once they are assigned to your account.
              </p>
            )}

            {!loading && partnerRewards.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {partnerRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-green-300 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-gray-900 mb-1">
                          {reward.reward_type || 'Partner reward'}
                        </div>
                        <p className="text-gray-600">
                          Reward assigned by your program administrator.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                        {(reward.points || 0) >= 0
                          ? `${reward.points || 0} points`
                          : `${Math.abs(reward.points || 0)} points used`}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {reward.issued_at
                          ? new Date(reward.issued_at).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Certificates</h3>
            {loading ? (
              <p className="text-gray-600">Loading certificates...</p>
            ) : certificates.length === 0 ? (
              <p className="text-gray-600">Certificates will appear here once issued.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {certificates.map((reward) => {
                  const meta = reward.metadata || {};
                  const t = reward.reward_type ? reward.reward_type.toLowerCase() : '';
                  const isTransfusion = t === 'certificate_transfusion' || !!(meta as any).schedule_id;
                  const title = isTransfusion
                    ? `Donation • ${typeof meta.hospital_name === 'string' ? meta.hospital_name : 'Hospital'}`
                    : typeof meta.camp_title === 'string'
                      ? meta.camp_title
                      : reward.reward_type || 'Certificate';
                  const dateValue = isTransfusion
                    ? meta.donation_date
                      ? new Date(meta.donation_date as any).toLocaleDateString()
                      : reward.issued_at
                        ? new Date(reward.issued_at).toLocaleDateString()
                        : ''
                    : typeof meta.camp_date === 'string'
                      ? meta.camp_date
                      : reward.issued_at
                        ? new Date(reward.issued_at).toLocaleDateString()
                        : '';
                  const subtitle = isTransfusion
                    ? typeof meta.patient_name === 'string'
                      ? `Patient: ${meta.patient_name}`
                      : null
                    : typeof meta.organizer_name === 'string'
                      ? `Organizer: ${meta.organizer_name}`
                      : null;
                  return (
                    <div key={reward.id} className="border border-gray-200 rounded-xl p-4 hover:border-green-300 transition">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="text-gray-900 mb-1 truncate">{title}</div>
                          <div className="text-gray-600 text-sm">
                            {dateValue}
                          </div>
                          {subtitle ? <div className="text-gray-600 text-sm">{subtitle}</div> : null}
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">Certificate</span>
                      </div>
                      <button
                        onClick={() => downloadCertificate(reward)}
                        className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Badges & Achievements</h3>

            <div className="grid grid-cols-4 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.name}
                  className={`text-center p-4 rounded-xl border-2 ${
                    badge.earned
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200 opacity-50'
                  }`}
                >
                  <div style={{ fontSize: '2.5rem' }} className="mb-2">
                    {badge.icon}
                  </div>
                  <div className="text-gray-900">{badge.name}</div>
                  {badge.earned && (
                    <span className="text-green-600 mt-1 inline-block">✓ Earned</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl p-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-8 h-8" fill="white" />
              <h3>Lives You&apos;ve Touched</h3>
            </div>

            {loading && <p className="opacity-90">Loading your recent donations...</p>}

            {!loading && impactDonations.length === 0 && (
              <p className="opacity-90">
                Once you start donating, stories about the impact of your donations will appear
                here.
              </p>
            )}

            {!loading && impactDonations.length > 0 && (
              <div className="space-y-4">
                {impactDonations.map((donation) => (
                  <div key={donation.id} className="bg-white/20 backdrop-blur rounded-lg p-4">
                    <div className="opacity-90 mb-2">
                      {donation.donation_date
                        ? new Date(donation.donation_date).toLocaleDateString()
                        : ''}
                    </div>
                    <p className="mb-2">
                      {donation.component
                        ? `Your ${donation.component.toLowerCase()} donation supported a patient in need.`
                        : 'Your donation supported a patient in need.'}
                    </p>
                    <div className="opacity-75 text-sm">
                      More details about the hospital and recipient will be shown here when
                      available.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Next Reward</h3>

            {loading && <p className="text-gray-600">Calculating your next milestone...</p>}

            {!loading && (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div style={{ fontSize: '2rem' }} className="text-center mb-2">
                    🏆
                  </div>
                  <div className="text-orange-900 text-center mb-1">
                    {nextMilestone ? `Next milestone at ${nextMilestone} pts` : 'Milestones complete'}
                  </div>
                  <p className="text-orange-600 text-center">
                    {nextMilestone
                      ? `${pointsToNext} more points needed`
                      : 'Keep donating to stay on top of the leaderboard.'}
                  </p>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-orange-500 h-3 rounded-full"
                    style={{ width: `${nextRewardProgress}%` }}
                  />
                </div>
                <p className="text-gray-500 text-center">
                  {netPoints} / {nextMilestone || netPoints} points
                </p>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Recent Activity</h3>

            {loading && <p className="text-gray-600">Loading your recent activity...</p>}

            {!loading && activities.length === 0 && (
              <p className="text-gray-600">
                Your recent reward activity will appear here as you start donating and earning
                rewards.
              </p>
            )}

            {!loading && activities.length > 0 && (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="text-gray-900">
                        {activity.activity_type || 'Activity'}
                      </div>
                      <p className="text-gray-500">
                        {activity.created_at
                          ? new Date(activity.created_at).toLocaleDateString()
                          : ''}
                      </p>
                    </div>
                    <span className="text-gray-500 text-sm max-w-[12rem] text-right">
                      {activity.description || ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Referral Rewards</h3>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Star className="w-5 h-5" />
                <span>Referral Program</span>
              </div>
              <p className="text-blue-600 mb-3">
                Referral-based rewards will be linked to your profile in a future update.
              </p>
              <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                View Referral Details
              </button>
            </div>

            <div className="text-center">
              <div className="text-gray-900 mb-1">No referral data yet</div>
              <p className="text-gray-500">
                Once enabled, your referral impact will be summarised here.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              <h3>Leaderboard</h3>
            </div>

            <p className="opacity-90">
              Global leaderboards require additional permissions and are not displayed in this
              read-only donor view. Your personal progress is still tracked through the rewards and
              badges above.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Limited Time Offers</h3>

            <div className="space-y-3">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-700 mb-1">
                  <Zap className="w-4 h-4" />
                  <span>Program Promotions</span>
                </div>
                <p className="text-orange-600">
                  Time-bound campaigns and bonus events configured by your program administrator
                  will appear here.
                </p>
              </div>

              <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
                <div className="text-violet-700 mb-1">Stay Tuned</div>
                <p className="text-violet-600">
                  Special incentives for regular donors and emergency responders will be listed in
                  this section.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
