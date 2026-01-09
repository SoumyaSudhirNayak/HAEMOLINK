import { useEffect, useMemo, useState } from 'react';
import { Thermometer, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

export function ColdChainView() {
  const { refreshTick } = useAutoRefresh();
  const [boxCode, setBoxCode] = useState('');
  const [activeBox, setActiveBox] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetRangeLabel = '2°C – 6°C';

  const statusMeta = useMemo(() => {
    const status = (activeBox?.status || '').toString().toLowerCase();
    if (status === 'critical') {
      return {
        label: 'Critical',
        badgeClass: 'bg-red-50 border-red-200 text-red-700',
        cardClass: 'from-red-50 to-red-100 border-red-300',
        icon: <TrendingDown className="w-16 h-16 text-red-600 mx-auto mb-4" />,
      };
    }
    if (status === 'warning') {
      return {
        label: 'Warning',
        badgeClass: 'bg-orange-50 border-orange-200 text-orange-700',
        cardClass: 'from-orange-50 to-orange-100 border-orange-300',
        icon: <AlertTriangle className="w-16 h-16 text-orange-600 mx-auto mb-4" />,
      };
    }
    if (status === 'stable') {
      return {
        label: 'Stable',
        badgeClass: 'bg-green-50 border-green-200 text-green-700',
        cardClass: 'from-green-50 to-green-100 border-green-300',
        icon: <Thermometer className="w-16 h-16 text-green-600 mx-auto mb-4" />,
      };
    }
    return {
      label: 'No data',
      badgeClass: 'bg-gray-50 border-gray-200 text-gray-700',
      cardClass: 'from-green-50 to-green-100 border-green-300',
      icon: <Thermometer className="w-16 h-16 text-green-600 mx-auto mb-4" />,
    };
  }, [activeBox?.status]);

  const loadLatest = async () => {
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'rider') return;
      const { data } = await supabase
        .from('cold_chain_boxes')
        .select('*')
        .eq('rider_id', session.user.id)
        .order('last_updated', { ascending: false })
        .limit(1);
      const row = Array.isArray(data) && data[0] ? data[0] : null;
      if (row) {
        setActiveBox(row);
        setBoxCode(typeof (row as any).box_code === 'string' ? (row as any).box_code : '');
      }
    } catch {}
  };

  useEffect(() => {
    loadLatest();
  }, [refreshTick]);

  const generateMockReading = (code: string) => {
    const seedBase = `${code}:${Date.now()}`;
    let h = 0;
    for (let i = 0; i < seedBase.length; i++) {
      h = (h * 31 + seedBase.charCodeAt(i)) >>> 0;
    }
    const r1 = (h % 1000) / 1000;
    const r2 = ((h >>> 10) % 1000) / 1000;
    const temp = Number((4 + (r1 - 0.5) * 8).toFixed(1));
    const humidity = Number((55 + (r2 - 0.5) * 50).toFixed(0));
    let status: 'stable' | 'warning' | 'critical' = 'stable';
    if (temp < 1 || temp > 8 || humidity > 85) status = 'critical';
    else if (temp < 2 || temp > 6 || humidity > 75) status = 'warning';
    return { temperature_c: temp, humidity_percent: humidity, status };
  };

  const handleSubmit = async () => {
    const code = boxCode.trim();
    if (!code) return;
    setLoading(true);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'rider') {
        setErrorMessage('Please log in as a rider to use cold chain.');
        return;
      }
      const reading = generateMockReading(code);
      const nowIso = new Date().toISOString();
      const upsertRow = {
        rider_id: session.user.id,
        box_code: code,
        temperature_c: reading.temperature_c,
        humidity_percent: reading.humidity_percent,
        status: reading.status,
        last_updated: nowIso,
      } as any;
      const { data, error } = await supabase
        .from('cold_chain_boxes')
        .upsert(upsertRow, { onConflict: 'rider_id,box_code' })
        .select('*')
        .maybeSingle();
      if (error) throw error;
      setActiveBox(data || null);
      setErrorMessage(null);
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : '';
      setErrorMessage(msg || 'Unable to save cold chain reading.');
    } finally {
      setLoading(false);
    }
  };

  const temperatureLabel =
    typeof activeBox?.temperature_c === 'number' || typeof activeBox?.temperature_c === 'string'
      ? `${Number(activeBox.temperature_c).toFixed(1)}°C`
      : null;
  const humidityLabel =
    typeof activeBox?.humidity_percent === 'number' || typeof activeBox?.humidity_percent === 'string'
      ? `${Number(activeBox.humidity_percent).toFixed(0)}%`
      : null;
  const lastUpdatedLabel = activeBox?.last_updated
    ? new Date(activeBox.last_updated).toLocaleString()
    : null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Cold Chain Compliance</h2>
        <p className="text-gray-600">Monitor temperature and handling conditions</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          {/* Live Temperature */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-gray-900">Smart Cold Box Monitor</h3>
                <div className="text-gray-600">
                  {activeBox?.box_code ? `Box: ${activeBox.box_code}` : 'Enter a Cold Chain Box Code to start'}
                </div>
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <input
                  value={boxCode}
                  onChange={(e) => setBoxCode(e.target.value)}
                  placeholder="Cold Chain Box Code"
                  className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={loading || !boxCode.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Generate'}
                </button>
              </form>
            </div>

            {errorMessage ? (
              <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div
                className={`bg-gradient-to-br border-2 rounded-xl p-8 text-center ${statusMeta.cardClass}`}
              >
                {statusMeta.icon}
                <div className="text-gray-900 mb-2" style={{ fontSize: '1.5rem' }}>
                  {temperatureLabel ?? 'No data available yet'}
                </div>
                <div className="text-gray-600">
                  {humidityLabel ? `Humidity ${humidityLabel}` : 'Humidity not available'}
                </div>
                <div className={`inline-flex mt-4 px-3 py-1 rounded-full border text-sm ${statusMeta.badgeClass}`}>
                  {statusMeta.label}
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-blue-600 mb-1">Target Range</div>
                  <div className="text-gray-600">{targetRangeLabel}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-gray-600 mb-1">Last Updated</div>
                  <div className="text-gray-600">{lastUpdatedLabel ?? 'No data available yet'}</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-green-600 mb-1">Compliance</div>
                  <div className="text-gray-600">
                    {activeBox?.status ? statusMeta.label : 'No data available yet'}
                  </div>
                </div>
              </div>
            </div>

            {/* Temperature Graph */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-gray-900 mb-4">Temperature History</h4>
              <div className="h-48 bg-white rounded border border-gray-200 flex items-center justify-center p-4">
                <div className="text-gray-600">No data available yet</div>
              </div>
              <div className="flex justify-between mt-2 text-gray-500">
                <span>0min</span>
                <span>30min</span>
                <span>60min</span>
              </div>
            </div>
          </div>

          {/* Auto Alerts */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Auto Alerts Configuration</h3>

            <div className="space-y-3">
              <div className="p-4 rounded-lg border-2 bg-gray-50 border-gray-200">
                <div className="text-gray-600">No alerts configured yet</div>
              </div>
            </div>
          </div>

          {/* Manual Checks */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Manual Safety Checks</h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" defaultChecked className="mt-1" />
                <div>
                  <div className="text-gray-900 mb-1">Box properly sealed</div>
                  <p className="text-gray-600">Verify thermal seal integrity</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" defaultChecked className="mt-1" />
                <div>
                  <div className="text-gray-900 mb-1">GPS tracking active</div>
                  <p className="text-gray-600">Confirm location services enabled</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" defaultChecked className="mt-1" />
                <div>
                  <div className="text-gray-900 mb-1">No visible damage</div>
                  <p className="text-gray-600">Check for physical tampering</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Current Status */}
          <div
            className={`border-2 rounded-lg p-6 ${
              statusMeta.label === 'Critical'
                ? 'bg-red-50 border-red-200'
                : statusMeta.label === 'Warning'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-green-50 border-green-200'
            }`}
          >
            <div
              className={`flex items-center gap-2 mb-4 ${
                statusMeta.label === 'Critical'
                  ? 'text-red-700'
                  : statusMeta.label === 'Warning'
                    ? 'text-orange-700'
                    : 'text-green-700'
              }`}
            >
              {statusMeta.label === 'Critical' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : statusMeta.label === 'Warning' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle className="w-6 h-6" />
              )}
              <h3>{activeBox?.status ? `Status: ${statusMeta.label}` : 'No Active Box'}</h3>
            </div>

            <div className="space-y-2">
              <div className="p-2 bg-white rounded">
                <span className="text-gray-600">
                  {activeBox?.box_code ? `Monitoring ${activeBox.box_code}` : 'No data available yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Alert History */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Recent Alerts</h3>
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-900 mb-1">No alerts today</div>
                <p className="text-gray-600">All deliveries compliant</p>
              </div>
            </div>
          </div>

          {/* Compliance Score */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="mb-4">Cold Chain Score</h3>
            <div className="mb-2">
              {activeBox?.status
                ? statusMeta.label === 'Stable'
                  ? '95 / 100'
                  : statusMeta.label === 'Warning'
                    ? '72 / 100'
                    : '40 / 100'
                : 'No data available yet'}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">
                Calibrate Sensor
              </button>
              <button className="w-full py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition">
                Report Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
