import { useEffect, useState } from 'react';
import { Calendar, Droplet, Download, FileText, Sparkles } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface PatientTransfusionRecord {
  id: string;
  occurred_at: string | null;
  component: string | null;
  units: number | null;
  hospital_id: string | null;
  hospital_name: string | null;
  donor_label: string | null;
  cycle_number: number | null;
  schedule_id: string | null;
}

interface HistoryStats {
  totalActivities: number;
  totalUnits: number;
  bloodBanks: number;
}

export function HistoryView() {
  const [records, setRecords] = useState<PatientTransfusionRecord[] | null>(null);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshTick } = useAutoRefresh();

  const parseTimestamp = (value: string | null) => {
    if (!value) return null;
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
    const fallback = new Date(normalized);
    if (!Number.isNaN(fallback.getTime())) return fallback;
    return null;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'patient') {
          if (active) {
            setRecords([]);
            setStats({ totalActivities: 0, totalUnits: 0, bloodBanks: 0 });
            setLoading(false);
          }
          return;
        }
        const { data } = await supabase.rpc('patient_list_transfusion_history', {
          p_patient_id: session.user.id,
          p_limit: 200,
        } as any);
        const rawRows = Array.isArray(data) ? (data as any[]) : [];
        const items: PatientTransfusionRecord[] = rawRows
          .map((r) => ({
            id: typeof r?.id === 'string' ? r.id : '',
            occurred_at: typeof r?.occurred_at === 'string' ? r.occurred_at : null,
            component: typeof r?.component === 'string' ? r.component : null,
            units: typeof r?.units === 'number' ? r.units : null,
            hospital_id: typeof r?.hospital_id === 'string' ? r.hospital_id : null,
            hospital_name: typeof r?.hospital_name === 'string' ? r.hospital_name : null,
            donor_label: typeof r?.donor_label === 'string' ? r.donor_label : null,
            cycle_number: typeof r?.cycle_number === 'number' ? r.cycle_number : null,
            schedule_id: typeof r?.schedule_id === 'string' ? r.schedule_id : null,
          }))
          .filter((r) => r.id);

        const totalUnits = items.reduce((sum, r) => sum + (typeof r.units === 'number' && Number.isFinite(r.units) ? r.units : 0), 0);
        const bloodBanks = new Set(items.map((r) => r.hospital_id).filter((v) => typeof v === 'string' && v.length > 0)).size;

        if (active) {
          setRecords(items);
          setStats({
            totalActivities: items.length,
            totalUnits,
            bloodBanks,
          });
          setLoading(false);
        }
      } catch {
        if (active) {
          setRecords([]);
          setStats({ totalActivities: 0, totalUnits: 0, bloodBanks: 0 });
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Transfusion History</h2>
        <p className="text-gray-600">Complete record of your blood transfusions and treatments</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-gray-500 mb-1">Total Activities</div>
              <div className="text-gray-900">
                {loading ? 'Loading...' : stats ? stats.totalActivities : '—'}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-gray-500 mb-1">Total Units</div>
              <div className="text-gray-900">
                {loading ? 'Loading...' : stats ? stats.totalUnits : '—'}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-gray-500 mb-1">Avg Blood Age</div>
              <div className="text-gray-900">
                Data not tracked yet
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-gray-500 mb-1">Blood Banks</div>
              <div className="text-gray-900">
                {loading ? 'Loading...' : stats ? stats.bloodBanks : '—'}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <select className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Time</option>
                <option>Last 30 Days</option>
                <option>Last 6 Months</option>
                <option>Last Year</option>
              </select>
              <select className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Components</option>
                <option>RBC Only</option>
                <option>Plasma Only</option>
                <option>Platelets Only</option>
              </select>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Filter
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
                <p className="text-gray-900 mb-2">Loading your history...</p>
              </div>
            ) : records && records.length > 0 ? (
              records.map((record) => {
                const occurredDate = parseTimestamp(record.occurred_at);
                const date = occurredDate ? occurredDate.toLocaleString() : null;
                const title = `${record.component || 'Blood'} Transfusion`;
                const metaParts = [
                  record.hospital_name ? `Hospital: ${record.hospital_name}` : null,
                  record.donor_label ? `Donor: ${record.donor_label}` : null,
                  typeof record.units === 'number' ? `Units: ${record.units}` : null,
                  typeof record.cycle_number === 'number' ? `Cycle: ${record.cycle_number}` : null,
                ].filter((v): v is string => typeof v === 'string' && v.length > 0);
                const description = metaParts.length > 0 ? metaParts.join(' • ') : 'Details not recorded';
                return (
                  <div key={record.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Droplet className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-gray-900">{title}</div>
                          </div>
                          <div className="flex items-center gap-4 text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {date || 'Time not recorded'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-gray-600">
                            <span>{description}</span>
                          </div>
                        </div>
                      </div>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-3 pt-4 border-t border-gray-200">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-gray-500 mb-1">Pre-Hb</div>
                        <div className="text-gray-900">Not captured</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-gray-500 mb-1">Post-Hb</div>
                        <div className="text-gray-900">Not captured</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-gray-500 mb-1">Duration</div>
                        <div className="text-gray-900">Not captured</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-gray-500 mb-1">Cost</div>
                        <div className="text-gray-900">Not captured</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
                <p className="text-gray-900 mb-2">No activity recorded yet</p>
                <p className="text-gray-500">
                  When your activity is recorded in HAEMOLINK, it will appear in this timeline.
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Previous
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">1</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">2</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">3</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6" />
              <h3>AI Insights</h3>
            </div>

            <p className="opacity-90">
              Insights will appear here once your transfusion history is connected to analytics.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Blood Age Distribution</h3>

            <p className="text-gray-600">
              Distribution charts will be available once more detailed transfusion data is captured.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Reaction History</h3>

            <p className="text-gray-600">
              Summary of reactions will appear here once transfusion outcomes are recorded.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Most Visited</h3>

            <p className="text-gray-600">
              Frequently visited hospitals will appear here once transfusion history is available.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Prescriptions</h3>

            <p className="text-gray-600">
              Prescription history will appear here when your doctor uploads linked documents.
            </p>
          </div>

          {/* Export Data */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Export History</h3>

            <div className="space-y-2">
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex items-center justify-between">
                <span className="text-gray-700">Download PDF</span>
                <Download className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex items-center justify-between">
                <span className="text-gray-700">Download Excel</span>
                <Download className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex items-center justify-between">
                <span className="text-gray-700">Share with Doctor</span>
                <FileText className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
