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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DollarSign, TrendingUp, Building2, FileText, CheckCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const revenueData = [
  { name: 'Insurance Partners', value: 45, color: '#3B82F6' },
  { name: 'CSR Sponsors', value: 35, color: '#10B981' },
  { name: 'Government Grants', value: 20, color: '#8B5CF6' },
];

const sponsorData = [
  { id: 'SP-201', name: 'HDFC Life Insurance', type: 'Insurance', status: 'Active', contribution: '₹12,50,000', lastPayment: '2026-01-01' },
  { id: 'SP-202', name: 'Tata CSR Foundation', type: 'CSR', status: 'Active', contribution: '₹8,75,000', lastPayment: '2025-12-28' },
  { id: 'SP-203', name: 'ICICI Lombard', type: 'Insurance', status: 'Pending Renewal', contribution: '₹6,20,000', lastPayment: '2025-11-15' },
  { id: 'SP-204', name: 'Reliance Foundation', type: 'CSR', status: 'Active', contribution: '₹15,00,000', lastPayment: '2026-01-05' },
];

const labPartners = [
  { id: 'LAB-101', name: 'PathCare Diagnostics', region: 'Pan India', testsProcessed: 8934, status: 'Active' },
  { id: 'LAB-102', name: 'Dr. Lal PathLabs', region: 'North India', testsProcessed: 12456, status: 'Active' },
  { id: 'LAB-103', name: 'Thyrocare', region: 'Maharashtra', testsProcessed: 6789, status: 'Active' },
];

const settlementData = [
  { id: 'TXN-5601', sponsor: 'HDFC Life Insurance', hospital: 'AIIMS Delhi', amount: '₹45,000', date: '2026-01-08', status: 'Completed' },
  { id: 'TXN-5602', sponsor: 'Tata CSR Foundation', hospital: 'Lilavati Hospital', amount: '₹32,000', date: '2026-01-07', status: 'Completed' },
  { id: 'TXN-5603', sponsor: 'Reliance Foundation', hospital: 'Apollo Hospitals', amount: '₹58,000', date: '2026-01-09', status: 'Pending' },
];

export function FinanceSponsors() {
  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">Financial & Sponsor Management</h2>
        <p className="text-sm text-gray-500">Track sponsorships, settlements, and revenue analytics</p>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-[#10B981]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <DollarSign className="size-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">₹42.5L</p>
              <p className="text-sm text-gray-500">Total Revenue (MTD)</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#3B82F6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#EFF6FF] flex items-center justify-center">
              <Building2 className="size-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">24</p>
              <p className="text-sm text-gray-500">Active Sponsors</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#8B5CF6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F5F3FF] flex items-center justify-center">
              <TrendingUp className="size-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">₹8.2L</p>
              <p className="text-sm text-gray-500">Pending Settlements</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#F97316]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#FFF7ED] flex items-center justify-center">
              <FileText className="size-5 text-[#F97316]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">156</p>
              <p className="text-sm text-gray-500">Transactions (MTD)</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="sponsors" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="sponsors">Sponsor Integrations</TabsTrigger>
          <TabsTrigger value="labs">Lab Partners</TabsTrigger>
          <TabsTrigger value="settlements">Payment Tracking</TabsTrigger>
          <TabsTrigger value="analytics">Revenue Analytics</TabsTrigger>
        </TabsList>

        {/* Sponsors Tab */}
        <TabsContent value="sponsors" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Sponsor Registry</h3>
                <p className="text-sm text-gray-500">Insurance partners and CSR sponsors</p>
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">Add New Sponsor</Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sponsor ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Total Contribution</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sponsorData.map((sponsor) => (
                    <TableRow key={sponsor.id}>
                      <TableCell className="font-medium font-mono text-sm">{sponsor.id}</TableCell>
                      <TableCell className="font-medium">{sponsor.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            sponsor.type === 'Insurance'
                              ? 'bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]'
                              : 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                          }
                        >
                          {sponsor.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{sponsor.contribution}</TableCell>
                      <TableCell className="text-sm text-gray-500">{sponsor.lastPayment}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            sponsor.status === 'Active'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                          }
                        >
                          {sponsor.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Lab Partners Tab */}
        <TabsContent value="labs" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Laboratory Partners</h3>
                <p className="text-sm text-gray-500">Integrated diagnostic centers for blood testing</p>
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">Add Lab Partner</Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lab ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Tests Processed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labPartners.map((lab) => (
                    <TableRow key={lab.id}>
                      <TableCell className="font-medium font-mono text-sm">{lab.id}</TableCell>
                      <TableCell className="font-medium">{lab.name}</TableCell>
                      <TableCell>{lab.region}</TableCell>
                      <TableCell className="font-semibold">{lab.testsProcessed.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
                          {lab.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Settlements Tab */}
        <TabsContent value="settlements" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-1">Payment Settlements</h3>
              <p className="text-sm text-gray-500">Sponsor to hospital payment tracking</p>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Hospital</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlementData.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-medium font-mono text-sm">{txn.id}</TableCell>
                      <TableCell className="text-sm">{txn.sponsor}</TableCell>
                      <TableCell className="text-sm">{txn.hospital}</TableCell>
                      <TableCell className="font-semibold">{txn.amount}</TableCell>
                      <TableCell className="text-sm text-gray-500">{txn.date}</TableCell>
                      <TableCell>
                        {txn.status === 'Completed' ? (
                          <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
                            <CheckCircle className="size-3 mr-1" />
                            Completed
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
                          View Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Distribution */}
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">Revenue Distribution</h3>
                <p className="text-sm text-gray-500">Contribution by sponsor type</p>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={revenueData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Key Metrics */}
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">Key Financial Metrics</h3>
                <p className="text-sm text-gray-500">Month-to-date performance</p>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Average Transaction Value</p>
                  <p className="text-2xl font-semibold">₹27,243</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Settlement Success Rate</p>
                  <p className="text-2xl font-semibold text-[#10B981]">98.4%</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Pending Amount</p>
                  <p className="text-2xl font-semibold text-[#F97316]">₹8,20,000</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
