import { useEffect, useState } from 'react';
import { Bike, Mail, Phone, MapPin, Edit, Star } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

export function RiderProfileView() {
  const { refreshTick } = useAutoRefresh();
  const [profile, setProfile] = useState<any>({});
  const [email, setEmail] = useState('');
  const [joinDate, setJoinDate] = useState('');
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'rider') {
          if (active) {
            setProfile({});
            setEmail('');
            setJoinDate('');
          }
          return;
        }
        const [p, userResult] = await Promise.all([getProfile('rider'), supabase.auth.getUser()]);
        if (!active) return;
        setProfile(p || {});
        const user = userResult.data.user;
        setEmail(user?.email || '');
        const createdAt = user?.created_at;
        setJoinDate(createdAt ? new Date(createdAt).toISOString().slice(0, 10) : '');
      } catch {
        if (active) {
          setProfile({});
          setEmail('');
          setJoinDate('');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Rider Profile</h2>
        <p className="text-gray-600">Manage your personal information and settings</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">Personal Information</h3>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Full Name</label>
                  <input type="text" value={profile?.full_name || ''} onChange={() => {}} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Rider ID</label>
                  <input type="text" value={(profile?.user_id || '').toString()} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Email</label>
                  <input type="email" value={email} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Phone</label>
                  <input type="tel" value={profile?.phone || ''} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50" />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Address</label>
                <textarea rows={2} placeholder="No data available yet" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Date of Birth</label>
                  <input type="date" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Join Date</label>
                  <input type="date" value={joinDate} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50" readOnly />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button className="flex-1 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
                Save Changes
              </button>
              <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Vehicle Information</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Vehicle Type</label>
                  <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
                    <option>Choose...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Registration Number</label>
                  <input type="text" value={profile?.vehicle_number || ''} onChange={() => {}} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                </div>
              </div> 

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Make & Model</label>
                  <input type="text" value={profile?.vehicle_type || ''} onChange={() => {}} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Year</label>
                  <input type="text" value={profile?.vehicle_number || ''} onChange={() => {}} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Insurance Valid Until</label>
                  <input type="date" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Cold Box Serial</label>
                  <input type="text" placeholder="No data available yet" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white mx-auto mb-4">
              <Bike className="w-12 h-12" />
            </div>
            <h3 className="text-gray-900 mb-1">{profile?.full_name || 'Rider'}</h3>
            <p className="text-gray-500 mb-2">{profile?.vehicle_type || 'Delivery Agent'}</p>
            <div className="flex items-center justify-center gap-1 mb-4">
              <span className="text-gray-600">No data available yet</span>
            </div>
            <button className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
              Upload Photo
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Total Deliveries</span>
                <span className="text-gray-600">No data available yet</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">This Month</span>
                <span className="text-gray-600">No data available yet</span>
              </div>
              <div className="flex justify-between p-2 bg-green-50 rounded">
                <span className="text-green-600">Success Rate</span>
                <span className="text-gray-600">No data available yet</span>
              </div>
              <div className="flex justify-between p-2 bg-blue-50 rounded">
                <span className="text-blue-600">Earnings (Month)</span>
                <span className="text-gray-600">No data available yet</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h3 className="text-orange-900 mb-4">Achievements</h3>
            <div className="space-y-2">
              <div className="p-3 bg-white rounded-lg">
                <div className="text-gray-600">No data available yet</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
