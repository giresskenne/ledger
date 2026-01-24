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

  // Actions
  setJurisdictionProfile: (profile: JurisdictionProfile) => void;
  updateJurisdictionProfile: (updates: Partial<JurisdictionProfile>) => void;
  setPayFrequency: (frequency: PayFrequency) => void;

  // Contribution actions
  addContribution: (contribution: Omit<Contribution, 'id'>) => void;
  updateContribution: (id: string, updates: Partial<Contribution>) => void;
  deleteContribution: (id: string) => void;

  // Room override actions
  setRoomOverride: (accountType: RegisteredAccountType, taxYearId: string, value: number | undefined) => void;

  // Computed
  getContributionsForAccount: (accountType: RegisteredAccountType, taxYearId: string) => Contribution[];
  getTotalContributed: (accountType: RegisteredAccountType, taxYearId: string) => number;
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

      setJurisdictionProfile: (profile) => set({ jurisdictionProfile: profile }),

      updateJurisdictionProfile: (updates) =>
        set((state) => ({
          jurisdictionProfile: state.jurisdictionProfile
            ? { ...state.jurisdictionProfile, ...updates }
            : null,
        })),

      setPayFrequency: (frequency) => set({ payFrequency: frequency }),

      addContribution: (contributionData) => {
        const newContribution: Contribution = {
          ...contributionData,
          id: Date.now().toString(),
        };
        set((state) => ({
          contributions: [...state.contributions, newContribution],
        }));
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

      getRemainingRoom: (accountType) => {
        const { jurisdictionProfile, roomOverrides } = get();
        if (!jurisdictionProfile) return 0;

        const config = ACCOUNT_CONFIGS.find((c) => c.type === accountType);
        if (!config) return 0;

        const taxYearId = getCurrentTaxYearId(jurisdictionProfile.countryCode);
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

        return Math.max(0, effectiveLimit - totalContributed);
      },

      getSavingsTarget: (accountType) => {
        const { jurisdictionProfile, payFrequency } = get();
        if (!jurisdictionProfile) return null;

        const config = ACCOUNT_CONFIGS.find((c) => c.type === accountType);
        if (!config) return null;

        const remainingRoom = get().getRemainingRoom(accountType);
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
      }),
    }
  )
);
