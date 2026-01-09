import { useEffect, useState } from 'react';
import { RiderSidebar } from './dashboard/rider/RiderSidebar';
import { RiderHeader } from './dashboard/rider/RiderHeader';
import { RiderOverviewView } from './dashboard/rider/RiderOverviewView';
import { AssignmentsView } from './dashboard/rider/AssignmentsView';
import { NavigationView } from './dashboard/rider/NavigationView';
import { PickupVerificationView } from './dashboard/rider/PickupVerificationView';
import { ColdChainView } from './dashboard/rider/ColdChainView';
import { RiderEmergencyView } from './dashboard/rider/RiderEmergencyView';
import { EarningsView } from './dashboard/rider/EarningsView';
import { RiderHistoryView } from './dashboard/rider/RiderHistoryView';
import { RiderComplianceView } from './dashboard/rider/RiderComplianceView';
import { RiderProfileView } from './dashboard/rider/RiderProfileView';
import { useAutoRefresh } from '../context/AutoRefreshContext';

export type RiderDashboardView = 
  | 'dashboard'
  | 'assignments'
  | 'navigation'
  | 'pickup'
  | 'coldchain'
  | 'emergency'
  | 'earnings'
  | 'history'
  | 'compliance'
  | 'profile';

interface RiderDashboardProps {
  onBackToHome: () => void;
  onSwitchRole?: () => void;
  onViewProfile?: () => void;
}

export function RiderDashboard({ onBackToHome, onSwitchRole, onViewProfile }: RiderDashboardProps) {
  const { refreshTick } = useAutoRefresh();
  const [currentView, setCurrentView] = useState<RiderDashboardView>('dashboard');
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [riderName, setRiderName] = useState<string>('Rider');

  useEffect(() => {
    const handler = (e: any) => {
      const detail = (e as any)?.detail;
      if (!detail || detail.role !== 'rider') return;
      if (detail.view) setCurrentView(detail.view as any);
    };
    window.addEventListener('haemolink:navigate', handler as any);
    return () => {
      window.removeEventListener('haemolink:navigate', handler as any);
    };
  }, []);

  const handleProfileClick = () => {
    if (onViewProfile) {
      onViewProfile();
    } else {
      setCurrentView('profile');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [{ getSessionAndRole, getProfile }] = await Promise.all([
          import('../services/auth'),
        ]);
        const { role } = await getSessionAndRole();
        if (role === 'rider') {
          const prof = await getProfile('rider');
          const name = (prof?.full_name as string) || 'Rider';
          setRiderName(name);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../services/auth'),
          import('../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'rider') {
          if (active) setNotificationCount(0);
          return;
        }
        const { count } = await supabase
          .from('rider_request_inbox')
          .select('id', { count: 'exact', head: true })
          .eq('rider_id', session.user.id)
          .eq('status', 'pending');
        if (active) setNotificationCount(count ?? 0);
      } catch {
        if (active) setNotificationCount(0);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <RiderSidebar 
        currentView={currentView} 
        onNavigate={setCurrentView}
        emergencyMode={emergencyMode}
        onLogoClick={onBackToHome}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <RiderHeader 
          notificationCount={notificationCount}
          onlineStatus={onlineStatus}
          onToggleStatus={() => setOnlineStatus(!onlineStatus)}
          emergencyMode={emergencyMode}
          onToggleEmergency={() => setEmergencyMode(!emergencyMode)}
          onGoToLanding={onBackToHome}
          onSwitchRole={onSwitchRole}
          onViewProfile={handleProfileClick}
          riderName={riderName}
        />

        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && <RiderOverviewView onNavigate={setCurrentView} />}
          {currentView === 'assignments' && <AssignmentsView onNavigate={setCurrentView} />}
          {currentView === 'navigation' && <NavigationView />}
          {currentView === 'pickup' && <PickupVerificationView />}
          {currentView === 'coldchain' && <ColdChainView />}
          {currentView === 'emergency' && <RiderEmergencyView />}
          {currentView === 'earnings' && <EarningsView />}
          {currentView === 'history' && <RiderHistoryView />}
          {currentView === 'compliance' && <RiderComplianceView />}
          {currentView === 'profile' && <RiderProfileView />}
        </main>
      </div>
    </div>
  );
}
