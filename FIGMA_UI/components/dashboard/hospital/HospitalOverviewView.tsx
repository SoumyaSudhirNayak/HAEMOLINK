import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Package, AlertTriangle, FileText, Truck, TrendingUp, Droplet, Clock, AlertCircle } from 'lucide-react';
import { HospitalDashboardView } from '../../HospitalDashboard';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface HospitalOverviewViewProps {
  onNavigate: (view: HospitalDashboardView) => void;
}

export function HospitalOverviewView({ onNavigate }: HospitalOverviewViewProps) {
  const [stats, setStats] = useState<{
    totalUnits: number;
    nearExpiryUnits: number;
    activeRequests: number;
    activeDeliveries: number;
    fulfillmentPct: number;
  } | null>(null);
  const [inventoryRows, setInventoryRows] = useState<any[] | null>(null);
  const [nearExpiryRows, setNearExpiryRows] = useState<any[] | null>(null);
  const [requestRows, setRequestRows] = useState<any[] | null>(null);
  const [deliveryRows, setDeliveryRows] = useState<any[] | null>(null);
  const [riderNamesById, setRiderNamesById] = useState<Record<string, string>>({});

  const { refreshTick } = useAutoRefresh();
  const activeRef = useRef(false);
  const reloadTimerRef = useRef<any>(null);
  const channelsRef = useRef<{ inventory: any | null; request: any | null; delivery: any | null }>({
    inventory: null,
    request: null,
    delivery: null,
  });

  const reset = useCallback(() => {
    setStats({ totalUnits: 0, nearExpiryUnits: 0, activeRequests: 0, activeDeliveries: 0, fulfillmentPct: 0 });
    setInventoryRows([]);
    setNearExpiryRows([]);
    setRequestRows([]);
    setDeliveryRows([]);
    setRiderNamesById({});
  }, []);

  const ensureCtx = useCallback(async () => {
    const [{ supabase }, { getSessionAndRole }] = await Promise.all([
      import('../../../supabase/client'),
      import('../../../services/auth'),
    ]);
    const { session, role } = await getSessionAndRole();
    if (!session || role !== 'hospital') return null;
    return { supabase, uid: session.user.id };
  }, []);

  const load = useCallback(async () => {
    try {
      const ctx = await ensureCtx();
      if (!ctx) {
        if (activeRef.current) reset();
        return;
      }

      const { supabase, uid } = ctx;
      const now = new Date();
      const nearExpiryCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const unitValue = (row: any) => {
        const raw = row?.quantity ?? row?.quantity_units ?? row?.units ?? row?.unit_count ?? null;
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
        if (typeof raw === 'string') {
          const n = Number(raw);
          if (Number.isFinite(n)) return n;
        }
        return 1;
      };

      const [inventoryResult, pendingReqCountResult, acceptedReqCountResult, deliveriesCountResult, requestListResult, deliveryListResult] =
        await Promise.all([
          supabase
            .from('hospital_inventory_units')
            .select('id, blood_group, component_type, collection_date, expiry_date, status, created_at')
            .eq('hospital_id', uid)
            .in('status', ['available', 'reserved'])
            .limit(1000),
          supabase
            .from('hospital_request_inbox')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', uid)
            .eq('status', 'pending'),
          supabase
            .from('hospital_request_inbox')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', uid)
            .eq('status', 'accepted'),
          supabase
            .from('deliveries')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', uid)
            .in('status', ['assigned', 'in_transit']),
          supabase
            .from('hospital_request_inbox')
            .select('id, status, created_at, request_id, blood_requests(id, blood_group, component, quantity_units, urgency, created_at)')
            .eq('hospital_id', uid)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('deliveries')
            .select('id, request_id, rider_id, status, created_at')
            .eq('hospital_id', uid)
            .order('created_at', { ascending: false })
            .limit(3),
        ]);

      const inventory = Array.isArray(inventoryResult.data) ? inventoryResult.data : [];
      const totalUnits = inventory.reduce((sum: number, row: any) => sum + unitValue(row), 0);
      const activeRequests = pendingReqCountResult.count ?? 0;
      const acceptedRequests = acceptedReqCountResult.count ?? 0;
      const activeDeliveries = deliveriesCountResult.count ?? 0;
      const denom = acceptedRequests + activeRequests;
      const fulfillmentPct = denom > 0 ? Math.round((acceptedRequests / denom) * 100) : 0;

      const nearExpiryAll = inventory
        .filter((row: any) => {
          const v = row?.expiry_date ?? row?.expires_at ?? row?.expiry ?? row?.expiration_date ?? null;
          if (!v) return false;
          const t = new Date(v).getTime();
          return !Number.isNaN(t) && t <= nearExpiryCutoff.getTime();
        })
        .sort((a: any, b: any) => {
          const ta = new Date(a?.expiry_date ?? a?.expires_at ?? a?.expiry ?? a?.expiration_date ?? 0).getTime();
          const tb = new Date(b?.expiry_date ?? b?.expires_at ?? b?.expiry ?? b?.expiration_date ?? 0).getTime();
          return ta - tb;
        });
      const nearExpiryUnits = nearExpiryAll.reduce((sum: number, row: any) => sum + unitValue(row), 0);
      const nearExpiry = nearExpiryAll.slice(0, 3);

      const nextRequestRows = Array.isArray(requestListResult.data) ? requestListResult.data : [];
      const nextDeliveryRows = Array.isArray(deliveryListResult.data) ? deliveryListResult.data : [];

      const riderIds = Array.from(new Set(nextDeliveryRows.map((d: any) => d?.rider_id).filter(Boolean)));
      let nextRiderNamesById: Record<string, string> = {};
      if (riderIds.length > 0) {
        const { data: profs } = await supabase.from('rider_profiles').select('user_id, full_name').in('user_id', riderIds as any);
        const list = Array.isArray(profs) ? profs : [];
        nextRiderNamesById = list.reduce((acc: Record<string, string>, p: any) => {
          if (p?.user_id) acc[p.user_id] = p.full_name || 'Rider';
          return acc;
        }, {});
      }

      if (activeRef.current) {
        setStats({ totalUnits, nearExpiryUnits, activeRequests, activeDeliveries, fulfillmentPct });
        setInventoryRows(inventory);
        setNearExpiryRows(nearExpiry);
        setRequestRows(nextRequestRows);
        setDeliveryRows(nextDeliveryRows);
        setRiderNamesById(nextRiderNamesById);
      }
    } catch {
      if (activeRef.current) reset();
    }
  }, [ensureCtx, reset]);

  const scheduleReload = useCallback(() => {
    if (!activeRef.current) return;
    if (reloadTimerRef.current) return;
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      load();
    }, 250);
  }, [load]);

  useEffect(() => {
    activeRef.current = true;
    (async () => {
      try {
        const ctx = await ensureCtx();
        if (!ctx) {
          if (activeRef.current) reset();
          return;
        }

        await load();

        const { supabase, uid } = ctx;
        channelsRef.current.inventory = supabase
          .channel(`hospital_overview_inventory_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'hospital_inventory_units', filter: `hospital_id=eq.${uid}` },
            () => scheduleReload(),
          )
          .subscribe();
        channelsRef.current.request = supabase
          .channel(`hospital_overview_requests_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'hospital_request_inbox', filter: `hospital_id=eq.${uid}` },
            () => scheduleReload(),
          )
          .subscribe();
        channelsRef.current.delivery = supabase
          .channel(`hospital_overview_deliveries_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'deliveries', filter: `hospital_id=eq.${uid}` },
            () => scheduleReload(),
          )
          .subscribe();
      } catch {
        if (activeRef.current) reset();
      }
    })();

    return () => {
      activeRef.current = false;
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
      if (channelsRef.current.inventory) channelsRef.current.inventory.unsubscribe();
      if (channelsRef.current.request) channelsRef.current.request.unsubscribe();
      if (channelsRef.current.delivery) channelsRef.current.delivery.unsubscribe();
      channelsRef.current = { inventory: null, request: null, delivery: null };
    };
  }, [ensureCtx, load, reset, scheduleReload]);

  useEffect(() => {
    scheduleReload();
  }, [refreshTick, scheduleReload]);

  const componentCounts = useMemo(() => {
    const rows = inventoryRows || [];
    const normalize = (v: any) => {
      const s = typeof v === 'string' ? v.trim() : '';
      return s || 'Unknown';
    };
    const unitValue = (row: any) => {
      const raw = row?.quantity ?? row?.quantity_units ?? row?.units ?? row?.unit_count ?? null;
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      if (typeof raw === 'string') {
        const n = Number(raw);
        if (Number.isFinite(n)) return n;
      }
      return 1;
    };
    const counts: Record<string, number> = {};
    rows.forEach((row: any) => {
      const component = normalize(row?.component ?? row?.component_type ?? row?.type);
      counts[component] = (counts[component] || 0) + unitValue(row);
    });
    const desiredOrder = ['Whole Blood', 'RBC', 'Platelets', 'Plasma'];
    const keys = Object.keys(counts);
    const ordered = [
      ...desiredOrder.filter((k) => k in counts),
      ...keys.filter((k) => !desiredOrder.includes(k)),
    ].slice(0, 4);
    return ordered.map((k) => ({ component: k, count: counts[k] || 0 }));
  }, [inventoryRows]);

  const bloodGroupCounts = useMemo(() => {
    const rows = inventoryRows || [];
    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const counts: Record<string, number> = groups.reduce((acc, g) => {
      acc[g] = 0;
      return acc;
    }, {} as Record<string, number>);
    const unitValue = (row: any) => {
      const raw = row?.quantity ?? row?.quantity_units ?? row?.units ?? row?.unit_count ?? null;
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      if (typeof raw === 'string') {
        const n = Number(raw);
        if (Number.isFinite(n)) return n;
      }
      return 1;
    };
    rows.forEach((row: any) => {
      const g = typeof (row?.blood_group ?? row?.bloodGroup ?? row?.group) === 'string' ? (row?.blood_group ?? row?.bloodGroup ?? row?.group).trim() : '';
      if (g && counts[g] != null) counts[g] += unitValue(row);
    });
    return groups.map((g) => ({ group: g, count: counts[g] || 0 }));
  }, [inventoryRows]);

  return (
    <div className="p-8">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Total Units</span>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-gray-900">{stats ? stats.totalUnits : 'Loading...'}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Near Expiry</span>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-gray-900">{stats ? stats.nearExpiryUnits : 'Loading...'}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Active Requests</span>
            <FileText className="w-5 h-5 text-violet-600" />
          </div>
          <div className="text-gray-900">{stats ? stats.activeRequests : 'Loading...'}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Deliveries</span>
            <Truck className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-gray-900">{stats ? stats.activeDeliveries : 'Loading...'}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Fulfillment</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-gray-900">{stats ? `${stats.fulfillmentPct}%` : 'Loading...'}</div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="col-span-2 space-y-6">
          {/* Live Inventory Count */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">Live Inventory by Component</h3>
              <button 
                onClick={() => onNavigate('stock')}
                className="text-violet-600 hover:text-violet-700"
              >
                View Full Stock →
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {inventoryRows === null ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 col-span-4">
                  <div className="text-gray-600">Loading inventory...</div>
                </div>
              ) : componentCounts.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 col-span-4">
                  <div className="text-gray-600">No inventory logged yet</div>
                </div>
              ) : (
                componentCounts.map((c) => (
                  <div key={c.component} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-gray-500 mb-1">{c.component}</div>
                    <div className="text-gray-900">{c.count}</div>
                  </div>
                ))
              )}
            </div>

            {/* Blood Group Breakdown */}
            <div className="mt-6 grid grid-cols-8 gap-2">
              {inventoryRows === null ? (
                <div className="bg-gray-50 rounded p-2 text-center col-span-8">
                  <div className="text-gray-600">Loading...</div>
                </div>
              ) : (
                bloodGroupCounts.map((g) => (
                  <div key={g.group} className="bg-gray-50 rounded p-2 text-center">
                    <div className="text-gray-900">{g.group}</div>
                    <div className="text-gray-600">{g.count}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Near-Expiry Units Alert */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">Near-Expiry Alerts</h3>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                {stats ? `${stats.nearExpiryUnits}` : 'Loading...'}
              </span>
            </div>

            <div className="space-y-3">
              {nearExpiryRows === null ? (
                <div className="p-4 rounded-lg border-2 bg-gray-50 border-gray-200">
                  <div className="text-gray-600">Loading alerts...</div>
                </div>
              ) : nearExpiryRows.length === 0 ? (
                <div className="p-4 rounded-lg border-2 bg-gray-50 border-gray-200">
                  <div className="text-gray-600">No near-expiry units</div>
                </div>
              ) : (
                nearExpiryRows.map((row: any, idx: number) => {
                  const component = row?.component ?? row?.component_type ?? row?.type ?? 'Unknown';
                  const group = row?.blood_group ?? row?.bloodGroup ?? row?.group ?? '—';
                  const expiry = row?.expiry_date ?? row?.expires_at ?? row?.expiry ?? row?.expiration_date ?? null;
                  const when = expiry ? new Date(expiry).toLocaleDateString() : 'Not recorded';
                  return (
                    <div key={(row?.id as any) ?? idx} className="p-4 rounded-lg border-2 bg-orange-50 border-orange-200">
                      <div className="flex items-center justify-between">
                        <div className="text-gray-900">
                          {group} • {component}
                        </div>
                        <div className="text-gray-700">Exp: {when}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Patient Requests */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">Active Patient Requests</h3>
              <button 
                onClick={() => onNavigate('requests')}
                className="text-violet-600 hover:text-violet-700"
              >
                View All Requests →
              </button>
            </div>

            <div className="space-y-3">
              {requestRows === null ? (
                <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                  <div className="text-gray-600">Loading requests...</div>
                </div>
              ) : requestRows.length === 0 ? (
                <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                  <div className="text-gray-600">No active requests</div>
                </div>
              ) : (
                requestRows.map((entry: any) => {
                  const br = entry?.blood_requests || {};
                  const group = br?.blood_group ?? '—';
                  const component = br?.component ?? '—';
                  const units = (br as any)?.units_required ?? (br as any)?.quantity_units ?? '—';
                  const urgency = br?.urgency ?? null;
                  return (
                    <div key={entry.id} className="p-4 rounded-lg border border-gray-200 bg-white flex items-center justify-between">
                      <div>
                        <div className="text-gray-900">
                          {group} • {component}
                        </div>
                        <div className="text-gray-600">
                          {units} units{urgency ? ` • ${urgency}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate('requests')}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                      >
                        Review
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="col-span-1 space-y-6">
          {/* Riders En Route */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Deliveries</h3>
              <button 
                onClick={() => onNavigate('delivery')}
                className="text-violet-600 hover:text-violet-700"
              >
                View →
              </button>
            </div>

            <div className="space-y-3">
              {deliveryRows === null ? (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-600">Loading deliveries...</div>
                </div>
              ) : deliveryRows.length === 0 ? (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-600">No active deliveries</div>
                </div>
              ) : (
                deliveryRows.map((d: any) => (
                  <div key={d.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-900">Delivery {d.id.slice(0, 8)}</div>
                    <div className="text-gray-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{d.status}</span>
                      {d.rider_id ? (
                        <>
                          <span>•</span>
                          <span>{riderNamesById[d.rider_id] || 'Rider'}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Emergency Demand Spikes */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-2 text-red-700 mb-4">
              <AlertCircle className="w-5 h-5" />
              <h3>Demand Spike Alert</h3>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-white rounded-lg">
                <div className="text-gray-600">No data yet</div>
              </div>
            </div>

            <button className="w-full mt-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              Activate Emergency Protocol
            </button>
          </div>

          {/* AI Forecast (Violet) */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              <h3>AI Demand Forecast</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <div className="opacity-90">No data yet</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Quick Actions</h3>

            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('inventory')}
                className="w-full py-2 text-left px-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                Log New Inventory
              </button>
              <button 
                onClick={() => onNavigate('requests')}
                className="w-full py-2 text-left px-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
              >
                Process Requests
              </button>
              <button 
                onClick={() => onNavigate('crossmatch')}
                className="w-full py-2 text-left px-4 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition"
              >
                Crossmatch Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
