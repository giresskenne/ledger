/**
 * Local notifications/event timeline store (preferences + generated events).
 * Generated events are periodically re-synced from app state (assets, room targets, autopilot).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Event types for the timeline
export type EventType =
  | 'maturity'           // Bond/fixed income maturity
  | 'amortization_milestone' // Fixed income amortization milestone
  | 'dividend'           // Expected dividend
  | 'price_alert'        // Price target reached
  | 'contribution_reminder' // Room contribution reminder
  | 'stale_valuation'    // Manual asset valuation is stale
  | 'rebalance'          // Portfolio rebalance suggestion
  | 'rate_us';           // Rate the app reminder

export interface PortfolioEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  date: string; // ISO date string
  assetId?: string;
  assetName?: string;
  amount?: number;
  currency?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  maturityAlerts: boolean;
  // Legacy single-value preference (kept for backward compatibility)
  maturityDaysBefore: number; // Days before maturity to notify
  // Cadence-based reminders (e.g. 90/30/7)
  maturityDaysBeforeList: number[];
  amortizationAlerts: boolean;
  priceAlerts: boolean;
  dividendAlerts: boolean;
  contributionReminders: boolean;
  staleValuationReminders: boolean;
  staleValuationDays: number;
  weeklyDigest: boolean;
}

interface NotificationsState {
  // Preferences
  preferences: NotificationPreferences;

  // Push notification token
  expoPushToken: string | null;

  // Events for timeline
  events: PortfolioEvent[];

  // Actions
  setPreferences: (prefs: Partial<NotificationPreferences>) => void;
  setExpoPushToken: (token: string | null) => void;

  // Event management
  addEvent: (event: Omit<PortfolioEvent, 'isRead' | 'createdAt'> & { id?: string }) => void;
  syncGeneratedEvents: (
    generated: Array<Omit<PortfolioEvent, 'isRead' | 'createdAt'>>
  ) => void;
  markEventAsRead: (eventId: string) => void;
  markAllAsRead: () => void;
  removeEvent: (eventId: string) => void;
  clearOldEvents: (daysOld: number) => void;

  // Computed
  getUnreadCount: () => number;
  getUpcomingEvents: (days: number) => PortfolioEvent[];
  getEventsByType: (type: EventType) => PortfolioEvent[];
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  maturityAlerts: true,
  maturityDaysBefore: 30,
  maturityDaysBeforeList: [90, 30, 7],
  amortizationAlerts: true,
  priceAlerts: true,
  dividendAlerts: true,
  contributionReminders: true,
  staleValuationReminders: false,
  staleValuationDays: 30,
  weeklyDigest: false,
};

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFERENCES,
      expoPushToken: null,
      events: [],

      setPreferences: (prefs) => {
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        }));
      },

      setExpoPushToken: (token) => {
        set({ expoPushToken: token });
      },

      addEvent: (eventData) => {
        const { id: providedId, ...rest } = eventData;
        const newEvent: PortfolioEvent = {
          ...rest,
          id: providedId ?? `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          events: [newEvent, ...state.events],
        }));
      },

      syncGeneratedEvents: (generated) => {
        // IDs with these prefixes are regenerated from app state and should be replaced on each sync.
        const generatedPrefixes = [
          'maturity_',
          'contrib_',
          'assetcontrib_',
          'autopilot_',
          'rebalance_',
          'stalevaluation_',
          'amortization_',
        ];
        const isGenerated = (id: string) => generatedPrefixes.some((p) => id.startsWith(p));

        const now = Date.now();

        set((state) => {
          const existingById = new Map(state.events.map((e) => [e.id, e]));

          // Keep non-generated events, and keep generated events only if they're still present in the new snapshot.
          const preservedNonGenerated = state.events.filter((e) => !isGenerated(e.id));

          const mergedGenerated: PortfolioEvent[] = generated.map((event) => {
            const prev = existingById.get(event.id);
            const createdAt = prev?.createdAt ?? new Date().toISOString();
            const defaultRead =
              new Date(event.date).getTime() - now > 1000 * 60 * 60 * 24 * 30;

            return {
              ...event,
              createdAt,
              isRead: prev?.isRead ?? defaultRead,
            };
          });

          return {
            events: [...mergedGenerated, ...preservedNonGenerated],
          };
        });
      },

      markEventAsRead: (eventId) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === eventId ? { ...event, isRead: true } : event
          ),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          events: state.events.map((event) => ({ ...event, isRead: true })),
        }));
      },

      removeEvent: (eventId) => {
        set((state) => ({
          events: state.events.filter((event) => event.id !== eventId),
        }));
      },

      clearOldEvents: (daysOld) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        set((state) => ({
          events: state.events.filter(
            (event) => new Date(event.date) > cutoffDate
          ),
        }));
      },

      getUnreadCount: () => {
        return get().events.filter((event) => !event.isRead).length;
      },

      getUpcomingEvents: (days) => {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return get()
          .events.filter((event) => {
            const eventDate = new Date(event.date);
            return eventDate >= now && eventDate <= futureDate;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      },

      getEventsByType: (type) => {
        return get()
          .events.filter((event) => event.type === type)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      },
    }),
    {
      name: 'ledger-notifications',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        expoPushToken: state.expoPushToken,
        events: state.events,
      }),
    }
  )
);

// Helper to get event type display info
export const EVENT_TYPE_INFO: Record<EventType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  maturity: {
    label: 'Maturity',
    icon: 'Calendar',
    color: '#F59E0B',
    bgColor: '#F59E0B20',
  },
  amortization_milestone: {
    label: 'Amortization',
    icon: 'RefreshCw',
    color: '#A855F7',
    bgColor: '#A855F720',
  },
  dividend: {
    label: 'Dividend',
    icon: 'DollarSign',
    color: '#10B981',
    bgColor: '#10B98120',
  },
  price_alert: {
    label: 'Price Alert',
    icon: 'TrendingUp',
    color: '#6366F1',
    bgColor: '#6366F120',
  },
  contribution_reminder: {
    label: 'Contribution',
    icon: 'PiggyBank',
    color: '#EC4899',
    bgColor: '#EC489920',
  },
  stale_valuation: {
    label: 'Update Value',
    icon: 'RefreshCw',
    color: '#F97316',
    bgColor: '#F9731620',
  },
  rebalance: {
    label: 'Rebalance',
    icon: 'RefreshCw',
    color: '#8B5CF6',
    bgColor: '#8B5CF620',
  },
};
