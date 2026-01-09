import { Bell, Search, Home, Users, LogOut, ChevronDown, User, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';
import { useTheme } from '../../../context/ThemeContext';

interface DonorHeaderProps {
  notificationCount: number;
  onGoToLanding?: () => void;
  onSwitchRole?: () => void;
  onViewProfile?: () => void;
}

type DonorInboxRow = {
  id: string;
  created_at: string | null;
  request_id: string | null;
  status: string | null;
  blood_requests?: {
    id: string;
    blood_group: string | null;
    component: string | null;
    urgency: string | null;
    created_at: string | null;
  } | null;
};

export function DonorHeader({ notificationCount, onGoToLanding, onSwitchRole, onViewProfile }: DonorHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileName, setProfileName] = useState('Donor');
  const [profileBloodGroup, setProfileBloodGroup] = useState<string | null>(null);
  const [inbox, setInbox] = useState<DonorInboxRow[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxCount, setInboxCount] = useState<number | null>(null);
  const { refreshTick } = useAutoRefresh();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const [{ getSessionAndRole, getProfile }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { role } = await getSessionAndRole();
        if (role !== 'donor') {
          return;
        }
        const profilePromise = getProfile(role);
        const userPromise = supabase.auth.getUser();
        const [profile, userResult] = await Promise.all([profilePromise, userPromise]);
        const user = userResult.data.user;
        const name = profile?.full_name || user?.email || 'Donor';
        const bloodGroup = profile?.blood_group || null;
        setProfileName(name);
        setProfileBloodGroup(bloodGroup);
      } catch {
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;
    let channel: any = null;
    (async () => {
      try {
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'donor') {
          if (active) {
            setInbox([]);
            setInboxCount(0);
          }
          return;
        }
        const uid = session.user.id;

        const load = async () => {
          setInboxLoading(true);
          const [countResult, listResult] = await Promise.all([
            supabase
              .from('donor_request_inbox')
              .select('id', { count: 'exact', head: true })
              .eq('donor_id', uid)
              .eq('status', 'pending'),
            supabase
              .from('donor_request_inbox')
              .select('id, created_at, request_id, status, blood_requests(id, blood_group, component, urgency, created_at)')
              .eq('donor_id', uid)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(10),
          ]);

          if (!active) return;
          setInboxCount(countResult.count ?? 0);
          setInbox(Array.isArray(listResult.data) ? (listResult.data as any) : []);
          setInboxLoading(false);
        };

        await load();

        channel = supabase
          .channel(`donor_header_inbox_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'donor_request_inbox', filter: `donor_id=eq.${uid}` },
            () => {
              load();
            },
          )
          .subscribe();
      } catch {
        if (active) {
          setInbox([]);
          setInboxCount(0);
          setInboxLoading(false);
        }
      }
    })();
    return () => {
      active = false;
      if (channel) channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'donor') {
          if (active) {
            setInbox([]);
            setInboxCount(0);
            setInboxLoading(false);
          }
          return;
        }
        const uid = session.user.id;
        if (active) setInboxLoading(true);
        const [countResult, listResult] = await Promise.all([
          supabase
            .from('donor_request_inbox')
            .select('id', { count: 'exact', head: true })
            .eq('donor_id', uid)
            .eq('status', 'pending'),
          supabase
            .from('donor_request_inbox')
            .select('id, created_at, request_id, status, blood_requests(id, blood_group, component, urgency, created_at)')
            .eq('donor_id', uid)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10),
        ]);
        if (!active) return;
        setInboxCount(countResult.count ?? 0);
        setInbox(Array.isArray(listResult.data) ? (listResult.data as any) : []);
        setInboxLoading(false);
      } catch {
        if (active) {
          setInbox([]);
          setInboxCount(0);
          setInboxLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const initials =
    profileName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'DN';

  return (
    <header className="bg-background border-b border-border px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests, camps, history..."
              className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4 ml-6">
          {/* Home Button */}
          <button
            onClick={onGoToLanding}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
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
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications((s) => !s);
                setShowProfileMenu(false);
              }}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <Bell className="w-5 h-5" />
              {(inboxCount ?? notificationCount) > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                  {inboxCount ?? notificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 text-gray-900">Notifications</div>
                  <div className="max-h-96 overflow-auto">
                    {inboxLoading ? (
                      <div className="p-4 text-gray-600">Loading notifications...</div>
                    ) : inbox.length > 0 ? (
                      inbox.map((row) => {
                        const br = (row as any)?.blood_requests ?? null;
                        const title =
                          br && (br.component || br.blood_group)
                            ? `${br.component || 'Blood'}${br.blood_group ? ` • ${br.blood_group}` : ''}`
                            : 'New request';
                        const time = row.created_at ? new Date(row.created_at).toLocaleString() : 'Time not recorded';
                        const urgency = br?.urgency ? `Urgency: ${br.urgency}` : null;
                        return (
                          <div key={row.id} className="px-4 py-3 border-b border-gray-100">
                            <div className="text-gray-900">{title}</div>
                            <div className="text-gray-600 text-sm">
                              {time}
                              {urgency ? ` • ${urgency}` : ''}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-gray-600">No new notifications</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

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
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white">
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
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onViewProfile?.();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition"
                  >
                    <User className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <div className="text-gray-900">View Profile</div>
                      <div className="text-gray-500 text-sm">Manage your profile</div>
                    </div>
                  </button>
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
