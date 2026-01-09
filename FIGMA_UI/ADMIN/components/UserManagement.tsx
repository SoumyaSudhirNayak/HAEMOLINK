import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  UserCheck,
  Ban,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { adminApi } from '../../supabase/client';

type PatientRow = {
  id: string;
  name: string;
  bloodGroup: string;
  city: string;
  requestsCount: number;
  lastTransfusion: string;
  status: 'Active' | 'Suspended';
  verified: boolean;
};

type DonorRow = {
  id: string;
  name: string;
  bloodGroup: string;
  donationCount: number;
  eligibility: string;
  lastDonation: string;
  location: string;
  fraudRisk: boolean;
};

type RiderRow = {
  id: string;
  userId: string;
  name: string;
  region: string;
  deliveries: number;
  compliance: string;
  status: string;
  documentsVerified: boolean;
};

type HospitalRow = {
  id: string;
  userId: string;
  name: string;
  license: string;
  inventoryConnected: boolean;
  verification: string;
  documentsVerified: boolean;
};

function shortId(prefix: string, uuid: string) {
  const cleaned = typeof uuid === 'string' ? uuid.replace(/-/g, '') : '';
  return `${prefix}-${cleaned.slice(0, 4).toUpperCase() || '0000'}`;
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function UserManagement() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [patientsData, setPatientsData] = useState<PatientRow[]>([]);
  const [donorsData, setDonorsData] = useState<DonorRow[]>([]);
  const [ridersData, setRidersData] = useState<RiderRow[]>([]);
  const [hospitalsData, setHospitalsData] = useState<HospitalRow[]>([]);

  const [patientsQuery, setPatientsQuery] = useState('');
  const [patientsBloodGroup, setPatientsBloodGroup] = useState('all');

  const [donorsQuery, setDonorsQuery] = useState('');
  const [donorsEligibility, setDonorsEligibility] = useState('all');

  const [ridersQuery, setRidersQuery] = useState('');
  const [ridersStatus, setRidersStatus] = useState('all');

  const [hospitalsQuery, setHospitalsQuery] = useState('');
  const [hospitalsVerification, setHospitalsVerification] = useState('all');

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewDocs, setReviewDocs] = useState<any[]>([]);
  const [reviewOwnerId, setReviewOwnerId] = useState<string | null>(null);
  const [reviewOwnerRole, setReviewOwnerRole] = useState<'rider' | 'hospital' | null>(null);
  const [reviewOwnerName, setReviewOwnerName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string | null>(null);
  const [reviewDecisionLoading, setReviewDecisionLoading] = useState(false);

  const fetchData = async (isCancelled?: () => boolean) => {
    setLoading(true);
    setLoadError(null);

    try {
      const payload = await adminApi<any>('/admin/user-management');

      const patientUsers = Array.isArray(payload?.patientUsers) ? payload.patientUsers : [];
      const donorUsers = Array.isArray(payload?.donorUsers) ? payload.donorUsers : [];
      const riderUsers = Array.isArray(payload?.riderUsers) ? payload.riderUsers : [];
      const hospitalUsers = Array.isArray(payload?.hospitalUsers) ? payload.hospitalUsers : [];

      const patientIds = patientUsers.map((u: any) => u.id).filter((v: any) => typeof v === 'string');
      const donorIds = donorUsers.map((u: any) => u.id).filter((v: any) => typeof v === 'string');
      const riderIds = riderUsers.map((u: any) => u.id).filter((v: any) => typeof v === 'string');
      const hospitalIds = hospitalUsers.map((u: any) => u.id).filter((v: any) => typeof v === 'string');

      const patientProfiles = Array.isArray(payload?.patientProfiles) ? payload.patientProfiles : [];
      const donorProfiles = Array.isArray(payload?.donorProfiles) ? payload.donorProfiles : [];
      const riderProfiles = Array.isArray(payload?.riderProfiles) ? payload.riderProfiles : [];
      const hospitalProfiles = Array.isArray(payload?.hospitalProfiles) ? payload.hospitalProfiles : [];
      const bloodRequests = Array.isArray(payload?.bloodRequests) ? payload.bloodRequests : [];
      const transfusions = Array.isArray(payload?.transfusions) ? payload.transfusions : [];
      const donorDonations = Array.isArray(payload?.donorDonations) ? payload.donorDonations : [];
      const deliveries = Array.isArray(payload?.deliveries) ? payload.deliveries : [];

      const patientProfileById = new Map<string, any>();
      for (const row of patientProfiles) {
        const uid = (row as any)?.user_id;
        if (typeof uid === 'string') patientProfileById.set(uid, row);
      }

      const donorProfileById = new Map<string, any>();
      for (const row of donorProfiles) {
        const uid = (row as any)?.user_id;
        if (typeof uid === 'string') donorProfileById.set(uid, row);
      }

      const riderProfileById = new Map<string, any>();
      for (const row of riderProfiles) {
        const uid = (row as any)?.user_id;
        if (typeof uid === 'string') riderProfileById.set(uid, row);
      }

      const hospitalProfileById = new Map<string, any>();
      for (const row of hospitalProfiles) {
        const uid = (row as any)?.user_id;
        if (typeof uid === 'string') hospitalProfileById.set(uid, row);
      }

      const requestsCountByPatient = new Map<string, number>();
      for (const row of bloodRequests) {
        const pid = (row as any)?.patient_id;
        if (typeof pid !== 'string') continue;
        requestsCountByPatient.set(pid, (requestsCountByPatient.get(pid) ?? 0) + 1);
      }

      const lastTransfusionByPatient = new Map<string, string>();
      for (const row of transfusions) {
        const pid = (row as any)?.patient_id;
        const dt = (row as any)?.transfusion_date;
        if (typeof pid !== 'string' || typeof dt !== 'string') continue;
        const prev = lastTransfusionByPatient.get(pid);
        if (!prev || new Date(dt).getTime() > new Date(prev).getTime()) lastTransfusionByPatient.set(pid, dt);
      }

      const donationCountByDonor = new Map<string, number>();
      const lastDonationByDonor = new Map<string, string>();
      for (const row of donorDonations) {
        const did = (row as any)?.donor_id;
        const dt = (row as any)?.donation_date;
        if (typeof did !== 'string') continue;
        donationCountByDonor.set(did, (donationCountByDonor.get(did) ?? 0) + 1);
        if (typeof dt === 'string') {
          const prev = lastDonationByDonor.get(did);
          if (!prev || new Date(dt).getTime() > new Date(prev).getTime()) lastDonationByDonor.set(did, dt);
        }
      }

      const deliveriesCountByRider = new Map<string, number>();
      for (const row of deliveries) {
        const rid = (row as any)?.rider_id;
        if (typeof rid !== 'string') continue;
        deliveriesCountByRider.set(rid, (deliveriesCountByRider.get(rid) ?? 0) + 1);
      }

      const nextPatients: PatientRow[] = patientUsers.map((u: any) => {
        const profile = patientProfileById.get(u.id);
        const name =
          (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
          (typeof u?.email === 'string' && u.email.trim()) ||
          '—';
        const bloodGroup = (typeof profile?.blood_group === 'string' && profile.blood_group.trim()) || '—';
        const city = (typeof profile?.location === 'string' && profile.location.trim()) || '—';
        return {
          id: shortId('PT', u.id),
          name,
          bloodGroup,
          city,
          requestsCount: requestsCountByPatient.get(u.id) ?? 0,
          lastTransfusion: fmtDate(lastTransfusionByPatient.get(u.id)),
          status: 'Active',
          verified: Boolean(profile),
        };
      });

      const nextDonors: DonorRow[] = donorUsers.map((u: any) => {
        const profile = donorProfileById.get(u.id);
        const name =
          (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
          (typeof u?.email === 'string' && u.email.trim()) ||
          '—';
        const bloodGroup = (typeof profile?.blood_group === 'string' && profile.blood_group.trim()) || '—';
        const eligibility = (typeof profile?.eligibility_status === 'string' && profile.eligibility_status.trim()) || '—';
        const location = (typeof profile?.location === 'string' && profile.location.trim()) || '—';
        const lastDonation = fmtDate(lastDonationByDonor.get(u.id) || profile?.last_donation_date);
        return {
          id: shortId('DN', u.id),
          name,
          bloodGroup,
          donationCount: donationCountByDonor.get(u.id) ?? 0,
          eligibility,
          lastDonation,
          location,
          fraudRisk: false,
        };
      });

      const nextRiders: RiderRow[] = riderUsers.map((u: any) => {
        const profile = riderProfileById.get(u.id);
        const name =
          (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
          (typeof u?.email === 'string' && u.email.trim()) ||
          '—';
        const compliance =
          (typeof profile?.verification_status === 'string' && profile.verification_status.trim()) || 'Pending';
        const availability = (typeof profile?.availability_status === 'string' && profile.availability_status.trim()) || '—';
        const documentsVerified = String(compliance).toLowerCase() === 'approved' || String(compliance).toLowerCase() === 'verified';
        const status = documentsVerified ? 'Approved' : 'Pending Approval';
        return {
          id: shortId('RD', u.id),
          userId: u.id,
          name,
          region: availability,
          deliveries: deliveriesCountByRider.get(u.id) ?? 0,
          compliance,
          status,
          documentsVerified,
        };
      });

      const nextHospitals: HospitalRow[] = hospitalUsers.map((u: any) => {
        const profile = hospitalProfileById.get(u.id);
        const name =
          (typeof profile?.organization_name === 'string' && profile.organization_name.trim()) ||
          (typeof u?.email === 'string' && u.email.trim()) ||
          '—';
        const license = (typeof profile?.license_number === 'string' && profile.license_number.trim()) || '—';
        const verification =
          (typeof profile?.verification_status === 'string' && profile.verification_status.trim()) || 'pending';
        const verificationLabel = verification.toLowerCase() === 'approved' ? 'Verified' : 'Pending';
        const documentsVerified = verificationLabel === 'Verified';
        return {
          id: shortId('HS', u.id),
          userId: u.id,
          name,
          license,
          inventoryConnected: true,
          verification: verificationLabel,
          documentsVerified,
        };
      });

      if (isCancelled?.()) return;
      setPatientsData(nextPatients);
      setDonorsData(nextDonors);
      setRidersData(nextRiders);
      setHospitalsData(nextHospitals);
    } catch (e: any) {
      if (isCancelled?.()) return;
      const message = typeof e?.message === 'string' ? e.message : 'Failed to load user management data';
      setLoadError(message);
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await fetchData(() => cancelled);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadReviewDocs = async (ownerId: string, ownerRole: 'rider' | 'hospital') => {
    setReviewLoading(true);
    setReviewError(null);
    setPreviewUrl(null);
    setPreviewMimeType(null);
    try {
      const qs = `ownerId=${encodeURIComponent(ownerId)}&ownerRole=${encodeURIComponent(ownerRole)}`;
      const payload = await adminApi<any>(`/admin/compliance-documents?${qs}`);
      const docs = Array.isArray(payload?.documents) ? payload.documents : [];
      setReviewDocs(docs);
      const first = docs.find((d: any) => typeof d?.signedUrl === 'string' && d.signedUrl.trim());
      if (first?.signedUrl) {
        setPreviewUrl(first.signedUrl);
        setPreviewMimeType(typeof first?.mime_type === 'string' ? first.mime_type : null);
      }
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Unable to load documents.';
      setReviewError(msg);
      setReviewDocs([]);
    } finally {
      setReviewLoading(false);
    }
  };

  const openReview = async (ownerRole: 'rider' | 'hospital', ownerId: string, ownerName: string) => {
    setReviewOwnerRole(ownerRole);
    setReviewOwnerId(ownerId);
    setReviewOwnerName(ownerName);
    setReviewOpen(true);
    await loadReviewDocs(ownerId, ownerRole);
  };

  const submitReviewDecision = async (decision: 'approve' | 'reject') => {
    if (!reviewOwnerId || !reviewOwnerRole) return;
    setReviewDecisionLoading(true);
    try {
      await adminApi<any>('/admin/compliance-review', {
        method: 'POST',
        body: JSON.stringify({ ownerId: reviewOwnerId, ownerRole: reviewOwnerRole, decision }),
      });
      setReviewOpen(false);
      setReviewDocs([]);
      setPreviewUrl(null);
      setPreviewMimeType(null);
      await fetchData();
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Unable to update compliance status.';
      setReviewError(msg);
    } finally {
      setReviewDecisionLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    const q = patientsQuery.trim().toLowerCase();
    const bg = patientsBloodGroup;
    return patientsData.filter((p) => {
      if (bg !== 'all' && p.bloodGroup !== bg) return false;
      if (!q) return true;
      return (
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.bloodGroup.toLowerCase().includes(q)
      );
    });
  }, [patientsBloodGroup, patientsData, patientsQuery]);

  const filteredDonors = useMemo(() => {
    const q = donorsQuery.trim().toLowerCase();
    const elig = donorsEligibility;
    return donorsData.filter((d) => {
      if (elig !== 'all') {
        const label = d.eligibility.toLowerCase().trim();
        if (elig === 'eligible' && label !== 'eligible') return false;
        if (elig === 'pending' && !label.includes('pending')) return false;
        if (elig === 'not-eligible' && !(label.includes('not') || label.includes('ineligible'))) return false;
      }
      if (!q) return true;
      return (
        d.id.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.bloodGroup.toLowerCase().includes(q)
      );
    });
  }, [donorsData, donorsEligibility, donorsQuery]);

  const filteredRiders = useMemo(() => {
    const q = ridersQuery.trim().toLowerCase();
    const st = ridersStatus;
    return ridersData.filter((r) => {
      if (st !== 'all') {
        const label = r.status.toLowerCase();
        if (st === 'approved' && !label.includes('approved')) return false;
        if (st === 'pending' && !label.includes('pending')) return false;
      }
      if (!q) return true;
      return r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.region.toLowerCase().includes(q);
    });
  }, [ridersData, ridersQuery, ridersStatus]);

  const filteredHospitals = useMemo(() => {
    const q = hospitalsQuery.trim().toLowerCase();
    const vf = hospitalsVerification;
    return hospitalsData.filter((h) => {
      if (vf !== 'all') {
        const label = h.verification.toLowerCase();
        if (vf === 'verified' && label !== 'verified') return false;
        if (vf === 'pending' && label !== 'pending') return false;
      }
      if (!q) return true;
      return h.id.toLowerCase().includes(q) || h.name.toLowerCase().includes(q) || h.license.toLowerCase().includes(q);
    });
  }, [hospitalsData, hospitalsQuery, hospitalsVerification]);

  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">User Management</h2>
        <p className="text-sm text-gray-500">Manage patients, donors, riders, and hospital registrations</p>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="patients" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="donors">Donors</TabsTrigger>
          <TabsTrigger value="riders">Riders</TabsTrigger>
          <TabsTrigger value="hospitals">Hospitals / Blood Banks</TabsTrigger>
        </TabsList>

        {/* Patients Tab */}
        <TabsContent value="patients" className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search patients..."
                  className="pl-10"
                  value={patientsQuery}
                  onChange={(e) => setPatientsQuery(e.target.value)}
                />
              </div>
              <Select value={patientsBloodGroup} onValueChange={setPatientsBloodGroup}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Blood Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Blood Groups</SelectItem>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2">
                <Filter className="size-4" />
                Filters
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Last Transfusion</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-[#EF4444]">
                        {loadError}
                      </TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-gray-500">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-gray-500">
                        No patients found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {patient.name}
                          {patient.verified && (
                            <CheckCircle className="size-4 text-[#10B981]" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]">
                          {patient.bloodGroup}
                        </Badge>
                      </TableCell>
                      <TableCell>{patient.city}</TableCell>
                      <TableCell>{patient.requestsCount}</TableCell>
                      <TableCell className="text-sm text-gray-500">{patient.lastTransfusion}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            patient.status === 'Active'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]'
                          }
                        >
                          {patient.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Donors Tab */}
        <TabsContent value="donors" className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search donors..."
                  className="pl-10"
                  value={donorsQuery}
                  onChange={(e) => setDonorsQuery(e.target.value)}
                />
              </div>
              <Select value={donorsEligibility} onValueChange={setDonorsEligibility}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Eligibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="eligible">Eligible</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="not-eligible">Not Eligible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>Donations</TableHead>
                    <TableHead>Eligibility</TableHead>
                    <TableHead>Last Donation</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-[#EF4444]">
                        {loadError}
                      </TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-gray-500">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredDonors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-gray-500">
                        No donors found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDonors.map((donor) => (
                    <TableRow key={donor.id}>
                      <TableCell className="font-medium">{donor.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {donor.name}
                          {donor.fraudRisk && (
                            <AlertCircle className="size-4 text-[#EF4444]" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]">
                          {donor.bloodGroup}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{donor.donationCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            donor.eligibility === 'Eligible'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : donor.eligibility === 'Pending Review'
                              ? 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                              : 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]'
                          }
                        >
                          {donor.eligibility}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{donor.lastDonation}</TableCell>
                      <TableCell>{donor.location}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" title="Suspend">
                            <Ban className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Riders Tab */}
        <TabsContent value="riders" className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search riders..."
                  className="pl-10"
                  value={ridersQuery}
                  onChange={(e) => setRidersQuery(e.target.value)}
                />
              </div>
              <Select value={ridersStatus} onValueChange={setRidersStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rider ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Deliveries</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-[#EF4444]">
                        {loadError}
                      </TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-gray-500">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredRiders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-gray-500">
                        No riders found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRiders.map((rider) => (
                    <TableRow key={rider.id}>
                      <TableCell className="font-medium">{rider.id}</TableCell>
                      <TableCell>{rider.name}</TableCell>
                      <TableCell>{rider.region}</TableCell>
                      <TableCell className="font-medium">{rider.deliveries}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            rider.compliance === 'Verified'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : rider.compliance === 'Pending'
                              ? 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                              : 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]'
                          }
                        >
                          {rider.compliance}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rider.documentsVerified ? (
                          <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
                            <CheckCircle className="size-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-[#F97316] border-[#F97316]"
                            onClick={() => openReview('rider', rider.userId, rider.name)}
                          >
                            <FileText className="size-4" />
                            Review
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            rider.status === 'Approved'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                          }
                        >
                          {rider.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {rider.status === 'Pending Approval' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-[#10B981]" title="Approve">
                                <UserCheck className="size-4" />
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Hospitals Tab */}
        <TabsContent value="hospitals" className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search hospitals..."
                  className="pl-10"
                  value={hospitalsQuery}
                  onChange={(e) => setHospitalsQuery(e.target.value)}
                />
              </div>
              <Select value={hospitalsVerification} onValueChange={setHospitalsVerification}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hospital ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>License Number</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-sm text-[#EF4444]">
                        {loadError}
                      </TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-sm text-gray-500">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredHospitals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-sm text-gray-500">
                        No hospitals found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHospitals.map((hospital) => (
                    <TableRow key={hospital.id}>
                      <TableCell className="font-medium">{hospital.id}</TableCell>
                      <TableCell>{hospital.name}</TableCell>
                      <TableCell className="font-mono text-sm">{hospital.license}</TableCell>
                      <TableCell>
                        {hospital.inventoryConnected ? (
                          <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-400">
                            Not Connected
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {hospital.documentsVerified ? (
                          <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
                            <CheckCircle className="size-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-[#F97316] border-[#F97316]"
                            onClick={() => openReview('hospital', hospital.userId, hospital.name)}
                          >
                            <FileText className="size-4" />
                            Review
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            hospital.verification === 'Verified'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                              : 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                          }
                        >
                          {hospital.verification}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {hospital.verification === 'Pending' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-[#10B981]" title="Approve">
                                <CheckCircle className="size-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-[#EF4444]" title="Suspend">
                                <Ban className="size-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm">
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={reviewOpen}
        onOpenChange={(next) => {
          setReviewOpen(next);
          if (!next) {
            setReviewOwnerId(null);
            setReviewOwnerRole(null);
            setReviewOwnerName('');
            setReviewDocs([]);
            setReviewError(null);
            setPreviewUrl(null);
            setPreviewMimeType(null);
            setReviewDecisionLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Document Verification{reviewOwnerName ? ` - ${reviewOwnerName}` : ''}
            </DialogTitle>
            <DialogDescription>Review uploaded documents and approve or reject.</DialogDescription>
          </DialogHeader>

          {reviewError ? (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{reviewError}</div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              {reviewLoading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : reviewDocs.length === 0 ? (
                <div className="text-sm text-gray-500">No documents found.</div>
              ) : (
                <div className="space-y-3">
                  {reviewDocs.map((d: any) => {
                    const canOpen = typeof d?.signedUrl === 'string' && d.signedUrl.trim().length > 0;
                    const label = (d?.status || 'pending_review').toString();
                    return (
                      <Card key={d?.id || `${d?.storage_path || ''}`} className="p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="size-8 text-[#3B82F6]" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium mb-1 truncate">{(d?.file_name || 'Document').toString()}</p>
                            <p className="text-sm text-gray-500 mb-2">
                              {(d?.doc_type || 'document').toString()} • {label}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                disabled={!canOpen}
                                onClick={() => {
                                  if (!canOpen) return;
                                  setPreviewUrl(d.signedUrl);
                                  setPreviewMimeType(typeof d?.mime_type === 'string' ? d.mime_type : null);
                                }}
                              >
                                <Eye className="size-4" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                disabled={!canOpen}
                                onClick={() => {
                                  if (!canOpen) return;
                                  window.open(d.signedUrl, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                <Download className="size-4" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-500">Preview</div>
              <div className="rounded-lg border bg-white overflow-hidden h-[420px]">
                {previewUrl ? (
                  previewMimeType && previewMimeType.startsWith('image/') ? (
                    <img src={previewUrl} alt="Document preview" className="w-full h-full object-contain" />
                  ) : (
                    <iframe title="Document preview" src={previewUrl} className="w-full h-full" />
                  )
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Select a document to preview.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="gap-2 text-[#EF4444]"
              disabled={reviewDecisionLoading || reviewLoading || !reviewOwnerId || !reviewOwnerRole}
              onClick={() => submitReviewDecision('reject')}
            >
              <XCircle className="size-4" />
              Reject
            </Button>
            <Button
              className="gap-2 bg-[#10B981] hover:bg-[#059669]"
              disabled={reviewDecisionLoading || reviewLoading || !reviewOwnerId || !reviewOwnerRole}
              onClick={() => submitReviewDecision('approve')}
            >
              <CheckCircle className="size-4" />
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
