import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Search, Filter, Eye, AlertTriangle, CheckCircle, Clock, TruckIcon } from 'lucide-react';
import { adminApi } from '../../supabase/client';

type RequestRow = {
  id: string;
  patient: string;
  bloodGroup: string;
  urgency: string;
  component: string;
  acceptedBy: string;
  rider: string;
  deliveryStatus: string;
  requestedAt: string;
  region: string;
};

function toTitle(s: string) {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export function RequestManagement() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestsData, setRequestsData] = useState<RequestRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const payload = await adminApi<any>('/admin/request-management');
        const requestRows = Array.isArray(payload?.requests) ? (payload.requests as any[]) : [];
        const patientProfiles = Array.isArray(payload?.patients) ? (payload.patients as any[]) : [];
        const hospitalProfiles = Array.isArray(payload?.hospitals) ? (payload.hospitals as any[]) : [];
        const donorProfiles = Array.isArray(payload?.donors) ? (payload.donors as any[]) : [];
        const deliveryRows = Array.isArray(payload?.deliveries) ? (payload.deliveries as any[]) : [];
        const riderProfiles = Array.isArray(payload?.riders) ? (payload.riders as any[]) : [];

        const patientById = new Map<string, { full_name?: string | null; location?: string | null }>();
        for (const row of patientProfiles) {
          if (typeof row?.user_id === 'string') patientById.set(row.user_id, row);
        }
        const hospitalById = new Map<string, { organization_name?: string | null; address?: string | null }>();
        for (const row of hospitalProfiles) {
          if (typeof row?.user_id === 'string') hospitalById.set(row.user_id, row);
        }
        const donorById = new Map<string, { full_name?: string | null; location?: string | null }>();
        for (const row of donorProfiles) {
          if (typeof row?.user_id === 'string') donorById.set(row.user_id, row);
        }

        const deliveryByRequest = new Map<string, any>();
        for (const d of deliveryRows) {
          if (typeof d?.request_id === 'string') deliveryByRequest.set(d.request_id, d);
        }

        const riderById = new Map<string, { full_name?: string | null }>();
        for (const row of riderProfiles) {
          if (typeof row?.user_id === 'string') riderById.set(row.user_id, row);
        }

        const mapped: RequestRow[] = requestRows.map((r) => {
          const rawId = typeof r?.id === 'string' ? r.id : '';
          const patientId = typeof r?.patient_id === 'string' ? r.patient_id : '';
          const patient = patientById.get(patientId);
          const patientName =
            typeof patient?.full_name === 'string' && patient.full_name.trim().length > 0
              ? patient.full_name.trim()
              : patientId
              ? `Patient ${patientId.slice(0, 6)}…`
              : 'Unknown';

          const createdAt = typeof r?.created_at === 'string' ? r.created_at : null;
          const requestedAt = createdAt ? new Date(createdAt).toLocaleString() : '—';

          const loc =
            typeof patient?.location === 'string' && patient.location.trim().length > 0 ? patient.location.trim() : 'Unknown';

          const acceptedByType = typeof r?.accepted_by_type === 'string' ? r.accepted_by_type : '';
          const acceptedById = typeof r?.accepted_by_id === 'string' ? r.accepted_by_id : '';
          let acceptedBy = 'Unassigned';
          if (acceptedByType === 'hospital') {
            const hp = hospitalById.get(acceptedById);
            acceptedBy =
              typeof hp?.organization_name === 'string' && hp.organization_name.trim().length > 0
                ? hp.organization_name.trim()
                : acceptedById
                ? `Hospital ${acceptedById.slice(0, 6)}…`
                : 'Hospital';
          } else if (acceptedByType === 'donor') {
            const dp = donorById.get(acceptedById);
            acceptedBy =
              typeof dp?.full_name === 'string' && dp.full_name.trim().length > 0
                ? dp.full_name.trim()
                : acceptedById
                ? `Donor ${acceptedById.slice(0, 6)}…`
                : 'Donor';
          }

          const delivery = deliveryByRequest.get(rawId);
          const deliveryStatusRaw = typeof delivery?.status === 'string' ? delivery.status : '';
          const deliveredAt = typeof delivery?.delivered_at === 'string' ? delivery.delivered_at : null;

          let deliveryStatus = 'Pending';
          if (deliveredAt || deliveryStatusRaw.toLowerCase() === 'delivered') {
            deliveryStatus = 'Delivered';
          } else if (deliveryStatusRaw.toLowerCase() === 'in_transit') {
            deliveryStatus = 'In Transit';
          } else if (deliveryStatusRaw.toLowerCase() === 'assigned') {
            deliveryStatus = 'Pending Pickup';
          } else if (acceptedByType) {
            deliveryStatus = 'Pending Pickup';
          } else if (typeof r?.request_type === 'string' && r.request_type.toLowerCase() === 'scheduled') {
            deliveryStatus = 'Scheduled';
          }

          const riderId = typeof delivery?.rider_id === 'string' ? delivery.rider_id : '';
          const riderProfile = riderById.get(riderId);
          const rider =
            typeof riderProfile?.full_name === 'string' && riderProfile.full_name.trim().length > 0
              ? riderProfile.full_name.trim()
              : acceptedByType
              ? 'Pending Assignment'
              : '—';

          const bloodGroup = typeof r?.blood_group === 'string' ? r.blood_group : '';
          const component = typeof r?.component === 'string' ? r.component : '';
          const urgencyRaw = typeof r?.urgency === 'string' ? r.urgency : '';
          const urgency = urgencyRaw ? toTitle(urgencyRaw) : 'Unknown';

          const displayId = rawId ? `REQ-${rawId.slice(0, 8).toUpperCase()}` : 'REQ-—';

          return {
            id: displayId,
            patient: patientName,
            bloodGroup: bloodGroup || '—',
            urgency,
            component: component || '—',
            acceptedBy,
            rider,
            deliveryStatus,
            requestedAt,
            region: loc,
          };
        });

        if (cancelled) return;
        setRequestsData(mapped);
      } catch (e: any) {
        if (cancelled) return;
        const msg = typeof e?.message === 'string' ? e.message : 'Failed to load requests';
        setLoadError(msg);
        setRequestsData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let critical = 0;
    let pendingPickup = 0;
    let inTransit = 0;
    let deliveredToday = 0;
    for (const r of requestsData) {
      const urg = r.urgency.toLowerCase();
      if (urg === 'critical') critical += 1;
      if (r.deliveryStatus === 'Pending Pickup') pendingPickup += 1;
      if (r.deliveryStatus === 'In Transit') inTransit += 1;
      if (r.deliveryStatus === 'Delivered') {
        const dt = new Date(r.requestedAt);
        if (!Number.isNaN(dt.getTime()) && dt >= today) deliveredToday += 1;
      }
    }
    return { critical, pendingPickup, inTransit, deliveredToday };
  }, [requestsData]);

  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">System-Wide Request Management</h2>
        <p className="text-sm text-gray-500">Unified view of all blood requests across the ecosystem</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-[#EF4444]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#FEF2F2] flex items-center justify-center">
              <AlertTriangle className="size-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : stats.critical.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Critical Requests</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#F97316]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#FFF7ED] flex items-center justify-center">
              <Clock className="size-5 text-[#F97316]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : stats.pendingPickup.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Pending Pickup</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#3B82F6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#EFF6FF] flex items-center justify-center">
              <TruckIcon className="size-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : stats.inTransit.toLocaleString()}</p>
              <p className="text-sm text-gray-500">In Transit</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#10B981]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <CheckCircle className="size-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : stats.deliveredToday.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Delivered Today</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input placeholder="Search requests..." className="pl-10" />
          </div>
          
          <Select defaultValue="all-urgency">
            <SelectTrigger>
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-urgency">All Urgency</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
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

          <Select defaultValue="all-components">
            <SelectTrigger>
              <SelectValue placeholder="Component" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-components">All Components</SelectItem>
              <SelectItem value="whole-blood">Whole Blood</SelectItem>
              <SelectItem value="rbc">RBC</SelectItem>
              <SelectItem value="platelets">Platelets</SelectItem>
              <SelectItem value="plasma">Plasma</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Unified Request Table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">All Blood Requests</h3>
            <p className="text-sm text-gray-500">{loadError ? `⚠️ ${loadError}` : '🔴 Live updates from all registered hospitals'}</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="size-4" />
            Advanced Filters
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Accepted By</TableHead>
                <TableHead>Rider</TableHead>
                <TableHead>Delivery Status</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-sm text-gray-500">
                    Loading requests…
                  </TableCell>
                </TableRow>
              )}
              {!loading && requestsData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-sm text-gray-500">
                    No requests found.
                  </TableCell>
                </TableRow>
              )}
              {requestsData.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium font-mono text-sm">{request.id}</TableCell>
                  <TableCell>{request.patient}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]">
                      {request.bloodGroup}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{request.component}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        request.urgency === 'Critical'
                          ? 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]'
                        : request.urgency === 'High'
                          ? 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                        : request.urgency === 'Medium'
                          ? 'bg-[#FFFBEB] text-yellow-600 border-yellow-500'
                          : 'bg-gray-100 text-gray-600 border-gray-400'
                      }
                    >
                      {request.urgency}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{request.acceptedBy}</TableCell>
                  <TableCell className="text-sm">{request.rider}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        request.deliveryStatus === 'Delivered'
                          ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                        : request.deliveryStatus === 'In Transit'
                          ? 'bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]'
                        : request.deliveryStatus === 'Pending Pickup'
                          ? 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                          : 'bg-gray-100 text-gray-600 border-gray-400'
                      }
                    >
                      {request.deliveryStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{request.region}</TableCell>
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

      {/* Manual Override Panel */}
      <Card className="p-6 border-[#8B5CF6]">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Manual Override Panel</h3>
          <p className="text-sm text-gray-500">Admin controls for exceptional cases</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 bg-[#F5F3FF]">
            <h4 className="font-medium mb-3">Emergency Priority Override</h4>
            <div className="space-y-3">
              <Input placeholder="Request ID" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Set Priority Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical - Immediate</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED]">
                Apply Override
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-[#EFF6FF]">
            <h4 className="font-medium mb-3">Manual Rider Assignment</h4>
            <div className="space-y-3">
              <Input placeholder="Request ID" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Rider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rider1">Suresh Kumar (North Delhi)</SelectItem>
                  <SelectItem value="rider2">Mohammed Ali (South Mumbai)</SelectItem>
                  <SelectItem value="rider3">Ravi Shankar (East Kolkata)</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full bg-[#3B82F6] hover:bg-[#2563EB]">
                Assign Rider
              </Button>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
}
