import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

type HospitalTransfusionRow = {
  schedule_id: string;
  scheduled_for: string | null;
  status: string | null;
  component: string | null;
  units: number | null;
  patient_id: string;
  patient_name: string | null;
  donor_id: string | null;
  donor_name: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  spo2: number | null;
  transfusion_status: string | null;
  reaction_notes: string | null;
};

type DraftVitals = {
  bp_systolic: string;
  bp_diastolic: string;
  heart_rate: string;
  spo2: string;
  transfusion_status: string;
  reaction_notes: string;
};

export function TransfusionView() {
  const { refreshTick } = useAutoRefresh();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<HospitalTransfusionRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftVitals>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ getSessionAndRole }, { supabase }] = await Promise.all([
        import('../../../services/auth'),
        import('../../../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') {
        setRows([]);
        return;
      }
      const { data, error: rpcError } = await supabase.rpc('hospital_list_transfusions', { p_only_upcoming: true } as any);
      if (rpcError) throw rpcError;
      const raw = Array.isArray(data) ? (data as any[]) : [];
      const normalized: HospitalTransfusionRow[] = raw
        .map((r) => ({
          schedule_id: typeof r?.schedule_id === 'string' ? r.schedule_id : '',
          scheduled_for: typeof r?.scheduled_for === 'string' ? r.scheduled_for : null,
          status: typeof r?.status === 'string' ? r.status : null,
          component: typeof r?.component === 'string' ? r.component : null,
          units: typeof r?.units === 'number' ? r.units : null,
          patient_id: typeof r?.patient_id === 'string' ? r.patient_id : '',
          patient_name: typeof r?.patient_name === 'string' ? r.patient_name : null,
          donor_id: typeof r?.donor_id === 'string' ? r.donor_id : null,
          donor_name: typeof r?.donor_name === 'string' ? r.donor_name : null,
          bp_systolic: typeof r?.bp_systolic === 'number' ? r.bp_systolic : null,
          bp_diastolic: typeof r?.bp_diastolic === 'number' ? r.bp_diastolic : null,
          heart_rate: typeof r?.heart_rate === 'number' ? r.heart_rate : null,
          spo2: typeof r?.spo2 === 'number' ? r.spo2 : null,
          transfusion_status: typeof r?.transfusion_status === 'string' ? r.transfusion_status : null,
          reaction_notes: typeof r?.reaction_notes === 'string' ? r.reaction_notes : null,
        }))
        .filter((r) => r.schedule_id && r.patient_id);
      setRows(normalized);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const row of normalized) {
          if (!next[row.schedule_id]) {
            next[row.schedule_id] = {
              bp_systolic: row.bp_systolic === null ? '' : String(row.bp_systolic),
              bp_diastolic: row.bp_diastolic === null ? '' : String(row.bp_diastolic),
              heart_rate: row.heart_rate === null ? '' : String(row.heart_rate),
              spo2: row.spo2 === null ? '' : String(row.spo2),
              transfusion_status: row.transfusion_status || 'pre_transfusion',
              reaction_notes: row.reaction_notes || '',
            };
          }
        }
        return next;
      });
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : 'Failed to load transfusions';
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await load();
    })();
    return () => {
      active = false;
    };
  }, [load, refreshTick]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ad = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0;
      const bd = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0;
      return ad - bd;
    });
  }, [rows]);

  const saveVitals = useCallback(
    async (scheduleId: string) => {
      if (savingId) return;
      setSavingId(scheduleId);
      setError(null);
      try {
        const draft = drafts[scheduleId];
        if (!draft) return;
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'hospital') return;

        const toIntOrNull = (v: string) => {
          const t = v.trim();
          if (!t) return null;
          const n = Number(t);
          return Number.isFinite(n) ? Math.trunc(n) : null;
        };

        const { error: rpcError } = await supabase.rpc('hospital_update_transfusion_vitals', {
          p_schedule_id: scheduleId,
          p_bp_systolic: toIntOrNull(draft.bp_systolic),
          p_bp_diastolic: toIntOrNull(draft.bp_diastolic),
          p_heart_rate: toIntOrNull(draft.heart_rate),
          p_spo2: toIntOrNull(draft.spo2),
          p_transfusion_status: draft.transfusion_status,
          p_reaction_notes: draft.reaction_notes,
        } as any);
        if (rpcError) throw rpcError;
        await load();
      } catch (e: any) {
        const msg = e && typeof e.message === 'string' ? e.message : 'Failed to update vitals';
        setError(msg);
      } finally {
        setSavingId(null);
      }
    },
    [drafts, load, savingId],
  );

  const markCompleted = useCallback(
    async (scheduleId: string) => {
      if (completingId) return;
      setCompletingId(scheduleId);
      setError(null);
      try {
        const row = rows.find((r) => r.schedule_id === scheduleId);
        if (!row || row.transfusion_status !== 'completed') {
          setError('Save vitals through all 3 phases before marking donation completed.');
          return;
        }
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'hospital') return;
        const { error: rpcError } = await supabase.rpc('hospital_mark_donation_completed', {
          p_schedule_id: scheduleId,
        } as any);
        if (rpcError) throw rpcError;
        await load();
      } catch (e: any) {
        const msg = e && typeof e.message === 'string' ? e.message : 'Failed to mark donation completed';
        setError(msg);
      } finally {
        setCompletingId(null);
      }
    },
    [completingId, load, rows],
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Patient Transfusion Workflow</h2>
        <p className="text-gray-600">Monitor and manage active transfusions</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-white rounded-xl border border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-gray-600">Loading transfusions...</div>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-gray-600">No active transfusions</div>
          </div>
        ) : (
          sortedRows.map((t) => {
            const when =
              t.scheduled_for && !Number.isNaN(new Date(t.scheduled_for).getTime())
                ? new Date(t.scheduled_for).toLocaleString()
                : '—';
            const draft = drafts[t.schedule_id];
            const canMarkCompleted = t.status !== 'completed' && t.transfusion_status === 'completed';
            return (
              <div key={t.schedule_id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 text-gray-900 mb-1">
                      <User className="w-5 h-5 text-blue-600" />
                      <span>{t.patient_name || 'Patient'}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-700">{t.donor_name || 'Donor'}</span>
                    </div>
                    <div className="text-gray-600">
                      {when} • {t.component || 'Component'} • {t.units ?? 1} unit(s)
                    </div>
                    <div className="text-gray-600 mt-1">
                      Status: {t.status || 'planned'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Activity className="w-5 h-5" />
                    <span>Vitals</span>
                  </div>
                </div>

                {draft ? (
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-500 mb-1">BP Systolic</div>
                      <input
                        type="number"
                        value={draft.bp_systolic}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [t.schedule_id]: { ...prev[t.schedule_id], bp_systolic: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">BP Diastolic</div>
                      <input
                        type="number"
                        value={draft.bp_diastolic}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [t.schedule_id]: { ...prev[t.schedule_id], bp_diastolic: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Heart Rate</div>
                      <input
                        type="number"
                        value={draft.heart_rate}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [t.schedule_id]: { ...prev[t.schedule_id], heart_rate: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">SpO2</div>
                      <input
                        type="number"
                        value={draft.spo2}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [t.schedule_id]: { ...prev[t.schedule_id], spo2: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-500 mb-1">Transfusion Status</div>
                      <select
                        value={draft.transfusion_status}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [t.schedule_id]: { ...prev[t.schedule_id], transfusion_status: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="pre_transfusion">Pre-transfusion</option>
                        <option value="in_progress">In-progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-500 mb-1">Reaction Notes</div>
                      <textarea
                        value={draft.reaction_notes}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [t.schedule_id]: { ...prev[t.schedule_id], reaction_notes: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <div className="text-gray-600">
                        {t.transfusion_status === 'completed' ? (
                          <span className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="w-5 h-5" />
                            Completed
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-700">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            Update vitals to progress status
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => saveVitals(t.schedule_id)}
                          disabled={savingId === t.schedule_id}
                          className={`px-4 py-2 rounded-lg text-white transition ${
                            savingId === t.schedule_id ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {savingId === t.schedule_id ? 'Saving…' : 'Save Vitals'}
                        </button>
                        <button
                          onClick={() => markCompleted(t.schedule_id)}
                          disabled={!canMarkCompleted || completingId === t.schedule_id}
                          className={`px-4 py-2 rounded-lg text-white transition ${
                            !canMarkCompleted || completingId === t.schedule_id
                              ? 'bg-green-400'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {t.status === 'completed'
                            ? 'Donation Completed'
                            : completingId === t.schedule_id
                              ? 'Completing…'
                              : 'Donor Gave Blood Successfully'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 text-gray-600">Vitals editor unavailable.</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
