/**
 * RevenueCat Client Module
 *
 * This module provides a centralized RevenueCat SDK wrapper that gracefully handles
 * missing configuration. The app will work fine whether or not RevenueCat is configured.
 *
 * Environment Variables:
 * - EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY: Used in development/test builds (both platforms)
 * - EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY: Used in production builds (iOS)
 * - EXPO_PUBLIC_VIBECODE_REVENUECAT_GOOGLE_KEY: Used in production builds (Android)
 * These are automatically injected into the workspace by the hosting service once the user sets up RevenueCat in the Payments tab.
 *
 * Platform Support:
 * - iOS/Android: Fully supported via app stores
 * - Web: Disabled (RevenueCat only supports native app stores)
 *
 * The module automatically selects the correct key based on __DEV__ mode.
 *
 * This module is used to get the current customer info, offerings, and purchase packages.
 * These exported functions are found at the bottom of the file.
 */

import { Platform } from "react-native";
import Purchases, {
  type PurchasesOfferings,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";

// Check if running on web
const isWeb = Platform.OS === "web";

// Check for environment keys
const testKey = process.env.EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY;
const appleKey = process.env.EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY;
const googleKey = process.env.EXPO_PUBLIC_VIBECODE_REVENUECAT_GOOGLE_KEY;

// Use __DEV__ and Platform to determine which key to use
const getApiKey = (): string | undefined => {
  if (isWeb) return undefined;
  if (__DEV__) return testKey;

  // Production: use platform-specific key
  return Platform.OS === "ios" ? appleKey : googleKey;
};

const apiKey = getApiKey();

// Track if RevenueCat is enabled
const isEnabled = !!apiKey && !isWeb;

const LOG_PREFIX = "[RevenueCat]";

export type RevenueCatGuardReason =
  | "web_not_supported"
  | "not_configured"
  | "sdk_error";

export type RevenueCatResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: RevenueCatGuardReason; error?: unknown };

// Internal guard to get consistent success/failure results from RevenueCat.
const guardRevenueCatUsage = async <T>(
  action: string,
  operation: () => Promise<T>,
): Promise<RevenueCatResult<T>> => {
  if (isWeb) {
    console.log(
      `${LOG_PREFIX} ${action} skipped: payments are not supported on web.`,
    );
    return { ok: false, reason: "web_not_supported" };
  }

  if (!isEnabled) {
    console.log(`${LOG_PREFIX} ${action} skipped: RevenueCat not configured`);
    return { ok: false, reason: "not_configured" };
  }

  try {
    const data = await operation();
    return { ok: true, data };
  } catch (error) {
    console.log(`${LOG_PREFIX} ${action} failed:`, error);
    return { ok: false, reason: "sdk_error", error };
  }
};

