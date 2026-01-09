import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Scale, FileText, Download, Eye, CheckCircle, Clock, Shield } from 'lucide-react';

const auditLogs = [
  { id: 'AUD-9001', action: 'Hospital Registration', user: 'admin@haemolink.gov', timestamp: '2026-01-09 14:23:15', status: 'Success' },
  { id: 'AUD-9002', action: 'Donor Eligibility Override', user: 'regional.admin@delhi.gov', timestamp: '2026-01-09 13:45:22', status: 'Success' },
  { id: 'AUD-9003', action: 'Emergency Priority Change', user: 'admin@haemolink.gov', timestamp: '2026-01-09 12:18:45', status: 'Success' },
  { id: 'AUD-9004', action: 'Failed Login Attempt', user: 'unknown@test.com', timestamp: '2026-01-09 11:32:18', status: 'Failed' },
];

const complianceTrackers = [
  { standard: 'NABH Accreditation', status: 'Compliant', lastAudit: '2025-11-15', nextReview: '2026-05-15', hospitals: 234 },
  { standard: 'NBTC Guidelines', status: 'Compliant', lastAudit: '2025-12-01', nextReview: '2026-06-01', hospitals: 892 },
  { standard: 'ISO 15189:2022', status: 'Partial Compliance', lastAudit: '2025-10-20', nextReview: '2026-04-20', hospitals: 156 },
  { standard: 'Drugs & Cosmetics Act', status: 'Compliant', lastAudit: '2025-12-10', nextReview: '2026-06-10', hospitals: 892 },
];

const consentRecords = [
  { donorId: 'DN-5601', donorName: 'Vikram Singh', consentType: 'Data Processing', status: 'Active', date: '2025-11-10' },
  { donorId: 'PT-2401', donorName: 'Rajesh Kumar', consentType: 'Medical Records', status: 'Active', date: '2025-12-15' },
  { donorId: 'DN-5603', donorName: 'Arjun Mehta', consentType: 'Communication', status: 'Active', date: '2025-10-25' },
];

export function ComplianceLegal() {
  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">Compliance, Audit & Legal</h2>
        <p className="text-sm text-gray-500">Regulatory compliance and legal documentation management</p>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-[#10B981]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <CheckCircle className="size-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">98.5%</p>
              <p className="text-sm text-gray-500">Compliance Rate</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#3B82F6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#EFF6FF] flex items-center justify-center">
              <FileText className="size-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">12,456</p>
              <p className="text-sm text-gray-500">Audit Logs (MTD)</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#8B5CF6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F5F3FF] flex items-center justify-center">
              <Shield className="size-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">34,567</p>
              <p className="text-sm text-gray-500">Consent Records</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#F97316]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#FFF7ED] flex items-center justify-center">
              <Clock className="size-5 text-[#F97316]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">3</p>
              <p className="text-sm text-gray-500">Pending Reviews</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="audit">Audit Log Viewer</TabsTrigger>
          <TabsTrigger value="compliance">NABH / NBTC Tracker</TabsTrigger>
          <TabsTrigger value="consent">Consent & Privacy</TabsTrigger>
          <TabsTrigger value="reports">Legal Reports</TabsTrigger>
        </TabsList>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">System Audit Log</h3>
                <p className="text-sm text-gray-500">Complete audit trail of all administrative actions</p>
              </div>
              <div className="flex gap-2">
                <Input type="date" className="w-40" />
                <Button variant="outline">
                  <Download className="size-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Audit ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium font-mono text-sm">{log.id}</TableCell>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell className="text-sm">{log.user}</TableCell>
                      <TableCell className="text-sm text-gray-500">{log.timestamp}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            log.status === 'Success'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]'
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-6 bg-[#EFF6FF] border-[#3B82F6]">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
                <FileText className="size-5 text-white" />
              </div>
              <div>
                <p className="font-medium mb-1">Audit Log Retention</p>
                <p className="text-sm text-gray-600">
                  All audit logs are retained for 7 years in compliance with regulatory requirements. Logs are immutable and cryptographically signed.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Compliance Tracker Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <Scale className="size-5 text-[#8B5CF6]" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Regulatory Compliance Tracker</h3>
                <p className="text-sm text-gray-500">Monitor compliance with national blood bank standards</p>
              </div>
            </div>

            <div className="space-y-3">
              {complianceTrackers.map((tracker, idx) => (
                <Card key={idx} className="p-4 border-l-4 border-l-[#3B82F6]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{tracker.standard}</h4>
                        <Badge
                          variant="outline"
                          className={
                            tracker.status === 'Compliant'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                          }
                        >
                          {tracker.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="text-gray-500">Last Audit:</span>
                          <p className="font-medium text-gray-900">{tracker.lastAudit}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Next Review:</span>
                          <p className="font-medium text-gray-900">{tracker.nextReview}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Hospitals Covered:</span>
                          <p className="font-medium text-gray-900">{tracker.hospitals}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Report
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="size-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Consent & Privacy Tab */}
        <TabsContent value="consent" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-1">Consent & Privacy Management</h3>
              <p className="text-sm text-gray-500">User consent tracking and privacy compliance</p>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Consent Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consentRecords.map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium font-mono text-sm">{record.donorId}</TableCell>
                      <TableCell>{record.donorName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]">
                          {record.consentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
                          <CheckCircle className="size-3 mr-1" />
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{record.date}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 bg-[#F5F3FF] border-[#8B5CF6]">
              <div className="flex items-start gap-3">
                <Shield className="size-8 text-[#8B5CF6]" />
                <div>
                  <p className="font-medium mb-1">Data Privacy Compliance</p>
                  <p className="text-sm text-gray-600">
                    HAEMOLINK is fully compliant with India's Personal Data Protection Bill and maintains strict privacy standards.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-[#FFF7ED] border-[#F97316]">
              <div className="flex items-start gap-3">
                <FileText className="size-8 text-[#F97316]" />
                <div>
                  <p className="font-medium mb-1">Consent Withdrawal</p>
                  <p className="text-sm text-gray-600">
                    Users can withdraw consent at any time. Data deletion requests are processed within 30 days.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Legal Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-1">Legal Report Generator</h3>
              <p className="text-sm text-gray-500">Generate compliance and regulatory reports</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 hover:border-[#3B82F6] transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <FileText className="size-8 text-[#3B82F6]" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">NABH Compliance Report</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Comprehensive report on NABH accreditation status
                    </p>
                    <Button size="sm" className="w-full bg-[#3B82F6] hover:bg-[#2563EB]">
                      <Download className="size-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-4 hover:border-[#10B981] transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <FileText className="size-8 text-[#10B981]" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">NBTC Guidelines Report</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Compliance with National Blood Transfusion Council
                    </p>
                    <Button size="sm" className="w-full bg-[#10B981] hover:bg-[#059669]">
                      <Download className="size-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-4 hover:border-[#8B5CF6] transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <FileText className="size-8 text-[#8B5CF6]" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">Data Privacy Report</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      User consent and data processing compliance
                    </p>
                    <Button size="sm" className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED]">
                      <Download className="size-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-4 hover:border-[#F97316] transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <FileText className="size-8 text-[#F97316]" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">Annual Audit Report</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Complete system audit for fiscal year
                    </p>
                    <Button size="sm" className="w-full bg-[#F97316] hover:bg-[#EA580C]">
                      <Download className="size-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
