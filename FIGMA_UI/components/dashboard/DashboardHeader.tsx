import { Bell, Search, Home, Users, LogOut, ChevronDown, User, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAutoRefresh } from '../../context/AutoRefreshContext';
import { useTheme } from '../../context/ThemeContext';

interface DashboardHeaderProps {
  notificationCount: number;
  onNotificationClick: () => void;
  onGoToLanding?: () => void;
  onSwitchRole?: () => void;
  onViewProfile?: () => void;
}

export function DashboardHeader({ notificationCount, onNotificationClick, onGoToLanding, onSwitchRole, onViewProfile }: DashboardHeaderProps) {
  const { refreshTick } = useAutoRefresh();
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileName, setProfileName] = useState('Patient');
  const [profileBloodGroup, setProfileBloodGroup] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
          import('../../services/auth'),
          import('../../supabase/client'),
        ]);
        const { role } = await getSessionAndRole();
        if (role !== 'patient') {
          return;
        }
        const profilePromise = getProfile(role);
        const userPromise = supabase.auth.getUser();
        const [profile, userResult] = await Promise.all([profilePromise, userPromise]);
        const user = userResult.data.user;
        const name = profile?.full_name || user?.email || 'Patient';
        const bloodGroup = profile?.blood_group || null;
        setProfileName(name);
        setProfileBloodGroup(bloodGroup);
      } catch {
      }
    })();
  }, [refreshTick]);

  const initials =
    profileName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'PT';

  return (
    <header className="bg-background border-b border-border px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search blood banks, donors, orders..."
              className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4 ml-6">
          {/* Home Button */}
          <button
            onClick={onGoToLanding}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Go to HAEMOLINK Home"
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                {notificationCount}
              </span>
            )}
          </button>

          {/* User Profile with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:bg-gray-50 py-2 pr-2 rounded-lg transition"
            >
              <div className="text-right">
                <div className="text-gray-900">{profileName}</div>
                <div className="text-gray-500">Blood Type: {profileBloodGroup || '--'}</div>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                {initials}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                  {onViewProfile && (
                    <>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onViewProfile();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition"
                      >
                        <User className="w-5 h-5 text-gray-500" />
                        <div className="text-left">
                          <div className="text-gray-900">View Profile</div>
                          <div className="text-gray-500 text-sm">Manage your account</div>
                        </div>
                      </button>
                      <div className="border-t border-gray-200 my-2" />
                    </>
                  )}
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSwitchRole?.();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Users className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <div className="text-gray-900">Switch Role</div>
                      <div className="text-gray-500 text-sm">Change to another portal</div>
                    </div>
                  </button>
                  <div className="border-t border-gray-200 my-2" />
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onGoToLanding?.();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition"
                  >
                    <LogOut className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <div className="text-gray-900">Exit to Home</div>
                      <div className="text-gray-500 text-sm">Return to landing page</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