// Initialize RevenueCat if key exists
if (isEnabled) {
  try {
    // Set up custom log handler to suppress Test Store and expected errors
    // These are non-errors thrown as errors by the SDK, and will be confusing to the user.
    Purchases.setLogHandler((logLevel, message) => {

      // Log ERROR messages normally
      if (logLevel === Purchases.LOG_LEVEL.ERROR) {
        console.log(LOG_PREFIX, message);
      }
    });

    Purchases.configure({ apiKey: apiKey! });
    console.log(`${LOG_PREFIX} SDK initialized successfully`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to initialize:`, error);
  }
}

/**
 * Check if RevenueCat is configured and enabled
 *
 * @returns true if RevenueCat is configured with valid API keys
 *
 * @example
 * if (isRevenueCatEnabled()) {
 *   // Show subscription features
 * } else {
 *   // Hide or disable subscription UI
 * }
 */
export const isRevenueCatEnabled = (): boolean => {
  return isEnabled;
};

/**
 * Get available offerings from RevenueCat
 *
 * @returns RevenueCatResult containing PurchasesOfferings data or a failure reason
 *
 * @example
 * const offeringsResult = await getOfferings();
 * if (offeringsResult.ok && offeringsResult.data.current) {
 *   // Display packages from offeringsResult.data.current.availablePackages
 * }
 */
export const getOfferings = (): Promise<
  RevenueCatResult<PurchasesOfferings>
> => {
  return guardRevenueCatUsage("getOfferings", () => Purchases.getOfferings());
};

/**
 * Purchase a package
 *
 * @param packageToPurchase - The package to purchase
 * @returns RevenueCatResult containing CustomerInfo data or a failure reason
 *
 * @example
 * const purchaseResult = await purchasePackage(selectedPackage);
 * if (purchaseResult.ok) {
 *   // Purchase successful, check entitlements
 * }
 */
export const purchasePackage = (
  packageToPurchase: PurchasesPackage,
): Promise<RevenueCatResult<CustomerInfo>> => {
  return guardRevenueCatUsage("purchasePackage", async () => {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo;
  });
};

/**
 * Get current customer info including active entitlements
 *
 * @returns RevenueCatResult containing CustomerInfo data or a failure reason
 *
 * @example
 * const customerInfoResult = await getCustomerInfo();
 * if (
 *   customerInfoResult.ok &&
 *   customerInfoResult.data.entitlements.active["premium"]
 * ) {
 *   // User has active premium entitlement
 * }
 */
export const getCustomerInfo = (): Promise<RevenueCatResult<CustomerInfo>> => {
  return guardRevenueCatUsage("getCustomerInfo", () =>
    Purchases.getCustomerInfo(),
  );
};

/**
 * Restore previous purchases
 *
 * @returns RevenueCatResult containing CustomerInfo data or a failure reason
 *
 * @example
 * const restoreResult = await restorePurchases();
 * if (restoreResult.ok) {
 *   // Purchases restored successfully
 * }
 */
export const restorePurchases = (): Promise<
  RevenueCatResult<CustomerInfo>
> => {
  return guardRevenueCatUsage("restorePurchases", () =>
    Purchases.restorePurchases(),
  );
};

/**
 * Set user ID for RevenueCat (useful for cross-platform user tracking)
 *
 * @param userId - The user ID to set
 * @returns RevenueCatResult<void> describing success/failure
 *
 * @example
 * const result = await setUserId(user.id);
 * if (!result.ok) {
 *   // Handle failure case
 * }
 */
export const setUserId = (userId: string): Promise<RevenueCatResult<void>> => {
  return guardRevenueCatUsage("setUserId", async () => {
    await Purchases.logIn(userId);
  });
};

/**
 * Log out the current user
 *
 * @returns RevenueCatResult<void> describing success/failure
 *
 * @example
 * const result = await logoutUser();
 * if (!result.ok) {
 *   // Handle failure case
 * }
 */
export const logoutUser = (): Promise<RevenueCatResult<void>> => {
  return guardRevenueCatUsage("logoutUser", async () => {
    await Purchases.logOut();
  });
};

/**
 * Check if user has a specific entitlement active
 *
 * @param entitlementId - The entitlement identifier (e.g., "premium", "pro")
 * @returns RevenueCatResult<boolean> describing entitlement state or failure
 *
 * @example
 * const premiumResult = await hasEntitlement("premium");
 * if (premiumResult.ok && premiumResult.data) {
 *   // Show premium features
 * }
 */
export const hasEntitlement = async (
  entitlementId: string,
): Promise<RevenueCatResult<boolean>> => {
  const customerInfoResult = await getCustomerInfo();

  if (!customerInfoResult.ok) {
    return {
      ok: false,
      reason: customerInfoResult.reason,
      error: customerInfoResult.error,
    };
  }

  const isActive = Boolean(
    customerInfoResult.data.entitlements.active?.[entitlementId],
  );
  return { ok: true, data: isActive };
};

/**
 * Check if user has any active subscription
 *
 * @returns RevenueCatResult<boolean> describing subscription state or failure
 *
 * @example
 * const subscriptionResult = await hasActiveSubscription();
 * if (subscriptionResult.ok && subscriptionResult.data) {
 *   // User is a paying subscriber
 * }
 */
export const hasActiveSubscription = async (): Promise<
  RevenueCatResult<boolean>
> => {
  const customerInfoResult = await getCustomerInfo();

  if (!customerInfoResult.ok) {
    return {
      ok: false,
      reason: customerInfoResult.reason,
      error: customerInfoResult.error,
    };
  }

  const hasSubscription =
    Object.keys(customerInfoResult.data.entitlements.active || {}).length > 0;
  return { ok: true, data: hasSubscription };
};

/**
 * Get a specific package from the current offering
 *
 * @param packageIdentifier - The package identifier (e.g., "$rc_monthly", "$rc_annual")
 * @returns RevenueCatResult containing the package (or null) or a failure reason
 *
 * @example
 * const packageResult = await getPackage("$rc_monthly");
 * if (packageResult.ok && packageResult.data) {
 *   // Display monthly subscription option
 * }
 */
export const getPackage = async (
  packageIdentifier: string,
): Promise<RevenueCatResult<PurchasesPackage | null>> => {
  const offeringsResult = await getOfferings();

  if (!offeringsResult.ok) {
    return {
      ok: false,
      reason: offeringsResult.reason,
      error: offeringsResult.error,
    };
  }

  const pkg =
    offeringsResult.data.current?.availablePackages.find(
      (availablePackage) => availablePackage.identifier === packageIdentifier,
    ) ?? null;

  return { ok: true, data: pkg };
};

// ============================================================================
// NEW: Subscription Sync Utilities
// ============================================================================

// Type for customer info listener callback
type CustomerInfoListener = (customerInfo: CustomerInfo) => void;

// Store the listener removal function
let customerInfoListenerRemover: (() => void) | null = null;

/**
 * Add a listener for customer info updates from RevenueCat.
 * This will be called whenever the customer's subscription status changes.
 *
 * @param callback - Function to call when customer info updates
 * @returns A function to remove the listener, or null if RevenueCat is not enabled
 *
 * @example
 * const removeListener = addCustomerInfoListener((customerInfo) => {
 *   // Update your app state based on customerInfo
 *   syncFromCustomerInfo(customerInfo);
 * });
 *
 * // Later, to remove the listener:
 * removeListener?.();
 */
// Track active callback for cleanup
let activeCustomerInfoCallback: CustomerInfoListener | null = null;

export const addCustomerInfoListener = (
  callback: CustomerInfoListener
): (() => void) | null => {
  if (!isEnabled) {
    console.log(`${LOG_PREFIX} addCustomerInfoListener skipped: RevenueCat not configured`);
    return null;
  }

  try {
    // Store the callback reference for potential cleanup
    activeCustomerInfoCallback = callback;

    // RevenueCat SDK listener - returns void in this SDK version
    // The listener persists for the app lifetime
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      // Only call if this callback is still active
      if (activeCustomerInfoCallback === callback) {
        console.log(`${LOG_PREFIX} Customer info updated`);
        callback(customerInfo);
      }
    });

    console.log(`${LOG_PREFIX} Customer info listener added`);

    // Return a function to "disable" the callback
    // Note: The SDK listener persists, but we stop calling the callback
    return () => {
      if (activeCustomerInfoCallback === callback) {
        activeCustomerInfoCallback = null;
      }
      console.log(`${LOG_PREFIX} Customer info listener disabled`);
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to add customer info listener:`, error);
    return null;
  }
};

