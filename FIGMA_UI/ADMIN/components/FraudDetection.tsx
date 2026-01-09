import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { 
  Shield, 
  AlertTriangle, 
  MapPin, 
  Users, 
  TrendingUp,
  Eye,
  Ban,
  CheckCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fraudTrendData = [
  { month: 'Jul', incidents: 12 },
  { month: 'Aug', incidents: 15 },
  { month: 'Sep', incidents: 9 },
  { month: 'Oct', incidents: 18 },
  { month: 'Nov', incidents: 11 },
  { month: 'Dec', incidents: 7 },
  { month: 'Jan', incidents: 14 },
];

const duplicateAccounts = [
  { primaryId: 'DN-5604', duplicateId: 'DN-6712', name: 'Rahul Verma', similarity: '98%', flaggedDate: '2026-01-08' },
  { primaryId: 'PT-2408', duplicateId: 'PT-3156', name: 'Sneha Patel', similarity: '95%', flaggedDate: '2026-01-07' },
  { primaryId: 'DN-5891', duplicateId: 'DN-6023', name: 'Amit Kumar', similarity: '92%', flaggedDate: '2026-01-06' },
];

const gpsAlerts = [
  { riderId: 'RD-3408', riderName: 'Deepak Yadav', requestId: 'REQ-8912', anomaly: 'Location Jump', severity: 'high' },
  { riderId: 'RD-3421', riderName: 'Ravi Kumar', requestId: 'REQ-8923', anomaly: 'GPS Spoofing', severity: 'critical' },
];

const inventoryMismatches = [
  { hospitalId: 'HS-7809', hospitalName: 'City Care Hospital', bloodGroup: 'O+', reported: 45, actual: 32, difference: -13 },
  { hospitalId: 'HS-7812', hospitalName: 'Max Healthcare', bloodGroup: 'AB-', reported: 18, actual: 23, difference: +5 },
];

export function FraudDetection() {
  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">Fraud & Anomaly Detection</h2>
        <p className="text-sm text-gray-500">Security monitoring and fraud prevention system</p>
      </div>

      {/* Security Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-[#10B981]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <Shield className="size-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">99.2%</p>
              <p className="text-sm text-gray-500">Security Score</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#EF4444]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#FEF2F2] flex items-center justify-center">
              <AlertTriangle className="size-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">14</p>
              <p className="text-sm text-gray-500">Active Alerts</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#F97316]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#FFF7ED] flex items-center justify-center">
              <Users className="size-5 text-[#F97316]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">28</p>
              <p className="text-sm text-gray-500">Flagged Accounts</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#3B82F6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#EFF6FF] flex items-center justify-center">
              <TrendingUp className="size-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">7</p>
              <p className="text-sm text-gray-500">Incidents (This Month)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Fraud Trend Chart */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Fraud Detection Trend</h3>
          <p className="text-sm text-gray-500">Monthly fraud incidents over time</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={fraudTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="incidents" 
              stroke="#EF4444" 
              fill="#FEF2F2" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Duplicate Accounts Detection */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="size-5 text-[#F97316]" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Duplicate Accounts Detection</h3>
            <p className="text-sm text-gray-500">AI-identified potential duplicate registrations</p>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Primary Account</TableHead>
                <TableHead>Duplicate Account</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Similarity</TableHead>
                <TableHead>Flagged Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duplicateAccounts.map((account, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium font-mono text-sm">{account.primaryId}</TableCell>
                  <TableCell className="font-medium font-mono text-sm">{account.duplicateId}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]">
                      {account.similarity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{account.flaggedDate}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" title="Review">
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-[#10B981]" title="Merge">
                        <CheckCircle className="size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-[#EF4444]" title="Suspend">
                        <Ban className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* GPS Spoofing Alerts */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="size-5 text-[#EF4444]" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">GPS Spoofing & Location Anomalies</h3>
            <p className="text-sm text-gray-500">Real-time rider location fraud detection</p>
          </div>
        </div>

        <div className="space-y-3">
          {gpsAlerts.map((alert, idx) => (
            <Card 
              key={idx} 
              className={`p-4 border-l-4 ${
                alert.severity === 'critical' 
                  ? 'border-l-[#EF4444] bg-[#FEF2F2]' 
                  : 'border-l-[#F97316] bg-[#FFF7ED]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge
                      className={
                        alert.severity === 'critical'
                          ? 'bg-[#EF4444] text-white'
                          : 'bg-[#F97316] text-white'
                      }
                    >
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{alert.riderName}</span>
                    <span className="text-sm text-gray-500">({alert.riderId})</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>🚨 {alert.anomaly}</span>
                    <span>Request: {alert.requestId}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Map
                  </Button>
                  <Button size="sm" className="bg-[#EF4444] hover:bg-[#DC2626]">
                    Investigate
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Inventory Mismatch Alerts */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Inventory Mismatch Alerts</h3>
          <p className="text-sm text-gray-500">Discrepancies between reported and actual inventory</p>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospital ID</TableHead>
                <TableHead>Hospital Name</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Reported Units</TableHead>
                <TableHead>Actual Units</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryMismatches.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium font-mono text-sm">{item.hospitalId}</TableCell>
                  <TableCell>{item.hospitalName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]">
                      {item.bloodGroup}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{item.reported}</TableCell>
                  <TableCell className="text-center">{item.actual}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.difference < 0
                          ? 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]'
                          : 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                      }
                    >
                      {item.difference > 0 ? '+' : ''}{item.difference}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        Request Audit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Fake Donor Detection */}
      <Card className="p-6 bg-[#F5F3FF] border-[#8B5CF6]">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-full bg-[#8B5CF6] flex items-center justify-center">
            <Shield className="size-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">AI-Powered Fake Donor Detection</h3>
            <p className="text-sm text-gray-600">
              Advanced ML models analyze donor behavior patterns to identify fraudulent registrations
            </p>
          </div>
          <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
            View Model Stats
          </Button>
        </div>
      </Card>
    </div>
  );
}
