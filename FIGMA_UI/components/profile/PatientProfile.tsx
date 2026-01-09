import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Heart, Shield, Bell, Settings, ChevronRight, LogOut, CheckCircle, ArrowLeft } from 'lucide-react';
import { LogoutModal } from '../auth/LogoutModal';
import { toast } from 'sonner';
import { useAutoRefresh } from '../../context/AutoRefreshContext';

interface PatientProfileProps {
  onBack: () => void;
  onLogout: () => void;
}

export function PatientProfile({ onBack, onLogout }: PatientProfileProps) {
  const { refreshTick } = useAutoRefresh();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [userData, setUserData] = useState<any>({});
  useEffect(() => {
    (async () => {
      const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
        import('../../services/auth'),
        import('../../supabase/client'),
      ]);
      const { role } = await getSessionAndRole();
      const profilePromise = role ? getProfile(role) : Promise.resolve(null);
      const userPromise = supabase.auth.getUser();
      const [profile, userResult] = await Promise.all([profilePromise, userPromise]);
      const user = userResult.data.user;
      setUserData({
        name: profile?.full_name || user?.email || 'Patient',
        role: 'Patient',
        email: user?.email || '',
        phone: profile?.phone || '',
        bloodGroup: profile?.blood_group || '',
        city: profile?.location || '',
        verified: !!profile,
        thalassemia: !!profile?.thalassemia_flag,
      });
    })();
  }, [refreshTick]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    // Call the logout handler which redirects to landing page
    onLogout();
  };

  const profileOptions = [
    {
      icon: User,
      label: 'Edit Profile',
      description: 'Update your personal information',
      onClick: () =>
        toast('Edit Profile', {
          description: 'Profile editing is coming soon.',
        }),
    },
    {
      icon: Settings,
      label: 'Preferences',
      description: 'Manage your account preferences',
      onClick: () =>
        toast('Preferences', {
          description: 'Preferences management is coming soon.',
        }),
    },
    {
      icon: Bell,
      label: 'Notifications',
      description: 'Configure notification settings',
      onClick: () =>
        toast('Notifications', {
          description: 'Notification settings are coming soon.',
        }),
    },
    {
      icon: Shield,
      label: 'Security & Privacy',
      description: 'View privacy policy and data usage',
      onClick: () =>
        toast('Security & Privacy', {
          description: 'Security options are coming soon.',
        }),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-gray-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <span className="text-xl text-gray-900 hidden sm:inline">HAEMOLINK</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-start gap-4 md:gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>

            {/* User Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl md:text-2xl text-gray-900 mb-1">{userData.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                      <Heart className="w-3 h-3 mr-1" />
                      {userData.role}
                    </span>
                    {userData.verified && (
                      <span className="inline-flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-5 h-5 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm truncate">{userData.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-5 h-5 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm">{userData.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Heart className="w-5 h-5 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Blood Group</p>
                    <p className="text-sm">{userData.bloodGroup}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm">{userData.city}</p>
                  </div>
                </div>
              </div>

              {/* Special Status */}
              {userData.thalassemia && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-violet-50 text-violet-700 rounded-lg text-sm">
                    <Shield className="w-4 h-4" />
                    <span>Enrolled in Thalassemia Cohort System</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Options */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6">
          {profileOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={option.label}
                onClick={option.onClick}
                className={`w-full flex items-center gap-4 p-4 md:p-6 hover:bg-gray-50 transition ${
                  index !== profileOptions.length - 1 ? 'border-b border-gray-200' : ''
                } ${index === 0 ? 'rounded-t-2xl' : ''} ${
                  index === profileOptions.length - 1 ? 'rounded-b-2xl' : ''
                }`}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-gray-900 mb-1">{option.label}</h3>
                  <p className="text-sm text-gray-500 truncate">{option.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Logout Section (LAST ITEM) */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-red-100">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-4 p-4 md:p-6 hover:bg-red-50 transition rounded-2xl group"
          >
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-red-600">Log out</h3>
              <p className="text-sm text-red-500/80">Sign out from your account</p>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        userName={userData.name}
      />
    </div>
  );
}
