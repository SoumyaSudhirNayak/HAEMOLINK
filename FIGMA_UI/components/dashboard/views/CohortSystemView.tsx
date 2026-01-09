import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Calendar, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { BackButton } from '../navigation/BackButton';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import type { DashboardView } from '../../PatientDashboard';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface CohortSystemViewProps {
  onNavigate?: (view: DashboardView) => void;
}

export function CohortSystemView({ onNavigate }: CohortSystemViewProps) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshTick } = useAutoRefresh();

  const [cohortRows, setCohortRows] = useState<
    Array<{
      cohort_id: string;
      cohort_name: string;
      start_date: string;
      sequence_order: number;
      donor_id: string;
      donor_name: string;
      donor_phone: string | null;
      donor_blood_group: string | null;
      donor_location: string | null;
      donor_available: boolean;
      last_donation_date: string | null;
      next_scheduled_for: string | null;
      next_transfusion_for: string | null;
    }>
  >([]);

  const [initDonorEmails, setInitDonorEmails] = useState('');
  const [initStartDate, setInitStartDate] = useState('');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [{ getSessionAndRole }, { supabase }] = await Promise.all([
        import('../../../services/auth'),
        import('../../../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'patient') {
        setCohortRows([]);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('patient_get_cohort_details', {
        p_patient_id: session.user.id,
      } as any);
      if (rpcError) throw rpcError;
      const rows = Array.isArray(data) ? (data as any[]) : [];
      const normalized = rows
        .map((r) => ({
          cohort_id: typeof r?.cohort_id === 'string' ? r.cohort_id : '',
          cohort_name: typeof r?.cohort_name === 'string' ? r.cohort_name : 'Cohort',
          start_date: typeof r?.start_date === 'string' ? r.start_date : new Date().toISOString(),
          sequence_order: typeof r?.sequence_order === 'number' ? r.sequence_order : 0,
          donor_id: typeof r?.donor_id === 'string' ? r.donor_id : '',
          donor_name: typeof r?.donor_name === 'string' ? r.donor_name : 'Donor',
          donor_phone: typeof r?.donor_phone === 'string' ? r.donor_phone : null,
          donor_blood_group: typeof r?.donor_blood_group === 'string' ? r.donor_blood_group : null,
          donor_location: typeof r?.donor_location === 'string' ? r.donor_location : null,
          donor_available: !!r?.donor_available,
          last_donation_date: typeof r?.last_donation_date === 'string' ? r.last_donation_date : null,
          next_scheduled_for: typeof r?.next_scheduled_for === 'string' ? r.next_scheduled_for : null,
          next_transfusion_for: typeof r?.next_transfusion_for === 'string' ? r.next_transfusion_for : null,
        }))
        .filter((r) => r.cohort_id)
        .sort((a, b) => a.sequence_order - b.sequence_order);

      setCohortRows(normalized);

      const nextTransfusionFor =
        normalized.length > 0 && normalized[0].next_transfusion_for ? normalized[0].next_transfusion_for : null;
      if (!nextTransfusionFor && normalized.length > 0) {
        try {
          await supabase.rpc('plan_next_transfusion', {
            p_patient_id: session.user.id,
            p_component: 'Whole Blood',
            p_units: 1,
          } as any);
          const { data: again } = await supabase.rpc('patient_get_cohort_details', { p_patient_id: session.user.id } as any);
          const againRows = Array.isArray(again) ? (again as any[]) : [];
          const againNormalized = againRows
            .map((r) => ({
              cohort_id: typeof r?.cohort_id === 'string' ? r.cohort_id : '',
              cohort_name: typeof r?.cohort_name === 'string' ? r.cohort_name : 'Cohort',
              start_date: typeof r?.start_date === 'string' ? r.start_date : new Date().toISOString(),
              sequence_order: typeof r?.sequence_order === 'number' ? r.sequence_order : 0,
              donor_id: typeof r?.donor_id === 'string' ? r.donor_id : '',
              donor_name: typeof r?.donor_name === 'string' ? r.donor_name : 'Donor',
              donor_phone: typeof r?.donor_phone === 'string' ? r.donor_phone : null,
              donor_blood_group: typeof r?.donor_blood_group === 'string' ? r.donor_blood_group : null,
              donor_location: typeof r?.donor_location === 'string' ? r.donor_location : null,
              donor_available: !!r?.donor_available,
              last_donation_date: typeof r?.last_donation_date === 'string' ? r.last_donation_date : null,
              next_scheduled_for: typeof r?.next_scheduled_for === 'string' ? r.next_scheduled_for : null,
              next_transfusion_for: typeof r?.next_transfusion_for === 'string' ? r.next_transfusion_for : null,
            }))
            .filter((r) => r.cohort_id)
            .sort((a, b) => a.sequence_order - b.sequence_order);
          setCohortRows(againNormalized);
        } catch {}
      }
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : 'Failed to load cohort';
      setError(msg);
      setCohortRows([]);
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

  const parseTimestamp = useCallback((value: string | null) => {
    if (!value) return null;
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
    const fallback = new Date(normalized);
    if (!Number.isNaN(fallback.getTime())) return fallback;
    return null;
  }, []);

  const cohortMeta = useMemo(() => {
    if (cohortRows.length === 0) return null;
    const first = cohortRows[0];
    const nextTransfusionDate = parseTimestamp(first.next_transfusion_for);
    const nextTransfusion = nextTransfusionDate ? nextTransfusionDate.toLocaleString() : null;
    const startDateValue = parseTimestamp(first.start_date);
    const startDate = startDateValue ? startDateValue.toLocaleDateString() : null;
    return {
      cohortId: first.cohort_id,
      cohortName: first.cohort_name,
      startDate,
      nextTransfusion,
    };
  }, [cohortRows, parseTimestamp]);

  const planNow = useCallback(async () => {
    if (planning) return;
    setPlanning(true);
    setError(null);
    try {
      const [{ getSessionAndRole }, { supabase }] = await Promise.all([
        import('../../../services/auth'),
        import('../../../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'patient') return;
      await supabase.rpc('plan_next_transfusion', {
        p_patient_id: session.user.id,
        p_component: 'Whole Blood',
        p_units: 1,
      } as any);
      await load();
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : 'Failed to plan next transfusion';
      setError(msg);
    } finally {
      setPlanning(false);
    }
  }, [load, planning]);

  const createCohort = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const donorEmails = initDonorEmails
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (donorEmails.length !== 5) {
        throw new Error('Enter exactly 5 donor emails (comma separated).');
      }
      const startDate = initStartDate.trim()
        ? new Date(`${initStartDate.trim()}T00:00:00.000Z`).toISOString()
        : new Date().toISOString();

      const [{ getSessionAndRole }, { supabase }] = await Promise.all([
        import('../../../services/auth'),
        import('../../../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'patient') return;

      const { error: createErr } = await supabase.rpc('create_patient_cohort_by_email', {
        p_patient_id: session.user.id,
        p_donor_emails: donorEmails,
        p_start_date: startDate,
        p_cohort_name: 'Primary Cohort',
      } as any);
      if (createErr) throw createErr;

      setInitDonorEmails('');
      setInitStartDate('');
      await load();
      await planNow();
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : 'Failed to create cohort';
      setError(msg);
    } finally {
      setCreating(false);
    }
  }, [creating, initDonorEmails, initStartDate, load, planNow]);

  return (
    <div className="p-8">
      {/* Navigation */}
      <BackButton onClick={() => onNavigate?.('home')} />
      <Breadcrumbs items={[
        { label: 'Home', onClick: () => onNavigate?.('home') },
        { label: 'Cohort System' }
      ]} />

      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">My Donor Cohort</h1>
        <p className="text-gray-600">
          Dedicated donor groups linked to your profile for recurring transfusions
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
          Loading cohort data...
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 bg-white rounded-xl border border-red-200 p-4 text-red-700">
              {error}
            </div>
          )}

          {cohortRows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-gray-900 mb-2">No cohort created yet</div>
              <div className="text-gray-600 mb-6">
                Create a cohort by entering 5 donor emails. This can be replaced by a care-team flow later.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-gray-700 mb-2">5 Donor Emails (comma separated)</label>
                  <input
                    value={initDonorEmails}
                    onChange={(e) => setInitDonorEmails(e.target.value)}
                    placeholder="donor1@email.com, donor2@email.com, donor3@email.com, donor4@email.com, donor5@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={initStartDate}
                    onChange={(e) => setInitStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={createCohort}
                    disabled={creating}
                    className={`w-full py-2.5 rounded-lg text-white transition ${
                      creating ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {creating ? 'Creating…' : 'Create Cohort'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Cohort Donors</span>
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-gray-900" style={{ fontSize: '2rem' }}>
                    {cohortRows.length}
                  </div>
                  <p className="text-green-600">Rotating every 21 days</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Start Date</span>
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-gray-900">
                    {cohortMeta?.startDate || '—'}
                  </div>
                  <p className="text-gray-600">Cohort cycle anchor</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Next Transfusion</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-gray-900">
                    {cohortMeta?.nextTransfusion || 'Not planned yet'}
                  </div>
                  <p className="text-gray-600">Auto-planned by rotation</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Actions</span>
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                  </div>
                  <button
                    onClick={planNow}
                    disabled={planning}
                    className={`w-full py-2 rounded-lg text-white transition ${planning ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {planning ? 'Planning…' : 'Plan Next Slot'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-gray-900">{cohortMeta?.cohortName || 'Cohort'} Donors</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {cohortRows.map((d) => {
                    const lastDate = parseTimestamp(d.last_donation_date);
                    const nextDate = parseTimestamp(d.next_scheduled_for);
                    const last = lastDate ? lastDate.toLocaleDateString() : '—';
                    const next = nextDate ? nextDate.toLocaleString() : '—';
                    const hasDonor = !!d.donor_id;
                    return (
                      <div key={`${d.cohort_id}:${d.sequence_order}`} className="p-6 flex items-start justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-gray-900">{d.donor_name}</h4>
                              <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                                Order {d.sequence_order}
                              </span>
                              {hasDonor ? (
                                <span
                                  className={`px-3 py-1 rounded-full text-sm ${
                                    d.donor_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {d.donor_available ? 'Available' : 'Unavailable'}
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">Pending</span>
                              )}
                            </div>
                            <div className="text-gray-600">
                              {d.donor_blood_group ? `${d.donor_blood_group} • ` : ''}
                              {d.donor_location || 'Location not set'}
                            </div>
                            <div className="text-gray-500 mt-1">
                              Last donation: {last} • Next scheduled: {next}
                            </div>
                            {d.donor_phone && (
                              <div className="text-gray-500 mt-1">
                                Contact: {d.donor_phone}
                              </div>
                            )}
                          </div>
                        </div>
                        {hasDonor ? (
                          <div className="text-right text-gray-500">
                            Donor ID: {d.donor_id}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-red-900 mb-2">Emergency Broadcast</h3>
                <p className="text-red-700 mb-4">
                  If cohort donors are unavailable or ineligible, HAEMOLINK assigns an emergency backup donor outside the cohort for that slot.
                </p>
              </div>
            </div>
          </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