/**
 * Sync subscription status from RevenueCat.
 * Call this on app startup and when you need to refresh the subscription state.
 *
 * @param onSync - Callback function to handle the customer info
 * @returns Promise that resolves when sync is complete
 *
 * @example
 * await syncSubscriptionStatus((customerInfo) => {
 *   usePremiumStore.getState().syncFromCustomerInfo(customerInfo);
 * });
 */
export const syncSubscriptionStatus = async (
  onSync: (customerInfo: CustomerInfo) => void
): Promise<void> => {
  console.log(`${LOG_PREFIX} Starting subscription sync...`);

  const result = await getCustomerInfo();

  if (result.ok) {
    console.log(`${LOG_PREFIX} Subscription sync successful`);
    onSync(result.data);
  } else {
    console.log(`${LOG_PREFIX} Subscription sync failed:`, result.reason);
    // Don't throw - just log the error
    // The app should continue working with cached data
  }
};

/**
 * Initialize subscription sync - sets up listener and performs initial sync.
 * Call this once at app startup (e.g., in root layout).
 *
 * @param onSync - Callback function to handle customer info updates
 * @returns Cleanup function to remove the listener
 *
 * @example
 * // In your root layout useEffect:
 * useEffect(() => {
 *   const cleanup = initializeSubscriptionSync((customerInfo) => {
 *     usePremiumStore.getState().syncFromCustomerInfo(customerInfo);
 *   });
 *   return cleanup;
 * }, []);
 */
export const initializeSubscriptionSync = (
  onSync: (customerInfo: CustomerInfo) => void
): (() => void) => {
  // Perform initial sync
  syncSubscriptionStatus(onSync);

  // Set up listener for future updates
  const removeListener = addCustomerInfoListener(onSync);

  // Return cleanup function
  return () => {
    removeListener?.();
  };
};

/**
 * Get detailed entitlement info for the "premium" entitlement
 *
 * @returns Detailed entitlement info or null if not entitled
 */
export const getPremiumEntitlementInfo = async (): Promise<{
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  expirationDate: string | null;
  productIdentifier: string;
  identifier: string;
} | null> => {
  const result = await getCustomerInfo();

  if (!result.ok) {
    return null;
  }

  const premiumEntitlement = result.data.entitlements.active?.['premium'];

  if (!premiumEntitlement) {
    return null;
  }

  return {
    isActive: premiumEntitlement.isActive,
    willRenew: premiumEntitlement.willRenew,
    periodType: premiumEntitlement.periodType,
    expirationDate: premiumEntitlement.expirationDate,
    productIdentifier: premiumEntitlement.productIdentifier,
    identifier: premiumEntitlement.identifier,
  };
};
