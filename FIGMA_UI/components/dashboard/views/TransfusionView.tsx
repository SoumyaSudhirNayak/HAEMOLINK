import { useCallback, useMemo, useEffect, useState } from 'react';
import { Calendar, Clock, Heart } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

type PatientScheduleItem = {
  schedule_id: string;
  scheduled_for: string | null;
  status: string | null;
  component: string | null;
  units: number | null;
  used_emergency: boolean;
  donor_name: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
};

type PatientHospital = {
  hospital_id: string;
  name: string;
  address: string;
  contact: string;
  verified: boolean;
};

export function TransfusionView() {
  const [scheduleItems, setScheduleItems] = useState<PatientScheduleItem[] | null>(null);
  const [hospitals, setHospitals] = useState<PatientHospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [booking, setBooking] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshTick } = useAutoRefresh();

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
            setScheduleItems([]);
            setHospitals([]);
          }
          return;
        }
        const [scheduleResult, hospitalsResult] = await Promise.all([
          supabase.rpc('patient_list_transfusion_schedule', { p_patient_id: session.user.id } as any),
          supabase.rpc('patient_list_hospitals', { p_query: null } as any),
        ]);

        if (scheduleResult.error || hospitalsResult.error) {
          if (active) {
            setScheduleItems([]);
            setHospitals([]);
          }
          return;
        }

        const rawSchedule = Array.isArray(scheduleResult.data) ? (scheduleResult.data as any[]) : [];
        const items: PatientScheduleItem[] = rawSchedule
          .map((r) => ({
            schedule_id: typeof r?.schedule_id === 'string' ? r.schedule_id : '',
            scheduled_for: typeof r?.scheduled_for === 'string' ? r.scheduled_for : null,
            status: typeof r?.status === 'string' ? r.status : null,
            component: typeof r?.component === 'string' ? r.component : null,
            units: typeof r?.units === 'number' ? r.units : null,
            used_emergency: !!r?.used_emergency,
            donor_name: typeof r?.donor_name === 'string' ? r.donor_name : null,
            hospital_id: typeof r?.hospital_id === 'string' ? r.hospital_id : null,
            hospital_name: typeof r?.hospital_name === 'string' ? r.hospital_name : null,
          }))
          .filter((r) => r.schedule_id);

        const rawHospitals = Array.isArray(hospitalsResult.data) ? (hospitalsResult.data as any[]) : [];
        const hospitalItems: PatientHospital[] = rawHospitals
          .map((h) => ({
            hospital_id: typeof h?.hospital_id === 'string' ? h.hospital_id : '',
            name: typeof h?.name === 'string' ? h.name : 'Hospital',
            address: typeof h?.address === 'string' ? h.address : '',
            contact: typeof h?.contact === 'string' ? h.contact : '',
            verified: !!h?.verified,
          }))
          .filter((h) => h.hospital_id);

        if (active) {
          setScheduleItems(items);
          setHospitals(hospitalItems);
          const existing = items.find((s) => s.hospital_id)?.hospital_id;
          setSelectedHospitalId((prev) => prev || existing || (hospitalItems[0]?.hospital_id ?? ''));
        }
      } catch {
        if (active) {
          setScheduleItems([]);
          setHospitals([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const nextUpcoming = useMemo(() => {
    if (!scheduleItems) return null;
    const now = Date.now();
    return scheduleItems
      .filter((s) => s.scheduled_for && new Date(s.scheduled_for).getTime() >= now && s.status !== 'completed')
      .sort((a, b) => new Date(a.scheduled_for as string).getTime() - new Date(b.scheduled_for as string).getTime())[0] || null;
  }, [scheduleItems]);

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h.hospital_id === selectedHospitalId) || null,
    [hospitals, selectedHospitalId],
  );

  const nextUpcomingHospital = useMemo(() => {
    if (!nextUpcoming?.hospital_id) return null;
    return hospitals.find((h) => h.hospital_id === nextUpcoming.hospital_id) || null;
  }, [hospitals, nextUpcoming?.hospital_id]);

  const mostRecentCompleted = useMemo(() => {
    if (!scheduleItems) return null;
    return scheduleItems
      .filter((s) => s.scheduled_for && s.status === 'completed')
      .sort((a, b) => new Date(b.scheduled_for as string).getTime() - new Date(a.scheduled_for as string).getTime())[0] || null;
  }, [scheduleItems]);

  useEffect(() => {
    if (!nextUpcoming?.scheduled_for) {
      setSelectedTime('09:00');
      return;
    }
    const d = new Date(nextUpcoming.scheduled_for);
    if (Number.isNaN(d.getTime())) {
      setSelectedTime('09:00');
      return;
    }
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setSelectedTime(`${hh}:${mm}`);
  }, [nextUpcoming?.schedule_id, nextUpcoming?.scheduled_for]);

  const planNext = useCallback(async () => {
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
      const { error: planError } = await supabase.rpc('plan_next_transfusion', {
        p_patient_id: session.user.id,
        p_component: 'Whole Blood',
        p_units: 1,
      } as any);
      if (planError) throw planError;
      const { data } = await supabase.rpc('patient_list_transfusion_schedule', { p_patient_id: session.user.id } as any);
      const raw = Array.isArray(data) ? (data as any[]) : [];
      const items: PatientScheduleItem[] = raw
        .map((r) => ({
          schedule_id: typeof r?.schedule_id === 'string' ? r.schedule_id : '',
          scheduled_for: typeof r?.scheduled_for === 'string' ? r.scheduled_for : null,
          status: typeof r?.status === 'string' ? r.status : null,
          component: typeof r?.component === 'string' ? r.component : null,
          units: typeof r?.units === 'number' ? r.units : null,
          used_emergency: !!r?.used_emergency,
          donor_name: typeof r?.donor_name === 'string' ? r.donor_name : null,
          hospital_id: typeof r?.hospital_id === 'string' ? r.hospital_id : null,
          hospital_name: typeof r?.hospital_name === 'string' ? r.hospital_name : null,
        }))
        .filter((r) => r.schedule_id);
      setScheduleItems(items);
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : 'Failed to plan next transfusion';
      setError(msg);
    } finally {
      setPlanning(false);
    }
  }, [planning]);

  const bookNext = useCallback(async () => {
    if (!nextUpcoming || !selectedHospitalId || booking) return;
    setBooking(true);
    setError(null);
    try {
      const base = nextUpcoming.scheduled_for ? new Date(nextUpcoming.scheduled_for) : new Date();
      if (Number.isNaN(base.getTime())) {
        throw new Error('Invalid scheduled date');
      }
      const [hhRaw, mmRaw] = selectedTime.split(':');
      const hh = Number(hhRaw);
      const mm = Number(mmRaw);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
        throw new Error('Select a valid time');
      }
      const scheduledAt = new Date(base);
      scheduledAt.setHours(hh, mm, 0, 0);

      const [{ getSessionAndRole }, { supabase }] = await Promise.all([
        import('../../../services/auth'),
        import('../../../supabase/client'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'patient') return;
      const { error: bookError } = await supabase.rpc('patient_book_transfusion', {
        p_schedule_id: nextUpcoming.schedule_id,
        p_hospital_id: selectedHospitalId,
        p_scheduled_for: scheduledAt.toISOString(),
      } as any);
      if (bookError) throw bookError;
      const { data } = await supabase.rpc('patient_list_transfusion_schedule', { p_patient_id: session.user.id } as any);
      const raw = Array.isArray(data) ? (data as any[]) : [];
      const items: PatientScheduleItem[] = raw
        .map((r) => ({
          schedule_id: typeof r?.schedule_id === 'string' ? r.schedule_id : '',
          scheduled_for: typeof r?.scheduled_for === 'string' ? r.scheduled_for : null,
          status: typeof r?.status === 'string' ? r.status : null,
          component: typeof r?.component === 'string' ? r.component : null,
          units: typeof r?.units === 'number' ? r.units : null,
          used_emergency: !!r?.used_emergency,
          donor_name: typeof r?.donor_name === 'string' ? r.donor_name : null,
          hospital_id: typeof r?.hospital_id === 'string' ? r.hospital_id : null,
          hospital_name: typeof r?.hospital_name === 'string' ? r.hospital_name : null,
        }))
        .filter((r) => r.schedule_id);
      setScheduleItems(items);
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : 'Failed to book transfusion';
      setError(msg);
    } finally {
      setBooking(false);
    }
  }, [booking, nextUpcoming, selectedHospitalId, selectedTime]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Transfusion Management</h2>
        <p className="text-gray-600">View your transfusion schedule and history</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          {error && (
            <div className="bg-white rounded-xl border border-red-200 p-4 text-red-700">
              {error}
            </div>
          )}

          {scheduleItems === null ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
              Loading transfusion data...
            </div>
          ) : scheduleItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
              <p className="text-gray-900 mb-2">No transfusions scheduled yet</p>
              <p className="text-gray-500">
                Once your cohort schedule is planned, upcoming transfusions will appear here.
              </p>
              <button
                onClick={planNext}
                disabled={planning}
                className={`mt-6 px-4 py-2 rounded-lg text-white transition ${
                  planning ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {planning ? 'Planning…' : 'Plan Next Transfusion'}
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-gray-900 mb-4">Next Scheduled Transfusion</h3>
                {nextUpcoming ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span>
                        {nextUpcoming.scheduled_for
                          ? new Date(nextUpcoming.scheduled_for).toLocaleString()
                          : 'Date not recorded'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span>
                        Status {nextUpcoming.status || 'planned'} • Donor {nextUpcoming.donor_name || 'Donor'}
                      </span>
                    </div>
                    <div className="text-gray-700">
                      Hospital: {nextUpcoming.hospital_name || 'Not assigned'}
                    </div>
                    {nextUpcomingHospital?.address ? (
                      <div className="text-gray-600">Address: {nextUpcomingHospital.address}</div>
                    ) : null}
                    {(() => {
                      const navQuery = nextUpcomingHospital?.address || nextUpcoming.hospital_name || null;
                      const navHref = navQuery
                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navQuery)}`
                        : null;
                      return navHref ? (
                        <a
                          href={navHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block mt-1 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition"
                        >
                          Navigate to hospital
                        </a>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="text-gray-600">
                    No upcoming transfusions scheduled.
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-gray-900 mb-4">Transfusion Timeline</h3>
                <div className="space-y-4">
                  {[...scheduleItems]
                    .sort((a, b) => {
                      const ad = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0;
                      const bd = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0;
                      return bd - ad;
                    })
                    .map((t) => {
                    const date = t.scheduled_for
                      ? new Date(t.scheduled_for).toLocaleDateString()
                      : null;
                    return (
                      <div
                        key={t.schedule_id}
                        className="border border-gray-200 rounded-lg p-4 flex items-start justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Heart className="w-4 h-4 text-red-500" />
                            <span className="text-gray-900">Transfusion</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-700">{t.status || 'planned'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-600 mb-1">
                            <span>
                              {date || 'Date not recorded'}
                            </span>
                            <span>•</span>
                            <span>
                              Donor {t.donor_name || 'Donor'}
                            </span>
                          </div>
                          <div className="text-gray-600">
                            Hospital: {t.hospital_name || 'Not assigned'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {mostRecentCompleted && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-gray-900 mb-4">Most Recent Completed</h3>
                  <div className="text-gray-700">
                    {mostRecentCompleted.scheduled_for
                      ? new Date(mostRecentCompleted.scheduled_for).toLocaleString()
                      : '—'}{' '}
                    • {mostRecentCompleted.hospital_name || 'Hospital'} • {mostRecentCompleted.donor_name || 'Donor'}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-6 h-6" />
              <h3>Next Transfusion</h3>
            </div>

            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="mb-2">
                {nextUpcoming && nextUpcoming.scheduled_for
                  ? new Date(nextUpcoming.scheduled_for).toLocaleString()
                  : 'No transfusions scheduled yet'}
              </div>
              <p className="opacity-90">
                Choose a hospital to book your next scheduled slot.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Book Hospital</h3>
            {!nextUpcoming ? (
              <div className="text-gray-600">
                Plan your next transfusion slot first.
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <div className="text-gray-500 mb-1">Hospital</div>
                  <select
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {hospitals.length === 0 && (
                      <option value="">No hospitals available</option>
                    )}
                    {hospitals.map((h) => (
                      <option key={h.hospital_id} value={h.hospital_id}>
                        {h.name}{h.verified ? ' (Verified)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedHospital?.address ? (
                  <div className="mb-3 text-gray-600">Address: {selectedHospital.address}</div>
                ) : null}
                {(() => {
                  const navQuery = selectedHospital?.address || selectedHospital?.name || null;
                  const navHref = navQuery
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navQuery)}`
                    : null;
                  return navHref ? (
                    <a
                      href={navHref}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full mb-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition text-center"
                    >
                      Navigate to hospital
                    </a>
                  ) : null;
                })()}
                <div className="mb-3">
                  <div className="text-gray-500 mb-1">Time</div>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                <button
                  onClick={bookNext}
                  disabled={booking || !selectedHospitalId}
                  className={`w-full py-2 rounded-lg text-white transition ${
                    booking || !selectedHospitalId ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {booking ? 'Booking…' : 'Book Next Slot'}
                </button>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-red-500" />
              <h3 className="text-gray-900">Thalassemia Care</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-500 mb-1">Transfusion plan</div>
                <div className="text-gray-900">
                  Your doctor can link a transfusion plan to your profile.
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-500 mb-1">Recorded transfusions</div>
                <div className="text-gray-900">
                  {scheduleItems ? scheduleItems.length : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
