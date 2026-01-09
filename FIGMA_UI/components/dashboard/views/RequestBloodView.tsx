import { CheckCircle, Circle, Building2, Droplet, MapPin, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { DashboardView } from '../../PatientDashboard';
import { BackButton } from '../navigation/BackButton';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import { createPatientBloodRequest } from '../../../services/patientRequests';

interface RequestBloodViewProps {
  onNavigate: (view: DashboardView) => void;
}

export function RequestBloodView({ onNavigate }: RequestBloodViewProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [units, setUnits] = useState<number>(2);
  const [submitting, setSubmitting] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<any | null>(null);
  const [urgency, setUrgency] = useState<"critical" | "high" | "medium" | "low" | null>(null);
  const [urgencyError, setUrgencyError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (submitting) return;
    if (!urgency) {
      setUrgencyError("Please select urgency level");
      setCurrentStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        request_type: 'emergency' as const,
        component: selectedComponent || 'RBC',
        units_required: units,
        urgency: urgency as "critical" | "high" | "medium" | "low",
        hospital_preference: null,
        notes: null,
      };
      console.log("Submitting blood request:", {
        request_type: payload.request_type,
        blood_group: "from-profile",
        component: payload.component,
        units_required: payload.units_required,
        urgency: payload.urgency,
      });
      const data = await createPatientBloodRequest(payload);
      setCreatedRequest(data);
      setCurrentStep(3);
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Failed to create request';
      window.alert(msg);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleContinueFromStep1 = () => {
    if (!urgency) {
      setUrgencyError("Please select urgency level");
      return;
    }
    setUrgencyError(null);
    setCurrentStep(2);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <BackButton onClick={() => onNavigate('home')} />
        <Breadcrumbs items={[
          { label: 'Home', onClick: () => onNavigate('home') },
          { label: 'Request Blood' }
        ]} />

        <div className="mb-8">
          <h2 className="text-gray-900 mb-2">Request Blood</h2>
          <p className="text-gray-600">Complete the steps to place your blood request</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            {[
              { num: 1, label: 'Select Component' },
              { num: 2, label: 'Confirm' },
              { num: 3, label: 'Request Created' },
            ].map((step, idx, arr) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      step.num <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.num < currentStep ? <CheckCircle className="w-5 h-5" /> : <span>{step.num}</span>}
                  </div>
                  <span
                    className={`text-center ${
                      step.num <= currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      step.num < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-gray-900 mb-6">Select Blood Component</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: 'Whole Blood', value: 'Whole Blood', desc: 'Complete blood with all components' },
                  { label: 'Red Blood Cells (RBC)', value: 'RBC', desc: 'Packed red blood cells' },
                  { label: 'Plasma', value: 'Plasma', desc: 'Fresh frozen plasma' },
                  { label: 'Platelets', value: 'Platelets', desc: 'Platelet concentrate' },
                  { label: 'Cryoprecipitate', value: 'Cryoprecipitate', desc: 'Factor VIII concentrate' },
                ].map((component) => (
                  <label
                    key={component.value}
                    className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 cursor-pointer transition"
                  >
                  <input
                    type="radio"
                    name="component"
                    className="mt-1"
                    checked={selectedComponent === component.value}
                    onChange={() => setSelectedComponent(component.value)}
                  />
                  <div>
                    <div className="text-gray-900 mb-1">{component.label}</div>
                    <p className="text-gray-500">{component.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Number of Units Required</label>
              <input
                type="number"
                min="1"
                value={units}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '0', 10);
                  setUnits(Number.isFinite(v) && v > 0 ? v : 1);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-2">
              <label className="block text-gray-700 mb-2">Urgency Level</label>
              <div className="grid grid-cols-4 gap-3">
                {['critical','high','medium','low'].map((u) => (
                  <label
                    key={u}
                    className={`flex items-center gap-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition ${
                      urgency === u ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      checked={urgency === u}
                      onChange={() => setUrgency(u as any)}
                    />
                    <span className="capitalize text-gray-900">{u}</span>
                  </label>
                ))}
              </div>
              {urgencyError && (
                <div className="mt-2 text-red-600">{urgencyError}</div>
              )}
            </div>

            <button
              onClick={handleContinueFromStep1}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Continue
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-gray-900 mb-6">Confirm Request</h3>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-900 mb-1">Emergency Request</div>
                  <p className="text-gray-600">This will be prioritized for immediate processing</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1" defaultChecked />
                <span className="text-gray-700">I confirm the blood type and component details are correct</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1" defaultChecked />
                <span className="text-gray-700">I will be available at the delivery location</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1" defaultChecked />
                <span className="text-gray-700">I agree to the terms and conditions</span>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm Request'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h3 className="text-gray-900 mb-2">Request Created Successfully!</h3>
            <p className="text-gray-600 mb-6">Your blood request has been submitted and is being processed</p>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
              <div className="text-gray-500 mb-2">Request ID</div>
              <div className="text-gray-900 mb-4">{createdRequest?.id || '—'}</div>
              
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <div className="text-gray-500 mb-1">Component</div>
                  <div className="text-gray-900">
                    {(createdRequest?.component || selectedComponent || 'RBC') + ' - ' + (createdRequest?.units_required ?? units) + ' Units'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Fulfillment</div>
                  <div className="text-gray-900">Nearby hospitals and donors</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Status</div>
                  <div className="text-green-600">{createdRequest?.status || 'Processing'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">ETA</div>
                  <div className="text-gray-900">~35 minutes</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => onNavigate('track-orders')}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Track Order
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
