import { Heart } from 'lucide-react';

/**
 * AuthFlowDemo - Quick Testing Component
 * 
 * This component provides quick access buttons to test different authentication flows
 * Remove this component in production or hide behind a feature flag
 */

interface AuthFlowDemoProps {
  onNavigate: (view: string) => void;
}

export function AuthFlowDemo({ onNavigate }: AuthFlowDemoProps) {
  const flows = [
    { name: 'Landing Page', view: 'landing', color: 'gray' },
    { name: 'Role Selection', view: 'role-selection', color: 'gray' },
    { name: 'Patient Login', view: 'patient-auth', color: 'blue' },
    { name: 'Donor Login', view: 'donor-auth', color: 'green' },
    { name: 'Rider Login', view: 'rider-auth', color: 'orange' },
    { name: 'Hospital Login', view: 'hospital-auth', color: 'violet' },
    { name: 'Patient Dashboard', view: 'patient-dashboard', color: 'blue' },
    { name: 'Donor Dashboard', view: 'donor-dashboard', color: 'green' },
    { name: 'Rider Dashboard', view: 'rider-dashboard', color: 'orange' },
    { name: 'Hospital Dashboard', view: 'hospital-dashboard', color: 'violet' },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <details className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200">
        <summary className="px-6 py-3 cursor-pointer hover:bg-gray-50 rounded-2xl flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <span className="font-medium text-gray-900">Auth Flow Tester</span>
        </summary>
        <div className="px-6 py-4 space-y-2 max-h-96 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-3">Quick navigation for testing</p>
          {flows.map((flow) => (
            <button
              key={flow.view}
              onClick={() => onNavigate(flow.view)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition hover:bg-${flow.color}-50 hover:text-${flow.color}-700 text-gray-700`}
            >
              {flow.name}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
