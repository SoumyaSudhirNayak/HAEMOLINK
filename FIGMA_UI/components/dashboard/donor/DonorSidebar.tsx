import { Home, AlertCircle, Heart, Calendar, MapPin, Users, Gift, Clock, User, Droplet, Truck } from 'lucide-react';
import { DonorDashboardView } from '../../DonorDashboard';

interface DonorSidebarProps {
  currentView: DonorDashboardView;
  onNavigate: (view: DonorDashboardView) => void;
  onLogoClick?: () => void;
}

const menuItems = [
  { id: 'home' as DonorDashboardView, label: 'Home', icon: Home },
  { id: 'live-requests' as DonorDashboardView, label: 'Live Requests', icon: AlertCircle },
  { id: 'eligibility' as DonorDashboardView, label: 'Eligibility', icon: Heart },
  { id: 'schedule' as DonorDashboardView, label: 'Schedule Donation', icon: Calendar },
  { id: 'navigation' as DonorDashboardView, label: 'Navigation', icon: MapPin },
  { id: 'rider-tracking' as DonorDashboardView, label: 'Rider Tracking', icon: Truck },
  { id: 'camps' as DonorDashboardView, label: 'Camps & Drives', icon: Users },
  { id: 'cohort' as DonorDashboardView, label: 'Cohort System', icon: Droplet },
  { id: 'rewards' as DonorDashboardView, label: 'Rewards', icon: Gift },
  { id: 'history' as DonorDashboardView, label: 'History', icon: Clock },
  { id: 'profile' as DonorDashboardView, label: 'Profile', icon: User },
];

export function DonorSidebar({ currentView, onNavigate, onLogoClick }: DonorSidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo - Clickable to return to landing */}
      <button
        onClick={onLogoClick}
        className="p-6 border-b border-gray-200 hover:bg-gray-50 transition text-left"
        title="Return to HAEMOLINK Home"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
            <Droplet className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <div className="text-gray-900">Donor Portal</div>
            <div className="text-gray-500">HAEMOLINK</div>
          </div>
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-green-50 text-green-600'
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