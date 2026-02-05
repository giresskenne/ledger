import React from 'react';
import { View, Text, Pressable, Alert, Dimensions, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Burnt from 'burnt';
import {
  X,
  Check,
  Shield,
  Crown,
  Infinity,
  Lock,
  Zap,
  BarChart3,
  Star,
  AlertCircle,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { usePortfolioStore } from '@/lib/store';
import { usePremiumStore, useEntitlementStatus, syncLegacyStore, FREE_TIER_LIMITS } from '@/lib/premium-store';
import { cn } from '@/lib/cn';
import * as Haptics from 'expo-haptics';
import { getOfferings, purchasePackage, restorePurchases, isRevenueCatEnabled } from '@/lib/revenuecatClient';
import { useTheme } from '@/lib/theme-store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Condensed features for non-scrolling layout
const FEATURES = [
  { icon: Infinity, title: 'Unlimited Assets' },
  { icon: Shield, title: 'Risk Analysis' },
  { icon: BarChart3, title: 'Sector & Geographic Breakdown' },
  { icon: Zap, title: 'AI Suggestions & Alerts' },
];

// Pricing configuration - connected to RevenueCat
const PRICING = {
  monthly: {
    price: '$8.99',
    period: '/mo',
    productId: 'ledger_premium_monthly',
    packageId: '$rc_monthly',
  },
  yearly: {
    price: '$4.17',
    period: '/mo',
    billedAs: '$49.99/year',
    fullPrice: '$107.88',
    savings: '54%',
    productId: 'ledger_premium_yearly',
    packageId: '$rc_annual',
  },
};

const TESTIMONIALS = [
  {
    quote:
      "I stopped guessing. The risk breakdown made my anxiety drop instantly — I finally understood what I actually owned.",
    author: 'Michael R.',
    rating: 5,
  },
  {
    quote:
      "The room tracker paid for itself. I used to under-contribute out of fear — now I know my limits down to the dollar.",
    author: 'Sarah K.',
    rating: 5,
  },
  {
    quote:
      "Seeing everything in one place is oddly emotional. It feels like taking a deep breath after years of spreadsheets.",
    author: 'Jason M.',
    rating: 5,
  },
  {
    quote:
      "The diversification suggestions called out my blind spots without shaming me. It’s like having a calm second opinion.",
    author: 'Amina T.',
    rating: 5,
  },
];

const SOCIAL_PROOF = {
  averageRating: 4.9,
  reviewsCount: 2384,
};

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { previewPaywall } = useLocalSearchParams<{ previewPaywall?: string }>();
  const isPaywallPreview = __DEV__ && (previewPaywall === '1' || previewPaywall === 'true');
  const [selectedPlan, setSelectedPlan] = React.useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = React.useState(false);
  const [testimonialIndex, setTestimonialIndex] = React.useState(0);
  const [rcOfferings, setRcOfferings] = React.useState<any>(null);
  const dismissPaywall = React.useCallback(() => {
    // Ensure we actually remove the paywall screen instead of stacking another route on top.
    // `dismissTo` will dismiss if possible, otherwise it will replace to the destination.
    router.dismissTo('/(tabs)');
  }, [router]);

  // Legacy store for backward compatibility
  const setPremiumLegacy = usePortfolioStore((s) => s.setPremium);

  // New premium store
  const setSubscription = usePremiumStore((s) => s.setSubscription);
  const syncFromCustomerInfo = usePremiumStore((s) => s.syncFromCustomerInfo);

  // Unified entitlement status
  const {
    isPremium,
    isActuallyPremium,
    isDebugOverride,
    willRenew,
    expiresAt,
    subscription,
  } = useEntitlementStatus();

  // Fetch offerings on mount
  React.useEffect(() => {
    const fetchOfferings = async () => {
      if (!isRevenueCatEnabled()) {
        console.log('RevenueCat not enabled');
        return;
      }

      const result = await getOfferings();
      if (result.ok && result.data.current) {
        setRcOfferings(result.data.current);
      }
    };

    fetchOfferings();
  }, []);

  // Rotate testimonials
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubscribe = async () => {
    if (isPaywallPreview) {
      Burnt.toast({
        title: 'Paywall preview',
        message: 'Purchases are disabled in preview mode.',
        preset: 'none',
        haptic: 'none',
        from: 'top',
      });
      return;
    }
    console.log('[Premium Debug] Upgrade button clicked:', {
      location: 'premium-screen',
      selectedPlan,
      isPremium,
      isActuallyPremium,
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Get the package to purchase
      const packageId = PRICING[selectedPlan].packageId;
      const pkg = rcOfferings?.availablePackages.find(
        (p: any) => p.identifier === packageId
      );

      if (!pkg) {
        Alert.alert(
          'Package Not Found',
          'The selected package is not available. Please try again.'
        );
        setIsLoading(false);
        return;
      }

      // Purchase the package
      const result = await purchasePackage(pkg);

      if (result.ok) {
        console.log('[Premium Debug] Purchase successful:', {
          plan: selectedPlan,
          productId: PRICING[selectedPlan].productId,
          timestamp: new Date().toISOString(),
        });

        // Sync from the returned customer info (source of truth)
        syncFromCustomerInfo(result.data);

        // Also sync legacy store
        syncLegacyStore(setPremiumLegacy);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Burnt.toast({
          title: 'Premium unlocked',
          message: 'Welcome to Ledger Premium — your features are now active.',
          preset: 'done',
          haptic: 'success',
          from: 'top',
        });
        dismissPaywall();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Purchase Failed',
          result.reason === 'web_not_supported'
            ? 'Purchases are only available on mobile apps.'
            : 'There was an error processing your purchase. Please try again.'
        );
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Purchase Failed',
        'There was an error processing your purchase. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (isPaywallPreview) {
      Burnt.toast({
        title: 'Paywall preview',
        message: 'Restore is disabled in preview mode.',
        preset: 'none',
        haptic: 'none',
        from: 'top',
      });
      return;
    }
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await restorePurchases();

      if (result.ok) {
        // Sync from restored customer info
        syncFromCustomerInfo(result.data);
        syncLegacyStore(setPremiumLegacy);

        // Check if any entitlements were restored
        const hasEntitlements = Object.keys(result.data.entitlements.active || {}).length > 0;

        if (hasEntitlements) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Burnt.toast({
            title: 'Purchases restored',
            message: 'Your Premium access is active on this device.',
            preset: 'done',
            haptic: 'success',
            from: 'top',
          });
          Alert.alert(
            'Purchases Restored',
            'Your previous purchases have been restored successfully.',
            [{ text: 'OK', onPress: dismissPaywall }]
          );
        } else {
          Alert.alert(
            'No Purchases Found',
            'We couldn\'t find any previous purchases to restore.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Restore Failed',
          result.reason === 'web_not_supported'
            ? 'Restore is only available on mobile apps.'
            : 'Failed to restore purchases. Please try again.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Continue button press - ensures app state is synced
  const handleContinue = () => {
    console.log('[Premium Debug] Continue button clicked:', {
      location: 'premium-screen-already-premium',
      isPremium,
      isActuallyPremium,
      isDebugOverride,
      canGoBack: router.canGoBack(),
      timestamp: new Date().toISOString(),
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Ensure legacy store is synced with current entitlement
    // This fixes the bug where debug mode can leave legacy store out of sync
    syncLegacyStore(setPremiumLegacy);

    dismissPaywall();
  };

  // Format expiry date for display
  const formatExpiryDate = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  // Get subscription status text
  const getStatusText = (): { text: string; color: string } => {
    if (!willRenew && expiresAt) {
      return {
        text: `Expires ${formatExpiryDate(expiresAt)} (renewal off)`,
        color: 'text-amber-400',
      };
    }
    if (subscription.status === 'trial') {
      return {
        text: `Trial ends ${formatExpiryDate(subscription.trialEndsAt || expiresAt)}`,
        color: 'text-blue-400',
      };
    }
    if (expiresAt) {
      return {
        text: `Renews ${formatExpiryDate(expiresAt)}`,
        color: 'text-green-400',
      };
    }
    return { text: 'Active', color: 'text-green-400' };
  };

  // If actually premium (from RevenueCat), show management screen
  // Note: We use isActuallyPremium here to check real entitlement, not debug override
  if (isActuallyPremium && !isPaywallPreview) {
    const statusInfo = getStatusText();

    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#0A0A0F' : '#1A1A2E' }}>
        <LinearGradient
          colors={isDark ? ['#F59E0B20', '#0A0A0F'] : ['#F59E0B30', '#1A1A2E']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 500 }}
        />

        <View style={{ paddingTop: insets.top }} className="px-5 pb-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              dismissPaywall();
            }}
            style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.15)' }}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <X size={20} color="white" />
          </Pressable>
          <View />
        </View>

        <View className="flex-1 items-center justify-center px-5">
          <View className="w-24 h-24 rounded-full overflow-hidden mb-6">
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={{
                width: 96,
                height: 96,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crown size={48} color="white" />
            </LinearGradient>
          </View>

          <Text style={{ color: '#FFFFFF' }} className="text-3xl font-bold text-center">
            You're Premium!
          </Text>
          <Text style={{ color: isDark ? '#9CA3AF' : '#D1D5DB' }} className="text-center mt-3 px-4 leading-6">
            You have full access to all premium features including unlimited asset tracking, risk analysis, and more.
          </Text>

          {/* Debug override notice */}
          {isDebugOverride && (
            <View className="bg-amber-500/20 rounded-xl p-3 mt-4 flex-row items-center">
              <AlertCircle size={16} color="#F59E0B" />
              <Text className="text-amber-400 text-xs ml-2">
                Debug mode active - UI override in effect
              </Text>
            </View>
          )}

          {/* Subscription details */}
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)' }} className="rounded-2xl p-4 mt-8 w-full">
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: isDark ? '#9CA3AF' : '#D1D5DB' }}>Plan</Text>
              <Text style={{ color: '#FFFFFF' }} className="font-medium capitalize">
                {subscription.plan || 'Premium'}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: isDark ? '#9CA3AF' : '#D1D5DB' }}>Status</Text>
              <Text className={cn('font-medium', statusInfo.color)}>
                {statusInfo.text}
              </Text>
            </View>
            {!willRenew && expiresAt && (
              <View className="bg-amber-500/10 rounded-lg p-2 mt-2">
                <Text className="text-amber-400 text-xs text-center">
                  Your subscription will not auto-renew. You'll retain access until the expiry date.
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={handleContinue}
            className="mt-8 bg-indigo-600 px-8 py-4 rounded-2xl"
          >
            <Text className="text-white font-bold">Continue</Text>
          </Pressable>

          {/* Restore purchases link */}
          <Pressable
            onPress={handleRestorePurchases}
            disabled={isLoading}
            className="mt-4"
          >
            <Text className="text-indigo-400 text-sm">
              {isLoading ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </Pressable>

          {/* Legal links (App Store requirement) */}
          <View className="flex-row justify-center items-center mt-4">
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                const url = 'https://giresskenne.github.io/ledger/privacy.html';
                router.push('/privacy');
              }}
              hitSlop={8}
            >
              <Text className="text-indigo-400 text-xs underline">Privacy Policy</Text>
            </Pressable>
            <Text className="text-gray-600 text-xs mx-2">•</Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                const url = 'https://giresskenne.github.io/ledger/terms.html';
                router.push('/terms');
              }}
              hitSlop={8}
            >
              <Text className="text-indigo-400 text-xs underline">Terms of Use</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const currentTestimonial = TESTIMONIALS[testimonialIndex];

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0A0A0F' : '#1A1A2E' }}>
      <LinearGradient
        colors={isDark ? ['#F59E0B15', '#0A0A0F'] : ['#F59E0B20', '#1A1A2E']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.5 }}
      />

      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="px-5 pb-2 flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            dismissPaywall();
          }}
          style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.15)' }}
          className="w-10 h-10 rounded-full items-center justify-center"
        >
          <X size={20} color="white" />
        </Pressable>
        <Pressable onPress={handleRestorePurchases} disabled={isLoading || isPaywallPreview}>
          <Text className={cn('text-sm', isPaywallPreview ? 'text-gray-600' : 'text-indigo-400')}>
            Restore
          </Text>
        </Pressable>
      </View>

      {/* Content - Fixed layout, no scrolling */}
      <View className="flex-1 px-5 justify-between" style={{ paddingBottom: insets.bottom + 16 }}>
        {isPaywallPreview && (
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }} className="border rounded-2xl px-4 py-3 mt-2">
            <Text style={{ color: isDark ? '#D1D5DB' : '#E5E7EB' }} className="text-sm font-medium">Paywall preview</Text>
            <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF' }} className="text-xs mt-1">
              Purchases and restore are disabled in this preview.
            </Text>
          </View>
        )}
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(100)} className="items-center pt-2">
          <View className="w-16 h-16 rounded-full overflow-hidden">
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={{
                width: 64,
                height: 64,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crown size={28} color="white" />
            </LinearGradient>
          </View>

          <Text style={{ color: '#FFFFFF' }} className="text-2xl font-bold mt-4 text-center">
            Ledger Premium
          </Text>
          <Text style={{ color: isDark ? '#9CA3AF' : '#D1D5DB' }} className="text-center mt-1 text-sm">
            Unlock powerful analytics for smarter investing
          </Text>
        </Animated.View>

        {/* Features Grid */}
        <Animated.View entering={FadeInDown.delay(200)} className="mt-4">
          <View className="flex-row flex-wrap justify-between">
            {FEATURES.map((feature) => (
              <View key={feature.title} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)' }} className="w-[48%] rounded-xl p-3 mb-2">
                <View className="flex-row items-center">
                  <feature.icon size={16} color="#F59E0B" />
                  <Text style={{ color: '#FFFFFF' }} className="text-xs font-medium ml-2 flex-1">{feature.title}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Testimonial */}
        <Animated.View entering={FadeInDown.delay(250)} className="mt-3">
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)' }} className="rounded-xl p-4">
            {/* Star Rating */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    color="#F59E0B"
                    fill={star <= currentTestimonial.rating ? '#F59E0B' : 'transparent'}
                    style={{ marginRight: 2 }}
                  />
                ))}
              </View>
              <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF' }} className="text-xs">
                {SOCIAL_PROOF.averageRating} avg • {SOCIAL_PROOF.reviewsCount.toLocaleString()} reviews
              </Text>
            </View>
            <Text style={{ color: isDark ? '#D1D5DB' : '#E5E7EB' }} className="text-sm leading-5" numberOfLines={2}>
              "{currentTestimonial.quote}"
            </Text>
            <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF' }} className="text-xs mt-2">— {currentTestimonial.author}</Text>

            {/* Testimonial indicators */}
            <View className="flex-row justify-center mt-3 gap-1">
              {TESTIMONIALS.map((_, index) => (
                <View
                  key={index}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    index === testimonialIndex ? 'bg-amber-500' : isDark ? 'bg-white/20' : 'bg-white/30'
                  )}
                />
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Pricing Plans */}
        <Animated.View entering={FadeInDown.delay(300)} className="mt-4">
          <View className="flex-row gap-3">
            {/* Monthly Plan */}
            <Pressable
              onPress={() => {
                setSelectedPlan('monthly');
                Haptics.selectionAsync();
              }}
              style={{
                backgroundColor: selectedPlan === 'monthly' ? 'rgba(245, 158, 11, 0.1)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'),
                borderColor: selectedPlan === 'monthly' ? '#F59E0B' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)')
              }}
              className="flex-1 rounded-xl p-3 border-2"
            >
              <Text style={{ color: isDark ? '#9CA3AF' : '#D1D5DB' }} className="text-xs">Monthly</Text>
              <View className="flex-row items-baseline mt-1">
                <Text style={{ color: '#FFFFFF' }} className="text-2xl font-bold">{PRICING.monthly.price}</Text>
                <Text style={{ color: isDark ? '#9CA3AF' : '#D1D5DB' }} className="text-xs ml-1">{PRICING.monthly.period}</Text>
              </View>
              {selectedPlan === 'monthly' && (
                <View className="absolute top-2 right-2">
                  <View className="w-5 h-5 bg-amber-500 rounded-full items-center justify-center">
                    <Check size={12} color="white" strokeWidth={3} />
                  </View>
                </View>
              )}
            </Pressable>

            {/* Yearly Plan - PROMO */}
            <Pressable
              onPress={() => {
                setSelectedPlan('yearly');
                Haptics.selectionAsync();
              }}
              style={{
                backgroundColor: selectedPlan === 'yearly' ? 'rgba(245, 158, 11, 0.1)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'),
                borderColor: selectedPlan === 'yearly' ? '#F59E0B' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)')
              }}
              className="flex-1 rounded-xl p-3 border-2 relative"
            >
              {/* Promo Badge */}
              <View className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}
                >
                  <Text className="text-white text-[10px] font-bold">SAVE {PRICING.yearly.savings}</Text>
                </LinearGradient>
              </View>

              <Text style={{ color: isDark ? '#9CA3AF' : '#D1D5DB' }} className="text-xs">Yearly</Text>
              <View className="flex-row items-baseline mt-1">
                <Text style={{ color: '#FFFFFF' }} className="text-2xl font-bold">{PRICING.yearly.price}</Text>
                <Text style={{ color: isDark ? '#9CA3AF' : '#D1D5DB' }} className="text-xs ml-1">{PRICING.yearly.period}</Text>
              </View>
              <View className="flex-row items-center mt-0.5">
                <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF' }} className="text-[10px] line-through mr-1">{PRICING.yearly.fullPrice}</Text>
                <Text className="text-amber-400 text-[10px] font-medium">{PRICING.yearly.billedAs}</Text>
              </View>
              {selectedPlan === 'yearly' && (
                <View className="absolute top-2 right-2">
                  <View className="w-5 h-5 bg-amber-500 rounded-full items-center justify-center">
                    <Check size={12} color="white" strokeWidth={3} />
                  </View>
                </View>
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* CTA Section */}
        <Animated.View entering={FadeInUp.delay(400)} className="mt-4">
          <Pressable onPress={handleSubscribe} disabled={isLoading || isPaywallPreview}>
            <LinearGradient
              colors={isLoading ? ['#6B7280', '#4B5563'] : ['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 14,
                padding: 16,
                alignItems: 'center',
                opacity: isLoading || isPaywallPreview ? 0.65 : 1,
              }}
            >
              <Text className="text-white font-bold text-base">
                {isLoading ? 'Processing...' : 'Start 7-Day Free Trial'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Text className="text-gray-500 text-center text-[10px] mt-2 px-4">
            Cancel anytime. No charge until trial ends.
          </Text>

          {/* Trust badges */}
          <View className="flex-row justify-center items-center mt-2 gap-4">
            <Text className="text-gray-600 text-[10px]">Secure payment</Text>
            <Text className="text-gray-700">•</Text>
            <Text className="text-gray-600 text-[10px]">Instant access</Text>
            <Text className="text-gray-700">•</Text>
            <Text className="text-gray-600 text-[10px]">Cancel anytime</Text>
          </View>

          {/* Legal links (App Store subscription requirement) */}
          <View className="flex-row justify-center items-center mt-3">
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                const url = 'https://giresskenne.github.io/ledger/privacy.html';
                router.push('/privacy');
              }}
              hitSlop={8}
            >
              <Text className="text-indigo-400 text-[11px] underline">Privacy Policy</Text>
            </Pressable>
            <Text className="text-gray-700 text-[11px] mx-2">•</Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                const url = 'https://giresskenne.github.io/ledger/terms.html';
                router.push('/terms');
              }}
              hitSlop={8}
            >
              <Text className="text-indigo-400 text-[11px] underline">Terms of Use</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* RevenueCat Notice - Only show in development builds */}
        {__DEV__ && (
          <Animated.View entering={FadeInDown.delay(500)} className="mt-3">
            {isRevenueCatEnabled() ? (
              <View className="bg-green-500/10 rounded-lg p-2 flex-row items-center">
                <Check size={12} color="#10B981" />
                <Text className="text-green-400 text-[10px] ml-2 flex-1">
                  RevenueCat connected. Real purchases enabled.
                </Text>
              </View>
            ) : (
              <View className="bg-indigo-500/10 rounded-lg p-2 flex-row items-center">
                <Lock size={12} color="#6366F1" />
                <Text className="text-indigo-400 text-[10px] ml-2 flex-1">
                  Set up RevenueCat in Payments tab for real payments.
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
}
