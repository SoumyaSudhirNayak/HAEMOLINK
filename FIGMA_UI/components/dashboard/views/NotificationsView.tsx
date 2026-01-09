import { useEffect, useMemo, useRef, useState } from 'react';
import { Droplet, Bell } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

type PatientNotificationRow = {
  id: string;
  title: string | null;
  message: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type BloodRequestRow = {
  id: string;
  status: string | null;
  component: string | null;
  blood_group: string | null;
  urgency: string | null;
  quantity_units?: number | null;
  units_required?: number | null;
  created_at: string | null;
};

type NotificationItem = {
  id: string;
  kind: 'patient_notification' | 'request';
  title: string;
  message: string | null;
  created_at: string | null;
  is_read: boolean;
};

export function NotificationsView() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'unread' | 'requests'>('all');
  const [patientNotifications, setPatientNotifications] = useState<PatientNotificationRow[]>([]);
  const [requestUpdates, setRequestUpdates] = useState<BloodRequestRow[]>([]);
  const { refreshTick } = useAutoRefresh();
  const reloadRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    let active = true;
    let channelNotifications: any = null;
    let channelRequests: any = null;
    (async () => {
      try {
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'patient') {
          if (active) {
            setPatientNotifications([]);
            setRequestUpdates([]);
            setLoading(false);
          }
          return;
        }
        const uid = session.user.id;

        const load = async () => {
          setLoading(true);
          const [notifResult, requestsResult] = await Promise.all([
            supabase
              .from('patient_notifications')
              .select('id, title, message, is_read, created_at')
              .eq('patient_id', uid)
              .order('created_at', { ascending: false })
              .limit(200),
            supabase
              .from('blood_requests')
              .select('id, status, component, blood_group, urgency, quantity_units, created_at')
              .eq('patient_id', uid)
              .order('created_at', { ascending: false })
              .limit(100),
          ]);

          if (!active) return;
          setPatientNotifications(Array.isArray(notifResult.data) ? (notifResult.data as any) : []);
          setRequestUpdates(Array.isArray(requestsResult.data) ? (requestsResult.data as any) : []);
          setLoading(false);
        };

        reloadRef.current = () => {
          void load();
        };
        await load();

        channelNotifications = supabase
          .channel(`patient_notifications_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'patient_notifications', filter: `patient_id=eq.${uid}` },
            () => load(),
          )
          .subscribe();

        channelRequests = supabase
          .channel(`patient_notifications_requests_${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'blood_requests', filter: `patient_id=eq.${uid}` },
            () => load(),
          )
          .subscribe();
      } catch {
        if (active) {
          setPatientNotifications([]);
          setRequestUpdates([]);
          setLoading(false);
          reloadRef.current = null;
        }
      }
    })();
    return () => {
      active = false;
      if (channelNotifications) channelNotifications.unsubscribe();
      if (channelRequests) channelRequests.unsubscribe();
      reloadRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (reloadRef.current) reloadRef.current();
  }, [refreshTick]);

  const items: NotificationItem[] = useMemo(() => {
    const notifItems: NotificationItem[] = (patientNotifications || []).map((n) => ({
      id: `pn_${n.id}`,
      kind: 'patient_notification',
      title: n.title || 'Notification',
      message: n.message ?? null,
      created_at: n.created_at ?? null,
      is_read: n.is_read === true,
    }));
    const requestItems: NotificationItem[] = (requestUpdates || []).map((r) => {
      const units = (r as any).quantity_units ?? (r as any).units_required ?? null;
      const title =
        r.component || r.blood_group
          ? `${r.component || 'Blood'}${r.blood_group ? ` • ${r.blood_group}` : ''}`
          : 'Blood request';
      const messageParts = [
        r.status ? `Status: ${r.status}` : null,
        r.urgency ? `Urgency: ${r.urgency}` : null,
        typeof units === 'number' && Number.isFinite(units) ? `Units: ${units}` : null,
      ].filter(Boolean);
      return {
        id: `br_${r.id}`,
        kind: 'request',
        title,
        message: messageParts.length > 0 ? messageParts.join(' • ') : null,
        created_at: r.created_at ?? null,
        is_read: true,
      };
    });

    const merged = [...notifItems, ...requestItems];
    merged.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return merged;
  }, [patientNotifications, requestUpdates]);

  const unreadCount = useMemo(() => {
    return (patientNotifications || []).reduce((sum, n) => sum + (n.is_read === true ? 0 : 1), 0);
  }, [patientNotifications]);

  const filtered = useMemo(() => {
    if (tab === 'unread') {
      return items.filter((i) => i.kind === 'patient_notification' && !i.is_read);
    }
    if (tab === 'requests') {
      return items.filter((i) => i.kind === 'request');
    }
    return items;
  }, [items, tab]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Notifications</h2>
        <p className="text-gray-600">Stay updated with request updates and alerts</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-lg ${tab === 'all' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          All ({items.length})
        </button>
        <button
          onClick={() => setTab('unread')}
          className={`px-4 py-2 rounded-lg ${tab === 'unread' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`px-4 py-2 rounded-lg ${tab === 'requests' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          Requests ({requestUpdates.length})
        </button>
        <div className="px-4 py-2 border border-gray-200 text-gray-500 rounded-lg flex items-center justify-center">
          Live
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-600">
            Loading notifications...
          </div>
        ) : filtered.length > 0 ? (
          filtered.slice(0, 100).map((n) => {
            const time = n.created_at ? new Date(n.created_at).toLocaleString() : 'Time not recorded';
            const Icon = n.kind === 'request' ? Droplet : Bell;
            const isUnread = n.kind === 'patient_notification' && !n.is_read;
            return (
              <div
                key={n.id}
                className={`bg-white border rounded-lg p-4 transition ${
                  isUnread ? 'border-blue-300' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-gray-900">{n.title}</div>
                      {isUnread && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">New</span>
                      )}
                    </div>
                    {n.message && <p className="text-gray-600 mb-2">{n.message}</p>}
                    <span className="text-gray-500">{time}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-600">
            No notifications yet
          </div>
        )}
      </div>
    </div>
  );
}
