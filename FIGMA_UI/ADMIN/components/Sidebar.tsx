import {
  LayoutDashboard,
  Users,
  Droplet,
  FileText,
  MessageSquare,
  Tent,
  Brain,
  Shield,
  DollarSign,
  Settings,
  Scale,
  Wifi,
  BarChart3,
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'inventory', label: 'Inventory & Blood Flow', icon: Droplet },
  { id: 'requests', label: 'Requests', icon: FileText },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'camps', label: 'Camps & NGOs', icon: Tent },
  { id: 'ai', label: 'AI & Automation', icon: Brain },
  { id: 'fraud', label: 'Fraud Detection', icon: Shield },
  { id: 'finance', label: 'Finance & Sponsors', icon: DollarSign },
  { id: 'config', label: 'System Config', icon: Settings },
  { id: 'compliance', label: 'Compliance & Legal', icon: Scale },
  { id: 'offline', label: 'Offline Ops', icon: Wifi },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar({ activeSection, onSectionChange, isOpen }: SidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => onSectionChange(activeSection)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <ScrollArea className="h-full">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`w-full justify-start gap-3 ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#EFF6FF]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => onSectionChange(item.id)}
                >
                  <Icon className="size-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Button>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
