import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Droplet,
  TruckIcon,
  Building2,
  AlertTriangle,
  Activity,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminApi } from '../../supabase/client';

type TrendPoint = { time: string; requests: number };
type RegionPoint = { region: string; requests: number };
type HeatZone = { region: string; severity: 'critical' | 'high' | 'medium' | 'low'; requests: number };

export function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [criticalRequests, setCriticalRequests] = useState<number>(0);
  const [requestsToday, setRequestsToday] = useState<number>(0);
  const [patientsCount, setPatientsCount] = useState<number>(0);
  const [donorsCount, setDonorsCount] = useState<number>(0);
  const [ridersCount, setRidersCount] = useState<number>(0);
  const [hospitalsCount, setHospitalsCount] = useState<number>(0);
  const [livesSavedThisMonth, setLivesSavedThisMonth] = useState<number>(0);

  const [emergencyTrendData, setEmergencyTrendData] = useState<TrendPoint[]>([]);
  const [regionalData, setRegionalData] = useState<RegionPoint[]>([]);
  const [heatZones, setHeatZones] = useState<HeatZone[]>([]);

  useEffect(() => {
    let cancelled = false;

    const startOfToday = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const startOfMonth = () => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const buildTrendBuckets = (rows: Array<{ created_at: string | null }>) => {
      const bucketStarts = [0, 4, 8, 12, 16, 20];
      const buckets = bucketStarts.map((h) => ({ time: `${String(h).padStart(2, '0')}:00`, requests: 0 }));
      for (const row of rows) {
        if (!row.created_at) continue;
        const created = new Date(row.created_at);
        const h = created.getHours();
        const idx = Math.max(0, Math.min(5, Math.floor(h / 4)));
        buckets[idx].requests += 1;
      }
      return buckets;
    };

    const severityFromRank = (rank: number, total: number): HeatZone['severity'] => {
      if (total <= 1) return 'critical';
      const ratio = total > 1 ? rank / (total - 1) : 0;
      if (ratio <= 0.2) return 'critical';
      if (ratio <= 0.5) return 'high';
      if (ratio <= 0.8) return 'medium';
      return 'low';
    };

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const payload = await adminApi<any>('/admin/dashboard-overview');
        const trend = Array.isArray(payload?.emergencyTrendData) ? (payload.emergencyTrendData as any[]) : [];
        const regionPoints = Array.isArray(payload?.regionalData) ? (payload.regionalData as any[]) : [];
        const zones = Array.isArray(payload?.heatZones) ? (payload.heatZones as any[]) : [];

        if (cancelled) return;
        setEmergencyTrendData(trend as TrendPoint[]);
        setRegionalData((regionPoints.length > 0 ? regionPoints : [{ region: 'Unknown', requests: 0 }]) as RegionPoint[]);
        setHeatZones((zones.length > 0 ? zones : [{ region: 'Unknown', severity: 'low', requests: 0 }]) as HeatZone[]);
        setRequestsToday(typeof payload?.requestsToday === 'number' ? payload.requestsToday : 0);
        setCriticalRequests(typeof payload?.criticalRequests === 'number' ? payload.criticalRequests : 0);
        setPatientsCount(typeof payload?.patientsCount === 'number' ? payload.patientsCount : 0);
        setDonorsCount(typeof payload?.donorsCount === 'number' ? payload.donorsCount : 0);
        setRidersCount(typeof payload?.ridersCount === 'number' ? payload.ridersCount : 0);
        setHospitalsCount(typeof payload?.hospitalsCount === 'number' ? payload.hospitalsCount : 0);
        setLivesSavedThisMonth(typeof payload?.livesSavedThisMonth === 'number' ? payload.livesSavedThisMonth : 0);
        setLastUpdatedAt(typeof payload?.lastUpdatedAt === 'string' ? new Date(payload.lastUpdatedAt) : new Date());
      } catch (e: any) {
        if (cancelled) return;
        const message = typeof e?.message === 'string' ? e.message : 'Failed to load dashboard data';
        setLoadError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return '—';
    const mins = Math.max(0, Math.round((Date.now() - lastUpdatedAt.getTime()) / 60000));
    if (mins <= 0) return 'just now';
    if (mins === 1) return '1 min ago';
    return `${mins} min ago`;
  }, [lastUpdatedAt]);

  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">Command Center Dashboard</h2>
        <p className="text-sm text-gray-500">Real-time system overview and critical metrics</p>
      </div>

      {/* Critical Alerts Banner */}
      <Card className="bg-[#FEF2F2] border-[#EF4444] p-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-[#EF4444] flex items-center justify-center">
            <AlertTriangle className="size-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-[#EF4444]">{loading ? 'Loading…' : `${criticalRequests} Critical Emergency Requests`}</p>
            <p className="text-sm text-gray-600">
              {loadError ? `Data error: ${loadError}` : `Immediate attention required • Last updated: ${lastUpdatedLabel}`}
            </p>
          </div>
          <Badge className="bg-[#EF4444] text-white">LIVE</Badge>
        </div>
      </Card>

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Blood Requests */}
        <Card className="p-4 border-l-4 border-l-[#3B82F6]">
          <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
              <Droplet className="size-5 text-[#3B82F6]" />
            </div>
            <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
              +12%
            </Badge>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mb-1">{loading ? '—' : requestsToday.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mb-2">Blood Requests Today</p>
          <p className="text-xs text-gray-400">{loadError ? '⚠️ Data unavailable' : '🔴 Live from Database'}</p>
        </Card>

        {/* Registered Patients */}
        <Card className="p-4 border-l-4 border-l-[#10B981]">
          <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
              <Users className="size-5 text-[#10B981]" />
            </div>
            <Badge variant="outline" className="bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]">
              +8.3%
            </Badge>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mb-1">{loading ? '—' : patientsCount.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mb-2">Registered Patients</p>
          <p className="text-xs text-gray-400">{loadError ? '⚠️ Data unavailable' : '🔴 Live from Database'}</p>
        </Card>

        {/* Verified Donors */}
        <Card className="p-4 border-l-4 border-l-[#8B5CF6]">
          <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
              <Users className="size-5 text-[#8B5CF6]" />
            </div>
            <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
              +15%
            </Badge>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mb-1">{loading ? '—' : donorsCount.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mb-2">Verified Donors</p>
          <p className="text-xs text-gray-400">{loadError ? '⚠️ Data unavailable' : '🔴 Live from Database'}</p>
        </Card>

        {/* Active Riders */}
        <Card className="p-4 border-l-4 border-l-[#F97316]">
          <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-lg bg-[#FFF7ED] flex items-center justify-center">
              <TruckIcon className="size-5 text-[#F97316]" />
            </div>
            <Badge variant="outline" className="bg-[#F0FDF4] text-[#10B981] border-[#10B981]">
              Online
            </Badge>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mb-1">{loading ? '—' : ridersCount.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mb-2">Active Riders Online</p>
          <p className="text-xs text-gray-400">{loadError ? '⚠️ Data unavailable' : '🔴 Live from Database'}</p>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
              <Building2 className="size-5 text-[#3B82F6]" />
            </div>
            <div className="flex-1">
              <p className="text-xl font-semibold text-gray-900">{loading ? '—' : hospitalsCount.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Hospitals & Blood Banks</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{loadError ? '⚠️ Data unavailable' : '🔴 Live from Database'}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
              <Activity className="size-5 text-[#8B5CF6]" />
            </div>
            <div className="flex-1">
              <p className="text-xl font-semibold text-gray-900">99.7%</p>
              <p className="text-sm text-gray-500">System Uptime</p>
            </div>
          </div>
          <Progress value={99.7} className="h-2" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-lg bg-[#FFF7ED] flex items-center justify-center">
              <TrendingUp className="size-5 text-[#F97316]" />
            </div>
            <div className="flex-1">
              <p className="text-xl font-semibold text-gray-900">{loading ? '—' : livesSavedThisMonth.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Lives Saved (This Month)</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{loadError ? '⚠️ Data unavailable' : '🔴 Live from Database'}</p>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emergency Spike Trend */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Emergency Request Trend (24h)</h3>
            <p className="text-sm text-gray-500">Real-time emergency request patterns</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={emergencyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="requests" 
                stroke="#EF4444" 
                strokeWidth={2}
                dot={{ fill: '#EF4444', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Regional Distribution */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Regional Request Distribution</h3>
            <p className="text-sm text-gray-500">Active requests by region</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={regionalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="region" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="requests" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Regional Heatmap */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Regional Outbreak Heatmap</h3>
          <p className="text-sm text-gray-500">Critical demand zones requiring immediate attention</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {heatZones.map((zone) => (
            <div
              key={zone.region}
              className={`p-4 rounded-lg border-2 ${
                zone.severity === 'critical'
                  ? 'bg-[#FEF2F2] border-[#EF4444]'
                : zone.severity === 'high'
                ? 'bg-[#FFF7ED] border-[#F97316]'
                : zone.severity === 'medium'
                ? 'bg-[#FFF7ED] border-[#F97316] opacity-70'
                : 'bg-[#F0FDF4] border-[#10B981]'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <MapPin className="size-4 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{zone.region}</p>
                </div>
              </div>
              <p className="text-xl font-semibold mb-1">{zone.requests}</p>
              <Badge
                variant="outline"
                className={`text-xs ${
                  zone.severity === 'critical'
                    ? 'bg-[#EF4444] text-white border-[#EF4444]'
                  : zone.severity === 'high'
                  ? 'bg-[#F97316] text-white border-[#F97316]'
                  : zone.severity === 'medium'
                  ? 'bg-[#F97316] text-white border-[#F97316] opacity-70'
                  : 'bg-[#10B981] text-white border-[#10B981]'
                }`}
              >
                {zone.severity.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
