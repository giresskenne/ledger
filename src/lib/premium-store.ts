import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Premium feature limits
export const FREE_TIER_LIMITS = {
  maxAssets: 10,
  hasAnalysis: false,
  hasRoomTracker: false,
  hasPriceAlerts: false,
  hasExportData: false,
  hasMultipleCurrencies: false,
} as const;

export const PREMIUM_TIER_LIMITS = {
  maxAssets: Infinity,
  hasAnalysis: true,
  hasRoomTracker: true,
  hasPriceAlerts: true,
  hasExportData: true,
  hasMultipleCurrencies: true,
} as const;

export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'trial'
  | 'grace_period';

export type SubscriptionPlan = 'monthly' | 'yearly';

// Debug mode - only affects UI, never the actual subscription state
export type DebugForceMode = 'none' | 'free' | 'premium';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
  willRenew: boolean;
  productId: string | null;
  // New fields from RevenueCat
  entitlementId: string | null;
  periodType: 'normal' | 'intro' | 'trial' | null;
  isActive: boolean; // Direct from RevenueCat - current entitlement status
}

interface PremiumState {
  // Subscription state (source of truth from RevenueCat)
  subscription: SubscriptionInfo;
  isLoading: boolean;
  lastChecked: string | null;
  lastSyncError: string | null;

  // Debug mode - ONLY for development testing, gated by __DEV__
  debugForceMode: DebugForceMode;

  // Actions
  setSubscription: (info: Partial<SubscriptionInfo>) => void;
  setLoading: (loading: boolean) => void;
  resetSubscription: () => void;
  setDebugForceMode: (mode: DebugForceMode) => void;
  setSyncError: (error: string | null) => void;

  // Sync from RevenueCat customer info
  syncFromCustomerInfo: (customerInfo: {
    entitlements: {
      active: Record<string, {
        isActive: boolean;
        willRenew: boolean;
        periodType: string;
        latestPurchaseDate: string;
        expirationDate: string | null;
        productIdentifier: string;
        identifier: string;
      }>;
    };
  }) => void;

  // Computed helpers - these respect debug mode in dev
  isPremium: () => boolean;
  isActuallyPremium: () => boolean; // Ignores debug mode - use for RevenueCat checks
  isTrialing: () => boolean;
  canAccessFeature: (feature: keyof typeof PREMIUM_TIER_LIMITS) => boolean;
  getAssetLimit: () => number;
  getDaysUntilExpiry: () => number | null;
  getEntitlementStatus: () => {
    isEntitledNow: boolean;
    willRenew: boolean;
    expiresAt: string | null;
    periodType: string | null;
    source: 'revenuecat' | 'cache' | 'debug_override';
  };
}

