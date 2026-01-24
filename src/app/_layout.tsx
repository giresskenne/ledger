import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect } from 'react';
import { clearCache } from '@/lib/market-data';
import { initializeSubscriptionSync } from '@/lib/revenuecatClient';
import { usePremiumStore, syncLegacyStore } from '@/lib/premium-store';
import { usePortfolioStore } from '@/lib/store';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Custom dark theme for the app
const FolioDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0A0F',
    card: '#0A0A0F',
    border: 'rgba(255,255,255,0.1)',
    primary: '#6366F1',
  },
};

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  // Get store actions for syncing
  const syncFromCustomerInfo = usePremiumStore((s) => s.syncFromCustomerInfo);
  const setLegacyPremium = usePortfolioStore((s) => s.setPremium);

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

    // Hide splash screen after layout is mounted
    SplashScreen.hideAsync();

    // Cleanup subscription listener on unmount
    return () => {
      cleanupSubscriptionSync();
    };
  }, [syncFromCustomerInfo, setLegacyPremium]);

  return (
    <ThemeProvider value={FolioDarkTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0F' },
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
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style="light" />
          <RootLayoutNav colorScheme={colorScheme} />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

