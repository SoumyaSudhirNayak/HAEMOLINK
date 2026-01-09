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
import { AlertTriangle, Droplet, TrendingDown, Search, ArrowRight } from 'lucide-react';
import { Progress } from './ui/progress';
import { adminApi } from '../../supabase/client';

type InventoryRow = {
  hospital: string;
  'A+': number;
  'A-': number;
  'B+': number;
  'B-': number;
  'O+': number;
  'O-': number;
  'AB+': number;
  'AB-': number;
  total: number;
  status: 'Good' | 'Low' | 'Critical';
};

type NearExpiryRow = {
  hospital: string;
  bloodGroup: string;
  units: number;
  expiryDate: string;
  daysLeft: number;
};

type SuggestionRow = {
  from: string;
  to: string;
  bloodGroup: string;
  units: number;
  reason: string;
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

export function InventoryBloodFlow() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryRow[]>([]);
  const [nearExpiryData, setNearExpiryData] = useState<NearExpiryRow[]>([]);
  const [redistributionSuggestions, setRedistributionSuggestions] = useState<SuggestionRow[]>([]);
  const [heatmapItems, setHeatmapItems] = useState<Array<{ group: string; percentage: number; status: 'good' | 'medium' | 'low' | 'critical' }>>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const resp = await adminApi<any>('/admin/inventory-blood-flow');
        if (!resp?.ok) throw new Error(resp?.error || 'Failed to load inventory');
        const invRows = Array.isArray(resp?.inventory) ? (resp.inventory as InventoryRow[]) : [];
        const nearRows = Array.isArray(resp?.nearExpiry) ? (resp.nearExpiry as NearExpiryRow[]) : [];
        const heat = Array.isArray(resp?.heatmap)
          ? (resp.heatmap as Array<{ group: string; percentage: number; status: 'good' | 'medium' | 'low' | 'critical' }>)
          : [];
        const suggestions = Array.isArray(resp?.suggestions) ? (resp.suggestions as SuggestionRow[]) : [];

        if (cancelled) return;
        setInventoryData(invRows);
        setNearExpiryData(nearRows);
        setHeatmapItems(heat);
        setRedistributionSuggestions(suggestions);
      } catch (e: any) {
        if (cancelled) return;
        const msg = typeof e?.message === 'string' ? e.message : 'Failed to load inventory';
        setLoadError(msg);
        setInventoryData([]);
        setNearExpiryData([]);
        setHeatmapItems([]);
        setRedistributionSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const criticalHospitalsCount = useMemo(() => inventoryData.filter((r) => r.status === 'Critical').length, [inventoryData]);

  return (
    <div className="space-y-6 mt-16">
      {/* Page Header */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">Inventory & Blood Flow Monitoring</h2>
        <p className="text-sm text-gray-500">Live blood availability and distribution management</p>
      </div>

      {/* Critical Shortage Alert */}
      <Card className="bg-[#FEF2F2] border-[#EF4444] p-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-[#EF4444] flex items-center justify-center">
            <AlertTriangle className="size-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-[#EF4444]">Critical Shortage Detected</p>
            <p className="text-sm text-gray-600">
              {loadError ? `Data error: ${loadError}` : loading ? 'Loading inventory…' : `${criticalHospitalsCount} hospitals have critically low inventory levels`}
            </p>
          </div>
          <Button className="bg-[#EF4444] hover:bg-[#DC2626]">Take Action</Button>
        </div>
      </Card>

      {/* Component Shortage Heatmap */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Component-wise Shortage Heatmap</h3>
          <p className="text-sm text-gray-500">Blood group availability across all hospitals</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {heatmapItems.map((item) => (
            <Card
              key={item.group}
              className={`p-4 ${
                item.status === 'critical'
                  ? 'bg-[#FEF2F2] border-[#EF4444]'
                  : item.status === 'low'
                  ? 'bg-[#FFF7ED] border-[#F97316]'
                  : item.status === 'medium'
                  ? 'bg-[#FFFBEB] border-yellow-500'
                  : 'bg-[#F0FDF4] border-[#10B981]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Droplet className="size-5" />
                <span className="font-semibold">{item.group}</span>
              </div>
              <p className="text-2xl font-semibold mb-1">{item.percentage}%</p>
              <Progress value={item.percentage} className="h-2" />
            </Card>
          ))}
        </div>
      </Card>

      {/* Live Blood Availability Table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Live Blood Availability (All Hospitals)</h3>
            <p className="text-sm text-gray-500">{loadError ? `⚠️ ${loadError}` : '🔴 Real-time data from connected inventory systems'}</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input placeholder="Search hospitals..." className="pl-10" />
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospital</TableHead>
                <TableHead className="text-center">A+</TableHead>
                <TableHead className="text-center">A-</TableHead>
                <TableHead className="text-center">B+</TableHead>
                <TableHead className="text-center">B-</TableHead>
                <TableHead className="text-center">O+</TableHead>
                <TableHead className="text-center">O-</TableHead>
                <TableHead className="text-center">AB+</TableHead>
                <TableHead className="text-center">AB-</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={11} className="text-sm text-gray-500">
                    Loading inventory…
                  </TableCell>
                </TableRow>
              )}
              {!loading && inventoryData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-sm text-gray-500">
                    No inventory data found.
                  </TableCell>
                </TableRow>
              )}
              {inventoryData.map((row) => (
                <TableRow key={row.hospital}>
                  <TableCell className="font-medium">{row.hospital}</TableCell>
                  <TableCell className="text-center">{row['A+']}</TableCell>
                  <TableCell className="text-center">{row['A-']}</TableCell>
                  <TableCell className="text-center">{row['B+']}</TableCell>
                  <TableCell className="text-center">{row['B-']}</TableCell>
                  <TableCell className="text-center">{row['O+']}</TableCell>
                  <TableCell className="text-center">{row['O-']}</TableCell>
                  <TableCell className="text-center">{row['AB+']}</TableCell>
                  <TableCell className="text-center">{row['AB-']}</TableCell>
                  <TableCell className="text-center font-semibold">{row.total}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        row.status === 'Good'
                          ? 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]'
                          : row.status === 'Low'
                          ? 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                          : 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]'
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Near-Expiry Units */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingDown className="size-5 text-[#F97316]" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Near-Expiry Units</h3>
            <p className="text-sm text-gray-500">Blood units expiring within 7 days</p>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospital</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Freshness Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-gray-500">
                    Loading near-expiry units…
                  </TableCell>
                </TableRow>
              )}
              {!loading && nearExpiryData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-gray-500">
                    No near-expiry units found.
                  </TableCell>
                </TableRow>
              )}
              {nearExpiryData.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.hospital}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]">
                      {item.bloodGroup}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.units}</TableCell>
                  <TableCell>{item.expiryDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.daysLeft <= 3
                          ? 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]'
                          : 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]'
                      }
                    >
                      {item.daysLeft} days
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={(item.daysLeft / 7) * 100} className="h-2 w-24" />
                      <span className="text-sm text-gray-500">{Math.round((item.daysLeft / 7) * 100)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Suggested Redistribution */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">AI-Suggested Redistribution</h3>
          <p className="text-sm text-gray-500">Optimize blood flow to prevent shortages</p>
        </div>

        <div className="space-y-3">
          {!loading && redistributionSuggestions.length === 0 && (
            <Card className="p-4">
              <p className="text-sm text-gray-600">No redistribution suggestions available right now.</p>
            </Card>
          )}
          {redistributionSuggestions.map((suggestion, idx) => (
            <Card key={idx} className="p-4 border-l-4 border-l-[#3B82F6]">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{suggestion.from}</span>
                    <ArrowRight className="size-4 text-[#3B82F6]" />
                    <span className="font-medium">{suggestion.to}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]">
                      {suggestion.bloodGroup}
                    </Badge>
                    <span className="text-sm text-gray-600">{suggestion.units} units</span>
                    <span className="text-sm text-gray-500">• {suggestion.reason}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Dismiss</Button>
                  <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">Execute Transfer</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