const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
  status: 'none',
  plan: null,
  expiresAt: null,
  trialEndsAt: null,
  willRenew: false,
  productId: null,
  entitlementId: null,
  periodType: null,
  isActive: false,
};

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set, get) => ({
      subscription: DEFAULT_SUBSCRIPTION,
      isLoading: false,
      lastChecked: null,
      lastSyncError: null,
      debugForceMode: 'none',

      setSubscription: (info) => {
        set((state) => ({
          subscription: { ...state.subscription, ...info },
          lastChecked: new Date().toISOString(),
        }));
      },

      setLoading: (loading) => set({ isLoading: loading }),

      resetSubscription: () => {
        set({
          subscription: DEFAULT_SUBSCRIPTION,
          lastChecked: new Date().toISOString(),
        });
      },

      setDebugForceMode: (mode) => {
        // Only allow setting debug mode in development
        if (__DEV__) {
          console.log('[Premium Debug] Setting debug force mode:', mode);
          set({ debugForceMode: mode });
        } else {
          console.warn('[Premium] Debug mode is only available in development');
        }
      },

      setSyncError: (error) => set({ lastSyncError: error }),

      // Sync subscription state from RevenueCat customer info
      syncFromCustomerInfo: (customerInfo) => {
        const premiumEntitlement = customerInfo.entitlements.active?.['premium'];

        if (premiumEntitlement && premiumEntitlement.isActive) {
          // User has active premium entitlement
          const periodType = premiumEntitlement.periodType as 'normal' | 'intro' | 'trial';
          const status: SubscriptionStatus =
            periodType === 'trial' ? 'trial' :
            !premiumEntitlement.willRenew ? 'cancelled' : 'active';

          // Determine plan from product identifier
          const productId = premiumEntitlement.productIdentifier;
          const plan: SubscriptionPlan = productId?.includes('annual') || productId?.includes('yearly')
            ? 'yearly' : 'monthly';

          set({
            subscription: {
              status,
              plan,
              expiresAt: premiumEntitlement.expirationDate,
              trialEndsAt: periodType === 'trial' ? premiumEntitlement.expirationDate : null,
              willRenew: premiumEntitlement.willRenew,
              productId,
              entitlementId: premiumEntitlement.identifier,
              periodType,
              isActive: true,
            },
            lastChecked: new Date().toISOString(),
            lastSyncError: null,
          });

          console.log('[Premium] Synced from RevenueCat:', {
            status,
            plan,
            willRenew: premiumEntitlement.willRenew,
            expiresAt: premiumEntitlement.expirationDate,
          });
        } else {
          // No active premium entitlement
          // Check if we previously had a subscription (to mark as expired)
          const currentState = get();
          const wasActive = currentState.subscription.isActive;

          set({
            subscription: {
              ...DEFAULT_SUBSCRIPTION,
              status: wasActive ? 'expired' : 'none',
            },
            lastChecked: new Date().toISOString(),
            lastSyncError: null,
          });

          console.log('[Premium] No active entitlement, status:', wasActive ? 'expired' : 'none');
        }
      },

      // Check if premium - respects debug mode in development
      isPremium: () => {
        const state = get();

        // In development, check debug override first
        if (__DEV__ && state.debugForceMode !== 'none') {
          console.log('[Premium Debug] Using debug force mode:', state.debugForceMode);
          return state.debugForceMode === 'premium';
        }

        // Normal check - user is entitled if status is active, trial, or grace_period
        const { subscription } = state;
        return (
          subscription.isActive ||
          subscription.status === 'active' ||
          subscription.status === 'trial' ||
          subscription.status === 'grace_period'
        );
      },

      // Check actual premium status ignoring debug mode
      // Use this when checking against RevenueCat (e.g., "already subscribed" screen)
      isActuallyPremium: () => {
        const { subscription } = get();
        return (
          subscription.isActive ||
          subscription.status === 'active' ||
          subscription.status === 'trial' ||
          subscription.status === 'grace_period'
        );
      },

      isTrialing: () => {
        const { subscription } = get();
        return subscription.status === 'trial' || subscription.periodType === 'trial';
      },

      canAccessFeature: (feature) => {
        const isPremium = get().isPremium();
        if (isPremium) {
          return PREMIUM_TIER_LIMITS[feature] as boolean;
        }
        return FREE_TIER_LIMITS[feature] as boolean;
      },

      getAssetLimit: () => {
        const isPremium = get().isPremium();
        return isPremium ? PREMIUM_TIER_LIMITS.maxAssets : FREE_TIER_LIMITS.maxAssets;
      },

      getDaysUntilExpiry: () => {
        const { subscription } = get();
        if (!subscription.expiresAt) return null;

        const expiryDate = new Date(subscription.expiresAt);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 0 ? diffDays : 0;
      },

      // Unified entitlement status getter
      getEntitlementStatus: () => {
        const state = get();

        // In dev with debug mode, indicate override
        if (__DEV__ && state.debugForceMode !== 'none') {
          return {
            isEntitledNow: state.debugForceMode === 'premium',
            willRenew: state.debugForceMode === 'premium',
            expiresAt: null,
            periodType: null,
            source: 'debug_override' as const,
          };
        }

        const { subscription } = state;
        return {
          isEntitledNow: subscription.isActive ||
            subscription.status === 'active' ||
            subscription.status === 'trial' ||
            subscription.status === 'grace_period',
          willRenew: subscription.willRenew,
          expiresAt: subscription.expiresAt,
          periodType: subscription.periodType,
          source: subscription.entitlementId ? 'revenuecat' as const : 'cache' as const,
        };
      },
    }),
    {
      name: 'ledger-premium',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        subscription: state.subscription,
        lastChecked: state.lastChecked,
        // Note: debugForceMode is NOT persisted - it resets on app restart
      }),
    }
  )
);

// Hook for unified entitlement checks - use this across the app
export function useEntitlementStatus() {
  const isPremium = usePremiumStore((s) => s.isPremium);
  const isActuallyPremium = usePremiumStore((s) => s.isActuallyPremium);
  const subscription = usePremiumStore((s) => s.subscription);
  const debugForceMode = usePremiumStore((s) => s.debugForceMode);
  const getEntitlementStatus = usePremiumStore((s) => s.getEntitlementStatus);

  return {
    // UI gating - respects debug mode
    isPremium: isPremium(),
    // Actual status - ignores debug mode, for RevenueCat interactions
    isActuallyPremium: isActuallyPremium(),
    // Full status details
    ...getEntitlementStatus(),
    // Additional info
    subscription,
    isDebugOverride: __DEV__ && debugForceMode !== 'none',
    debugMode: __DEV__ ? debugForceMode : 'none',
  };
}

// Helper to sync legacy isPremium in portfolio store
// This ensures backward compatibility while transitioning
export function syncLegacyStore(
  legacySetPremium: (isPremium: boolean) => void,
  skipDebugOverride = false
) {
  const state = usePremiumStore.getState();

  // Respect debug mode unless explicitly skipped
  if (__DEV__ && !skipDebugOverride && state.debugForceMode !== 'none') {
    legacySetPremium(state.debugForceMode === 'premium');
    return;
  }

  // Set based on actual entitlement
  const isEntitled = state.isActuallyPremium();
  legacySetPremium(isEntitled);
}
