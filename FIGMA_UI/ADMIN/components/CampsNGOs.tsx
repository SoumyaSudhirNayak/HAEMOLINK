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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Search, CheckCircle, XCircle, Eye, Award, Users, MapPin } from 'lucide-react';
import { adminApi } from '../../supabase/client';

type NgoRow = {
  id: string;
  name: string;
  region: string;
  status: 'Approved' | 'Pending Approval';
  campsOrganized: number;
  donorsReached: number;
  verificationDocs: boolean;
};

type CampRow = {
  id: string;
  organizer: string;
  location: string;
  date: string;
  expectedDonors: number;
  status: 'Approved' | 'Pending Approval' | 'Pending Review';
};

type CertificateRow = {
  donorId: string;
  donorName: string;
  campId: string;
  date: string;
  status: 'Issued' | 'Pending';
};

function minutesBetweenTimes(start: string, end: string) {
  const parse = (t: string) => {
    const m = t.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  };
  const s = parse(start);
  const e = parse(end);
  if (s === null || e === null) return null;
  const diff = e - s;
  return diff > 0 ? diff : null;
}

export function CampsNGOs() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ngoData, setNgoData] = useState<NgoRow[]>([]);
  const [campProposals, setCampProposals] = useState<CampRow[]>([]);
  const [certificateData, setCertificateData] = useState<CertificateRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const startOfMonth = () => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const payload = await adminApi<any>('/admin/camps-ngos');

        const campRows = Array.isArray(payload?.camps) ? (payload.camps as any[]) : [];
        const hospitalProfiles = Array.isArray(payload?.hospitals) ? (payload.hospitals as any[]) : [];
        const bookings = Array.isArray(payload?.bookings) ? (payload.bookings as any[]) : [];
        const donorProfiles = Array.isArray(payload?.donors) ? (payload.donors as any[]) : [];
        const rewards = Array.isArray(payload?.rewards) ? (payload.rewards as any[]) : [];

        const hospitalById = new Map<string, any>();
        for (const row of hospitalProfiles) {
          if (typeof row?.user_id === 'string') hospitalById.set(row.user_id, row);
        }

        const donorsByCamp = new Map<string, number>();
        const donorsByOrganizer = new Map<string, number>();
        for (const b of bookings) {
          const campId = typeof b?.camp_id === 'string' ? b.camp_id : null;
          const donorId = typeof b?.donor_id === 'string' ? b.donor_id : null;
          if (!campId || !donorId) continue;
          donorsByCamp.set(campId, (donorsByCamp.get(campId) ?? 0) + 1);
        }
        for (const c of campRows) {
          const oid = typeof c?.organizer_id === 'string' ? c.organizer_id : null;
          const cid = typeof c?.id === 'string' ? c.id : null;
          if (!oid || !cid) continue;
          donorsByOrganizer.set(oid, (donorsByOrganizer.get(oid) ?? 0) + (donorsByCamp.get(cid) ?? 0));
        }

        const ngoAgg = new Map<
          string,
          { organizer_id: string; campsOrganized: number; approvedCamps: number; regionSamples: string[]; donorsReached: number }
        >();
        for (const c of campRows) {
          const oid = typeof c?.organizer_id === 'string' ? c.organizer_id : null;
          if (!oid) continue;
          const a = ngoAgg.get(oid) ?? {
            organizer_id: oid,
            campsOrganized: 0,
            approvedCamps: 0,
            regionSamples: [] as string[],
            donorsReached: donorsByOrganizer.get(oid) ?? 0,
          };
          a.campsOrganized += 1;
          a.approvedCamps += c?.is_published ? 1 : 0;
          const addr = typeof c?.address === 'string' ? c.address.trim() : '';
          if (addr) a.regionSamples.push(addr);
          ngoAgg.set(oid, a);
        }

        const ngos: NgoRow[] = Array.from(ngoAgg.values())
          .map((agg) => {
            const hp = hospitalById.get(agg.organizer_id);
            const name =
              typeof hp?.organization_name === 'string' && hp.organization_name.trim().length > 0
                ? hp.organization_name.trim()
                : `Organizer ${agg.organizer_id.slice(0, 6)}…`;
            const region =
              typeof hp?.address === 'string' && hp.address.trim().length > 0
                ? hp.address.trim()
                : agg.regionSamples[0] ?? 'Unknown';
            const verified = typeof hp?.verification_status === 'string' && hp.verification_status.toLowerCase() === 'approved';
            const status: NgoRow['status'] = verified || agg.approvedCamps > 0 ? 'Approved' : 'Pending Approval';
            return {
              id: `NGO-${agg.organizer_id.slice(0, 6).toUpperCase()}`,
              name,
              region,
              status,
              campsOrganized: agg.campsOrganized,
              donorsReached: agg.donorsReached,
              verificationDocs: verified,
            };
          })
          .sort((a, b) => b.donorsReached - a.donorsReached);

        const campsList: CampRow[] = campRows.map((c) => {
          const rawId = typeof c?.id === 'string' ? c.id : '';
          const organizerId = typeof c?.organizer_id === 'string' ? c.organizer_id : '';
          const hp = hospitalById.get(organizerId);
          const organizer =
            typeof hp?.organization_name === 'string' && hp.organization_name.trim().length > 0
              ? hp.organization_name.trim()
              : organizerId
              ? `Organizer ${organizerId.slice(0, 6)}…`
              : 'Organizer';
          const location = typeof c?.address === 'string' && c.address.trim().length > 0 ? c.address.trim() : 'Unknown';
          const date = typeof c?.start_date === 'string' && c.start_date.trim().length > 0 ? c.start_date : '—';
          const slotMinutes = typeof c?.slot_minutes === 'number' && c.slot_minutes > 0 ? c.slot_minutes : 30;
          const capacityPerSlot = typeof c?.capacity_per_slot === 'number' && c.capacity_per_slot > 0 ? c.capacity_per_slot : 10;
          const startTime = typeof c?.start_time === 'string' ? c.start_time : '';
          const endTime = typeof c?.end_time === 'string' ? c.end_time : '';
          const durationMin = startTime && endTime ? minutesBetweenTimes(startTime, endTime) : null;
          const slotCount = durationMin ? Math.max(1, Math.floor(durationMin / slotMinutes)) : 10;
          const expectedDonors = slotCount * capacityPerSlot;

          const isPublished = !!c?.is_published;
          const createdAt = typeof c?.created_at === 'string' ? new Date(c.created_at) : null;
          const isRecent = createdAt ? createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false;
          const status: CampRow['status'] = isPublished ? 'Approved' : isRecent ? 'Pending Approval' : 'Pending Review';
          return {
            id: rawId ? `CAMP-${rawId.slice(0, 6).toUpperCase()}` : 'CAMP-—',
            organizer,
            location,
            date,
            expectedDonors,
            status,
          };
        });

        const donorById = new Map<string, string>();
        for (const d of donorProfiles) {
          if (typeof d?.user_id === 'string') {
            const name = typeof d?.full_name === 'string' && d.full_name.trim().length > 0 ? d.full_name.trim() : `Donor ${d.user_id.slice(0, 6)}…`;
            donorById.set(d.user_id, name);
          }
        }

        let issuedBookingIds = new Set<string>();
        for (const r of rewards) {
          const bookingId = r?.metadata?.booking_id;
          if (typeof bookingId === 'string' && bookingId.trim().length > 0) issuedBookingIds.add(bookingId.trim());
        }

        const campIdByRaw = new Map<string, string>();
        for (const c of campRows) {
          const rawId = typeof c?.id === 'string' ? c.id : null;
          if (!rawId) continue;
          campIdByRaw.set(rawId, `CAMP-${rawId.slice(0, 6).toUpperCase()}`);
        }

        const certs: CertificateRow[] = bookings
          .filter((b) => b?.status === 'attended')
          .slice(0, 50)
          .map((b) => {
            const donorId = typeof b?.donor_id === 'string' ? b.donor_id : '';
            const donorName = donorById.get(donorId) ?? (donorId ? `Donor ${donorId.slice(0, 6)}…` : 'Donor');
            const rawCampId = typeof b?.camp_id === 'string' ? b.camp_id : '';
            const campId = campIdByRaw.get(rawCampId) ?? (rawCampId ? `CAMP-${rawCampId.slice(0, 6).toUpperCase()}` : 'CAMP-—');
            const date = typeof b?.updated_at === 'string' ? b.updated_at.slice(0, 10) : typeof b?.created_at === 'string' ? b.created_at.slice(0, 10) : '—';
            const status: CertificateRow['status'] = typeof b?.id === 'string' && issuedBookingIds.has(b.id) ? 'Issued' : 'Pending';
            return {
              donorId: donorId ? `DN-${donorId.slice(0, 6).toUpperCase()}` : 'DN-—',
              donorName,
              campId,
              date,
              status,
            };
          });

        if (cancelled) return;
        setNgoData(ngos);
        setCampProposals(campsList);
        setCertificateData(certs);
      } catch (e: any) {
        if (cancelled) return;
        const msg = typeof e?.message === 'string' ? e.message : 'Failed to load camps';
        setLoadError(msg);
        setNgoData([]);
        setCampProposals([]);
        setCertificateData([]);
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
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const activeNgos = ngoData.filter((n) => n.status === 'Approved').length;
    const campsThisMonth = campProposals.filter((c) => {
      const dt = new Date(c.date);
      return !Number.isNaN(dt.getTime()) && dt >= monthStart;
    }).length;
    const donorsReached = ngoData.reduce((sum, n) => sum + (typeof n.donorsReached === 'number' ? n.donorsReached : 0), 0);
    const pendingApprovals = campProposals.filter((c) => c.status !== 'Approved').length;
    return { activeNgos, campsThisMonth, donorsReached, pendingApprovals };
  }, [ngoData, campProposals]);

  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">Donation Camp & NGO Management</h2>
        <p className="text-sm text-gray-500">Manage NGO partnerships and blood donation camps</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-[#3B82F6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#EFF6FF] flex items-center justify-center">
              <Users className="size-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : stats.activeNgos.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Active NGOs</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#10B981]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <MapPin className="size-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : stats.campsThisMonth.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Camps This Month</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#8B5CF6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F5F3FF] flex items-center justify-center">
              <Users className="size-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : stats.donorsReached.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Donors Reached</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#F97316]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#FFF7ED] flex items-center justify-center">
              <Award className="size-5 text-[#F97316]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : stats.pendingApprovals.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Pending Approvals</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="ngos" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="ngos">NGO Registry</TabsTrigger>
          <TabsTrigger value="camps">Camp Proposals</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        {/* NGO Registry Tab */}
        <TabsContent value="ngos" className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input placeholder="Search NGOs..." className="pl-10" />
              </div>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">Register New NGO</Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NGO ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Camps Organized</TableHead>
                    <TableHead>Donors Reached</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadError && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-gray-500">
                        ⚠️ {loadError}
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-gray-500">
                        Loading NGOs…
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && ngoData.length === 0 && !loadError && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-gray-500">
                        No NGOs found.
                      </TableCell>
                    </TableRow>
                  )}
                  {ngoData.map((ngo) => (
                    <TableRow key={ngo.id}>
                      <TableCell className="font-medium font-mono text-sm">{ngo.id}</TableCell>
                      <TableCell className="font-medium">{ngo.name}</TableCell>
                      <TableCell>{ngo.region}</TableCell>
                      <TableCell className="text-center">{ngo.campsOrganized}</TableCell>
                      <TableCell className="text-center">{ngo.donorsReached.toLocaleString()}</TableCell>
                      <TableCell>
                        {ngo.verificationDocs ? (
                          <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
                            <CheckCircle className="size-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-[#FFF7ED] text-[#F97316] border-[#F97316]">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            ngo.status === 'Approved'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                          }
                        >
                          {ngo.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {ngo.status === 'Pending Approval' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-[#10B981]" title="Approve">
                                <CheckCircle className="size-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-[#EF4444]" title="Reject">
                                <XCircle className="size-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm">
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Camp Proposals Tab */}
        <TabsContent value="camps" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Camp Proposals</h3>
                <p className="text-sm text-gray-500">Review and approve upcoming donation camps</p>
              </div>
              <Button variant="outline">Filter by Date</Button>
            </div>

            <div className="space-y-3">
              {loading && (
                <Card className="p-4">
                  <p className="text-sm text-gray-600">Loading camps…</p>
                </Card>
              )}
              {!loading && campProposals.length === 0 && (
                <Card className="p-4">
                  <p className="text-sm text-gray-600">No camp proposals found.</p>
                </Card>
              )}
              {campProposals.map((camp) => (
                <Card key={camp.id} className="p-4 border-l-4 border-l-[#3B82F6]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium font-mono text-sm">{camp.id}</span>
                        <Badge
                          variant="outline"
                          className={
                            camp.status === 'Approved'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                            : camp.status === 'Pending Approval'
                              ? 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                              : 'bg-[#FFFBEB] text-yellow-600 border-yellow-500'
                          }
                        >
                          {camp.status}
                        </Badge>
                      </div>
                      <h4 className="font-medium mb-1">{camp.organizer}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-4" />
                          {camp.location}
                        </span>
                        <span>📅 {camp.date}</span>
                        <span>👥 Expected: {camp.expectedDonors} donors</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {camp.status !== 'Approved' && (
                        <>
                          <Button variant="outline" size="sm" className="text-[#EF4444]">
                            <XCircle className="size-4 mr-1" />
                            Reject
                          </Button>
                          <Button size="sm" className="bg-[#10B981] hover:bg-[#059669]">
                            <CheckCircle className="size-4 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
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

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-1">Certificate Issuance Status</h3>
              <p className="text-sm text-gray-500">Track donor appreciation certificates</p>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor ID</TableHead>
                    <TableHead>Donor Name</TableHead>
                    <TableHead>Camp ID</TableHead>
                    <TableHead>Donation Date</TableHead>
                    <TableHead>Certificate Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-sm text-gray-500">
                        Loading certificates…
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && certificateData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-sm text-gray-500">
                        No certificate items found.
                      </TableCell>
                    </TableRow>
                  )}
                  {certificateData.map((cert, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium font-mono text-sm">{cert.donorId}</TableCell>
                      <TableCell>{cert.donorName}</TableCell>
                      <TableCell className="font-mono text-sm">{cert.campId}</TableCell>
                      <TableCell>{cert.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            cert.status === 'Issued'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                          }
                        >
                          {cert.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {cert.status === 'Pending' && (
                            <Button size="sm" className="bg-[#3B82F6] hover:bg-[#2563EB]">
                              Issue Certificate
                            </Button>
                          )}
                          {cert.status === 'Issued' && (
                            <Button size="sm" variant="outline">
                              View Certificate
                            </Button>
                          )}
                        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Top Performing NGOs</h3>
              <div className="space-y-3">
                {ngoData.slice(0, 3).map((ngo, idx) => (
                  <div key={ngo.id} className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-[#EFF6FF] flex items-center justify-center font-semibold text-[#3B82F6]">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ngo.name}</p>
                      <p className="text-xs text-gray-500">{ngo.donorsReached.toLocaleString()} donors reached</p>
                    </div>
                    <Award className="size-5 text-[#F97316]" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Participation Metrics</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Camp Attendance Rate</span>
                    <span className="font-semibold">87%</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Conversion to Donation</span>
                    <span className="font-semibold text-[#10B981]">92%</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Repeat Donors</span>
                    <span className="font-semibold">45%</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
