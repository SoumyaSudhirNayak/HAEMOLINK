import { LayoutDashboard, ClipboardList, Navigation, ScanLine, Thermometer, AlertCircle, DollarSign, History, Shield, User, Bike } from 'lucide-react';
import { RiderDashboardView } from '../../RiderDashboard';

interface RiderSidebarProps {
  currentView: RiderDashboardView;
  onNavigate: (view: RiderDashboardView) => void;
  emergencyMode: boolean;
  onLogoClick?: () => void;
}

const menuItems = [
  { id: 'dashboard' as RiderDashboardView, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assignments' as RiderDashboardView, label: 'Assignments', icon: ClipboardList },
  { id: 'navigation' as RiderDashboardView, label: 'Navigation', icon: Navigation },
  { id: 'pickup' as RiderDashboardView, label: 'Pickup Verification', icon: ScanLine },
  { id: 'coldchain' as RiderDashboardView, label: 'Cold Chain Monitor', icon: Thermometer },
  { id: 'emergency' as RiderDashboardView, label: 'Emergency Mode', icon: AlertCircle },
  { id: 'earnings' as RiderDashboardView, label: 'Earnings', icon: DollarSign },
  { id: 'history' as RiderDashboardView, label: 'History', icon: History },
  { id: 'compliance' as RiderDashboardView, label: 'Compliance', icon: Shield },
  { id: 'profile' as RiderDashboardView, label: 'Profile', icon: User },
];

export function RiderSidebar({ currentView, onNavigate, emergencyMode, onLogoClick }: RiderSidebarProps) {
  return (
    <div className={`w-64 border-r flex flex-col ${
      emergencyMode ? 'bg-red-900 border-red-800' : 'bg-white border-gray-200'
    }`}>
      {/* Logo - Clickable to return to landing */}
      <button
        onClick={onLogoClick}
        className={`p-6 border-b transition text-left ${
          emergencyMode 
            ? 'border-red-800 hover:bg-red-800' 
            : 'border-gray-200 hover:bg-gray-50'
        }`}
        title="Return to HAEMOLINK Home"
      >
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-lg ${
            emergencyMode 
              ? 'bg-red-500' 
              : 'bg-gradient-to-br from-orange-500 to-orange-600'
          }`}>
            <Bike className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className={emergencyMode ? 'text-white' : 'text-gray-900'}>Rider Portal</div>
            <div className={emergencyMode ? 'text-red-300' : 'text-gray-500'}>HAEMOLINK</div>
          </div>
        </div>
      </button>

      {/* Emergency Alert */}
      {emergencyMode && (
        <div className="p-4 bg-red-800 border-b border-red-700">
          <div className="flex items-center gap-2 text-white mb-2">
            <AlertCircle className="w-5 h-5 animate-pulse" />
            <span>EMERGENCY MODE</span>
          </div>
          <p className="text-red-200">Priority delivery active</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isEmergencyItem = item.id === 'emergency';
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                emergencyMode
                  ? isActive
                    ? 'bg-red-800 text-white'
                    : 'text-red-100 hover:bg-red-800'
                  : isActive
                    ? isEmergencyItem
                      ? 'bg-red-50 text-red-600'
                      : 'bg-orange-50 text-orange-600'
                    : isEmergencyItem
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}