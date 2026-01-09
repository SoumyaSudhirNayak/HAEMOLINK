import { useEffect, useState } from 'react';
import { HospitalSidebar } from './dashboard/hospital/HospitalSidebar';
import { HospitalHeader } from './dashboard/hospital/HospitalHeader';
import { HospitalOverviewView } from './dashboard/hospital/HospitalOverviewView';
import { InventoryView } from './dashboard/hospital/InventoryView';
import { StockDashboardView } from './dashboard/hospital/StockDashboardView';
import { RequestsView } from './dashboard/hospital/RequestsView';
import { CrossmatchView } from './dashboard/hospital/CrossmatchView';
import { DeliveryView } from './dashboard/hospital/DeliveryView';
import { TransfusionView } from './dashboard/hospital/TransfusionView';
import { EmergencyModeView } from './dashboard/hospital/EmergencyModeView';
import { CampsManagementView } from './dashboard/hospital/CampsManagementView';
import { ComplianceView } from './dashboard/hospital/ComplianceView';
import { OfflineOpsView } from './dashboard/hospital/OfflineOpsView';
import { HospitalProfileView } from './dashboard/hospital/HospitalProfileView';
import { useAutoRefresh } from '../context/AutoRefreshContext';

export type HospitalDashboardView = 
  | 'dashboard'
  | 'inventory'
  | 'stock'
  | 'requests'
  | 'crossmatch'
  | 'delivery'
  | 'transfusion'
  | 'emergency'
  | 'camps'
  | 'compliance'
  | 'offline'
  | 'profile';

interface HospitalDashboardProps {
  onBackToHome: () => void;
  onSwitchRole?: () => void;
  onViewProfile?: () => void;
}

export function HospitalDashboard({ onBackToHome, onSwitchRole, onViewProfile }: HospitalDashboardProps) {
  const { refreshTick } = useAutoRefresh();
  const [currentView, setCurrentView] = useState<HospitalDashboardView>('dashboard');
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const handler = (e: any) => {
      const detail = (e as any)?.detail;
      if (!detail || detail.role !== 'hospital') return;
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
        if (!session || role !== 'hospital') {
          if (active) setNotificationCount(0);
          return;
        }
        const { count } = await supabase
          .from('hospital_request_inbox')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', session.user.id)
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
      <HospitalSidebar 
        currentView={currentView} 
        onNavigate={setCurrentView}
        emergencyMode={emergencyMode}
        onLogoClick={onBackToHome}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <HospitalHeader 
          notificationCount={notificationCount}
          emergencyMode={emergencyMode}
          onToggleEmergency={() => setEmergencyMode(!emergencyMode)}
          onGoToLanding={onBackToHome}
          onSwitchRole={onSwitchRole}
          onViewProfile={handleProfileClick}
        />

        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && <HospitalOverviewView onNavigate={setCurrentView} />}
          {currentView === 'inventory' && <InventoryView />}
          {currentView === 'stock' && <StockDashboardView />}
          {currentView === 'requests' && <RequestsView />}
          {currentView === 'crossmatch' && <CrossmatchView />}
          {currentView === 'delivery' && <DeliveryView />}
          {currentView === 'transfusion' && <TransfusionView />}
          {currentView === 'emergency' && <EmergencyModeView />}
          {currentView === 'camps' && <CampsManagementView />}
          {currentView === 'compliance' && <ComplianceView />}
          {currentView === 'offline' && <OfflineOpsView />}
          {currentView === 'profile' && <HospitalProfileView />}
        </main>
      </div>
    </div>
  );
}
