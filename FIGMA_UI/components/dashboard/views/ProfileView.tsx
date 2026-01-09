import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Droplet, Shield, Bell, Lock, Edit } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface PatientProfileData {
  full_name?: string | null;
  age?: number | null;
  gender?: string | null;
  blood_group?: string | null;
  chronic_conditions?: string | null;
  thalassemia_flag?: boolean | null;
  emergency_contact?: string | null;
  location?: string | null;
}

export function ProfileView() {
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
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
          if (active) {
            setProfile(null);
            setMemberSince(null);
          }
          return;
        }
        const [profileData, userResult] = await Promise.all([
          getProfile('patient'),
          supabase.auth.getUser(),
        ]);
        if (!active) return;
        setProfile(profileData as PatientProfileData | null);
        const createdAt = userResult.data.user?.created_at;
        setMemberSince(createdAt ? new Date(createdAt).toLocaleDateString() : null);
        setEmail(userResult.data.user?.email || '');

        const uid = userResult.data.user?.id;
        if (uid) {
          const { data: pref } = await supabase
            .from('user_notification_preferences')
            .select('sms_enabled, whatsapp_enabled')
            .eq('user_id', uid)
            .maybeSingle();
          if (active) {
            setSmsEnabled(typeof (pref as any)?.sms_enabled === 'boolean' ? (pref as any).sms_enabled : true);
            setWhatsappEnabled(typeof (pref as any)?.whatsapp_enabled === 'boolean' ? (pref as any).whatsapp_enabled : false);
          }
        }
      } catch {
        if (active) {
          setProfile(null);
          setMemberSince(null);
          setEmail('');
          setSmsEnabled(true);
          setWhatsappEnabled(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const saveNotificationPreferences = async () => {
    if (savingPrefs) return;
    setSavingPrefs(true);
    try {
      const [{ getSessionAndRole }, { supabase }] = await Promise.all([
        import('../../../services/auth'),
        import('../../../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'patient') return;
      await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: session.user.id,
          sms_enabled: smsEnabled,
          whatsapp_enabled: whatsappEnabled,
          updated_at: new Date().toISOString(),
        } as any);
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Profile Settings</h2>
        <p className="text-gray-600">Manage your personal information and preferences</p>
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

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  defaultValue={profile?.full_name || ''}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  defaultValue={email}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  defaultValue={(profile as any)?.phone || ''}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Blood Group</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={profile?.blood_group || ''}
                >
                  <option value="" disabled>
                    Select blood group
                  </option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>O+</option>
                  <option>O-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Gender</label>
                <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue={profile?.gender || ''}>
                  <option value="" disabled>
                    Select gender
                  </option>
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
                  placeholder="Enter your address"
                  defaultValue={profile?.location || ''}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
          </div>

          {/* Medical Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Medical Information</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2">Medical Condition</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={profile?.thalassemia_flag ? 'Thalassemia' : profile?.chronic_conditions ? 'Other' : 'None'}
                >
                  <option value="" disabled>
                    Select condition
                  </option>
                  <option>None</option>
                  <option>Thalassemia</option>
                  <option>Anemia</option>
                  <option>Hemophilia</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Emergency Contact</label>
                <input
                  type="tel"
                  placeholder="Enter emergency contact"
                  defaultValue={profile?.emergency_contact || ''}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-gray-700 mb-2">Allergies & Medical Notes</label>
              <textarea
                rows={3}
                placeholder="Add notes about allergies or medical history"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-6">
              <label className="block text-gray-700 mb-3">Upload Medical Documents</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition cursor-pointer">
                <p className="text-gray-600">Drag and drop or click to upload</p>
                <p className="text-gray-500 mt-1">PDF, JPG, PNG (Max 10MB)</p>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Security & Privacy</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Update Password
            </button>
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-gray-900 mb-1">SMS Notifications</div>
                  <p className="text-gray-500">Receive updates via SMS</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-gray-900 mb-1">WhatsApp Alerts</div>
                  <p className="text-gray-500">Receive updates via WhatsApp</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-gray-900 mb-1">Emergency Alerts</div>
                  <p className="text-gray-500">Critical notifications only</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={saveNotificationPreferences}
              disabled={savingPrefs}
              className={`flex-1 py-3 rounded-lg transition ${savingPrefs ? 'bg-blue-600/60 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              Save Changes
            </button>
            <button className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div
              className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white mx-auto mb-4"
              style={{ fontSize: '2rem' }}
            >
              {profile?.full_name
                ? profile.full_name
                    .split(' ')
                    .map((part) => part.charAt(0))
                    .join('')
                    .slice(0, 2)
                : '--'}
            </div>
            <div className="text-gray-900 mb-1">
              {profile?.full_name || 'Name not available'}
            </div>
            <p className="text-gray-500 mb-4">
              Linked to your HAEMOLINK patient profile
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-2">
                <Droplet className="w-4 h-4" />
                {profile?.blood_group || 'Blood group not set'}
              </div>
            </div>
            <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Upload Photo
            </button>
          </div>

          {/* Account Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Account Stats</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Member Since</span>
                <span className="text-gray-900">
                  {memberSince || 'Not available'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total Orders</span>
                <span className="text-gray-900">—</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Active Requests</span>
                <span className="text-blue-600">—</span>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Verification Status</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">Email</span>
                </div>
                <span className="text-gray-600">Not available</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">Phone</span>
                </div>
                <span className="text-gray-600">Not available</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-700">Medical ID</span>
                </div>
                <button className="text-orange-600 hover:text-orange-700">Verify</button>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Privacy</h3>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Share profile with donors</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Allow emergency broadcasts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-700">Public transfusion history</span>
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-red-900 mb-4">Danger Zone</h3>

            <div className="space-y-2">
              <button className="w-full py-2 text-left px-4 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition">
                Deactivate Account
              </button>
              <button className="w-full py-2 text-left px-4 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
