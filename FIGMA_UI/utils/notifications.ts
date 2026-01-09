type NotifyInput = {
  title: string;
  body: string;
  tag: string;
  data?: any;
  icon?: string;
};

const PERMISSION_KEY = 'haemolink:notif:permission:v1';
const ASKED_KEY = 'haemolink:notif:askedAt:v1';
const SEEN_KEY = 'haemolink:notif:seen:v1';

const SEEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SEEN_MAX = 1000;

const isHttps = () => {
  try {
    return typeof window !== 'undefined' && window.location && window.location.protocol === 'https:';
  } catch {
    return false;
  }
};

const readJson = (key: string) => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: any) => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const getStoredPermission = (): 'granted' | 'denied' | 'default' | null => {
  const v = readJson(PERMISSION_KEY);
  return v === 'granted' || v === 'denied' || v === 'default' ? v : null;
};

const setStoredPermission = (v: 'granted' | 'denied' | 'default') => {
  writeJson(PERMISSION_KEY, v);
};

const getSeenMap = (): Map<string, number> => {
  const parsed = readJson(SEEN_KEY);
  if (!Array.isArray(parsed)) return new Map();
  const m = new Map<string, number>();
  for (const entry of parsed) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const k = entry[0];
    const ts = entry[1];
    if (typeof k === 'string' && typeof ts === 'number' && Number.isFinite(ts)) m.set(k, ts);
  }
  return m;
};

const saveSeenMap = (m: Map<string, number>) => {
  writeJson(SEEN_KEY, Array.from(m.entries()));
};

export const shouldNotifyTag = (tag: string) => {
  if (typeof window === 'undefined' || !tag) return false;
  const now = Date.now();
  const m = getSeenMap();
  for (const [k, ts] of m.entries()) {
    if (now - ts > SEEN_TTL_MS) m.delete(k);
  }
  if (m.has(tag)) return false;
  m.set(tag, now);
  if (m.size > SEEN_MAX) {
    const oldest = Array.from(m.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, Math.max(200, Math.floor(SEEN_MAX * 0.25)));
    oldest.forEach(([k]) => m.delete(k));
  }
  saveSeenMap(m);
  return true;
};

export const initNotificationBootstrap = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  const current = Notification.permission;
  setStoredPermission(current);

  if (current !== 'default') return;

  const stored = getStoredPermission();
  if (stored && stored !== 'default') return;

  const askedAt = readJson(ASKED_KEY);
  if (typeof askedAt === 'string' && askedAt) return;

  let requested = false;
  const ask = async () => {
    if (requested) return;
    requested = true;
    writeJson(ASKED_KEY, new Date().toISOString());
    try {
      const result = await Notification.requestPermission();
      setStoredPermission(result);
    } catch {}
  };

  const onGesture = () => {
    void ask();
  };

  window.addEventListener('pointerdown', onGesture, { capture: true, once: true });
  window.addEventListener('keydown', onGesture, { capture: true, once: true });
  window.addEventListener('touchstart', onGesture, { capture: true, once: true });
};

export const notify = async ({ title, body, tag, data, icon }: NotifyInput) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (!title || !tag) return false;
  if (Notification.permission !== 'granted') return false;
  if (!shouldNotifyTag(tag)) return false;

  const navDetail = data && typeof data === 'object' ? data : {};
  const swData = { type: 'haemolink:navigate', ...navDetail };

  if (isHttps() && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg && typeof (reg as any).active?.postMessage === 'function') {
        (reg as any).active.postMessage({
          type: 'haemolink:notify',
          title,
          options: {
            body,
            tag,
            data: swData,
            icon,
          },
        });
        return true;
      }
      if (reg && typeof (reg as any).showNotification === 'function') {
        await (reg as any).showNotification(title, { body, tag, data: swData, icon });
        return true;
      }
    } catch {}
  }

  try {
    const n = new Notification(title, { body, tag, icon, data: swData } as any);
    n.onclick = (ev) => {
      ev.preventDefault();
      try {
        window.focus();
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('haemolink:navigate', { detail: navDetail }));
      } catch {}
      try {
        n.close();
      } catch {}
    };
    return true;
  } catch {
    return false;
  }
};
