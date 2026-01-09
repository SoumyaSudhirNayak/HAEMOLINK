import { useCallback, useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import AdminPortal from './ADMIN/App';
import { RoleSelection } from './components/auth/RoleSelection';
import { PatientAuth } from './components/auth/PatientAuth';
import { DonorAuth } from './components/auth/DonorAuth';
import { RiderAuth } from './components/auth/RiderAuth';
import { HospitalAuth } from './components/auth/HospitalAuth';
import { PatientProfile } from './components/profile/PatientProfile';
import { DonorProfile } from './components/profile/DonorProfile';
import { RiderProfile } from './components/profile/RiderProfile';
import { HospitalProfile } from './components/profile/HospitalProfile';
import { PatientDashboard } from './components/PatientDashboard';
import { DonorDashboard } from './components/DonorDashboard';
import { HospitalDashboard } from './components/HospitalDashboard';
import { RiderDashboard } from './components/RiderDashboard';
import { AutoRefreshProvider } from './context/AutoRefreshContext';
import { ThemeProvider } from './context/ThemeContext';
import { initNotificationBootstrap, notify } from './utils/notifications';

type View = 
  | 'landing' 
  | 'admin'
  | 'role-selection' 
  | 'patient-auth' 
  | 'donor-auth' 
  | 'rider-auth' 
  | 'hospital-auth'
  | 'patient-dashboard' 
  | 'donor-dashboard' 
  | 'hospital-dashboard' 
  | 'rider-dashboard'
  | 'patient-profile'
  | 'donor-profile'
  | 'rider-profile'
  | 'hospital-profile';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [userData, setUserData] = useState<any>(null);
  const [role, setRole] = useState<'patient'|'donor'|'rider'|'hospital'|null>(null);
  
  useEffect(() => {
    (async () => {
      const { getSessionAndRole } = await import('./services/auth');
      const { session, role } = await getSessionAndRole();
      if (session && role) {
        setRole(role);
        if (role === 'patient') setCurrentView('patient-dashboard');
        else if (role === 'donor') setCurrentView('donor-dashboard');
        else if (role === 'rider') setCurrentView('rider-dashboard');
        else if (role === 'hospital') setCurrentView('hospital-dashboard');
      } else {
        setCurrentView('landing');
      }
    })();
  }, []);

  useEffect(() => {
    initNotificationBootstrap();
  }, []);

  const navigateToDashboardView = useCallback((targetRole: 'patient'|'donor'|'rider'|'hospital', dashboardView?: string) => {
    if (targetRole === 'patient') setCurrentView('patient-dashboard');
    else if (targetRole === 'donor') setCurrentView('donor-dashboard');
    else if (targetRole === 'rider') setCurrentView('rider-dashboard');
    else if (targetRole === 'hospital') setCurrentView('hospital-dashboard');

    if (typeof window !== 'undefined' && dashboardView) {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('haemolink:navigate', { detail: { role: targetRole, view: dashboardView } }));
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = (ev: MessageEvent) => {
      const data: any = (ev as any)?.data;
      if (!data || data.type !== 'haemolink:navigate') return;
      const targetRole = data.role;
      if (targetRole !== 'patient' && targetRole !== 'donor' && targetRole !== 'rider' && targetRole !== 'hospital') return;
      const targetView = typeof data.view === 'string' ? data.view : undefined;
      navigateToDashboardView(targetRole, targetView);
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
    };
  }, [navigateToDashboardView]);

  useEffect(() => {
    let channels: any[] = [];
    let active = true;
    const send = (opts: { key: string; title: string; body: string; targetRole: 'patient'|'donor'|'rider'|'hospital'; targetView?: string | null }) => {
      if (!active) return;
      void notify({
        title: opts.title,
        body: opts.body,
        tag: `${opts.targetRole}:${opts.key}`,
        data: { role: opts.targetRole, view: opts.targetView ?? null },
      });
    };

    (async () => {
      try {
        if (!role) return;
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('./supabase/client'),
          import('./services/auth'),
        ]);
        const { session, role: sessionRole } = await getSessionAndRole();
        if (!session || !sessionRole) return;

        const uid = session.user.id;
        const viewFor = (nRole: 'patient'|'donor'|'rider'|'hospital', eventType: string | null | undefined) => {
          const ev = (eventType || '').toString().toLowerCase();
          if (nRole === 'donor') return ev.includes('reward') ? 'rewards' : 'live-requests';
          if (nRole === 'hospital') return ev.includes('deliver') || ev.includes('pickup') ? 'delivery' : 'requests';
          if (nRole === 'rider') return ev.includes('deliver') || ev.includes('pickup') ? 'navigation' : 'assignments';
          if (nRole === 'patient') return ev.includes('deliver') ? 'history' : 'track-orders';
          return null;
        };

        channels.push(
          supabase
            .channel('notifications-feed')
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
              (payload: any) => {
                const row = payload?.new as any;
                const nRole = (row?.role || '').toString();
                if (nRole !== 'patient' && nRole !== 'donor' && nRole !== 'rider' && nRole !== 'hospital') return;
                const title = typeof row?.title === 'string' && row.title.trim().length ? row.title.trim() : 'Notification';
                const body = typeof row?.message === 'string' ? row.message : 'You have a new update.';
                const key = row?.id
                  ? `notifications:INSERT:${row.id}`
                  : `notifications:INSERT:${row?.event_type || ''}:${row?.entity_id || ''}:${row?.created_at || ''}`;
                send({
                  key,
                  title,
                  body,
                  targetRole: nRole,
                  targetView: viewFor(nRole, row?.event_type),
                });
              },
            )
            .subscribe(),
        );
      } catch {}
    })();

    return () => {
      active = false;
      channels.forEach((c) => {
        try {
          c.unsubscribe();
        } catch {}
      });
      channels = [];
    };
  }, [role]);

  // Set page title
  if (typeof document !== 'undefined') {
    document.title = 'HAEMOLINK - Connecting Blood, Saving Lives';
  }

  const handleAuthSuccess = (data: any) => {
    setUserData(data);
    setRole(data.role ?? null);
    // Navigate to appropriate dashboard based on role
    if (data.role === 'patient') {
      setCurrentView('patient-dashboard');
    } else if (data.role === 'donor') {
      setCurrentView('donor-dashboard');
    } else if (data.role === 'rider') {
      setCurrentView('rider-dashboard');
    } else if (data.role === 'hospital') {
      setCurrentView('hospital-dashboard');
    }
  };

  const handleLogout = () => {
    (async () => {
      const { signOut } = await import('./services/auth');
      await signOut();
      setUserData(null);
      setRole(null);
      setCurrentView('landing');
    })();
  };

  return (
    <ThemeProvider>
      <AutoRefreshProvider>
        <div className="min-h-screen bg-background text-foreground">
          {currentView === 'landing' && (
            <LandingPage
              onGetStarted={() => setCurrentView('role-selection')}
              onGoToAdmin={() => setCurrentView('admin')}
            />
          )}

          {currentView === 'admin' && (
            <AdminPortal onExit={() => setCurrentView('landing')} />
          )}
          
          {currentView === 'role-selection' && (
            <RoleSelection 
              onRoleSelect={(role) => {
                if (role === 'patient') setCurrentView('patient-auth');
                else if (role === 'donor') setCurrentView('donor-auth');
                else if (role === 'rider') setCurrentView('rider-auth');
                else if (role === 'hospital') setCurrentView('hospital-auth');
              }}
              onBackToHome={() => setCurrentView('landing')}
            />
          )}

      {currentView === 'patient-auth' && (
        <PatientAuth 
          onBackToRoles={() => setCurrentView('role-selection')}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {currentView === 'donor-auth' && (
        <DonorAuth 
          onBackToRoles={() => setCurrentView('role-selection')}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {currentView === 'rider-auth' && (
        <RiderAuth 
          onBackToRoles={() => setCurrentView('role-selection')}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {currentView === 'hospital-auth' && (
        <HospitalAuth 
          onBackToRoles={() => setCurrentView('role-selection')}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {currentView === 'patient-dashboard' && (
        <PatientDashboard 
          onBackToHome={handleLogout}
          onSwitchRole={() => setCurrentView('role-selection')}
          onViewProfile={() => setCurrentView('patient-profile')}
        />
      )}

      {currentView === 'patient-profile' && (
        <PatientProfile
          onBack={() => setCurrentView('patient-dashboard')}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'donor-dashboard' && (
        <DonorDashboard 
          onBackToHome={handleLogout}
          onSwitchRole={() => setCurrentView('role-selection')}
          onViewProfile={() => setCurrentView('donor-profile')}
        />
      )}

      {currentView === 'donor-profile' && (
        <DonorProfile
          onBack={() => setCurrentView('donor-dashboard')}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'hospital-dashboard' && (
        <HospitalDashboard 
          onBackToHome={handleLogout}
          onSwitchRole={() => setCurrentView('role-selection')}
          onViewProfile={() => setCurrentView('hospital-profile')}
        />
      )}

      {currentView === 'hospital-profile' && (
        <HospitalProfile
          onBack={() => setCurrentView('hospital-dashboard')}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'rider-dashboard' && (
        <RiderDashboard 
          onBackToHome={handleLogout}
          onSwitchRole={() => setCurrentView('role-selection')}
          onViewProfile={() => setCurrentView('rider-profile')}
        />
      )}

        {currentView === 'rider-profile' && (
          <RiderProfile
            onBack={() => setCurrentView('rider-dashboard')}
            onLogout={handleLogout}
          />
        )}
        </div>
      </AutoRefreshProvider>
    </ThemeProvider>
  );
}
