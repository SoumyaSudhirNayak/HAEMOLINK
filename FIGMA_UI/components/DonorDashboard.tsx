import { useEffect, useState } from 'react';
import { DonorSidebar } from './dashboard/donor/DonorSidebar';
import { DonorHeader } from './dashboard/donor/DonorHeader';
import { DonorHomeView } from './dashboard/donor/DonorHomeView';
import { LiveRequestsView } from './dashboard/donor/LiveRequestsView';
import { EligibilityView } from './dashboard/donor/EligibilityView';
import { ScheduleDonationView } from './dashboard/donor/ScheduleDonationView';
import { NavigationView } from './dashboard/donor/NavigationView';
import { CampsView } from './dashboard/donor/CampsView';
import { CohortView } from './dashboard/donor/CohortView';
import { RewardsView } from './dashboard/donor/RewardsView';
import { DonorHistoryView } from './dashboard/donor/DonorHistoryView';
import { DonorProfileView } from './dashboard/donor/DonorProfileView';
import { RiderTrackingView } from './dashboard/donor/RiderTrackingView';
import { useAutoRefresh } from '../context/AutoRefreshContext';

export type DonorDashboardView = 
  | 'home' 
  | 'live-requests' 
  | 'eligibility' 
  | 'schedule'
  | 'navigation'
  | 'camps'
  | 'cohort'
  | 'rewards'
  | 'rider-tracking'
  | 'history'
  | 'profile';

interface DonorDashboardProps {
  onBackToHome: () => void;
  onSwitchRole?: () => void;
  onViewProfile?: () => void;
}

export function DonorDashboard({ onBackToHome, onSwitchRole, onViewProfile }: DonorDashboardProps) {
  const { refreshTick } = useAutoRefresh();
  const [currentView, setCurrentView] = useState<DonorDashboardView>('home');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const handler = (e: any) => {
      const detail = (e as any)?.detail;
      if (!detail || detail.role !== 'donor') return;
      if (detail.view) setCurrentView(detail.view as any);
    };
    window.addEventListener('haemolink:navigate', handler as any);
    return () => {
      window.removeEventListener('haemolink:navigate', handler as any);
    };
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
        if (!session || role !== 'donor') {
          if (active) setNotificationCount(0);
          return;
        }
        const { count } = await supabase
          .from('donor_request_inbox')
          .select('id', { count: 'exact', head: true })
          .eq('donor_id', session.user.id)
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

  const handleProfileClick = () => {
    if (onViewProfile) {
      onViewProfile();
    } else {
      setCurrentView('profile');
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <DonorSidebar 
        currentView={currentView} 
        onNavigate={setCurrentView}
        onLogoClick={onBackToHome}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DonorHeader 
          notificationCount={notificationCount}
          onGoToLanding={onBackToHome}
          onSwitchRole={onSwitchRole}
          onViewProfile={handleProfileClick}
        />

        <main className="flex-1 overflow-y-auto">
          {currentView === 'home' && <DonorHomeView onNavigate={setCurrentView} />}
          {currentView === 'live-requests' && <LiveRequestsView />}
          {currentView === 'eligibility' && <EligibilityView />}
          {currentView === 'schedule' && <ScheduleDonationView />}
          {currentView === 'navigation' && <NavigationView />}
          {currentView === 'camps' && <CampsView />}
          {currentView === 'cohort' && <CohortView />}
          {currentView === 'rewards' && <RewardsView />}
          {currentView === 'rider-tracking' && <RiderTrackingView onNavigate={setCurrentView} />}
          {currentView === 'history' && <DonorHistoryView />}
          {currentView === 'profile' && <DonorProfileView />}
        </main>
      </div>
    </div>
  );
}
