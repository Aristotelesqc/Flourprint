import { Capacitor } from '@capacitor/core';
import type { BakeState, Instant } from '@flourprint/core/domain';
import { bakeAlerts, type BakeAlert } from './bake-view';

/** A reminder shown by the system at a planned moment of a bake (ADR 0012). */
export interface Reminder {
  readonly id: number;
  readonly at: Instant;
  readonly title: string;
  readonly body: string;
  readonly bakeId: string;
}

export type Permission = 'granted' | 'denied' | 'prompt';

export interface Notifier {
  readonly kind: 'native' | 'web' | 'none';
  permission(): Promise<Permission>;
  request(): Promise<Permission>;
  /** Replaces every pending reminder of the app by these. */
  replace(reminders: readonly Reminder[]): Promise<void>;
  /** Called with the bake of a reminder the baker tapped; returns the unsubscribe. */
  onOpen(handler: (bakeId: string) => void): () => void;
  /** Android: whether reminders fire on time, and the system setting that allows it. */
  readonly exact?: { check(): Promise<boolean>; open(): Promise<void> };
}

/** Reminders further away are scheduled the next time the app runs. */
const WINDOW_MS = 7 * 24 * 3600 * 1000;
const CHANNEL = 'bakes';

/** Stable positive 31-bit id: Android notification ids are Java ints. */
export const reminderId = (key: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 1 || 1;
};

export interface ReminderTexts {
  readonly title: (alert: BakeAlert, step: string) => string;
  readonly body: (alert: BakeAlert, step: string, recipe: string) => string;
}

/** The reminders of every active bake, from their live projections (bakeAlerts). */
export const remindersFor = (
  bakes: readonly { readonly state: BakeState; readonly recipe?: string }[],
  now: Instant,
  stepName: (state: BakeState, stepId: string) => string,
  texts: ReminderTexts,
): Reminder[] =>
  bakes.flatMap(({ state, recipe }) =>
    bakeAlerts(state, now)
      .filter((alert) => {
        const ahead = Date.parse(alert.at) - Date.parse(now);
        return ahead > 0 && ahead <= WINDOW_MS;
      })
      .map((alert) => {
        const step = stepName(state, alert.stepId);
        return {
          id: reminderId(
            `${state.bakeId}:${alert.kind}${alert.set === undefined ? '' : alert.set}:${alert.stepId}`,
          ),
          at: alert.at,
          title: texts.title(alert, step),
          body: texts.body(alert, step, recipe ?? ''),
          bakeId: state.bakeId,
        };
      }),
  );

/**
 * The system fires at real times: a reminder of a simulated bake, due on the simulated clock,
 * fires that offset earlier (ADR 0014).
 */
export const onRealClock = (reminders: readonly Reminder[], offsetMs: number): Reminder[] =>
  reminders.map((r) =>
    offsetMs === 0
      ? r
      : { ...r, at: new Date(Date.parse(r.at) - offsetMs).toISOString() as Instant },
  );

const nativeNotifier = (channelName: string): Notifier => {
  const plugin = import('@capacitor/local-notifications').then(async ({ LocalNotifications }) => {
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: channelName,
      importance: 4,
      vibration: true,
    });
    return LocalNotifications;
  });
  const asPermission = (state: string): Permission =>
    state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'prompt';
  return {
    kind: 'native',
    permission: async () => asPermission((await (await plugin).checkPermissions()).display),
    request: async () => asPermission((await (await plugin).requestPermissions()).display),
    replace: async (reminders) => {
      const notifications = await plugin;
      const pending = await notifications.getPending();
      if (pending.notifications.length > 0) {
        await notifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
      if (reminders.length === 0) return;
      await notifications.schedule({
        notifications: reminders.map((r) => ({
          id: r.id,
          title: r.title,
          body: r.body,
          channelId: CHANNEL,
          schedule: { at: new Date(r.at), allowWhileIdle: true },
          extra: { bakeId: r.bakeId },
        })),
      });
    },
    onOpen: (handler) => {
      const listener = plugin.then((notifications) =>
        notifications.addListener('localNotificationActionPerformed', (action) => {
          const bakeId = (action.notification.extra as { bakeId?: unknown } | undefined)?.bakeId;
          if (typeof bakeId === 'string') handler(bakeId);
        }),
      );
      return () => void listener.then((l) => l.remove());
    },
    exact: {
      check: async () =>
        (await (await plugin).checkExactNotificationSetting()).exact_alarm === 'granted',
      open: async () => {
        await (await plugin).changeExactNotificationSetting();
      },
    },
  };
};

/** The PC shell and the browser: the web API, while the app runs. */
const webNotifier = (): Notifier => {
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  const handlers = new Set<(bakeId: string) => void>();
  const asPermission = (): Permission =>
    Notification.permission === 'default' ? 'prompt' : Notification.permission;
  return {
    kind: 'web',
    permission: async () => asPermission(),
    request: async () => {
      await Notification.requestPermission();
      return asPermission();
    },
    replace: async (reminders) => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      for (const reminder of reminders) {
        const delay = Date.parse(reminder.at) - Date.now();
        timers.set(
          reminder.id,
          setTimeout(() => {
            timers.delete(reminder.id);
            if (Notification.permission !== 'granted') return;
            const shown = new Notification(reminder.title, {
              body: reminder.body,
              tag: String(reminder.id),
            });
            shown.onclick = () => {
              window.focus();
              for (const handler of handlers) handler(reminder.bakeId);
            };
          }, delay),
        );
      }
    },
    onOpen: (handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
};

const noNotifier: Notifier = {
  kind: 'none',
  permission: async () => 'denied',
  request: async () => 'denied',
  replace: async () => undefined,
  onOpen: () => () => undefined,
};

export const createNotifier = (channelName: string): Notifier =>
  Capacitor.isNativePlatform()
    ? nativeNotifier(channelName)
    : typeof Notification === 'function'
      ? webNotifier()
      : noNotifier;

/** Sent after every bake command, so reminders follow the plan. */
export const BAKES_CHANGED = 'flourprint:bakes-changed';
