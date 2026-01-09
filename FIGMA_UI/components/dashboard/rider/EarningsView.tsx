import { DollarSign, TrendingUp, Award, Heart, Calendar } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface RiderEarningRow {
  id: string;
  rider_id: string;
  delivery_id?: string | null;
  distance_km?: number | string | null;
  amount: number | string | null;
  incentive_type?: string | null;
  created_at: string | null;
}

export function EarningsView() {
  const { refreshTick } = useAutoRefresh();
  const [rows, setRows] = useState<RiderEarningRow[] | null>(null);
  const reloadRef = useRef<null | (() => void)>(null);

  const toNumber = (v: any) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const normalizeTimestamp = (v: string) => (v.includes('T') ? v : v.replace(' ', 'T'));

  const toTimeMs = (v: any) => {
    if (typeof v !== 'string' || !v) return 0;
    const t = new Date(normalizeTimestamp(v)).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  useEffect(() => {
    let active = true;
    let earningsChannel: any = null;
    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'rider') {
          if (active) setRows([]);
          return;
        }
        const uid = session.user.id;

        const normalize = (data: any) =>
          (Array.isArray(data) ? data : []).map((r: any) => ({
            id: String(r?.id ?? ''),
            rider_id: String(r?.rider_id ?? uid),
            delivery_id: typeof r?.delivery_id === 'string' ? r.delivery_id : r?.delivery_id ?? null,
            distance_km: toNumber(r?.distance_km),
            amount: toNumber(r?.amount),
            incentive_type: typeof r?.incentive_type === 'string' ? r.incentive_type : r?.incentive_type ?? null,
            created_at: typeof r?.created_at === 'string' ? r.created_at : r?.created_at ?? null,
          })) as RiderEarningRow[];

        const load = async () => {
          const base = (sel: string) =>
            supabase
              .from('rider_earnings')
              .select(sel)
              .eq('rider_id', uid)
              .order('created_at', { ascending: false })
              .limit(200);

          const r1 = await base('id, rider_id, delivery_id, distance_km, amount, incentive_type, created_at');
          if (!r1.error) return normalize(r1.data);

          const r2 = await base('id, rider_id, delivery_id, distance_km, amount, created_at');
          if (!r2.error) return normalize(r2.data);

          const r3 = await base('*');
          if (!r3.error) return normalize(r3.data);

          return [];
        };

        const reload = async () => {
          const data = await load();
          if (active) setRows(data);
        };

        reloadRef.current = () => {
          void reload();
        };

        await reload();

        earningsChannel = supabase
          .channel(`rider_earnings_view_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rider_earnings', filter: `rider_id=eq.${uid}` },
            () => reload(),
          )
          .subscribe();
      } catch {
        if (active) {
          setRows([]);
          reloadRef.current = null;
        }
      }
    })();
    return () => {
      active = false;
      if (earningsChannel) earningsChannel.unsubscribe();
      reloadRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (reloadRef.current) reloadRef.current();
  }, [refreshTick]);

  const totals = useMemo(() => {
    const list = rows || [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const sum = (predicate: (t: number) => boolean) =>
      list.reduce((acc, r) => {
        const t = toTimeMs(r.created_at);
        if (!predicate(t)) return acc;
        return acc + (toNumber(r.amount) ?? 0);
      }, 0);
    return {
      today: sum((t) => t >= startOfToday),
      week: sum((t) => t >= startOfWeek),
      month: sum((t) => t >= startOfMonth),
      bonuses: list.reduce(
        (acc, r) => acc + ((r.incentive_type || '').toLowerCase().includes('bonus') ? (toNumber(r.amount) ?? 0) : 0),
        0,
      ),
    };
  }, [rows]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Earnings & Incentives</h2>
        <p className="text-gray-600">Track your performance and rewards</p>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Today</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-gray-900">{rows ? `₹${Math.round(totals.today).toLocaleString()}` : '—'}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">This Week</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-gray-900">{rows ? `₹${Math.round(totals.week).toLocaleString()}` : '—'}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">This Month</span>
            <Calendar className="w-5 h-5 text-violet-600" />
          </div>
          <div className="text-gray-900">{rows ? `₹${Math.round(totals.month).toLocaleString()}` : '—'}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Bonuses</span>
            <Award className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-gray-900">{rows ? `₹${Math.round(totals.bonuses).toLocaleString()}` : '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-2 space-y-6">
          {/* Delivery Credits Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Delivery Credits Breakdown</h3>

            <div className="space-y-3">
              {rows && rows.length > 0 ? (
                rows.slice(0, 12).map((r) => (
                  <div key={r.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-gray-900">
                        {r.delivery_id ? `Delivery ${(r.delivery_id || '').slice(0, 8)}` : (r.incentive_type || 'Earning')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const timeLabel = r.created_at ? new Date(normalizeTimestamp(r.created_at)).toLocaleString() : 'Time not recorded';
                          const dist = toNumber(r.distance_km);
                          const distLabel = typeof dist === 'number' ? ` • ${dist.toFixed(1)} km` : '';
                          return timeLabel + distLabel;
                        })()}
                      </div>
                    </div>
                    <div className="text-gray-900">
                      {(() => {
                        const amt = toNumber(r.amount);
                        return typeof amt === 'number' ? `₹${Math.round(amt).toLocaleString()}` : '—';
                      })()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-gray-600">No earnings yet</div>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Bonuses */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Emergency Bonuses</h3>

            <div className="space-y-2">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-gray-600">₹{rows ? Math.round(totals.bonuses).toLocaleString() : '—'}</div>
              </div>
            </div>
          </div>

          {/* Performance Score */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Performance Metrics</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <div className="text-gray-600">No data available yet</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-1 space-y-6">
          {/* Lives Saved Counter */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-6 h-6" fill="white" />
              <h3>Lives Saved</h3>
            </div>

            <div className="mb-2">{rows ? `${rows.length}` : '—'}</div>

            <div className="bg-white/20 backdrop-blur rounded-lg p-3">
              <div>
                Total recorded earnings:{' '}
                {rows
                  ? `₹${Math.round((rows || []).reduce((a, r) => a + (toNumber(r.amount) ?? 0), 0)).toLocaleString()}`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Appreciation Badges */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Appreciation Badges</h3>

            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
                <div className="text-gray-600">No data available yet</div>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Payment Schedule</h3>

            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Next Payout</span>
                <span className="text-gray-600">{rows && rows.length > 0 ? 'Weekly' : '—'}</span>
              </div>
              <div className="flex justify-between p-2 bg-green-50 rounded">
                <span className="text-green-600">Amount</span>
                <span className="text-gray-600">{rows ? `₹${Math.round(totals.week).toLocaleString()}` : '—'}</span>
              </div>
            </div>

            <button className="w-full mt-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition">
              View Full History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
