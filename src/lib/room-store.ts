/**
 * Local store for registered-account room tracking (limits, contributions, overrides).
 * Also holds "Contribution Autopilot" settings used to generate reminders and confirm logging.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  JurisdictionCode,
  JurisdictionProfile,
  Contribution,
  RegisteredAccountType,
  PayFrequency,
  SavingsTarget,
  ACCOUNT_CONFIGS,
  JURISDICTION_INFO,
  Currency,
} from './types';

export type ContributionAutopilotSchedule = {
  enabled: boolean;
  // Contribution amount to log when the user confirms the reminder.
  amount: number;
  // The cadence the user wants to follow (separate from their savings frequency display).
  frequency: PayFrequency;
  // For monthly: day of month (1–28) to avoid month-length edge cases.
  dayOfMonth?: number;
  // For weekly/biweekly: weekday (0=Sun..6=Sat).
  weekday?: number;
  // Last confirmed occurrence id (monthly: YYYY-MM, otherwise YYYY-MM-DD).
  lastConfirmedId?: string;
};

export type ContributionReminderLog = Partial<Record<RegisteredAccountType, string>>;

// Helper to get current tax year ID based on jurisdiction
export function getCurrentTaxYearId(jurisdiction: JurisdictionCode): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();

  if (jurisdiction === 'UK') {
    // UK tax year runs Apr 6 to Apr 5
    // If before Apr 6, we're in the previous tax year
    if (month < 3 || (month === 3 && day < 6)) {
      return `UK_${year - 1}_${year}`;
    }
    return `UK_${year}_${year + 1}`;
  }

  // Calendar year for CA and US
  return `${jurisdiction}_${year}`;
}

// Helper to get tax year end date
export function getTaxYearEndDate(jurisdiction: JurisdictionCode): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  if (jurisdiction === 'UK') {
    // UK tax year ends Apr 5
    if (month < 3 || (month === 3 && day < 6)) {
      return new Date(year, 3, 5); // Apr 5 of current year
    }
    return new Date(year + 1, 3, 5); // Apr 5 of next year
  }

  // Calendar year ends Dec 31
  return new Date(year, 11, 31);
}

// Helper to format tax year for display
export function formatTaxYear(taxYearId: string): string {
  if (taxYearId.startsWith('UK_')) {
    const parts = taxYearId.split('_');
    return `${parts[1]}/${parts[2].slice(-2)}`;
  }
  const parts = taxYearId.split('_');
  return parts[1];
}

// Helper to count periods until tax year end
export function countPeriodsUntilEnd(
  jurisdiction: JurisdictionCode,
  frequency: PayFrequency
): number {
  const now = new Date();
  const endDate = getTaxYearEndDate(jurisdiction);
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  switch (frequency) {
    case 'weekly':
      return Math.ceil(daysLeft / 7);
    case 'biweekly':
      return Math.ceil(daysLeft / 14);
    case 'monthly':
      return Math.ceil(daysLeft / 30);
  }
}

// Helper to calculate age from birthdate
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Helper to get effective annual limit with catch-up
export function getEffectiveAnnualLimit(
  accountType: RegisteredAccountType,
  birthDate?: string
): number {
  const config = ACCOUNT_CONFIGS.find((c) => c.type === accountType);
  if (!config) return 0;

  let limit = config.annualLimit2026;

  if (birthDate && config.catchUpAge) {
    const age = calculateAge(birthDate);

    // Check for special catch-up (60-63 for 401k)
    if (
      config.specialCatchUpAge &&
      config.specialCatchUpAmount &&
      age >= config.specialCatchUpAge.min &&
      age <= config.specialCatchUpAge.max
    ) {
      limit += config.specialCatchUpAmount;
    } else if (age >= config.catchUpAge && config.catchUpAmount) {
      limit += config.catchUpAmount;
    }
  }

  return limit;
}

// Get currency symbol for display
export function getCurrencySymbol(jurisdiction: JurisdictionCode): string {
  switch (jurisdiction) {
    case 'CA':
      return 'CAD ';
    case 'US':
      return '$';
    case 'UK':
      return '£';
  }
}

// Format currency value
export function formatRoomCurrency(amount: number, jurisdiction: JurisdictionCode): string {
  // Some account types (e.g., US 529) do not have a single standard cap; we represent those limits as Infinity.
  // Render these as human-friendly text to avoid "Infinity" leaking into the UI.
  if (!Number.isFinite(amount)) return 'No cap';
  const symbol = getCurrencySymbol(jurisdiction);
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface RoomState {
  // Profile
  jurisdictionProfile: JurisdictionProfile | null;
  payFrequency: PayFrequency;

  // Contributions
  contributions: Contribution[];

  // Room overrides (user-entered official values)
  roomOverrides: Record<string, number>; // key: `${accountType}_${taxYearId}`

  // Contribution Autopilot (confirmation-based; does not connect to the bank).
  autopilotSchedules: Partial<Record<RegisteredAccountType, ContributionAutopilotSchedule>>;

  // Track which "save-to-max" reminder occurrence has been logged to avoid duplicate events.
  contributionReminderLog: ContributionReminderLog;

  // Actions
  setJurisdictionProfile: (profile: JurisdictionProfile) => void;
  updateJurisdictionProfile: (updates: Partial<JurisdictionProfile>) => void;
  setPayFrequency: (frequency: PayFrequency) => void;

  // Contribution actions
  addContribution: (contribution: Omit<Contribution, 'id'>) => {
    ok: boolean;
    appliedAmount: number;
    wasCapped: boolean;
    remainingAfter: number;
    reason?: string;
  };
  updateContribution: (id: string, updates: Partial<Contribution>) => void;
  deleteContribution: (id: string) => void;

  // Room override actions
  setRoomOverride: (accountType: RegisteredAccountType, taxYearId: string, value: number | undefined) => void;

  // Autopilot actions
  setAutopilotSchedule: (
    accountType: RegisteredAccountType,
    schedule: Partial<ContributionAutopilotSchedule> | null
  ) => void;
  confirmAutopilotOccurrence: (params: {
    accountType: RegisteredAccountType;
    occurrenceId: string;
    amount: number;
    date: string;
  }) => {
    ok: boolean;
    appliedAmount: number;
    wasCapped: boolean;
    remainingAfter: number;
    reason?: string;
  };

  confirmContributionReminderOccurrence: (params: {
    accountType: RegisteredAccountType;
    occurrenceId: string;
    amount: number;
    date: string;
  }) => {
    ok: boolean;
    appliedAmount: number;
    wasCapped: boolean;
    remainingAfter: number;
    reason?: string;
  };

  // Computed
  getContributionsForAccount: (accountType: RegisteredAccountType, taxYearId: string) => Contribution[];
  getTotalContributed: (accountType: RegisteredAccountType, taxYearId: string) => number;
  getLifetimeContributed: (accountType: RegisteredAccountType) => number;
  getRemainingRoomForTaxYear: (accountType: RegisteredAccountType, taxYearId: string) => number;
  getRemainingRoom: (accountType: RegisteredAccountType) => number;
  getSavingsTarget: (accountType: RegisteredAccountType) => SavingsTarget | null;
  getAccountsForJurisdiction: () => typeof ACCOUNT_CONFIGS;

  // Reset
  clearAllData: () => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      jurisdictionProfile: null,
      payFrequency: 'monthly',
      contributions: [],
      roomOverrides: {},
      autopilotSchedules: {},
      contributionReminderLog: {},

      setJurisdictionProfile: (profile) => set({ jurisdictionProfile: profile }),

      updateJurisdictionProfile: (updates) =>
        set((state) => ({
          jurisdictionProfile: state.jurisdictionProfile
            ? { ...state.jurisdictionProfile, ...updates }
            : null,
        })),

      setPayFrequency: (frequency) => set({ payFrequency: frequency }),

      setAutopilotSchedule: (accountType, schedule) =>
        set((state) => {
          const next = { ...state.autopilotSchedules };

          if (!schedule) {
            delete next[accountType];
            return { autopilotSchedules: next };
          }

          const prev = state.autopilotSchedules[accountType];

          // Keep existing lastConfirmedId unless explicitly provided.
          const merged: ContributionAutopilotSchedule = {
            enabled: schedule.enabled ?? prev?.enabled ?? false,
            amount: schedule.amount ?? prev?.amount ?? 0,
            frequency: schedule.frequency ?? prev?.frequency ?? 'monthly',
            dayOfMonth: schedule.dayOfMonth ?? prev?.dayOfMonth,
            weekday: schedule.weekday ?? prev?.weekday,
            lastConfirmedId: schedule.lastConfirmedId ?? prev?.lastConfirmedId,
          };

          next[accountType] = merged;
          return { autopilotSchedules: next };
        }),

      confirmAutopilotOccurrence: ({ accountType, occurrenceId, amount, date }) => {
        const { jurisdictionProfile } = get();
        if (!jurisdictionProfile) {
          return { ok: false, appliedAmount: 0, wasCapped: false, remainingAfter: 0, reason: 'No jurisdiction profile set' };
        }

        // Prevent double-logging the same occurrence.
        const currentSchedule = get().autopilotSchedules[accountType];
        if (currentSchedule?.lastConfirmedId === occurrenceId) {
          return { ok: false, appliedAmount: 0, wasCapped: false, remainingAfter: get().getRemainingRoom(accountType), reason: 'Already confirmed' };
        }

        const taxYearId = getCurrentTaxYearId(jurisdictionProfile.countryCode);
        const currency = JURISDICTION_INFO[jurisdictionProfile.countryCode].currency;

        // Log as a normal contribution (still capped by limits) and attach a small note.
        const result = get().addContribution({
          accountType,
          taxYearId,
          amount,
          currency,
          date,
          source: 'manual',
          notes: 'Autopilot confirmed',
        });

        if (!result.ok) return result;

        // Mark the occurrence as confirmed so future sync removes the reminder.
        get().setAutopilotSchedule(accountType, { lastConfirmedId: occurrenceId });
        return result;
      },

      confirmContributionReminderOccurrence: ({ accountType, occurrenceId, amount, date }) => {
        const { jurisdictionProfile } = get();
        if (!jurisdictionProfile) {
          return { ok: false, appliedAmount: 0, wasCapped: false, remainingAfter: 0, reason: 'No jurisdiction profile set' };
        }

        // Prevent double-logging the same occurrence.
        if (get().contributionReminderLog[accountType] === occurrenceId) {
          return { ok: false, appliedAmount: 0, wasCapped: false, remainingAfter: get().getRemainingRoom(accountType), reason: 'Already logged' };
        }

        const taxYearId = getCurrentTaxYearId(jurisdictionProfile.countryCode);
        const currency = JURISDICTION_INFO[jurisdictionProfile.countryCode].currency;

        const result = get().addContribution({
          accountType,
          taxYearId,
          amount,
          currency,
          date,
          source: 'manual',
          notes: 'Contribution reminder logged',
        });

        if (!result.ok) return result;

        set((state) => ({
          contributionReminderLog: { ...state.contributionReminderLog, [accountType]: occurrenceId },
        }));

        return result;
      },

      addContribution: (contributionData) => {
        const { jurisdictionProfile, roomOverrides } = get();
        if (!jurisdictionProfile) {
          return { ok: false, appliedAmount: 0, wasCapped: false, remainingAfter: 0, reason: 'No jurisdiction profile set' };
        }

        const config = ACCOUNT_CONFIGS.find((c) => c.type === contributionData.accountType);
        if (!config) {
          return { ok: false, appliedAmount: 0, wasCapped: false, remainingAfter: 0, reason: 'Unknown account type' };
        }

        const overrideKey = `${contributionData.accountType}_${contributionData.taxYearId}`;
        const computedLimit = getEffectiveAnnualLimit(contributionData.accountType, jurisdictionProfile.birthDate);
        const effectiveAnnualLimit = roomOverrides[overrideKey] ?? computedLimit;

        const contributedThisYear = get().getTotalContributed(contributionData.accountType, contributionData.taxYearId);
        const annualRemaining = Math.max(0, effectiveAnnualLimit - contributedThisYear);

        const lifetimeLimit = config.lifetimeLimit;
        const lifetimeRemaining = lifetimeLimit !== undefined
          ? Math.max(0, lifetimeLimit - get().getLifetimeContributed(contributionData.accountType))
          : Number.POSITIVE_INFINITY;

        const remaining = Math.max(0, Math.min(annualRemaining, lifetimeRemaining));
        if (remaining <= 0) {
          return {
            ok: false,
            appliedAmount: 0,
            wasCapped: true,
            remainingAfter: 0,
            reason: 'No contribution room remaining',
          };
        }

        const appliedAmount = Math.min(contributionData.amount, remaining);
        const wasCapped = appliedAmount < contributionData.amount;
        const remainingAfter = Math.max(0, remaining - appliedAmount);

        const newContribution: Contribution = {
          ...contributionData,
          amount: appliedAmount,
          id: Date.now().toString(),
        };

        set((state) => ({
          contributions: [...state.contributions, newContribution],
        }));

        return { ok: true, appliedAmount, wasCapped, remainingAfter };
      },

      updateContribution: (id, updates) =>
        set((state) => ({
          contributions: state.contributions.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteContribution: (id) =>
        set((state) => ({
          contributions: state.contributions.filter((c) => c.id !== id),
        })),

      setRoomOverride: (accountType, taxYearId, value) =>
        set((state) => {
          const key = `${accountType}_${taxYearId}`;
          const newOverrides = { ...state.roomOverrides };
          if (value === undefined) {
            delete newOverrides[key];
          } else {
            newOverrides[key] = value;
          }
          return { roomOverrides: newOverrides };
        }),

      getContributionsForAccount: (accountType, taxYearId) => {
        return get().contributions.filter(
          (c) => c.accountType === accountType && c.taxYearId === taxYearId
        );
      },

      getTotalContributed: (accountType, taxYearId) => {
        const contributions = get().getContributionsForAccount(accountType, taxYearId);
        return contributions.reduce((sum, c) => sum + c.amount, 0);
      },

      getLifetimeContributed: (accountType) => {
        return get().contributions
          .filter((c) => c.accountType === accountType)
          .reduce((sum, c) => sum + c.amount, 0);
      },

      getRemainingRoomForTaxYear: (accountType, taxYearId) => {
        const { jurisdictionProfile, roomOverrides } = get();
        if (!jurisdictionProfile) return 0;

        const config = ACCOUNT_CONFIGS.find((c) => c.type === accountType);
        if (!config) return 0;

        const overrideKey = `${accountType}_${taxYearId}`;

        // Get effective limit (with catch-up if applicable)
        const computedLimit = getEffectiveAnnualLimit(
          accountType,
          jurisdictionProfile.birthDate
        );

        // Use override if set, otherwise computed
        const effectiveLimit = roomOverrides[overrideKey] ?? computedLimit;

        // Get contributions
        const totalContributed = get().getTotalContributed(accountType, taxYearId);

        const annualRemaining = Math.max(0, effectiveLimit - totalContributed);

        // FHSA also has a lifetime cap; apply if present in config.
        const lifetimeLimit = config.lifetimeLimit;
        if (lifetimeLimit !== undefined) {
          const lifetimeContributed = get().getLifetimeContributed(accountType);
          const lifetimeRemaining = Math.max(0, lifetimeLimit - lifetimeContributed);
          return Math.max(0, Math.min(annualRemaining, lifetimeRemaining));
        }

        return annualRemaining;
      },

      getRemainingRoom: (accountType) => {
        const { jurisdictionProfile } = get();
        if (!jurisdictionProfile) return 0;
        const taxYearId = getCurrentTaxYearId(jurisdictionProfile.countryCode);
        return get().getRemainingRoomForTaxYear(accountType, taxYearId);
      },

      getSavingsTarget: (accountType) => {
        const { jurisdictionProfile, payFrequency } = get();
        if (!jurisdictionProfile) return null;

        const config = ACCOUNT_CONFIGS.find((c) => c.type === accountType);
        if (!config) return null;

        const remainingRoom = get().getRemainingRoom(accountType);
        // Skip save-to-max for accounts without a standard cap (e.g., 529) to avoid Infinity targets.
        if (!Number.isFinite(remainingRoom)) return null;
        if (remainingRoom <= 0) return null;

        const periodsLeft = countPeriodsUntilEnd(
          jurisdictionProfile.countryCode,
          payFrequency
        );

        if (periodsLeft <= 0) return null;

        const perPeriodTarget = remainingRoom / periodsLeft;
        const endDate = getTaxYearEndDate(jurisdictionProfile.countryCode);

        return {
          accountType,
          remainingRoom,
          periodsLeft,
          perPeriodTarget,
          frequency: payFrequency,
          taxYearEndDate: endDate.toISOString(),
        };
      },

      getAccountsForJurisdiction: () => {
        const { jurisdictionProfile } = get();
        if (!jurisdictionProfile) return [];
        return ACCOUNT_CONFIGS.filter(
          (c) => c.jurisdiction === jurisdictionProfile.countryCode
        );
      },

      clearAllData: () =>
        set({
          jurisdictionProfile: null,
          payFrequency: 'monthly',
          contributions: [],
          roomOverrides: {},
          autopilotSchedules: {},
          contributionReminderLog: {},
        }),
    }),
    {
      name: 'ledger-room-tracker',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        jurisdictionProfile: state.jurisdictionProfile,
        payFrequency: state.payFrequency,
        contributions: state.contributions,
        roomOverrides: state.roomOverrides,
        autopilotSchedules: state.autopilotSchedules,
        contributionReminderLog: state.contributionReminderLog,
      }),
    }
  )
);
