import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Wifi, Phone, MessageSquare, RefreshCw, CheckCircle, Clock } from 'lucide-react';

const smsConfigs = [
  { id: 1, provider: 'Twilio', region: 'Pan India', status: 'Active', messagesSent: 45623, successRate: '98.5%' },
  { id: 2, provider: 'AWS SNS', region: 'North India', status: 'Active', messagesSent: 23451, successRate: '97.2%' },
  { id: 3, provider: 'MSG91', region: 'South India', status: 'Active', messagesSent: 34212, successRate: '99.1%' },
];

const ivrConfigs = [
  { id: 1, language: 'Hindi', template: 'Emergency Blood Request', status: 'Active', callsMade: 1234 },
  { id: 2, language: 'English', template: 'Donation Reminder', status: 'Active', callsMade: 892 },
  { id: 3, language: 'Tamil', template: 'Emergency Blood Request', status: 'Active', callsMade: 567 },
  { id: 4, language: 'Telugu', template: 'Camp Notification', status: 'Active', callsMade: 423 },
];

const ruralSyncData = [
  { region: 'Rural Maharashtra', lastSync: '2026-01-09 14:30', pendingRecords: 12, status: 'Synced' },
  { region: 'Rural Bihar', lastSync: '2026-01-09 11:45', pendingRecords: 34, status: 'Pending' },
  { region: 'Rural Odisha', lastSync: '2026-01-09 13:15', pendingRecords: 8, status: 'Synced' },
  { region: 'Rural Rajasthan', lastSync: '2026-01-09 10:20', pendingRecords: 56, status: 'Pending' },
];

export function OfflineOperations() {
  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">Offline Operations Control</h2>
        <p className="text-sm text-gray-500">Manage SMS, IVR, and rural connectivity services</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-[#10B981]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <MessageSquare className="size-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">103K</p>
              <p className="text-sm text-gray-500">SMS Sent (MTD)</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#3B82F6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#EFF6FF] flex items-center justify-center">
              <Phone className="size-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">3,116</p>
              <p className="text-sm text-gray-500">IVR Calls (MTD)</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#8B5CF6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F5F3FF] flex items-center justify-center">
              <Wifi className="size-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">98.2%</p>
              <p className="text-sm text-gray-500">Delivery Success</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#F97316]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#FFF7ED] flex items-center justify-center">
              <RefreshCw className="size-5 text-[#F97316]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">110</p>
              <p className="text-sm text-gray-500">Pending Syncs</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="sms" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="sms">SMS Configuration</TabsTrigger>
          <TabsTrigger value="ivr">IVR System</TabsTrigger>
          <TabsTrigger value="rural">Rural Sync Rules</TabsTrigger>
          <TabsTrigger value="monitor">Offline Monitor</TabsTrigger>
        </TabsList>

        {/* SMS Configuration Tab */}
        <TabsContent value="sms" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">SMS Gateway Configuration</h3>
                <p className="text-sm text-gray-500">Manage SMS providers and delivery settings</p>
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">Add Provider</Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Messages Sent</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {smsConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.provider}</TableCell>
                      <TableCell>{config.region}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
                          {config.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{config.messagesSent.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]">
                          {config.successRate}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">SMS Delivery Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium mb-1">Auto-Retry Failed Messages</p>
                  <p className="text-sm text-gray-600">Automatically retry failed SMS deliveries</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium mb-1">Priority Queue for Critical Alerts</p>
                  <p className="text-sm text-gray-600">Emergency messages bypass rate limits</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="mb-2 block">Maximum Retry Attempts</Label>
                <Input type="number" defaultValue={3} className="w-32" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* IVR System Tab */}
        <TabsContent value="ivr" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">IVR Call Templates</h3>
                <p className="text-sm text-gray-500">Automated voice call configurations</p>
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">Create Template</Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Language</TableHead>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Calls Made</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ivrConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]">
                          {config.language}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{config.template}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
                          {config.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{config.callsMade}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm">
                            Preview
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-6 bg-[#F5F3FF] border-[#8B5CF6]">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                <Phone className="size-5 text-white" />
              </div>
              <div>
                <p className="font-medium mb-1">Multi-Language IVR Support</p>
                <p className="text-sm text-gray-600">
                  IVR templates are available in 12 regional languages including Hindi, English, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, and Assamese.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Rural Sync Rules Tab */}
        <TabsContent value="rural" className="space-y-4">
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-1">Rural Connectivity Rules</h3>
              <p className="text-sm text-gray-500">Configure data synchronization for low-connectivity areas</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium mb-1">Auto-Sync on Connection</p>
                    <p className="text-sm text-gray-600">Automatically sync data when connectivity is restored</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex gap-4 items-center">
                  <Label className="whitespace-nowrap">Sync Interval:</Label>
                  <Input type="number" defaultValue={30} className="w-24" />
                  <span className="text-sm text-gray-600">minutes</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium mb-1">Offline Data Collection</p>
                    <p className="text-sm text-gray-600">Allow data entry in offline mode for later sync</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium mb-1">SMS Fallback for Offline Regions</p>
                    <p className="text-sm text-gray-600">Use SMS when internet is unavailable</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Offline Monitor Tab */}
        <TabsContent value="monitor" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Offline → Online Sync Monitor</h3>
                <p className="text-sm text-gray-500">Track pending data synchronization from rural areas</p>
              </div>
              <Button variant="outline" className="gap-2">
                <RefreshCw className="size-4" />
                Force Sync All
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Pending Records</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ruralSyncData.map((sync, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{sync.region}</TableCell>
                      <TableCell className="text-sm text-gray-500">{sync.lastSync}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            sync.pendingRecords > 30
                              ? 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                              : 'bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]'
                          }
                        >
                          {sync.pendingRecords} records
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sync.status === 'Synced' ? (
                          <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
                            <CheckCircle className="size-3 mr-1" />
                            Synced
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-[#FFF7ED] text-[#F97316] border-[#F97316]">
                            <Clock className="size-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Sync Now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
