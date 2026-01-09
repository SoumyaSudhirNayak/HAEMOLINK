import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Settings, Plus, Users, Droplet, AlertTriangle, Shield } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';

const bloodComponents = [
  { id: 1, name: 'Whole Blood', code: 'WB', shelfLife: '35 days', enabled: true },
  { id: 2, name: 'Red Blood Cells', code: 'RBC', shelfLife: '42 days', enabled: true },
  { id: 3, name: 'Platelets', code: 'PLT', shelfLife: '5 days', enabled: true },
  { id: 4, name: 'Fresh Frozen Plasma', code: 'FFP', shelfLife: '1 year', enabled: true },
  { id: 5, name: 'Cryoprecipitate', code: 'CRYO', shelfLife: '1 year', enabled: true },
];

const userRoles = [
  { id: 1, role: 'Super Admin', users: 2, permissions: 'Full System Access' },
  { id: 2, role: 'Regional Admin', users: 12, permissions: 'Regional Operations' },
  { id: 3, role: 'Hospital Manager', users: 156, permissions: 'Hospital Operations' },
  { id: 4, role: 'Rider Supervisor', users: 45, permissions: 'Rider Management' },
];

export function SystemConfiguration() {
  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">System Configuration</h2>
        <p className="text-sm text-gray-500">Manage system-wide settings and configurations</p>
      </div>

      <Tabs defaultValue="hospitals" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="hospitals">Hospital Management</TabsTrigger>
          <TabsTrigger value="components">Blood Components</TabsTrigger>
          <TabsTrigger value="rules">Emergency Rules</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
        </TabsList>

        {/* Hospital Management Tab */}
        <TabsContent value="hospitals" className="space-y-4">
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-1">Add New Hospital / Blood Bank</h3>
              <p className="text-sm text-gray-500">Register a new facility in the HAEMOLINK network</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hospital-name">Hospital Name</Label>
                <Input id="hospital-name" placeholder="Enter hospital name" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="license">License Number</Label>
                <Input id="license" placeholder="MH/XX/YYYY/NNNN" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Complete address" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="City name" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="contact">Contact Number</Label>
                <Input id="contact" placeholder="+91 XXXXXXXXXX" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="hospital@example.com" className="mt-2" />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="capacity">Blood Bank Capacity (Units)</Label>
                <Input id="capacity" type="number" placeholder="e.g., 500" className="mt-2" />
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium mb-1">Enable Inventory Integration</p>
                  <p className="text-sm text-gray-600">Connect to hospital's blood bank management system</p>
                </div>
                <Switch />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t">
              <Button variant="outline" className="flex-1">Cancel</Button>
              <Button className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB]">
                <Plus className="size-4 mr-2" />
                Register Hospital
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Blood Components Tab */}
        <TabsContent value="components" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Blood Component Management</h3>
                <p className="text-sm text-gray-500">Configure available blood components and properties</p>
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">
                <Plus className="size-4 mr-2" />
                Add Component
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Shelf Life</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bloodComponents.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Droplet className="size-4 text-[#EF4444]" />
                          {component.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {component.code}
                        </Badge>
                      </TableCell>
                      <TableCell>{component.shelfLife}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            component.enabled
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : 'bg-gray-100 text-gray-600 border-gray-400'
                          }
                        >
                          {component.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Emergency Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="size-5 text-[#EF4444]" />
                <h3 className="font-semibold text-gray-900">Emergency Rule Editor</h3>
              </div>
              <p className="text-sm text-gray-500">Define system behavior during emergencies</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium mb-1">Auto-Escalate Critical Requests</p>
                    <p className="text-sm text-gray-600">
                      Automatically notify regional admins for unhandled critical requests
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex gap-4 items-center">
                  <Label className="whitespace-nowrap">Escalation Time:</Label>
                  <Input type="number" defaultValue={10} className="w-24" />
                  <span className="text-sm text-gray-600">minutes</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium mb-1">Emergency Broadcast Alerts</p>
                    <p className="text-sm text-gray-600">
                      Send mass notifications during critical shortages
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex gap-4 items-center">
                  <Label className="whitespace-nowrap">Shortage Threshold:</Label>
                  <Input type="number" defaultValue={15} className="w-24" />
                  <span className="text-sm text-gray-600">% of normal inventory</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium mb-1">Priority Routing for Rare Blood Types</p>
                    <p className="text-sm text-gray-600">
                      O-, AB-, B- requests get immediate priority
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium mb-1">Weekend & Holiday Mode</p>
                    <p className="text-sm text-gray-600">
                      Adjust matching algorithms for reduced staff availability
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t">
              <Button variant="outline" className="flex-1">Reset to Defaults</Button>
              <Button className="flex-1 bg-[#EF4444] hover:bg-[#DC2626]">
                Save Emergency Rules
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="size-5 text-[#8B5CF6]" />
                  <h3 className="font-semibold text-gray-900">Role-Based Access Control</h3>
                </div>
                <p className="text-sm text-gray-500">Manage user roles and permissions</p>
              </div>
              <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
                <Plus className="size-4 mr-2" />
                Create Role
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Active Users</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-[#3B82F6]" />
                          {role.role}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]">
                          {role.users} users
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{role.permissions}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Edit Permissions
                          </Button>
                          <Button variant="ghost" size="sm">
                            View Users
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-6 bg-[#FFF7ED] border-[#F97316]">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-[#F97316] flex items-center justify-center flex-shrink-0">
                <Settings className="size-5 text-white" />
              </div>
              <div>
                <p className="font-medium mb-1">Permission Management</p>
                <p className="text-sm text-gray-600">
                  Changes to role permissions take effect immediately. Exercise caution when modifying Super Admin and Regional Admin roles.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
