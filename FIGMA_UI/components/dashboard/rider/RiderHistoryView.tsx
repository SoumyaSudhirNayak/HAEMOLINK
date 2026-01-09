import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Award, Thermometer, Star, Download } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

type RiderDelivery = {
  id: string;
  request_id: string | null;
  status: string | null;
  created_at: string | null;
  delivered_at?: string | null;
  distance_km?: number | null;
  fare_amount?: number | null;
};

type RiderEarningRow = {
  id: string;
  delivery_id: string | null;
  distance_km?: number | null;
  amount: number | null;
  created_at: string | null;
};

type RiderColdChainLog = {
  id: string;
  temperature: number | null;
  recorded_at: string | null;
};

type RiderActivity = {
  id: string;
  activity_type: string | null;
  description: string | null;
  created_at: string | null;
};

type BloodRequestMini = {
  id: string;
  blood_group: string | null;
  component: string | null;
  urgency: string | null;
};

export function RiderHistoryView() {
  const { refreshTick } = useAutoRefresh();
  const [loading, setLoading] = useState(true);
  const [totalDeliveries, setTotalDeliveries] = useState<number>(0);
  const [completedDeliveries, setCompletedDeliveries] = useState<number>(0);
  const [deliveries, setDeliveries] = useState<RiderDelivery[] | null>(null);
  const [earnings, setEarnings] = useState<RiderEarningRow[] | null>(null);
  const [coldChain, setColdChain] = useState<RiderColdChainLog[] | null>(null);
  const [activity, setActivity] = useState<RiderActivity[] | null>(null);
  const [requestInfo, setRequestInfo] = useState<Record<string, BloodRequestMini>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'rider') {
          if (active) {
            setLoading(false);
            setTotalDeliveries(0);
            setCompletedDeliveries(0);
            setDeliveries([]);
            setEarnings([]);
            setColdChain([]);
            setActivity([]);
            setRequestInfo({});
          }
          return;
        }

        const uid = session.user.id;
        const [totalCountResult, completedCountResult, deliveriesResult, earningsResult, coldResult, activityResult] =
          await Promise.all([
            supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('rider_id', uid),
            supabase
              .from('deliveries')
              .select('id', { count: 'exact', head: true })
              .eq('rider_id', uid)
              .in('status', ['delivered', 'completed']),
            supabase
              .from('deliveries')
              .select('id, request_id, status, created_at, delivered_at, distance_km, fare_amount')
              .eq('rider_id', uid)
              .order('created_at', { ascending: false })
              .limit(50),
            supabase
              .from('rider_earnings')
              .select('id, delivery_id, distance_km, amount, created_at')
              .eq('rider_id', uid)
              .order('created_at', { ascending: false })
              .limit(500),
            supabase
              .from('rider_cold_chain_logs')
              .select('id, temperature, recorded_at')
              .eq('rider_id', uid)
              .order('recorded_at', { ascending: false })
              .limit(200),
            supabase
              .from('rider_activity_log')
              .select('id, activity_type, description, created_at')
              .eq('rider_id', uid)
              .order('created_at', { ascending: false })
              .limit(20),
          ]);

        const dList = Array.isArray(deliveriesResult.data) ? (deliveriesResult.data as any[]) : [];
        const requestIds = Array.from(
          new Set(dList.map((d) => d?.request_id).filter((v) => typeof v === 'string' && v.length > 0)),
        ).slice(0, 50);

        let brMap: Record<string, BloodRequestMini> = {};
        if (requestIds.length > 0) {
          try {
            const { data: brs, error: brErr } = await supabase
              .from('blood_requests')
              .select('id, blood_group, component, urgency')
              .in('id', requestIds);
            if (!brErr && Array.isArray(brs)) {
              brs.forEach((r: any) => {
                if (r?.id) {
                  brMap[String(r.id)] = {
                    id: String(r.id),
                    blood_group: r.blood_group ?? null,
                    component: r.component ?? null,
                    urgency: r.urgency ?? null,
                  };
                }
              });
            }
          } catch {}
        }

        if (!active) return;
        setTotalDeliveries(totalCountResult.count ?? 0);
        setCompletedDeliveries(completedCountResult.count ?? 0);
        setDeliveries(dList as RiderDelivery[]);
        setEarnings(Array.isArray(earningsResult.data) ? (earningsResult.data as any) : []);
        setColdChain(Array.isArray(coldResult.data) ? (coldResult.data as any) : []);
        setActivity(Array.isArray(activityResult.data) ? (activityResult.data as any) : []);
        setRequestInfo(brMap);
        setLoading(false);
      } catch {
        if (active) {
          setLoading(false);
          setTotalDeliveries(0);
          setCompletedDeliveries(0);
          setDeliveries([]);
          setEarnings([]);
          setColdChain([]);
          setActivity([]);
          setRequestInfo({});
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const earningsByDelivery = useMemo(() => {
    const map: Record<string, number> = {};
    (earnings || []).forEach((e) => {
      if (!e.delivery_id) return;
      if (typeof e.amount !== 'number' || !Number.isFinite(e.amount)) return;
      if (!(e.delivery_id in map)) map[e.delivery_id] = 0;
      map[e.delivery_id] += e.amount;
    });
    return map;
  }, [earnings]);

  const totalEarnings = useMemo(() => {
    return (earnings || []).reduce((sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0), 0);
  }, [earnings]);

  const lastTemp = coldChain && coldChain.length > 0 ? coldChain[0]?.temperature ?? null : null;

  const successRate =
    totalDeliveries > 0 ? Math.round((completedDeliveries / Math.max(1, totalDeliveries)) * 100) : 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-gray-900 mb-2">Rider History Dashboard</h2>
          <p className="text-gray-600">Analytics, records, and certificates</p>
        </div>
        <button className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span>Total Deliveries</span>
          </div>
          <div className="text-gray-900">{loading ? 'Loading...' : totalDeliveries}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
            <Award className="w-4 h-4" />
            <span>Success Rate</span>
          </div>
          <div className="text-green-900">{loading ? 'Loading...' : `${successRate}%`}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
            <Award className="w-4 h-4" />
            <span>Total Earnings</span>
          </div>
          <div className="text-blue-900">{loading ? 'Loading...' : `₹${Math.round(totalEarnings).toLocaleString()}`}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-orange-700 mb-2">
            <Thermometer className="w-4 h-4" />
            <span>Last Temp</span>
          </div>
          <div className="text-orange-900">
            {loading ? 'Loading...' : typeof lastTemp === 'number' ? `${lastTemp.toFixed(1)}°C` : '—'}
          </div>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-violet-700 mb-2">
            <Star className="w-4 h-4" />
            <span>Avg Rating</span>
          </div>
          <div className="text-violet-900">{loading ? 'Loading...' : '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-2 space-y-6">
          {/* Delivery History */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Recent Deliveries</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-700">Delivery ID</th>
                    <th className="px-4 py-3 text-left text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-gray-700">Distance</th>
                    <th className="px-4 py-3 text-left text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-gray-700">Rating</th>
                    <th className="px-4 py-3 text-left text-gray-700">Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-gray-600 text-center">
                        Loading deliveries...
                      </td>
                    </tr>
                  ) : deliveries && deliveries.length > 0 ? (
                    deliveries.slice(0, 12).map((d) => {
                      const br = d.request_id ? requestInfo[d.request_id] : undefined;
                      const typeLabel =
                        br && (br.component || br.blood_group)
                          ? `${br.component || 'Blood'}${br.blood_group ? ` • ${br.blood_group}` : ''}`
                          : 'Blood Delivery';
                      const distanceLabel =
                        typeof d.distance_km === 'number' && Number.isFinite(d.distance_km)
                          ? `${d.distance_km.toFixed(1)} km`
                          : '—';
                      const earningsValue =
                        typeof earningsByDelivery[d.id] === 'number' && Number.isFinite(earningsByDelivery[d.id])
                          ? earningsByDelivery[d.id]
                          : typeof d.fare_amount === 'number' && Number.isFinite(d.fare_amount)
                            ? d.fare_amount
                            : null;
                      return (
                        <tr key={d.id}>
                          <td className="px-4 py-3 text-gray-900">{String(d.id).slice(0, 8)}</td>
                          <td className="px-4 py-3 text-gray-700">{typeLabel}</td>
                          <td className="px-4 py-3 text-gray-700">{distanceLabel}</td>
                          <td className="px-4 py-3 text-gray-700">{d.status || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">—</td>
                          <td className="px-4 py-3 text-gray-900">
                            {typeof earningsValue === 'number' ? `₹${Math.round(earningsValue).toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-gray-600 text-center">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hospital Feedback */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Hospital Feedback</h3>

            <div className="space-y-3">
              {loading ? (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-gray-600">Loading...</div>
                </div>
              ) : activity && activity.length > 0 ? (
                activity.slice(0, 6).map((a) => (
                  <div key={a.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-gray-900">{a.activity_type || 'Update'}</div>
                    <div className="text-gray-600 text-sm">
                      {(a.created_at ? new Date(a.created_at).toLocaleString() : 'Time not recorded') +
                        (a.description ? ` • ${a.description}` : '')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-gray-600">No feedback recorded yet</div>
                </div>
              )}
            </div>
          </div>

          {/* Performance Trends */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Performance Trends</h3>

            <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center p-4">
              <div className="text-gray-600">
                {loading ? 'Loading...' : deliveries && deliveries.length > 0 ? 'Trend data will appear as deliveries grow.' : 'No data available yet'}
              </div>
            </div>
            <div className="flex justify-between mt-3 text-gray-500">
              <span>Jan</span>
              <span>Jun</span>
              <span>Dec</span>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-1 space-y-6">
          {/* Certificates */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Certificates Earned</h3>

            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
                <div className="text-gray-600">No data available yet</div>
              </div>
            </div>

            <button className="w-full mt-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
              View All Certificates
            </button>
          </div>

          {/* Temperature Compliance */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Thermometer className="w-6 h-6" />
              <h3>Cold Chain Record</h3>
            </div>

            <div className="mb-2">
              {loading ? 'Loading...' : coldChain && coldChain.length > 0 ? `${coldChain.length} records` : 'No data available yet'}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Achievements</h3>

            <div className="space-y-2">
              <div className="p-2 bg-gray-50 rounded">
                <span className="text-gray-600">No data available yet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
