import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

export function StockDashboardView() {
  const { refreshTick } = useAutoRefresh();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Array<any>>([]);
  const [error, setError] = useState<string | null>(null);
  const [componentFilter, setComponentFilter] = useState<string>('All Components');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('All Blood Groups');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [ageFilter, setAgeFilter] = useState<string>('All Ages');
  const [expiryFilter, setExpiryFilter] = useState<string>('Expiry: All');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchRows = useCallback(async (opts?: { resetPage?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') return;

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      try {
        await supabase
          .from('hospital_inventory_units')
          .update({ status: 'expired' })
          .eq('hospital_id', session.user.id)
          .lt('expiry_date', todayStr)
          .in('status', ['available', 'reserved']);
      } catch {}

      let q = supabase
        .from('hospital_inventory_units')
        .select('id, batch_id, blood_group, component_type, collection_date, expiry_date, status, qr_hash, created_at')
        .eq('hospital_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (componentFilter !== 'All Components') q = q.eq('component_type', componentFilter);
      if (bloodGroupFilter !== 'All Blood Groups') q = q.eq('blood_group', bloodGroupFilter);
      if (statusFilter === 'Available') q = q.eq('status', 'available');
      if (statusFilter === 'Reserved') q = q.eq('status', 'reserved');

      const { data, error } = await q;
      if (error) throw error;
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      if (opts?.resetPage) setPage(1);
    } catch (e: any) {
      const message = e && typeof e.message === 'string' ? e.message : 'Failed to load inventory';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [bloodGroupFilter, componentFilter, statusFilter]);

  useEffect(() => {
    let active = true;
    let channel: any = null;

    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'hospital') return;

        await fetchRows({ resetPage: true });
        channel = supabase
          .channel('hospital_stock_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'hospital_inventory_units', filter: `hospital_id=eq.${session.user.id}` },
            () => {
              if (!active) return;
              fetchRows();
            },
          )
          .subscribe();
      } catch {}
    })();

    return () => {
      active = false;
      try {
        if (channel) channel.unsubscribe();
      } catch {}
    };
  }, [fetchRows]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows, refreshTick]);

  const filtered = useMemo(() => {
    const now = new Date();
    const dayDiff = (d: string) => {
      const dt = new Date(d + 'T00:00:00');
      return Math.floor((dt.getTime() - new Date(now.toDateString()).getTime()) / (1000 * 60 * 60 * 24));
    };
    const ageDays = (d: string) => {
      const dt = new Date(d + 'T00:00:00');
      return Math.max(0, Math.floor((new Date(now.toDateString()).getTime() - dt.getTime()) / (1000 * 60 * 60 * 24)));
    };

    return rows.filter((r) => {
      if (statusFilter === 'Emergency Only') {
        const diff = typeof r.expiry_date === 'string' ? dayDiff(r.expiry_date) : 9999;
        if (diff < 0 || diff > 2) return false;
      }
      if (ageFilter !== 'All Ages' && typeof r.collection_date === 'string') {
        const a = ageDays(r.collection_date);
        if (ageFilter === '0-7 days' && !(a >= 0 && a <= 7)) return false;
        if (ageFilter === '8-14 days' && !(a >= 8 && a <= 14)) return false;
        if (ageFilter === '15-21 days' && !(a >= 15 && a <= 21)) return false;
        if (ageFilter === '22+ days' && !(a >= 22)) return false;
      }
      if (expiryFilter !== 'Expiry: All' && typeof r.expiry_date === 'string') {
        const diff = dayDiff(r.expiry_date);
        if (expiryFilter === 'Expires in 1-3 days' && !(diff >= 1 && diff <= 3)) return false;
        if (expiryFilter === 'Expires in 4-7 days' && !(diff >= 4 && diff <= 7)) return false;
        if (expiryFilter === 'Expires 7+ days' && !(diff >= 7)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, ageFilter, expiryFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const dayDiff = (d: string) => {
      const dt = new Date(d + 'T00:00:00');
      return Math.floor((dt.getTime() - new Date(now.toDateString()).getTime()) / (1000 * 60 * 60 * 24));
    };

    const available = filtered.filter((r) => r.status === 'available').length;
    const reserved = filtered.filter((r) => r.status === 'reserved').length;
    const expiringSoon = filtered.filter((r) => {
      if (typeof r.expiry_date !== 'string') return false;
      const diff = dayDiff(r.expiry_date);
      return diff >= 0 && diff <= 2;
    }).length;

    const byKey = new Map<string, number>();
    for (const r of filtered) {
      if (r.status !== 'available') continue;
      const key = `${r.blood_group || ''}__${r.component_type || ''}`;
      byKey.set(key, (byKey.get(key) || 0) + 1);
    }
    const lowStock = Array.from(byKey.entries()).filter(([, c]) => c < 2).length;

    return { available, reserved, expiringSoon, lowStock };
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const ageDays = (d: string) => {
    const now = new Date();
    const dt = new Date(d + 'T00:00:00');
    return Math.max(0, Math.floor((new Date(now.toDateString()).getTime() - dt.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-gray-900 mb-2">Real-Time Stock Dashboard</h2>
          <p className="text-gray-600">Complete inventory overview with expiry tracking</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-6 gap-4">
          <select value={componentFilter} onChange={(e) => setComponentFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Components</option>
            <option>Whole Blood</option>
            <option>RBC</option>
            <option>Platelets</option>
            <option>Plasma</option>
          </select>
          <select value={bloodGroupFilter} onChange={(e) => setBloodGroupFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Blood Groups</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g}>{g}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Status</option>
            <option>Available</option>
            <option>Reserved</option>
            <option>Emergency Only</option>
          </select>
          <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Ages</option>
            <option>0-7 days</option>
            <option>8-14 days</option>
            <option>15-21 days</option>
            <option>22+ days</option>
          </select>
          <select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Expiry: All</option>
            <option>Expires in 1-3 days</option>
            <option>Expires in 4-7 days</option>
            <option>Expires 7+ days</option>
          </select>
          <button onClick={() => fetchRows({ resetPage: true })} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Apply
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">Batch ID</th>
                <th className="px-6 py-3 text-left text-gray-700">Component</th>
                <th className="px-6 py-3 text-left text-gray-700">Blood Group</th>
                <th className="px-6 py-3 text-left text-gray-700">Volume</th>
                <th className="px-6 py-3 text-left text-gray-700">Age (Days)</th>
                <th className="px-6 py-3 text-left text-gray-700">Expiry</th>
                <th className="px-6 py-3 text-left text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-600">
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length ? (
                pageRows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 text-gray-700">
                      {typeof r.batch_id === 'string' ? r.batch_id.slice(0, 8) : typeof r.qr_hash === 'string' ? r.qr_hash.slice(0, 8) : r.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{r.component_type}</td>
                    <td className="px-6 py-4 text-gray-700">{r.blood_group}</td>
                    <td className="px-6 py-4 text-gray-700">—</td>
                    <td className="px-6 py-4 text-gray-700">{typeof r.collection_date === 'string' ? ageDays(r.collection_date) : '—'}</td>
                    <td className="px-6 py-4 text-gray-700">{r.expiry_date}</td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="inline-flex items-center gap-2">
                        {r.status === 'available' ? <CheckCircle className="w-4 h-4 text-green-600" /> : r.status === 'reserved' ? <Clock className="w-4 h-4 text-blue-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700"></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-600">
                    No records available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <p className="text-gray-600">{filtered.length ? `Showing ${Math.min((currentPage - 1) * pageSize + 1, filtered.length)}-${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length}` : 'No records to display'}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Previous</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">{currentPage}</button>
            <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>

      {/* Summary Panels */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-green-900 mb-4">Available Stock</h3>
          <div className="text-gray-600">{stats.available} units</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-blue-900 mb-4">Reserved Units</h3>
          <div className="text-gray-600">{stats.reserved} units</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-900 mb-4">Emergency Reserve</h3>
          <div className="text-gray-600">{stats.expiringSoon} expiring &lt;48h • {stats.lowStock} low-stock</div>
        </div>
      </div>
    </div>
  );
}
