import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Brain, Zap, Settings2, RefreshCw } from 'lucide-react';

export function AIAutomation() {
  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">AI & Automation Controls</h2>
        <p className="text-sm text-gray-500">Configure intelligent matching and automated workflows</p>
      </div>

      {/* AI Status */}
      <Card className="p-6 bg-[#F5F3FF] border-[#8B5CF6]">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-full bg-[#8B5CF6] flex items-center justify-center">
            <Brain className="size-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">AI Engine Status</h3>
            <p className="text-sm text-gray-600">All automation systems operational</p>
          </div>
          <Badge className="bg-[#10B981] text-white">Active</Badge>
        </div>
      </Card>

      {/* Urgency Scoring */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="size-5 text-[#F97316]" />
            <h3 className="font-semibold text-gray-900">Urgency Scoring Parameters</h3>
          </div>
          <p className="text-sm text-gray-500">Configure AI-based request prioritization</p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label>Critical Time Window (hours)</Label>
              <span className="text-sm font-medium">4 hours</span>
            </div>
            <Slider defaultValue={[4]} max={24} min={1} step={1} />
            <p className="text-xs text-gray-500 mt-1">
              Requests requiring delivery within this window are marked as critical
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label>High Priority Threshold</Label>
              <span className="text-sm font-medium">12 hours</span>
            </div>
            <Slider defaultValue={[12]} max={48} min={4} step={1} />
            <p className="text-xs text-gray-500 mt-1">
              Requests within this window are marked as high priority
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label>Distance Weighting Factor</Label>
              <span className="text-sm font-medium">0.7</span>
            </div>
            <Slider defaultValue={[70]} max={100} min={0} step={5} />
            <p className="text-xs text-gray-500 mt-1">
              Higher values prioritize proximity in matching algorithm
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label>Blood Availability Weight</Label>
              <span className="text-sm font-medium">0.9</span>
            </div>
            <Slider defaultValue={[90]} max={100} min={0} step={5} />
            <p className="text-xs text-gray-500 mt-1">
              Importance of inventory levels in hospital matching
            </p>
          </div>
        </div>
      </Card>

      {/* Matching Rules */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings2 className="size-5 text-[#3B82F6]" />
            <h3 className="font-semibold text-gray-900">Smart Matching Rules</h3>
          </div>
          <p className="text-sm text-gray-500">Automated donor-patient matching configuration</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium mb-1">Auto-Match Compatible Donors</p>
              <p className="text-sm text-gray-600">Automatically suggest donors within 10km radius</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium mb-1">Rare Blood Type Priority</p>
              <p className="text-sm text-gray-600">Escalate requests for O-, AB-, B- automatically</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium mb-1">Multi-Hospital Coordination</p>
              <p className="text-sm text-gray-600">Suggest inter-hospital transfers for shortages</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium mb-1">Predictive Shortage Alerts</p>
              <p className="text-sm text-gray-600">Alert admins 48 hours before predicted shortage</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </Card>

      {/* Emergency Routing */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="size-5 text-[#EF4444]" />
            <h3 className="font-semibold text-gray-900">Emergency Routing Thresholds</h3>
          </div>
          <p className="text-sm text-gray-500">Configure automated emergency response protocols</p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label>Max Rider Assignment Time (minutes)</Label>
              <span className="text-sm font-medium">5 minutes</span>
            </div>
            <Slider defaultValue={[5]} max={30} min={1} step={1} />
            <p className="text-xs text-gray-500 mt-1">
              Auto-escalate if no rider assigned within this time
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label>Critical Inventory Level (%)</Label>
              <span className="text-sm font-medium">15%</span>
            </div>
            <Slider defaultValue={[15]} max={50} min={5} step={5} />
            <p className="text-xs text-gray-500 mt-1">
              Trigger emergency redistribution protocols
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label>Auto-Escalation Delay (minutes)</Label>
              <span className="text-sm font-medium">10 minutes</span>
            </div>
            <Slider defaultValue={[10]} max={60} min={5} step={5} />
            <p className="text-xs text-gray-500 mt-1">
              Time before unhandled critical requests are escalated
            </p>
          </div>
        </div>
      </Card>

      {/* Donor Eligibility Rules */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Badge className="size-5 bg-[#10B981]" />
            <h3 className="font-semibold text-gray-900">Donor Eligibility Rules</h3>
          </div>
          <p className="text-sm text-gray-500">Automated eligibility checking parameters</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium mb-2">Minimum Age</p>
            <p className="text-2xl font-semibold mb-1">18 years</p>
            <p className="text-xs text-gray-500">Legal minimum for blood donation</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium mb-2">Maximum Age</p>
            <p className="text-2xl font-semibold mb-1">65 years</p>
            <p className="text-xs text-gray-500">Standard upper age limit</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium mb-2">Min. Donation Interval</p>
            <p className="text-2xl font-semibold mb-1">90 days</p>
            <p className="text-xs text-gray-500">Whole blood donation gap</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium mb-2">Min. Hemoglobin</p>
            <p className="text-2xl font-semibold mb-1">12.5 g/dL</p>
            <p className="text-xs text-gray-500">Female donors threshold</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1">
          <RefreshCw className="size-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED]">
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
