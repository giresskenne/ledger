import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Currency, JurisdictionCode, PayFrequency, RegisteredAccountType } from './types';

// All supported countries with their currencies
export const COUNTRY_DATA: Record<string, { name: string; currency: Currency; flag: string }> = {
  US: { name: 'United States', currency: 'USD', flag: '🇺🇸' },
  CA: { name: 'Canada', currency: 'USD', flag: '🇨🇦' }, // Using USD as CAD not in Currency type
  UK: { name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  DE: { name: 'Germany', currency: 'EUR', flag: '🇩🇪' },
  FR: { name: 'France', currency: 'EUR', flag: '🇫🇷' },
  AU: { name: 'Australia', currency: 'USD', flag: '🇦🇺' }, // Using USD as AUD not in Currency type
  JP: { name: 'Japan', currency: 'JPY', flag: '🇯🇵' },
  BR: { name: 'Brazil', currency: 'BRL', flag: '🇧🇷' },
  CH: { name: 'Switzerland', currency: 'CHF', flag: '🇨🇭' },
  OTHER: { name: 'Other', currency: 'USD', flag: '🌍' },
};

// Countries that support registered accounts
export const REGISTERED_ACCOUNT_COUNTRIES: JurisdictionCode[] = ['CA', 'US', 'UK'];

// Tracking intent options
export type TrackingIntent =
  | 'stocks'
  | 'crypto'
  | 'real_estate'
  | 'private_investments'
  | 'cash_savings'
  | 'registered_accounts';

export const TRACKING_INTENT_OPTIONS: { id: TrackingIntent; label: string; icon: string; description: string; requiresEligibility?: boolean }[] = [
  { id: 'stocks', label: 'Stocks & ETFs', icon: 'TrendingUp', description: 'Individual stocks, ETFs, mutual funds' },
  { id: 'crypto', label: 'Cryptocurrency', icon: 'Coins', description: 'Bitcoin, Ethereum, and more' },
  { id: 'real_estate', label: 'Real Estate', icon: 'Home', description: 'Properties & REITs' },
  { id: 'private_investments', label: 'Private Investments', icon: 'Briefcase', description: 'Private equity, startups' },
  { id: 'cash_savings', label: 'Cash & Savings', icon: 'Wallet', description: 'Bank accounts, CDs, bonds' },
  { id: 'registered_accounts', label: 'Registered Accounts', icon: 'Shield', description: 'Tax-advantaged accounts', requiresEligibility: true },
];

// Onboarding steps enum for clarity
export type OnboardingStep =
  | 'cinematic'
  | 'country'
  | 'tracking_intent'
  | 'first_asset'
  | 'registered_accounts'
  | 'pay_frequency'
  | 'notifications'
  | 'room_reveal'
  | 'dashboard_reveal'
  | 'premium_nudge';

export interface OnboardingState {
  // Completion status
  hasCompletedOnboarding: boolean;
  currentStep: OnboardingStep;

  // User selections
  selectedCountry: string | null;
  selectedCurrency: Currency;
  currencyOverridden: boolean;
  trackingIntents: TrackingIntent[];

  // Registered accounts (only for eligible countries)
  registeredAccountsEnabled: boolean;
  selectedRegisteredAccounts: RegisteredAccountType[];
  payFrequency: PayFrequency;

  // First asset added
  hasAddedFirstAsset: boolean;
  firstAssetId: string | null;

  // Notifications consent
  notificationsConsented: boolean;
  enabledNotificationTypes: {
    contributionReminders: boolean;
    maturityAlerts: boolean;
    investmentReminders: boolean;
  };

  // Actions
  setCurrentStep: (step: OnboardingStep) => void;
  setCountry: (country: string) => void;
  setCurrency: (currency: Currency, overridden?: boolean) => void;
  setTrackingIntents: (intents: TrackingIntent[]) => void;
  toggleTrackingIntent: (intent: TrackingIntent) => void;
  setSelectedRegisteredAccounts: (accounts: RegisteredAccountType[]) => void;
  toggleRegisteredAccount: (account: RegisteredAccountType) => void;
  setPayFrequency: (frequency: PayFrequency) => void;
  markFirstAssetAdded: (assetId?: string) => void;
  setNotificationsConsent: (consented: boolean) => void;
  setEnabledNotificationTypes: (types: Partial<OnboardingState['enabledNotificationTypes']>) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;

  // Computed
  isRegisteredAccountsEligible: () => boolean;
  shouldShowRegisteredAccountsModule: () => boolean;
  getCountryName: () => string;
  getCountryFlag: () => string;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      currentStep: 'cinematic',
      selectedCountry: null,
      selectedCurrency: 'USD',
      currencyOverridden: false,
      trackingIntents: [],
      registeredAccountsEnabled: false,
      selectedRegisteredAccounts: [],
      payFrequency: 'monthly',
      hasAddedFirstAsset: false,
      firstAssetId: null,
      notificationsConsented: false,
      enabledNotificationTypes: {
        contributionReminders: true,
        maturityAlerts: true,
        investmentReminders: true,
      },

      setCurrentStep: (step) => set({ currentStep: step }),

      setCountry: (country) => {
        const countryData = COUNTRY_DATA[country];
        const isEligible = REGISTERED_ACCOUNT_COUNTRIES.includes(country as JurisdictionCode);

        set({
          selectedCountry: country,
          selectedCurrency: countryData?.currency || 'USD',
          currencyOverridden: false,
          registeredAccountsEnabled: isEligible,
          // Clear registered accounts if not eligible
          selectedRegisteredAccounts: isEligible ? get().selectedRegisteredAccounts : [],
          // Remove registered_accounts from tracking intents if not eligible
          trackingIntents: isEligible
            ? get().trackingIntents
            : get().trackingIntents.filter(i => i !== 'registered_accounts'),
        });
      },

      setCurrency: (currency, overridden = true) => set({
        selectedCurrency: currency,
        currencyOverridden: overridden,
      }),

      setTrackingIntents: (intents) => set({ trackingIntents: intents }),

      toggleTrackingIntent: (intent) => {
        const current = get().trackingIntents;
        const isEligible = get().registeredAccountsEnabled;

        // Don't allow toggling registered_accounts if not eligible
        if (intent === 'registered_accounts' && !isEligible) return;

        if (current.includes(intent)) {
          set({ trackingIntents: current.filter(i => i !== intent) });
        } else {
          set({ trackingIntents: [...current, intent] });
        }
      },

      setSelectedRegisteredAccounts: (accounts) => set({ selectedRegisteredAccounts: accounts }),

      toggleRegisteredAccount: (account) => {
        const current = get().selectedRegisteredAccounts;
        if (current.includes(account)) {
          set({ selectedRegisteredAccounts: current.filter(a => a !== account) });
        } else {
          set({ selectedRegisteredAccounts: [...current, account] });
        }
      },

      setPayFrequency: (frequency) => set({ payFrequency: frequency }),

      markFirstAssetAdded: (assetId) => set({
        hasAddedFirstAsset: true,
        firstAssetId: assetId || null,
      }),

      setNotificationsConsent: (consented) => set({ notificationsConsented: consented }),

      setEnabledNotificationTypes: (types) => set((state) => ({
        enabledNotificationTypes: { ...state.enabledNotificationTypes, ...types },
      })),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      resetOnboarding: () => set({
        hasCompletedOnboarding: false,
        currentStep: 'cinematic',
        selectedCountry: null,
        selectedCurrency: 'USD',
        currencyOverridden: false,
        trackingIntents: [],
        registeredAccountsEnabled: false,
        selectedRegisteredAccounts: [],
        payFrequency: 'monthly',
        hasAddedFirstAsset: false,
        firstAssetId: null,
        notificationsConsented: false,
        enabledNotificationTypes: {
          contributionReminders: true,
          maturityAlerts: true,
          investmentReminders: true,
        },
      }),

      isRegisteredAccountsEligible: () => {
        const country = get().selectedCountry;
        return country !== null && REGISTERED_ACCOUNT_COUNTRIES.includes(country as JurisdictionCode);
      },

      shouldShowRegisteredAccountsModule: () => {
        const state = get();
        return state.registeredAccountsEnabled && state.trackingIntents.includes('registered_accounts');
      },

      getCountryName: () => {
        const country = get().selectedCountry;
        if (!country) return '';
        return COUNTRY_DATA[country]?.name || '';
      },

      getCountryFlag: () => {
        const country = get().selectedCountry;
        if (!country) return '';
        return COUNTRY_DATA[country]?.flag || '';
      },
    }),
    {
      name: 'ledger-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
