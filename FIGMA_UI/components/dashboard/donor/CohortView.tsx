import { Users, Heart, Calendar, Bell, TrendingUp, AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

type DonorCohortAssignment = {
  cohort_id: string;
  cohort_name: string | null;
  patient_id: string;
  patient_name: string | null;
  sequence_order: number | null;
  next_scheduled_for: string | null;
  last_donation_date: string | null;
  days_until_eligible: number | null;
  donor_available: boolean;
  hospital_id: string | null;
  hospital_name: string | null;
  hospital_address: string | null;
};

export function CohortView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<DonorCohortAssignment[]>([]);
  const [donorAvailable, setDonorAvailable] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const { refreshTick } = useAutoRefresh();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ getSessionAndRole }, { supabase }] = await Promise.all([
        import('../../../services/auth'),
        import('../../../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'donor') {
        setAssignments([]);
        return;
      }
      const { data, error: rpcError } = await supabase.rpc('donor_list_cohort_assignments');
      if (rpcError) throw rpcError;
      const rows = Array.isArray(data) ? (data as any[]) : [];
      const normalized: DonorCohortAssignment[] = rows
        .map((r) => ({
          cohort_id: typeof r?.cohort_id === 'string' ? r.cohort_id : '',
          cohort_name: typeof r?.cohort_name === 'string' ? r.cohort_name : null,
          patient_id: typeof r?.patient_id === 'string' ? r.patient_id : '',
          patient_name: typeof r?.patient_name === 'string' ? r.patient_name : null,
          sequence_order: typeof r?.sequence_order === 'number' ? r.sequence_order : null,
          next_scheduled_for: typeof r?.next_scheduled_for === 'string' ? r.next_scheduled_for : null,
          last_donation_date: typeof r?.last_donation_date === 'string' ? r.last_donation_date : null,
          days_until_eligible: typeof r?.days_until_eligible === 'number' ? r.days_until_eligible : null,
          donor_available: !!r?.donor_available,
          hospital_id: typeof r?.hospital_id === 'string' && r.hospital_id.trim().length > 0 ? r.hospital_id : null,
          hospital_name: typeof r?.hospital_name === 'string' && r.hospital_name.trim().length > 0 ? r.hospital_name : null,
          hospital_address:
            typeof r?.hospital_address === 'string' && r.hospital_address.trim().length > 0 ? r.hospital_address : null,
        }))
        .filter((r) => r.cohort_id && r.patient_id);
      setAssignments(normalized);
      const firstAvailability = normalized.length > 0 ? normalized[0].donor_available : true;
      setDonorAvailable(firstAvailability);
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : 'Failed to load cohort assignments';
      setError(msg);
      setAssignments([]);
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

  const activeCohortCount = useMemo(() => new Set(assignments.map((a) => a.cohort_id)).size, [assignments]);
  const supportedPatientsCount = useMemo(() => new Set(assignments.map((a) => a.patient_id)).size, [assignments]);
  const nextRotation = useMemo(() => {
    const upcoming = assignments
      .filter((a) => a.next_scheduled_for && !Number.isNaN(new Date(a.next_scheduled_for).getTime()))
      .sort((a, b) => new Date(a.next_scheduled_for as string).getTime() - new Date(b.next_scheduled_for as string).getTime());
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [assignments]);

  const nextRotationLabel =
    nextRotation?.next_scheduled_for && !Number.isNaN(new Date(nextRotation.next_scheduled_for).getTime())
      ? new Date(nextRotation.next_scheduled_for).toLocaleString()
      : '—';

  const eligibilityLabel = useMemo(() => {
    if (loading || !nextRotation) return '—';
    if (nextRotation.days_until_eligible === null || nextRotation.days_until_eligible === undefined) return '—';
    if (nextRotation.days_until_eligible <= 0) return 'Eligible';
    return `${nextRotation.days_until_eligible} days remaining`;
  }, [loading, nextRotation]);

  const updateAvailability = useCallback(
    async (nextValue: boolean) => {
      if (savingAvailability) return;
      setSavingAvailability(true);
      setError(null);
      try {
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'donor') return;
        const { error: rpcError } = await supabase.rpc('donor_set_availability', { p_available: nextValue } as any);
        if (rpcError) throw rpcError;
        setDonorAvailable(nextValue);
        await load();
      } catch (e: any) {
        const msg = e && typeof e.message === 'string' ? e.message : 'Failed to update availability';
        setError(msg);
      } finally {
        setSavingAvailability(false);
      }
    },
    [load, savingAvailability],
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-gray-900 mb-2">Cohort Donor System</h2>
            <p className="text-gray-600">Dedicated support for patients with chronic blood needs</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className={`px-4 py-2 rounded-lg border transition ${
              loading ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-white rounded-xl border border-red-200 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Cohort Info Banner */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-8 h-8" />
              <h3>You're Part of a Life-Saving Team</h3>
            </div>
            <p className="opacity-90 mb-6">
              Cohort donors provide regular support to patients with conditions like Thalassemia, ensuring they receive timely transfusions from trusted donors.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                <div className="opacity-90 mb-1">Active Cohorts</div>
                <div style={{ fontSize: '1.5rem' }}>{loading ? '—' : activeCohortCount}</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                <div className="opacity-90 mb-1">Patients Supported</div>
                <div style={{ fontSize: '1.5rem' }}>{loading ? '—' : supportedPatientsCount}</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                <div className="opacity-90 mb-1">Next Rotation</div>
                <div style={{ fontSize: '1.5rem' }}>{loading ? '—' : nextRotationLabel}</div>
              </div>
            </div>
          </div>

          {/* My Cohort Assignments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Your Cohort Assignments</h3>

            <div className="space-y-4">
              {loading ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="text-gray-600">Loading your assignments...</div>
                </div>
              ) : assignments.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="text-gray-600">
                    No cohort assignments found for your account yet.
                    <div className="text-gray-500 mt-2">
                      If you were added to a patient cohort, make sure you are logged in with the correct donor account.
                    </div>
                  </div>
                </div>
              ) : (
                assignments.map((a) => {
                  const next =
                    a.next_scheduled_for && !Number.isNaN(new Date(a.next_scheduled_for).getTime())
                      ? new Date(a.next_scheduled_for).toLocaleString()
                      : '—';
                  const last =
                    a.last_donation_date && !Number.isNaN(new Date(a.last_donation_date).getTime())
                      ? new Date(a.last_donation_date).toLocaleDateString()
                      : '—';
                  const eligibility =
                    a.days_until_eligible === null
                      ? '—'
                      : a.days_until_eligible <= 0
                        ? 'Eligible'
                        : `${a.days_until_eligible} days`;
                  const hasHospital = !!(a.hospital_id || a.hospital_name || a.hospital_address);
                  const navQuery = a.hospital_address || a.hospital_name || null;
                  const navHref = navQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navQuery)}` : null;
                  return (
                    <div key={`${a.cohort_id}:${a.patient_id}`} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Users className="w-5 h-5 text-violet-600" />
                            <div className="text-gray-900">
                              {a.patient_name || 'Patient'} • {a.cohort_name || 'Cohort'}
                            </div>
                          </div>
                          <div className="text-gray-600">
                            Position: {a.sequence_order ?? '—'} • Next scheduled: {next}
                          </div>
                          <div className="text-gray-600 mt-1">
                            Last donation: {last} • Eligibility: {eligibility}
                          </div>
                          <div className="text-gray-600 mt-1">
                            Hospital: {hasHospital ? a.hospital_name || 'Hospital' : 'Not booked yet'}
                          </div>
                          {a.hospital_address && (
                            <div className="text-gray-600 mt-1">
                              Address: {a.hospital_address}
                            </div>
                          )}
                          {hasHospital && navHref && (
                            <a
                              href={navHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block mt-3 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition"
                            >
                              Navigate to hospital
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              donorAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {donorAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Rotation Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Cohort Rotation Schedule</h3>

            {loading ? (
              <div className="p-4 bg-gray-50 rounded-lg text-gray-600">Loading rotation schedule...</div>
            ) : assignments.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
                Rotation schedule will appear once cohorts are assigned.
              </div>
            ) : (
              <div className="space-y-3">
                {assignments
                  .filter((a) => a.next_scheduled_for)
                  .sort(
                    (a, b) =>
                      new Date(a.next_scheduled_for as string).getTime() - new Date(b.next_scheduled_for as string).getTime(),
                  )
                  .slice(0, 5)
                  .map((a) => (
                    <div key={`rot:${a.cohort_id}:${a.patient_id}`} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between gap-6">
                        <div className="text-gray-900">
                          {a.patient_name || 'Patient'} • {a.cohort_name || 'Cohort'} • Position {a.sequence_order ?? '—'}
                        </div>
                        <div className="text-gray-600">
                          {a.next_scheduled_for ? new Date(a.next_scheduled_for).toLocaleString() : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Emergency Backup */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Emergency Backup Donor</h3>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-red-900 mb-2">Be a Backup Hero</div>
                  <p className="text-red-700 mb-4">
                    If a scheduled donor is unavailable, backup donors ensure patients never miss their critical transfusions.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={donorAvailable}
                      disabled={savingAvailability}
                      onChange={(e) => updateAvailability(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-red-700">I'm available as emergency backup</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Right Sidebar */}
          <div className="col-span-1 space-y-6">
            {/* Next Rotation */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Next Rotation</h3>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-orange-700 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span>Your Turn</span>
                </div>
                <div style={{ fontSize: '1.5rem' }} className="text-orange-900 mb-1">{loading ? '—' : nextRotationLabel}</div>
                <p className="text-orange-600">Schedule details will be shown here</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Patient</span>
                  <span className="text-gray-900">{loading ? '—' : nextRotation?.patient_name || 'Not assigned yet'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Cohort</span>
                  <span className="text-gray-900">{loading ? '—' : nextRotation?.cohort_name || 'Not assigned yet'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Hospital</span>
                  <span className="text-gray-900">
                    {loading ? '—' : nextRotation?.hospital_name || nextRotation?.hospital_address || 'Not booked yet'}
                  </span>
                </div>
              </div>

              {!loading && nextRotation ? (
                (() => {
                  const navQuery = nextRotation.hospital_address || nextRotation.hospital_name || null;
                  const navHref = navQuery
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navQuery)}`
                    : null;
                  return navHref ? (
                    <a
                      href={navHref}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full mt-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition text-center"
                    >
                      Navigate to hospital
                    </a>
                  ) : null;
                })()
              ) : null}

              <button className="w-full mt-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
                Set Reminder
              </button>
            </div>

            {/* Health Tracking */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Cohort Health Tracking</h3>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-700 mb-1">Donor Eligibility</div>
                <p className="text-gray-600">
                  {eligibilityLabel}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-700 mb-1">Last Donation</div>
                <p className="text-gray-600">
                  {loading
                    ? '—'
                    : nextRotation?.last_donation_date
                      ? new Date(nextRotation.last_donation_date).toLocaleDateString()
                      : '—'}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-700 mb-1">Success Rate</div>
                <p className="text-gray-600">—</p>
              </div>
            </div>
            </div>

            {/* Reminders */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Notifications</h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">Rotation reminders</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">Emergency alerts</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">Cohort updates</span>
                <input type="checkbox" className="rounded" />
              </label>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Bell className="w-4 h-4" />
                <span>SMS + Email alerts enabled</span>
              </div>
            </div>
          </div>

            {/* Impact Stats */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5" />
                <h3>Your Cohort Impact</h3>
              </div>

              <div className="space-y-3">
                <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                  <div className="opacity-90 mb-1">Total Rotations</div>
                  <div style={{ fontSize: '1.5rem' }}>—</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                  <div className="opacity-90 mb-1">Patients Helped</div>
                  <div style={{ fontSize: '1.5rem' }}>—</div>
                </div>
              </div>

              <p className="opacity-90 mt-4">
                Your regular donations help patients maintain their treatment schedules
              </p>
          </div>

          {/* Join More Cohorts */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Join More Cohorts</h3>

            <p className="text-gray-600 mb-4">
              Help more patients by joining additional cohort groups
            </p>

            <button className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
              Browse Available Cohorts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
