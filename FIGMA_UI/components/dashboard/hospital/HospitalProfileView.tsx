import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, MapPin, Edit } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

export function HospitalProfileView() {
  const { refreshTick } = useAutoRefresh();
  const [formData, setFormData] = useState({
    organizationName: '',
    licenseNumber: '',
    registrationDate: '',
    address: '',
    adminContact: '',
  });
  const [userEmail, setUserEmail] = useState<string>('');
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [requestsTodayCount, setRequestsTodayCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'hospital') return;

        const [profile, userResult] = await Promise.all([
          getProfile('hospital'),
          supabase.auth.getUser(),
        ]);

        const createdAt = userResult.data.user?.created_at;
        const regDate =
          typeof createdAt === 'string' ? new Date(createdAt).toISOString().slice(0, 10) : '';

        if (active) {
          setUserEmail(userResult.data.user?.email || '');
          setFormData({
            organizationName: profile?.organization_name || '',
            licenseNumber: profile?.license_number || '',
            registrationDate: regDate,
            address: profile?.address || '',
            adminContact: profile?.admin_contact || '',
          });
        }

        try {
          const { count } = await supabase
            .from('hospital_inventory_units')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', session.user.id);
          if (active) setInventoryCount(count ?? 0);
        } catch {
          if (active) setInventoryCount(null);
        }

        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const { count } = await supabase
            .from('hospital_request_inbox')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', session.user.id)
            .gte('created_at', today.toISOString());
          if (active) setRequestsTodayCount(count ?? 0);
        } catch {
          if (active) setRequestsTodayCount(null);
        }
      } catch {
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const handleSave = async () => {
    try {
      const [{ getSessionAndRole, upsertProfile }] = await Promise.all([
        import('../../../services/auth'),
      ]);
      const { role } = await getSessionAndRole();
      if (role !== 'hospital') return;
      await upsertProfile('hospital', {
        organization_name: formData.organizationName,
        license_number: formData.licenseNumber,
        address: formData.address,
        admin_contact: formData.adminContact,
      });
    } catch {
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Hospital Profile</h2>
        <p className="text-gray-600">Manage hospital information and settings</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">Hospital Information</h3>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Hospital Name</label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organizationName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">License Number</label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, licenseNumber: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Registration Date</label>
                  <input
                    type="date"
                    value={formData.registrationDate}
                    readOnly
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Address</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={userEmail}
                    readOnly
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.adminContact}
                    onChange={(e) => setFormData((prev) => ({ ...prev, adminContact: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
              >
                Save Changes
              </button>
              <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-violet-600 rounded-full flex items-center justify-center text-white mx-auto mb-4">
              <Building2 className="w-12 h-12" />
            </div>
            <h3 className="text-gray-900 mb-1">{formData.organizationName || 'Hospital'}</h3>
            <p className="text-gray-500 mb-4">{formData.licenseNumber || 'License not set'}</p>
            <button className="w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition">
              Upload Logo
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Total Inventory</span>
                <span className="text-gray-900">{inventoryCount == null ? '—' : inventoryCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Requests Today</span>
                <span className="text-gray-900">{requestsTodayCount == null ? '—' : requestsTodayCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
