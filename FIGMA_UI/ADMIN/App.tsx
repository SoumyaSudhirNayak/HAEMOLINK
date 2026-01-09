import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { UserManagement } from './components/UserManagement';
import { InventoryBloodFlow } from './components/InventoryBloodFlow';
import { RequestManagement } from './components/RequestManagement';
import { Communication } from './components/Communication';
import { CampsNGOs } from './components/CampsNGOs';
import { AIAutomation } from './components/AIAutomation';
import { FraudDetection } from './components/FraudDetection';
import { FinanceSponsors } from './components/FinanceSponsors';
import { SystemConfiguration } from './components/SystemConfiguration';
import { ComplianceLegal } from './components/ComplianceLegal';
import { OfflineOperations } from './components/OfflineOperations';
import { AnalyticsReports } from './components/AnalyticsReports';

export default function App({ onExit }: { onExit?: () => void }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'users':
        return <UserManagement />;
      case 'inventory':
        return <InventoryBloodFlow />;
      case 'requests':
        return <RequestManagement />;
      case 'communication':
        return <Communication />;
      case 'camps':
        return <CampsNGOs />;
      case 'ai':
        return <AIAutomation />;
      case 'fraud':
        return <FraudDetection />;
      case 'finance':
        return <FinanceSponsors />;
      case 'config':
        return <SystemConfiguration />;
      case 'compliance':
        return <ComplianceLegal />;
      case 'offline':
        return <OfflineOperations />;
      case 'analytics':
        return <AnalyticsReports />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} onExit={onExit} />
      <div className="flex">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          isOpen={sidebarOpen}
        />
        <main className={`flex-1 p-6 pt-24 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
