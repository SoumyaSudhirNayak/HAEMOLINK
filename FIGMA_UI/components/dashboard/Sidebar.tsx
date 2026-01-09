import { Home, DropletIcon, Search, MapPin, Activity, FileText, CreditCard, Clock, User, Heart, Users } from 'lucide-react';
import { DashboardView } from '../PatientDashboard';

interface SidebarProps {
  currentView: DashboardView;
  onNavigate: (view: DashboardView) => void;
  onLogoClick?: () => void;
}

const menuItems = [
  { id: 'home' as DashboardView, label: 'Home', icon: Home },
  { id: 'request-blood' as DashboardView, label: 'Request Blood', icon: DropletIcon },
  { id: 'search-donor' as DashboardView, label: 'Search Donor', icon: Search },
  { id: 'track-orders' as DashboardView, label: 'Track Orders', icon: MapPin },
  { id: 'cohort' as DashboardView, label: 'Cohort System', icon: Users },
  { id: 'transfusions' as DashboardView, label: 'Transfusions', icon: Activity },
  { id: 'reports' as DashboardView, label: 'Reports', icon: FileText },
  { id: 'payments' as DashboardView, label: 'Payments', icon: CreditCard },
  { id: 'history' as DashboardView, label: 'History', icon: Clock },
  { id: 'profile' as DashboardView, label: 'Profile', icon: User },
];

export function Sidebar({ currentView, onNavigate, onLogoClick }: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo - Clickable to return to landing */}
      <button 
        onClick={onLogoClick}
        className="p-6 border-b border-gray-200 hover:bg-gray-50 transition text-left"
        title="Return to HAEMOLINK Home"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <div className="text-gray-900">Patient Portal</div>
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
                  ? 'bg-blue-50 text-blue-600'
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