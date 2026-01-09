import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { BarChart3, TrendingUp, Download, Users, Droplet, TruckIcon, Heart } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../supabase/client';

type WeeklyPerformanceRow = { week: string; requests: number; fulfilled: number; donors: number };
type BloodUsageRow = {
  month: string;
  'A+': number;
  'A-': number;
  'B+': number;
  'B-': number;
  'O+': number;
  'O-': number;
  'AB+': number;
  'AB-': number;
};
type DonorGrowthRow = { region: string; donors: number; growth: number };
type RiderPerformanceRow = { rider: string; deliveries: number; avgTime: string; rating: number | null };

type AnalyticsPayload = {
  ok: boolean;
  error?: string;
  kpis?: {
    livesSavedMtd: number;
    requestFulfillmentPct: number;
    newDonorsMtd: number;
    avgDeliveryMinutes: number | null;
  };
  weeklyPerformanceData?: WeeklyPerformanceRow[];
  bloodUsageTrends?: BloodUsageRow[];
  donorGrowthData?: DonorGrowthRow[];
  riderPerformanceData?: RiderPerformanceRow[];
  emergency?: {
    successRatePct: number | null;
    avgResponseMinutes: number | null;
    criticalRequestsMtd: number;
  };
};

export function AnalyticsReports() {
  const [range, setRange] = useState('last-30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeklyPerformanceData, setWeeklyPerformanceData] = useState<WeeklyPerformanceRow[]>([]);
  const [bloodUsageTrends, setBloodUsageTrends] = useState<BloodUsageRow[]>([]);
  const [donorGrowthData, setDonorGrowthData] = useState<DonorGrowthRow[]>([]);
  const [riderPerformanceData, setRiderPerformanceData] = useState<RiderPerformanceRow[]>([]);
  const [kpis, setKpis] = useState<AnalyticsPayload['kpis'] | null>(null);
  const [emergency, setEmergency] = useState<AnalyticsPayload['emergency'] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await adminApi<AnalyticsPayload>(`/admin/analytics-reports?range=${encodeURIComponent(range)}`);
        if (!resp?.ok) throw new Error(resp?.error || 'Failed to load analytics');
        if (cancelled) return;
        setKpis(resp.kpis ?? null);
        setEmergency(resp.emergency ?? null);
        setWeeklyPerformanceData(Array.isArray(resp.weeklyPerformanceData) ? resp.weeklyPerformanceData : []);
        setBloodUsageTrends(Array.isArray(resp.bloodUsageTrends) ? resp.bloodUsageTrends : []);
        setDonorGrowthData(Array.isArray(resp.donorGrowthData) ? resp.donorGrowthData : []);
        setRiderPerformanceData(Array.isArray(resp.riderPerformanceData) ? resp.riderPerformanceData : []);
      } catch (e: any) {
        if (cancelled) return;
        setError(typeof e?.message === 'string' ? e.message : 'Failed to load analytics');
        setKpis(null);
        setEmergency(null);
        setWeeklyPerformanceData([]);
        setBloodUsageTrends([]);
        setDonorGrowthData([]);
        setRiderPerformanceData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const avgDeliveryLabel = useMemo(() => {
    const v = kpis?.avgDeliveryMinutes;
    return typeof v === 'number' ? `${v} min` : '—';
  }, [kpis?.avgDeliveryMinutes]);

  const fulfillmentLabel = useMemo(() => {
    const v = kpis?.requestFulfillmentPct;
    return typeof v === 'number' ? `${v.toFixed(1)}%` : '—';
  }, [kpis?.requestFulfillmentPct]);

  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Analytics & Reporting</h2>
          <p className="text-sm text-gray-500">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7">Last 7 Days</SelectItem>
              <SelectItem value="last-30">Last 30 Days</SelectItem>
              <SelectItem value="last-90">Last 90 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2 bg-[#3B82F6] hover:bg-[#2563EB]">
            <Download className="size-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-[#10B981]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <Heart className="size-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '…' : (kpis?.livesSavedMtd ?? 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500">Lives Saved (MTD)</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <TrendingUp className="size-4 text-[#10B981]" />
            <span className="text-xs text-gray-500">{error ? `⚠️ ${error}` : loading ? 'Loading…' : 'Live from database'}</span>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#3B82F6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#EFF6FF] flex items-center justify-center">
              <Droplet className="size-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '…' : fulfillmentLabel}</p>
              <p className="text-sm text-gray-500">Request Fulfillment</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <TrendingUp className="size-4 text-[#10B981]" />
            <span className="text-xs text-gray-500">{loading ? 'Loading…' : 'Range-based'}</span>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#8B5CF6]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#F5F3FF] flex items-center justify-center">
              <Users className="size-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '…' : (kpis?.newDonorsMtd ?? 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500">New Donors (MTD)</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <TrendingUp className="size-4 text-[#10B981]" />
            <span className="text-xs text-gray-500">{loading ? 'Loading…' : 'Live from database'}</span>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#F97316]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#FFF7ED] flex items-center justify-center">
              <TruckIcon className="size-5 text-[#F97316]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '…' : avgDeliveryLabel}</p>
              <p className="text-sm text-gray-500">Avg. Delivery Time</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <TrendingUp className="size-4 text-[#10B981]" />
            <span className="text-xs text-gray-500">{loading ? 'Loading…' : 'Live from database'}</span>
          </div>
        </Card>
      </div>

      {/* Weekly Performance Chart */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Weekly Performance Overview</h3>
          <p className="text-sm text-gray-500">Requests, fulfillment, and donor participation trends</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyPerformanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip />
            <Legend />
            <Bar dataKey="requests" fill="#3B82F6" radius={[8, 8, 0, 0]} name="Total Requests" />
            <Bar dataKey="fulfilled" fill="#10B981" radius={[8, 8, 0, 0]} name="Fulfilled" />
            <Bar dataKey="donors" fill="#8B5CF6" radius={[8, 8, 0, 0]} name="Active Donors" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Blood Usage Trends */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Blood Usage Trends by Type</h3>
          <p className="text-sm text-gray-500">Monthly consumption patterns for major blood groups</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={bloodUsageTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="O+" stackId="1" stroke="#EF4444" fill="#FEF2F2" />
            <Area type="monotone" dataKey="A+" stackId="1" stroke="#3B82F6" fill="#EFF6FF" />
            <Area type="monotone" dataKey="B+" stackId="1" stroke="#10B981" fill="#F0FDF4" />
            <Area type="monotone" dataKey="AB+" stackId="1" stroke="#8B5CF6" fill="#F5F3FF" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Donor Growth by Region */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Donor Growth by Region</h3>
          <p className="text-sm text-gray-500">Regional donor acquisition and growth rates</p>
        </div>
        <div className="space-y-4">
          {donorGrowthData.map((region, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-32">
                <p className="font-medium">{region.region}</p>
                <p className="text-sm text-gray-500">{region.donors.toLocaleString()} donors</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-[#3B82F6] h-3 rounded-full"
                      style={{ width: `${Math.min(100, Math.round((region.donors / Math.max(1, donorGrowthData[0]?.donors ?? region.donors)) * 100))}%` }}
                    />
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-[#F0FDF4] text-[#10B981] border-[#10B981] whitespace-nowrap"
                  >
                    +{region.growth}%
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Rider Performance & Emergency Success Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rider Performance */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Top Performing Riders</h3>
            <p className="text-sm text-gray-500">Delivery performance metrics</p>
          </div>
          <div className="space-y-3">
            {riderPerformanceData.map((rider, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-[#EFF6FF] flex items-center justify-center font-semibold text-[#3B82F6]">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium">{rider.rider}</p>
                    <p className="text-sm text-gray-500">{rider.deliveries} deliveries</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{rider.avgTime}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-[#F97316]">★</span>
                    <span className="text-sm font-medium">{typeof rider.rating === 'number' ? rider.rating.toFixed(1) : '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Emergency Success Rate */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Emergency Request Success Rate</h3>
            <p className="text-sm text-gray-500">Critical request fulfillment analytics</p>
          </div>
          <div className="space-y-4">
            <div className="text-center p-6">
              <div className="size-32 mx-auto rounded-full border-8 border-[#10B981] flex items-center justify-center mb-4">
                <div>
                  <p className="text-4xl font-semibold text-gray-900">
                    {loading ? '…' : `${(emergency?.successRatePct ?? 0).toFixed(1)}%`}
                  </p>
                  <p className="text-sm text-gray-500">Success Rate</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {loading ? 'Loading emergency metrics…' : 'Emergency metrics computed from database activity'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-semibold text-gray-900 mb-1">
                  {loading ? '…' : `${Math.round(emergency?.avgResponseMinutes ?? 0)} min`}
                </p>
                <p className="text-sm text-gray-600">Avg. Response Time</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-semibold text-gray-900 mb-1">{loading ? '…' : (emergency?.criticalRequestsMtd ?? 0).toLocaleString()}</p>
                <p className="text-sm text-gray-600">Critical Requests (MTD)</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
