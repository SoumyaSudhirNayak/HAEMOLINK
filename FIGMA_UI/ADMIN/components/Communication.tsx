import { useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Send, Bell, MessageSquare, Radio, Globe, Building2 } from 'lucide-react';

const bulletinFeed = [
  { 
    id: 1, 
    from: 'Red Cross Society', 
    type: 'NGO',
    message: 'Organizing blood donation camp on Jan 15th at Central Park. Expected 500+ donors.',
    timestamp: '2026-01-09 14:30',
    priority: 'high'
  },
  { 
    id: 2, 
    from: 'AIIMS Delhi', 
    type: 'Hospital',
    message: 'Critical shortage of O- blood. Immediate donations needed.',
    timestamp: '2026-01-09 13:15',
    priority: 'critical'
  },
  { 
    id: 3, 
    from: 'Apollo Hospitals', 
    type: 'Hospital',
    message: 'Successfully received 50 units from redistribution program. Thank you!',
    timestamp: '2026-01-09 11:45',
    priority: 'normal'
  },
];

const messageTemplates = [
  { id: 1, name: 'Emergency Alert', category: 'Critical', channels: ['Push', 'SMS', 'IVR'] },
  { id: 2, name: 'Donation Reminder', category: 'Routine', channels: ['Push', 'SMS'] },
  { id: 3, name: 'Camp Notification', category: 'Event', channels: ['Push', 'SMS'] },
  { id: 4, name: 'Request Confirmation', category: 'Transaction', channels: ['Push'] },
];

export function Communication() {
  const [selectedTemplate, setSelectedTemplate] = useState('');

  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">Communication & Notification Control</h2>
        <p className="text-sm text-gray-500">Broadcast messages and manage notifications across the ecosystem</p>
      </div>

      <Tabs defaultValue="broadcast" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="broadcast">Broadcast Messages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="bulletin">Bulletin Feed</TabsTrigger>
        </TabsList>

        {/* Broadcast Messages Tab */}
        <TabsContent value="broadcast" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Composer */}
            <Card className="lg:col-span-2 p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">Compose Broadcast Message</h3>
                <p className="text-sm text-gray-500">Send notifications to users across the platform</p>
              </div>

              <div className="space-y-4">
                {/* Template Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Message Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template or write custom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Message</SelectItem>
                      <SelectItem value="emergency">Emergency Alert</SelectItem>
                      <SelectItem value="donation">Donation Reminder</SelectItem>
                      <SelectItem value="camp">Camp Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Target Audience</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Select defaultValue="all-users">
                      <SelectTrigger>
                        <SelectValue placeholder="User Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-users">All Users</SelectItem>
                        <SelectItem value="patients">Patients Only</SelectItem>
                        <SelectItem value="donors">Donors Only</SelectItem>
                        <SelectItem value="hospitals">Hospitals Only</SelectItem>
                        <SelectItem value="riders">Riders Only</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select defaultValue="all-regions">
                      <SelectTrigger>
                        <SelectValue placeholder="Region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-regions">All Regions</SelectItem>
                        <SelectItem value="north">North</SelectItem>
                        <SelectItem value="south">South</SelectItem>
                        <SelectItem value="east">East</SelectItem>
                        <SelectItem value="west">West</SelectItem>
                        <SelectItem value="central">Central</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Language Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Language</label>
                  <div className="flex gap-2 flex-wrap">
                    {['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi'].map((lang) => (
                      <Button
                        key={lang}
                        variant="outline"
                        size="sm"
                        className="hover:bg-[#EFF6FF] hover:text-[#3B82F6] hover:border-[#3B82F6]"
                      >
                        {lang}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Message Content */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Message Content</label>
                  <Textarea 
                    placeholder="Type your message here..."
                    className="min-h-32"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Characters: 0/500 • Available variables: {'{name}'}, {'{bloodGroup}'}, {'{location}'}
                  </p>
                </div>

                {/* Delivery Channels */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Delivery Channels</label>
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="p-4 cursor-pointer hover:border-[#3B82F6] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                          <Bell className="size-5 text-[#3B82F6]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Push</p>
                          <p className="text-xs text-gray-500">In-app</p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 cursor-pointer hover:border-[#3B82F6] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
                          <MessageSquare className="size-5 text-[#10B981]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">SMS</p>
                          <p className="text-xs text-gray-500">Text</p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 cursor-pointer hover:border-[#3B82F6] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
                          <Radio className="size-5 text-[#8B5CF6]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">IVR</p>
                          <p className="text-xs text-gray-500">Voice</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" className="flex-1">Save as Draft</Button>
                  <Button variant="outline" className="flex-1">Preview</Button>
                  <Button className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB]">
                    <Send className="size-4 mr-2" />
                    Send Broadcast
                  </Button>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3">Broadcast Statistics</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Messages Sent Today</span>
                      <span className="font-semibold">1,247</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Delivery Rate</span>
                      <span className="font-semibold text-[#10B981]">98.4%</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Active Recipients</span>
                      <span className="font-semibold">69,283</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-[#FFF7ED] border-[#F97316]">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-[#F97316] flex items-center justify-center flex-shrink-0">
                    <Globe className="size-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">Multi-language Support</p>
                    <p className="text-xs text-gray-600">Messages are auto-translated based on user preferences</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Message Templates</h3>
                <p className="text-sm text-gray-500">Pre-configured notification templates</p>
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">Create Template</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {messageTemplates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium mb-1">{template.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                  <div className="flex gap-2">
                    {template.channels.map((channel) => (
                      <Badge
                        key={channel}
                        variant="outline"
                        className="bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]"
                      >
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Bulletin Feed Tab */}
        <TabsContent value="bulletin" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-1">NGO / Hospital Bulletin Feed</h3>
              <p className="text-sm text-gray-500">Real-time updates from registered organizations</p>
            </div>

            <div className="space-y-3">
              {bulletinFeed.map((bulletin) => (
                <Card
                  key={bulletin.id}
                  className={`p-4 border-l-4 ${
                    bulletin.priority === 'critical'
                      ? 'border-l-[#EF4444] bg-[#FEF2F2]'
                      : bulletin.priority === 'high'
                      ? 'border-l-[#F97316] bg-[#FFF7ED]'
                      : 'border-l-[#3B82F6] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center">
                        {bulletin.type === 'NGO' ? (
                          <Globe className="size-4" />
                        ) : (
                          <Building2 className="size-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{bulletin.from}</p>
                        <p className="text-xs text-gray-500">{bulletin.timestamp}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        bulletin.priority === 'critical'
                          ? 'bg-[#EF4444] text-white border-[#EF4444]'
                          : bulletin.priority === 'high'
                          ? 'bg-[#F97316] text-white border-[#F97316]'
                          : 'bg-gray-100 text-gray-600 border-gray-400'
                      }
                    >
                      {bulletin.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">{bulletin.message}</p>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
