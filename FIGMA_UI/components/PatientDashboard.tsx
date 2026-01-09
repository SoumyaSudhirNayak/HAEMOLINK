import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './dashboard/Sidebar';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { HomeView } from './dashboard/views/HomeView';
import { SearchFiltersView } from './dashboard/views/SearchFiltersView';
import { OrderTrackingView } from './dashboard/views/OrderTrackingView';
import { DonorSearchView } from './dashboard/views/DonorSearchView';
import { BloodPacketView } from './dashboard/views/BloodPacketView';
import { MedicalReportsView } from './dashboard/views/MedicalReportsView';
import { TransfusionView } from './dashboard/views/TransfusionView';
import { PaymentsView } from './dashboard/views/PaymentsView';
import { NotificationsView } from './dashboard/views/NotificationsView';
import { HistoryView } from './dashboard/views/HistoryView';
import { ProfileView } from './dashboard/views/ProfileView';
import { RequestBloodView } from './dashboard/views/RequestBloodView';
import { CohortSystemView } from './dashboard/views/CohortSystemView';
import { useAutoRefresh } from '../context/AutoRefreshContext';

export type DashboardView = 
  | 'home' 
  | 'request-blood' 
  | 'search-donor' 
  | 'track-orders' 
  | 'transfusions'
  | 'reports'
  | 'payments'
  | 'cohort'
  | 'history'
  | 'profile'
  | 'search-filters'
  | 'order-tracking'
  | 'blood-packet'
  | 'notifications';

interface PatientDashboardProps {
  onBackToHome: () => void;
  onSwitchRole: () => void;
  onViewProfile?: () => void;
}

export function PatientDashboard({ onBackToHome, onSwitchRole, onViewProfile }: PatientDashboardProps) {
  const { refreshTick } = useAutoRefresh();
  const [currentView, setCurrentView] = useState<DashboardView>('home');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const handler = (e: any) => {
      const detail = (e as any)?.detail;
      if (!detail || detail.role !== 'patient') return;
      if (detail.view) setCurrentView(detail.view as any);
    };
    window.addEventListener('haemolink:navigate', handler as any);
    return () => {
      window.removeEventListener('haemolink:navigate', handler as any);
    };
  }, []);

  const loadNotificationCount = useCallback(async () => {
    try {
      const [{ getSessionAndRole }, { supabase }] = await Promise.all([
        import('../services/auth'),
        import('../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'patient') {
        setNotificationCount(0);
        return;
      }
      const uid = session.user.id;
      const [unreadResult, activeRequestsResult] = await Promise.all([
        supabase
          .from('patient_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', uid)
          .eq('is_read', false),
        supabase
          .from('blood_requests')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', uid)
          .in('status', ['open', 'pending', 'accepted', 'preparing', 'dispatched', 'assigned', 'in_transit']),
      ]);
      const unread = unreadResult.count ?? 0;
      const activeRequests = activeRequestsResult.count ?? 0;
      setNotificationCount(unread + activeRequests);
    } catch {
      setNotificationCount(0);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let channelNotifications: any = null;
    let channelRequests: any = null;
    (async () => {
      try {
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../services/auth'),
          import('../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'patient') {
          if (active) setNotificationCount(0);
          return;
        }
        const uid = session.user.id;
        await loadNotificationCount();

        channelNotifications = supabase
          .channel(`patient_header_notifications_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'patient_notifications', filter: `patient_id=eq.${uid}` },
            () => {
              if (!active) return;
              loadNotificationCount();
            },
          )
          .subscribe();

        channelRequests = supabase
          .channel(`patient_header_requests_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'blood_requests', filter: `patient_id=eq.${uid}` },
            () => {
              if (!active) return;
              loadNotificationCount();
            },
          )
          .subscribe();
      } catch {
        if (active) setNotificationCount(0);
      }
    })();
    return () => {
      active = false;
      if (channelNotifications) channelNotifications.unsubscribe();
      if (channelRequests) channelRequests.unsubscribe();
    };
  }, [loadNotificationCount]);

  useEffect(() => {
    loadNotificationCount();
  }, [loadNotificationCount, refreshTick]);

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
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView}
        onLogoClick={onBackToHome}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader 
          notificationCount={notificationCount}
          onNotificationClick={() => setCurrentView('notifications')}
          onGoToLanding={onBackToHome}
          onSwitchRole={onSwitchRole}
          onViewProfile={handleProfileClick}
        />

        <main className="flex-1 overflow-y-auto">
          {currentView === 'home' && <HomeView onNavigate={setCurrentView} />}
          {currentView === 'request-blood' && <RequestBloodView onNavigate={setCurrentView} />}
          {currentView === 'search-donor' && <DonorSearchView />}
          {currentView === 'track-orders' && <OrderTrackingView />}
          {currentView === 'cohort' && <CohortSystemView onNavigate={(view: any) => setCurrentView(view)} />}
          {currentView === 'transfusions' && <TransfusionView />}
          {currentView === 'reports' && <MedicalReportsView />}
          {currentView === 'payments' && <PaymentsView />}
          {currentView === 'history' && <HistoryView />}
          {currentView === 'profile' && <ProfileView />}
          {currentView === 'search-filters' && <SearchFiltersView onNavigate={setCurrentView} />}
          {currentView === 'order-tracking' && <OrderTrackingView />}
          {currentView === 'blood-packet' && <BloodPacketView />}
          {currentView === 'notifications' && <NotificationsView />}
        </main>
      </div>
    </div>
  );
}
