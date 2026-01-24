import React from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Sparkles,
  Moon,
  Globe,
  Lock,
  RotateCcw,
  Calendar,
  DollarSign,
  PiggyBank,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Bug,
  AlertTriangle,
} from 'lucide-react-native';
import { usePortfolioStore } from '@/lib/store';
import { usePremiumStore, useEntitlementStatus, syncLegacyStore, type DebugForceMode } from '@/lib/premium-store';
import { useOnboardingStore } from '@/lib/onboarding-store';
import { useNotificationsStore } from '@/lib/notifications-store';
import { cn } from '@/lib/cn';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [biometrics, setBiometrics] = React.useState(false);
  const [notificationsExpanded, setNotificationsExpanded] = React.useState(false);

  // Use unified entitlement status
  const { isPremium, isActuallyPremium, isDebugOverride, debugMode, willRenew, expiresAt } = useEntitlementStatus();

  // Legacy store setter for sync
  const setPremiumLegacy = usePortfolioStore((s) => s.setPremium);
  const resetStore = usePortfolioStore((s) => s.resetStore);

  // Premium store actions
  const setDebugForceMode = usePremiumStore((s) => s.setDebugForceMode);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

  // Notification preferences from store
  const preferences = useNotificationsStore((s) => s.preferences);
  const setPreferences = useNotificationsStore((s) => s.setPreferences);

  const handleResetOnboarding = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetOnboarding();
    router.replace('/onboarding');
  };

  const handleResetPortfolio = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await resetStore();
    // Force refresh by reloading the page
    router.replace('/(tabs)');
  };

  const handleToggleNotification = (
    key: keyof typeof preferences,
    value: boolean
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreferences({ [key]: value });
  };

  const handleEnableNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Request iOS native push notification permission
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowProvisional: false,
        },
      });

      if (status === 'granted') {
        // Permission granted - enable notifications
        setPreferences({ enabled: true });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Permission denied
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alert('Push notifications permission denied. You can enable them in Settings > [App Name] > Notifications.');
      }
    } catch (error) {
      console.log('Error requesting notification permissions:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Handle debug mode change
  const handleDebugModeChange = (mode: DebugForceMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDebugForceMode(mode);
    // Sync legacy store with the new debug mode
    syncLegacyStore(setPremiumLegacy);
  };

  // Get subscription display text
  const getSubscriptionDisplayText = (): string => {
    if (isDebugOverride) {
      return debugMode === 'premium' ? 'Premium (Debug)' : 'Free (Debug)';
    }
    if (isPremium) {
      if (!willRenew && expiresAt) {
        return 'Premium (Expires)';
      }
      return 'Premium';
    }
    return 'Free';
  };

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      <LinearGradient
        colors={['#1a1a2e', '#0A0A0F']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top }} className="px-5">
          <Text className="text-white text-2xl font-bold">Settings</Text>

          {/* Profile Card */}
          <View className="mt-6 bg-white/5 rounded-2xl p-4">
            <View className="flex-row items-center">
              <View className="w-16 h-16 rounded-full bg-indigo-600 items-center justify-center">
                <User size={28} color="white" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-white text-lg font-semibold">Investor</Text>
                <Text className="text-gray-400 text-sm">investor@email.com</Text>
              </View>
              {isPremium && (
                <View className={cn(
                  "flex-row items-center px-3 py-1 rounded-full",
                  isDebugOverride ? "bg-purple-500/20" : "bg-amber-500/20"
                )}>
                  <Sparkles size={14} color={isDebugOverride ? "#A855F7" : "#F59E0B"} />
                  <Text className={cn(
                    "text-sm font-medium ml-1",
                    isDebugOverride ? "text-purple-500" : "text-amber-500"
                  )}>
                    {isDebugOverride ? 'Debug Premium' : 'Premium'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Premium Banner (if not premium) */}
          {!isPremium && (
            <Pressable
              onPress={() => {
                console.log('[Premium Debug] Upgrade button clicked:', {
                  location: 'settings-banner',
                  isPremium: false,
                  timestamp: new Date().toISOString(),
                });
                router.push('/premium');
              }}
              className="mt-4"
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}
              >
                <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                  <Sparkles size={20} color="white" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-white font-bold">Upgrade to Premium</Text>
                  <Text className="text-white/80 text-sm">Unlock risk analysis & more</Text>
                </View>
                <ChevronRight size={20} color="white" />
              </LinearGradient>
            </Pressable>
          )}

          {/* Developer Debug Section - ONLY visible in __DEV__ mode */}
          {__DEV__ && (
            <>
              <Text className="text-purple-400 text-sm mt-8 mb-3 px-1">DEVELOPER DEBUG</Text>
              <View className="bg-purple-500/10 border border-purple-500/30 rounded-2xl overflow-hidden">
                {/* Warning notice */}
                <View className="flex-row items-center p-3 bg-purple-500/10 border-b border-purple-500/20">
                  <AlertTriangle size={16} color="#A855F7" />
                  <Text className="text-purple-400 text-xs ml-2 flex-1">
                    Debug controls - only visible in development builds
                  </Text>
                </View>

                {/* Debug mode selector */}
                <View className="p-4">
                  <View className="flex-row items-center mb-3">
                    <Bug size={18} color="#A855F7" />
                    <Text className="text-white ml-2 font-medium">Force Premium Mode</Text>
                  </View>
                  <Text className="text-gray-400 text-xs mb-3">
                    Override UI gating without affecting actual subscription state
                  </Text>

                  {/* Mode buttons */}
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleDebugModeChange('none')}
                      className={cn(
                        'flex-1 py-3 rounded-xl border-2',
                        debugMode === 'none'
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-white/10 bg-white/5'
                      )}
                    >
                      <Text className={cn(
                        'text-center font-medium text-sm',
                        debugMode === 'none' ? 'text-purple-400' : 'text-gray-400'
                      )}>
                        Normal
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDebugModeChange('free')}
                      className={cn(
                        'flex-1 py-3 rounded-xl border-2',
                        debugMode === 'free'
                          ? 'border-red-500 bg-red-500/20'
                          : 'border-white/10 bg-white/5'
                      )}
                    >
                      <Text className={cn(
                        'text-center font-medium text-sm',
                        debugMode === 'free' ? 'text-red-400' : 'text-gray-400'
                      )}>
                        Force Free
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDebugModeChange('premium')}
                      className={cn(
                        'flex-1 py-3 rounded-xl border-2',
                        debugMode === 'premium'
                          ? 'border-amber-500 bg-amber-500/20'
                          : 'border-white/10 bg-white/5'
                      )}
                    >
                      <Text className={cn(
                        'text-center font-medium text-sm',
                        debugMode === 'premium' ? 'text-amber-400' : 'text-gray-400'
                      )}>
                        Force Premium
                      </Text>
                    </Pressable>
                  </View>

                  {/* Current state display */}
                  <View className="mt-4 bg-black/30 rounded-lg p-3">
                    <Text className="text-gray-500 text-xs mb-2">Current State:</Text>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-400 text-xs">Actual Entitlement:</Text>
                      <Text className={cn(
                        'text-xs font-medium',
                        isActuallyPremium ? 'text-green-400' : 'text-gray-400'
                      )}>
                        {isActuallyPremium ? 'Premium' : 'Free'}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-400 text-xs">UI Shows:</Text>
                      <Text className={cn(
                        'text-xs font-medium',
                        isPremium ? 'text-amber-400' : 'text-gray-400'
                      )}>
                        {isPremium ? 'Premium' : 'Free'}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-400 text-xs">Debug Override:</Text>
                      <Text className={cn(
                        'text-xs font-medium',
                        isDebugOverride ? 'text-purple-400' : 'text-gray-500'
                      )}>
                        {isDebugOverride ? `Yes (${debugMode})` : 'No'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Notifications Section */}
          <Text className="text-gray-400 text-sm mt-8 mb-3 px-1">NOTIFICATIONS</Text>
          <View className="bg-white/5 rounded-2xl overflow-hidden">
            {/* Main notification toggle */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (!preferences.enabled) {
                  handleEnableNotifications();
                } else {
                  setNotificationsExpanded(!notificationsExpanded);
                }
              }}
              className="flex-row items-center p-4 border-b border-white/5"
            >
              <View className="w-9 h-9 rounded-full bg-white/10 items-center justify-center">
                <Bell size={20} color="#6366F1" />
              </View>
              <Text className="text-white flex-1 ml-3">Push Notifications</Text>
              {!preferences.enabled ? (
                <Text className="text-amber-500 text-sm font-medium">Enable</Text>
              ) : (
                <Switch
                  value={preferences.enabled}
                  onValueChange={(value) => handleToggleNotification('enabled', value)}
                  trackColor={{ false: '#374151', true: '#6366F1' }}
                  thumbColor="white"
                />
              )}
              {preferences.enabled && (
                notificationsExpanded ? (
                  <ChevronUp size={18} color="#6B7280" className="ml-2" />
                ) : (
                  <ChevronDown size={18} color="#6B7280" className="ml-2" />
                )
              )}
            </Pressable>

            {/* Expandable notification settings */}
            {notificationsExpanded && preferences.enabled && (
              <Animated.View entering={FadeInDown.springify()}>
                <View className="bg-white/[0.02] px-4 py-2">
                  <Text className="text-gray-500 text-xs uppercase tracking-wide mb-2">
                    Alert Types
                  </Text>
                </View>

                {/* Maturity Alerts */}
                <View className="flex-row items-center p-4 pl-6 border-b border-white/5">
                  <View className="w-8 h-8 rounded-full bg-amber-500/10 items-center justify-center">
                    <Calendar size={16} color="#F59E0B" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-white text-sm">Maturity Alerts</Text>
                    <Text className="text-gray-500 text-xs mt-0.5">
                      Bonds & fixed income maturity dates
                    </Text>
                  </View>
                  <Switch
                    value={preferences.maturityAlerts}
                    onValueChange={(value) =>
                      handleToggleNotification('maturityAlerts', value)
                    }
                    trackColor={{ false: '#374151', true: '#6366F1' }}
                    thumbColor="white"
                  />
                </View>

                {/* Price Alerts */}
                <View className="flex-row items-center p-4 pl-6 border-b border-white/5">
                  <View className="w-8 h-8 rounded-full bg-indigo-500/10 items-center justify-center">
                    <TrendingUp size={16} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-white text-sm">Price Alerts</Text>
                    <Text className="text-gray-500 text-xs mt-0.5">
                      When assets hit target prices
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    {!isPremium && (
                      <View className="bg-amber-500/20 px-2 py-0.5 rounded mr-2">
                        <Text className="text-amber-500 text-[10px] font-medium">
                          PRO
                        </Text>
                      </View>
                    )}
                    <Switch
                      value={preferences.priceAlerts}
                      onValueChange={(value) =>
                        handleToggleNotification('priceAlerts', value)
                      }
                      trackColor={{ false: '#374151', true: '#6366F1' }}
                      thumbColor="white"
                      disabled={!isPremium}
                    />
                  </View>
                </View>

                {/* Dividend Alerts */}
                <View className="flex-row items-center p-4 pl-6 border-b border-white/5">
                  <View className="w-8 h-8 rounded-full bg-emerald-500/10 items-center justify-center">
                    <DollarSign size={16} color="#10B981" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-white text-sm">Dividend Alerts</Text>
                    <Text className="text-gray-500 text-xs mt-0.5">
                      Expected dividend payments
                    </Text>
                  </View>
                  <Switch
                    value={preferences.dividendAlerts}
                    onValueChange={(value) =>
                      handleToggleNotification('dividendAlerts', value)
                    }
                    trackColor={{ false: '#374151', true: '#6366F1' }}
                    thumbColor="white"
                  />
                </View>

                {/* Contribution Reminders */}
                <View className="flex-row items-center p-4 pl-6">
                  <View className="w-8 h-8 rounded-full bg-pink-500/10 items-center justify-center">
                    <PiggyBank size={16} color="#EC4899" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-white text-sm">
                      Contribution Reminders
                    </Text>
                    <Text className="text-gray-500 text-xs mt-0.5">
                      Registered account contributions
                    </Text>
                  </View>
                  <Switch
                    value={preferences.contributionReminders}
                    onValueChange={(value) =>
                      handleToggleNotification('contributionReminders', value)
                    }
                    trackColor={{ false: '#374151', true: '#6366F1' }}
                    thumbColor="white"
                  />
                </View>
              </Animated.View>
            )}
          </View>

          {/* Preferences */}
          <Text className="text-gray-400 text-sm mt-8 mb-3 px-1">PREFERENCES</Text>
          <View className="bg-white/5 rounded-2xl overflow-hidden">
            <SettingsRow
              icon={<Lock size={20} color="#10B981" />}
              label="Biometric Login"
              rightElement={
                <Switch
                  value={biometrics}
                  onValueChange={setBiometrics}
                  trackColor={{ false: '#374151', true: '#6366F1' }}
                  thumbColor="white"
                />
              }
            />
            <SettingsRow
              icon={<Globe size={20} color="#EC4899" />}
              label="Currency"
              value="USD"
              showArrow
              onPress={() => router.push('/currency-selector')}
            />
            <SettingsRow
              icon={<Moon size={20} color="#8B5CF6" />}
              label="Appearance"
              value="Dark"
              showArrow
              isLast
              onPress={() => router.push('/appearance')}
            />
          </View>

          {/* Account */}
          <Text className="text-gray-400 text-sm mt-8 mb-3 px-1">ACCOUNT</Text>
          <View className="bg-white/5 rounded-2xl overflow-hidden">
            <SettingsRow
              icon={<CreditCard size={20} color="#F59E0B" />}
              label="Subscription"
              value={getSubscriptionDisplayText()}
              showArrow
              onPress={() => {
                console.log('[Premium Debug] Subscription row clicked:', {
                  location: 'settings-subscription',
                  currentStatus: isPremium ? 'premium' : 'free',
                  isDebugOverride,
                  timestamp: new Date().toISOString(),
                });
                router.push('/premium');
              }}
            />
            <SettingsRow
              icon={<FileText size={20} color="#6B7280" />}
              label="Export Data"
              showArrow
              isLast
              onPress={() => router.push('/export-data')}
            />
          </View>

          {/* Support */}
          <Text className="text-gray-400 text-sm mt-8 mb-3 px-1">SUPPORT</Text>
          <View className="bg-white/5 rounded-2xl overflow-hidden">
            <SettingsRow
              icon={<HelpCircle size={20} color="#6366F1" />}
              label="Help Center"
              showArrow
              onPress={() => router.push('/help-center')}
            />
            <SettingsRow
              icon={<FileText size={20} color="#9CA3AF" />}
              label="Terms of Service"
              showArrow
              onPress={() => router.push('/terms')}
            />
            <SettingsRow
              icon={<Shield size={20} color="#9CA3AF" />}
              label="Privacy Policy"
              showArrow
              onPress={() => router.push('/privacy')}
            />
            <SettingsRow
              icon={<FileText size={20} color="#F59E0B" />}
              label="Investment Disclaimer"
              showArrow
              onPress={() => router.push('/disclaimer')}
            />
            <SettingsRow
              icon={<RotateCcw size={20} color="#8B5CF6" />}
              label="Replay Onboarding"
              showArrow
              onPress={handleResetOnboarding}
            />
            <SettingsRow
              icon={<AlertTriangle size={20} color="#EF4444" />}
              label="Clear All Assets (Testing)"
              showArrow
              isLast
              onPress={handleResetPortfolio}
            />
          </View>

          {/* Sign Out */}
          <Pressable className="mt-8 bg-red-500/10 rounded-2xl p-4 flex-row items-center justify-center">
            <LogOut size={20} color="#EF4444" />
            <Text className="text-red-500 font-semibold ml-2">Sign Out</Text>
          </Pressable>

          {/* App Info */}
          <View className="mt-8 items-center">
            <Text className="text-gray-500 text-sm">Ledger v1.0.0</Text>
            <Text className="text-gray-600 text-xs mt-1">Made with care for investors</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  rightElement,
  showArrow,
  isLast,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
  isLast?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center p-4',
        !isLast && 'border-b border-white/5'
      )}
    >
      <View className="w-9 h-9 rounded-full bg-white/10 items-center justify-center">
        {icon}
      </View>
      <Text className="text-white flex-1 ml-3">{label}</Text>
      {value && <Text className="text-gray-400 mr-2">{value}</Text>}
      {rightElement}
      {showArrow && <ChevronRight size={18} color="#6B7280" />}
    </Pressable>
  );
}
