import React from 'react';
import * as Notifications from 'expo-notifications';
import { useNotificationsStore, type PortfolioEvent, type NotificationPreferences } from '@/lib/notifications-store';

const MAX_SCHEDULED = 48;
const WINDOW_DAYS = 90;
const LEDGER_DATA_FLAG = 'ledger_local_notification';

function isPermissionGranted(permissions: Notifications.NotificationPermissionsStatus): boolean {
  // Expo returns `granted` on iOS/Android, plus `status`.
  // We treat provisional on iOS as granted if `granted` is true.
  return Boolean((permissions as any)?.granted) || permissions.status === 'granted';
}

function nineAM(date: Date): Date {
  const d = new Date(date);
  d.setHours(9, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function withinWindow(trigger: Date, now: Date): boolean {
  const latest = addDays(now, WINDOW_DAYS);
  return trigger.getTime() >= now.getTime() && trigger.getTime() <= latest.getTime();
}

function shouldNotifyForEvent(event: PortfolioEvent, prefs: NotificationPreferences): boolean {
  if (!prefs.enabled) return false;
  if (event.isRead) return false;

  switch (event.type) {
    case 'maturity':
      return prefs.maturityAlerts;
    case 'dividend':
      return prefs.dividendAlerts;
    case 'price_alert':
      return prefs.priceAlerts;
    case 'contribution_reminder':
      return prefs.contributionReminders;
    case 'rebalance':
      return true;
    default:
      return true;
  }
}

type ScheduledItem = {
  trigger: Date;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

function buildScheduledItems(event: PortfolioEvent, prefs: NotificationPreferences, now: Date): ScheduledItem[] {
  const baseDate = new Date(event.date);
  if (Number.isNaN(baseDate.getTime())) return [];

  const items: ScheduledItem[] = [];

  // Maturity: schedule a heads-up X days before, plus a day-of reminder.
  if (event.type === 'maturity') {
    const daysBefore = Math.max(0, Math.floor(prefs.maturityDaysBefore ?? 0));
    const maturityDay = nineAM(baseDate);

    if (daysBefore > 0) {
      const headsUp = nineAM(addDays(maturityDay, -daysBefore));
      if (withinWindow(headsUp, now)) {
        items.push({
          trigger: headsUp,
          title: 'Maturity coming up',
          body: event.title,
          data: { [LEDGER_DATA_FLAG]: true, eventId: event.id, kind: 'maturity_heads_up' },
        });
      }
    }

    if (withinWindow(maturityDay, now)) {
      items.push({
        trigger: maturityDay,
        title: 'Maturity today',
        body: event.title,
        data: { [LEDGER_DATA_FLAG]: true, eventId: event.id, kind: 'maturity_day_of' },
      });
    }

    return items;
  }

  // Default: schedule at 9am of the event date.
  const trigger = nineAM(baseDate);

  // If already past due but still relevant (unread), schedule a near-immediate reminder.
  const effectiveTrigger =
    trigger.getTime() < now.getTime() ? new Date(now.getTime() + 30 * 1000) : trigger;

  if (!withinWindow(effectiveTrigger, now)) return [];

  items.push({
    trigger: effectiveTrigger,
    title: event.title,
    body: event.description,
    data: { [LEDGER_DATA_FLAG]: true, eventId: event.id, kind: 'event' },
  });

  return items;
}

async function cancelLedgerScheduledNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter(
    (req) => Boolean((req.content?.data as any)?.[LEDGER_DATA_FLAG]) === true
  );
  await Promise.all(
    ours.map((req) => Notifications.cancelScheduledNotificationAsync(req.identifier))
  );
}

export function useScheduleLocalNotifications(): void {
  const prefs = useNotificationsStore((s) => s.preferences);
  const events = useNotificationsStore((s) => s.events);
  const signatureRef = React.useRef<string>('');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const now = new Date();
    const relevant = events
      .filter((e) => shouldNotifyForEvent(e, prefs))
      .map((e) => ({ id: e.id, type: e.type, date: e.date, isRead: e.isRead }));

    const signature = JSON.stringify({
      enabled: prefs.enabled,
      maturityAlerts: prefs.maturityAlerts,
      maturityDaysBefore: prefs.maturityDaysBefore,
      priceAlerts: prefs.priceAlerts,
      dividendAlerts: prefs.dividendAlerts,
      contributionReminders: prefs.contributionReminders,
      relevant,
    });

    if (signatureRef.current === signature) return;
    signatureRef.current = signature;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const permissions = await Notifications.getPermissionsAsync();
          const granted = isPermissionGranted(permissions);

          // Always clean up old ledger schedules when preferences are disabled or permission is missing.
          if (!prefs.enabled || !granted) {
            await cancelLedgerScheduledNotifications();
            return;
          }

          const items: ScheduledItem[] = [];
          for (const event of events) {
            if (!shouldNotifyForEvent(event, prefs)) continue;
            items.push(...buildScheduledItems(event, prefs, now));
          }

          items.sort((a, b) => a.trigger.getTime() - b.trigger.getTime());
          const limited = items.slice(0, MAX_SCHEDULED);

          await cancelLedgerScheduledNotifications();

          await Promise.all(
            limited.map((item) =>
              Notifications.scheduleNotificationAsync({
                content: {
                  title: item.title,
                  body: item.body,
                  sound: false,
                  data: {
                    ...item.data,
                    // Used by the response handler to route inside the app.
                    pathname: '/events',
                    params: { returnTo: '/' },
                  },
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: item.trigger,
                },
              })
            )
          );
        } catch (error) {
          console.log('[Notifications] Failed to schedule local notifications:', error);
        }
      })();
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [events, prefs]);
}
