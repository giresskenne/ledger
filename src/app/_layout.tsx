import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/lib/theme-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect } from 'react';
import { clearCache } from '@/lib/market-data';
import { initializeSubscriptionSync } from '@/lib/revenuecatClient';
import { usePremiumStore, syncLegacyStore } from '@/lib/premium-store';
import { usePortfolioStore } from '@/lib/store';
import * as Notifications from 'expo-notifications';
import { useRouter, useSegments } from 'expo-router';
import { BiometricGate } from '@/components/BiometricGate';
import { useOnboardingStore } from '@/lib/onboarding-store';
import { useLegalStore } from '@/lib/legal-store';
import { useAppRatingStore } from '@/lib/app-rating-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  // Get store actions for syncing
  const syncFromCustomerInfo = usePremiumStore((s) => s.syncFromCustomerInfo);
  const setLegacyPremium = usePortfolioStore((s) => s.setPremium);
  const router = useRouter();
  const segments = useSegments();
  const { isDark, theme } = useTheme();
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const hasAcceptedDisclaimer = useLegalStore((s) => s.hasAcceptedDisclaimer);
  const incrementAppOpens = useAppRatingStore((s) => s.incrementAppOpens);
  const markDayUsed = useAppRatingStore((s) => s.markDayUsed);

  useEffect(() => {
    // Track app opens and daily usage for rating prompts
    incrementAppOpens();
    markDayUsed();
  }, [incrementAppOpens, markDayUsed]);

  useEffect(() => {
    // Clear corrupted market data cache on startup (one-time fix)
    const clearCorruptedCache = async () => {
      try {
        await clearCache();
        console.log('[Market Data] Cache cleared on startup');
      } catch (e) {
        console.warn('[Market Data] Failed to clear cache:', e);
      }
    };
    clearCorruptedCache();

    // Initialize RevenueCat subscription sync
    // This fetches current customer info and sets up a listener for updates
    const cleanupSubscriptionSync = initializeSubscriptionSync((customerInfo) => {
      console.log('[App] Syncing subscription from RevenueCat');
      // Update the premium store with RevenueCat data
      syncFromCustomerInfo(customerInfo);
      // Sync legacy store for backward compatibility
      syncLegacyStore(setLegacyPremium);
    });

    // Hide splash screen after a brief delay for visual polish
    const hideSplash = async () => {
      // Wait 1 second so users can see the splash branding
      await new Promise(resolve => setTimeout(resolve, 1000));
      await SplashScreen.hideAsync();
    };
    hideSplash();

    // Cleanup subscription listener on unmount
    return () => {
      cleanupSubscriptionSync();
    };
  }, [syncFromCustomerInfo, setLegacyPremium]);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as any;
      if (!data) return;

      if (data.ledger_local_notification) {
        router.push({
          pathname: '/events',
          params: { returnTo: '/' },
        } as any);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);

    // If the app was opened from a notification, handle it once on mount.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleResponse(response);
      })
      .catch(() => {});

    return () => {
      sub.remove();
    };
  }, [router]);

  useEffect(() => {
    const current = segments.join('/');
    const onOnboarding = segments[0] === 'onboarding';
    const onDisclaimer = segments[0] === 'disclaimer';

    if (!hasCompletedOnboarding) return;
    if (hasAcceptedDisclaimer) return;
    if (onDisclaimer || onOnboarding) return;
    if (current.length === 0) return;

    router.replace('/disclaimer');
  }, [hasAcceptedDisclaimer, hasCompletedOnboarding, router, segments]);

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.background,
      border: theme.border,
      primary: theme.primary,
      text: theme.text,
      notification: theme.accent,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <BiometricGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="onboarding"
            options={{
              headerShown: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="add-asset"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="premium"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="asset/[id]"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="room-setup"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="terms"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="privacy"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="disclaimer"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="currency-selector"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="appearance"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="export-data"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="help-center"
            options={{
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </BiometricGate>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AppRoot />
    </AppThemeProvider>
  );
}

function AppRoot() {
  const { theme } = useTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style={theme.statusBarStyle} />
          <RootLayoutNav />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
