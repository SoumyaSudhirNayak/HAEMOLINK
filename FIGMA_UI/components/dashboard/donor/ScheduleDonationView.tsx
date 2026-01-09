import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, MapPin, Clock, QrCode, FileText, CheckCircle } from 'lucide-react';
import { Calendar as DateCalendar } from '../../ui/calendar';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

type DonorScheduledDonation = {
  schedule_id: string;
  scheduled_for: string | null;
  status: string | null;
  component: string | null;
  units: number | null;
  patient_name: string | null;
  hospital_name: string | null;
  used_emergency: boolean;
};

export function ScheduleDonationView() {
  const [upcomingDonations, setUpcomingDonations] = useState<DonorScheduledDonation[]>([]);
  const [loading, setLoading] = useState(true);
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
        if (!active || !session || role !== 'donor') {
          if (active) {
            setUpcomingDonations([]);
          }
          return;
        }
        const { data } = await supabase.rpc('donor_list_scheduled_donations', {
          p_only_upcoming: true,
        } as any);
        if (!active) {
          return;
        }
        const rows = Array.isArray(data) ? (data as any[]) : [];
        const normalized: DonorScheduledDonation[] = rows.map((r) => ({
          schedule_id: typeof r?.schedule_id === 'string' ? r.schedule_id : '',
          scheduled_for: typeof r?.scheduled_for === 'string' ? r.scheduled_for : null,
          status: typeof r?.status === 'string' ? r.status : null,
          component: typeof r?.component === 'string' ? r.component : null,
          units: typeof r?.units === 'number' ? r.units : null,
          patient_name: typeof r?.patient_name === 'string' ? r.patient_name : null,
          hospital_name: typeof r?.hospital_name === 'string' ? r.hospital_name : null,
          used_emergency: !!r?.used_emergency,
        }));
        setUpcomingDonations(normalized.filter((d) => d.schedule_id));
      } catch {
        if (active) {
          setUpcomingDonations([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const hasUpcoming = upcomingDonations.length > 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Schedule Donation</h2>
        <p className="text-gray-600">Book your blood donation appointment</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Select Date</h3>

            <div className="flex items-center justify-between mb-6">
              <div className="text-gray-900">Your scheduled donation cycle</div>
            </div>

            {loading ? (
              <div className="text-gray-600">Loading calendar…</div>
            ) : !hasUpcoming ? (
              <div className="text-gray-600">No scheduled donation dates yet.</div>
            ) : (
              <>
                <DateCalendar
                  mode="multiple"
                  selected={upcomingDonations
                    .map((d) => (d.scheduled_for ? new Date(d.scheduled_for) : null))
                    .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))}
                  className="border border-gray-200 rounded-lg"
                />
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-gray-700 mb-3">Upcoming cycle dates</div>
                  <div className="space-y-2">
                    {upcomingDonations.slice(0, 5).map((donation) => (
                      <div key={`cal:${donation.schedule_id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="text-gray-900">
                          {donation.scheduled_for ? new Date(donation.scheduled_for).toLocaleString() : '—'}
                        </div>
                        <CalendarIcon className="w-4 h-4 text-gray-600" />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Upcoming Donations</h3>

            {loading && (
              <p className="text-gray-600">Loading your donation schedule...</p>
            )}

            {!loading && !hasUpcoming && (
              <p className="text-gray-600">
                No data available yet. This information will appear once activity begins.
              </p>
            )}

            {!loading && hasUpcoming && (
              <div className="space-y-3">
                {upcomingDonations.map((donation) => (
                  <div
                    key={donation.schedule_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="text-gray-900 mb-1">
                        {donation.scheduled_for
                          ? new Date(donation.scheduled_for).toLocaleString()
                          : 'Scheduled donation'}
                      </div>
                      <p className="text-gray-600">
                        {donation.patient_name ? `${donation.patient_name} • ` : ''}
                        {donation.hospital_name ? `${donation.hospital_name} • ` : ''}
                        {donation.component || 'Donation type will be shown here'}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pre-screening Instructions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Pre-Donation Instructions</h3>

            <div className="space-y-3">
              {[
                { icon: '💧', title: 'Stay Hydrated', desc: 'Drink plenty of water before donation' },
                { icon: '🍽️', title: 'Eat Well', desc: 'Have a healthy meal 2-3 hours before' },
                { icon: '😴', title: 'Rest Well', desc: 'Get adequate sleep the night before' },
                { icon: '🚫', title: 'Avoid Alcohol', desc: 'No alcohol 24 hours before donation' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <span style={{ fontSize: '2rem' }}>{item.icon}</span>
                  <div>
                    <div className="text-gray-900 mb-1">{item.title}</div>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Booking Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Booking Summary</h3>

            {loading && (
              <p className="text-gray-600">Loading your next scheduled donation...</p>
            )}

            {!loading && !hasUpcoming && (
              <p className="text-gray-600">
                You do not have any upcoming donations scheduled. Once you book a donation,
                a summary will appear here.
              </p>
            )}

            {!loading && hasUpcoming && (
              <div className="space-y-3">
                {upcomingDonations.slice(0, 1).map((donation) => {
                  const date = donation.scheduled_for
                    ? new Date(donation.scheduled_for)
                    : null;
                  const dateString =
                    date && !Number.isNaN(date.getTime())
                      ? date.toLocaleDateString()
                      : null;
                  const timeString =
                    date && !Number.isNaN(date.getTime())
                      ? date.toLocaleTimeString()
                      : null;
                  return (
                    <div key={donation.schedule_id} className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-gray-500 mb-1">Date</div>
                        <div className="text-gray-900">
                          {dateString || 'Scheduled date will appear here'}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-gray-500 mb-1">Time</div>
                        <div className="text-gray-900">
                          {timeString || 'Scheduled time will appear here'}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-gray-500 mb-1">Type</div>
                        <div className="text-gray-900">
                          {donation.component || 'Donation type will appear here'}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-gray-500 mb-1">Patient</div>
                        <div className="text-gray-900">
                          {donation.patient_name || 'Patient will appear here'}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-gray-500 mb-1">Hospital</div>
                        <div className="text-gray-900">
                          {donation.hospital_name || 'Hospital will appear here'}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Upcoming donation scheduled</span>
                  </div>
                  <p className="text-green-600">
                    Eligibility and health checks will be confirmed at the blood bank.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* QR Code for Check-in */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <h3 className="text-gray-900 mb-4">Quick Check-in</h3>

            <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-20 h-20 text-gray-400" />
            </div>

            <p className="text-gray-600 mb-4">
              Show this QR code at the blood bank for instant check-in
            </p>

            <button className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
              Download QR Code
            </button>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Upcoming Appointments</h3>

            {loading && (
              <p className="text-gray-600">Loading appointments...</p>
            )}

            {!loading && !hasUpcoming && (
              <p className="text-gray-600">
                You do not have any confirmed appointments yet. Scheduled donations will appear here.
              </p>
            )}

            {!loading && hasUpcoming && (
              <div className="space-y-3">
                {upcomingDonations.slice(0, 3).map((donation) => (
                  <div
                    key={donation.schedule_id}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{donation.status || 'Scheduled'}</span>
                    </div>
                    <p className="text-blue-600">
                      {donation.scheduled_for
                        ? new Date(donation.scheduled_for).toLocaleString()
                        : 'Scheduled donation'}
                    </p>
                    <p className="text-gray-600 mt-1">
                      {donation.patient_name ? `${donation.patient_name} • ` : ''}
                      {donation.hospital_name ? `${donation.hospital_name} • ` : ''}
                      {donation.component || 'Donation type will appear here'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nearby Blood Banks */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Nearby Blood Banks</h3>

            <p className="text-gray-600">
              Details of nearby blood banks and travel times will appear here once search
              and navigation services are connected.
            </p>
          </div>

          {/* Contact Support */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Need Help?</h3>

            <div className="space-y-2">
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-gray-700">
                Call Blood Bank
              </button>
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-gray-700">
                Chat with Support
              </button>
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-gray-700">
                FAQs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
