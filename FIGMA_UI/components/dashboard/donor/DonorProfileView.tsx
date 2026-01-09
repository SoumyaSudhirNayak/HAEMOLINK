import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Droplet, CheckCircle, Shield, Bell, Edit, Calendar, Heart } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface DonorProfileData {
  name: string;
  email: string;
  phone: string;
  bloodGroup: string;
  location: string;
  eligibilityStatus: string | null;
  lastDonationDate: string | null;
  memberSince: string | null;
  totalDonations: number | null;
}

export function DonorProfileView() {
  const [profileData, setProfileData] = useState<DonorProfileData>({
    name: '',
    email: '',
    phone: '',
    bloodGroup: '',
    location: '',
    eligibilityStatus: null,
    lastDonationDate: null,
    memberSince: null,
    totalDonations: null,
  });
  const [loadedProfile, setLoadedProfile] = useState<DonorProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [loadedSmsEnabled, setLoadedSmsEnabled] = useState<boolean | null>(null);
  const { refreshTick } = useAutoRefresh();

  const isDirty =
    (loadedProfile ? JSON.stringify(profileData) !== JSON.stringify(loadedProfile) : false) ||
    (loadedSmsEnabled !== null ? smsEnabled !== loadedSmsEnabled : false);

  useEffect(() => {
    (async () => {
      try {
        const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { role, session } = await getSessionAndRole();
        if (role !== 'donor') {
          return;
        }
        const profilePromise = getProfile(role);
        const userPromise = supabase.auth.getUser();
        const [profile, userResult] = await Promise.all([profilePromise, userPromise]);
        const user = userResult.data.user;
        const memberSince = user?.created_at
          ? new Date(user.created_at).getFullYear().toString()
          : null;
        const totalDonations =
          typeof profile?.total_donations === 'number' ? profile.total_donations : null;
        const next: DonorProfileData = {
          name: profile?.full_name || user?.email || 'Donor',
          email: user?.email || '',
          phone: profile?.phone || '',
          bloodGroup: profile?.blood_group || '',
          location: profile?.location || '',
          eligibilityStatus: profile?.eligibility_status ?? null,
          lastDonationDate: profile?.last_donation_date ?? null,
          memberSince,
          totalDonations,
        };
        setLoadedProfile(next);
        setProfileData((prev) => (isDirty ? prev : next));

        const uid = session?.user?.id || user?.id;
        if (uid) {
          const { data: pref } = await supabase
            .from('user_notification_preferences')
            .select('sms_enabled')
            .eq('user_id', uid)
            .maybeSingle();
          const nextSmsEnabled = typeof (pref as any)?.sms_enabled === 'boolean' ? (pref as any).sms_enabled : true;
          setLoadedSmsEnabled(nextSmsEnabled);
          setSmsEnabled((prev) => (isDirty ? prev : nextSmsEnabled));
        }
      } catch {
      }
    })();
  }, [refreshTick]);

  const saveProfile = async () => {
    setSaveError(null);
    setSaveOk(false);
    setSaving(true);
    try {
      const [{ getSessionAndRole, upsertProfile, getProfile }, { supabase }] = await Promise.all([
        import('../../../services/auth'),
        import('../../../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'donor') {
        setSaveError('Not authenticated');
        return;
      }
      await upsertProfile('donor', {
        full_name: profileData.name,
        phone: profileData.phone,
        blood_group: profileData.bloodGroup || null,
        location: profileData.location || null,
      });
      await supabase
        .from('user_notification_preferences')
        .upsert({ user_id: session.user.id, sms_enabled: smsEnabled, updated_at: new Date().toISOString() } as any);
      const [profile, userResult] = await Promise.all([getProfile('donor'), supabase.auth.getUser()]);
      const user = userResult.data.user;
      const memberSince = user?.created_at ? new Date(user.created_at).getFullYear().toString() : null;
      const totalDonations = typeof (profile as any)?.total_donations === 'number' ? (profile as any).total_donations : null;
      const refreshed: DonorProfileData = {
        name: (profile as any)?.full_name || user?.email || 'Donor',
        email: user?.email || '',
        phone: (profile as any)?.phone || '',
        bloodGroup: (profile as any)?.blood_group || '',
        location: (profile as any)?.location || '',
        eligibilityStatus: (profile as any)?.eligibility_status ?? null,
        lastDonationDate: (profile as any)?.last_donation_date ?? null,
        memberSince,
        totalDonations,
      };
      setProfileData(refreshed);
      setLoadedProfile(refreshed);
      setSaveOk(true);
    } catch (e) {
      const message = (e as any)?.message;
      setSaveError(typeof message === 'string' && message.trim() ? message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdits = () => {
    setSaveError(null);
    setSaveOk(false);
    if (loadedProfile) setProfileData(loadedProfile);
  };

  const initials =
    profileData.name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'DN';

  const formattedLastDonation = profileData.lastDonationDate
    ? new Date(profileData.lastDonationDate).toLocaleDateString()
    : null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Profile Settings</h2>
        <p className="text-gray-600">Manage your donor profile and preferences</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">Personal Information</h3>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>

            {saveError ? <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{saveError}</div> : null}
            {saveOk ? <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">Saved</div> : null}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Blood Group</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={profileData.bloodGroup}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, bloodGroup: e.target.value }))
                  }
                >
                  <option value="">Select blood group</option>
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
                <label className="block text-gray-700 mb-2">Gender</label>
                <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-gray-700 mb-2">Address</label>
              <textarea
                rows={3}
                value={profileData.location}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Health Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Health Information</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2">Weight (kg)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Emergency Contact</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-gray-700 mb-2">Medical Conditions & Allergies</label>
              <textarea
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mt-6">
              <label className="block text-gray-700 mb-3">Current Medications</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-gray-700">I am currently taking medications</span>
                </label>
              </div>
            </div>
          </div>

          {/* Donor Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Donor Preferences</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Preferred Donation Type</label>
                <div className="flex gap-3">
                  {['Whole Blood', 'Platelets', 'Plasma'].map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked={type === 'Whole Blood'} className="rounded" />
                      <span className="text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Preferred Time Slots</label>
                <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option>Morning (8 AM - 12 PM)</option>
                  <option>Afternoon (12 PM - 4 PM)</option>
                  <option>Evening (4 PM - 8 PM)</option>
                  <option>Flexible</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-3">Emergency Response</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-700">Available for emergency requests</span>
                </label>
              </div>

              <div>
                <label className="block text-gray-700 mb-3">Cohort Participation</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-700">Willing to join cohort donor programs</span>
                </label>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Notification Preferences</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-gray-900 mb-1">Email Notifications</div>
                  <p className="text-gray-500">Receive updates via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-gray-900 mb-1">SMS Notifications</div>
                  <p className="text-gray-500">Receive updates via SMS</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={smsEnabled} onChange={(e) => setSmsEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-gray-900 mb-1">Emergency Alerts</div>
                  <p className="text-gray-500">Critical notifications only</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={saveProfile}
              disabled={saving}
              className={`flex-1 py-3 rounded-lg transition ${saving ? 'bg-green-600/60 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              Save Changes
            </button>
            <button
              onClick={cancelEdits}
              disabled={saving}
              className={`flex-1 py-3 rounded-lg transition ${saving ? 'border border-gray-300 text-gray-400 cursor-not-allowed' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white mx-auto mb-4" style={{ fontSize: '2rem' }}>
              {initials}
            </div>
            <div className="text-gray-900 mb-1">{profileData.name}</div>
            <p className="text-gray-500 mb-4">
              Donor ID will appear here once assigned
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-2">
                <Droplet className="w-4 h-4" />
                {profileData.bloodGroup || 'Blood group not set'}
              </div>
            </div>
            <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              Upload Photo
            </button>
          </div>

          {/* Donor Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Donor Stats</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Member Since</span>
                <span className="text-gray-900">
                  {profileData.memberSince || 'Not available'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Last Donation</span>
                <span className="text-gray-900">
                  {formattedLastDonation || 'No donations yet'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total Donations</span>
                <span className="text-gray-900">
                  {profileData.totalDonations != null ? profileData.totalDonations : 'Not available'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Lives Impacted</span>
                <span className="text-green-600">
                  Will appear when impact data is available
                </span>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Verification Status</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Email</span>
                </div>
                <span className="text-green-600">Status not available</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Phone</span>
                </div>
                <span className="text-green-600">Status not available</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Donor ID</span>
                </div>
                <span className="text-green-600">Status not available</span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5" />
              <h3>Your Badges</h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['🎉', '⭐', '🚨', '🏆', '📅', '👥'].map((emoji) => (
                <div key={emoji} className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
                  <div style={{ fontSize: '2rem' }}>{emoji}</div>
                </div>
              ))}
            </div>

            <p className="opacity-90 mt-4 text-center">
              Badges will appear here once available.
            </p>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Privacy</h3>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Show profile to patients</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Share donation history</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-700">Public leaderboard</span>
              </label>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Account</h3>

            <div className="space-y-2">
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-gray-700">
                Change Password
              </button>
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-gray-700">
                Download My Data
              </button>
              <button className="w-full py-2 text-left px-4 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition">
                Deactivate Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
