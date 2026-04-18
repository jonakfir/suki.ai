// Routine reminder scheduling via Capacitor LocalNotifications when the app is
// running inside the native iOS/Android shell. On the web the helpers fall
// back to a no-op so the UI can still render a toggle.
//
// Capacitor injects `window.Capacitor` inside the WebView. The plugin surface
// is available at `Capacitor.Plugins.LocalNotifications` once installed in the
// native project — no npm dep needed in this web bundle. When not native, the
// functions short-circuit to `{ supported: false }`.

type NotifPlugin = {
  requestPermissions: () => Promise<{ display: "granted" | "denied" | "prompt" }>;
  checkPermissions: () => Promise<{ display: "granted" | "denied" | "prompt" }>;
  schedule: (opts: { notifications: ScheduledNotification[] }) => Promise<unknown>;
  cancel: (opts: { notifications: { id: number }[] }) => Promise<unknown>;
  getPending: () => Promise<{ notifications: { id: number }[] }>;
};

interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  schedule: {
    on: { hour: number; minute: number };
    allowWhileIdle?: boolean;
    repeats?: boolean;
    every?: "day";
  };
}

type CapacitorShape = {
  Plugins?: { LocalNotifications?: NotifPlugin };
  isNativePlatform?: () => boolean;
};

function cap(): CapacitorShape | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Capacitor?: CapacitorShape };
  return w.Capacitor ?? null;
}

export function isNative(): boolean {
  const c = cap();
  return !!(c && (c.isNativePlatform?.() || !!c.Plugins?.LocalNotifications));
}

function plugin(): NotifPlugin | null {
  return cap()?.Plugins?.LocalNotifications ?? null;
}

// Stable IDs so rescheduling replaces old notifications deterministically.
const MORNING_ID = 1001;
const EVENING_ID = 1002;

export interface ReminderTimes {
  morningHour?: number;   // 0-23
  morningMinute?: number; // 0-59
  eveningHour?: number;
  eveningMinute?: number;
}

const DEFAULTS: Required<ReminderTimes> = {
  morningHour: 8,
  morningMinute: 0,
  eveningHour: 21,
  eveningMinute: 30,
};

export async function ensurePermission(): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  const existing = await p.checkPermissions();
  if (existing.display === "granted") return true;
  const r = await p.requestPermissions();
  return r.display === "granted";
}

export async function scheduleRoutineReminders(
  times: ReminderTimes = {}
): Promise<{ scheduled: boolean; supported: boolean; error?: string }> {
  const p = plugin();
  if (!p) return { scheduled: false, supported: false };
  try {
    const ok = await ensurePermission();
    if (!ok) return { scheduled: false, supported: true, error: "permission denied" };

    const t = { ...DEFAULTS, ...times };
    // Cancel stale copies first.
    await p.cancel({ notifications: [{ id: MORNING_ID }, { id: EVENING_ID }] });

    await p.schedule({
      notifications: [
        {
          id: MORNING_ID,
          title: "Morning routine",
          body: "Start your day — tap to open your AM steps.",
          schedule: {
            on: { hour: t.morningHour, minute: t.morningMinute },
            repeats: true,
            every: "day",
            allowWhileIdle: true,
          },
        },
        {
          id: EVENING_ID,
          title: "Night routine",
          body: "Wind down — your PM routine is waiting.",
          schedule: {
            on: { hour: t.eveningHour, minute: t.eveningMinute },
            repeats: true,
            every: "day",
            allowWhileIdle: true,
          },
        },
      ],
    });
    return { scheduled: true, supported: true };
  } catch (e) {
    return {
      scheduled: false,
      supported: true,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function cancelRoutineReminders(): Promise<void> {
  const p = plugin();
  if (!p) return;
  await p.cancel({
    notifications: [{ id: MORNING_ID }, { id: EVENING_ID }],
  }).catch(() => {});
}

export async function hasScheduledReminders(): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  try {
    const { notifications } = await p.getPending();
    const ids = new Set(notifications.map((n) => n.id));
    return ids.has(MORNING_ID) || ids.has(EVENING_ID);
  } catch {
    return false;
  }
}
