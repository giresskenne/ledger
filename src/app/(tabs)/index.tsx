import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TrendingUp, TrendingDown, ChevronRight, Sparkles, Bell, Eye, EyeOff, AlertTriangle, Globe, PieChart, Shield, Calendar, PiggyBank, RefreshCw, DollarSign } from 'lucide-react-native';
import { PolarChart, Pie } from 'victory-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePortfolioStore } from '@/lib/store';
import { useOnboardingStore } from '@/lib/onboarding-store';
import { useRoomStore, getCurrentTaxYearId, getEffectiveAnnualLimit } from '@/lib/room-store';
import { FREE_TIER_LIMITS, useEntitlementStatus } from '@/lib/premium-store';
import { formatCurrency, formatPercent, getGainColor } from '@/lib/formatters';
import { CATEGORY_INFO, SECTOR_INFO, COUNTRY_INFO, Sector, CountryCode } from '@/lib/types';
import { cn } from '@/lib/cn';
import { AssetLimitBanner, PremiumPaywall } from '@/components/PremiumPaywall';
import { useNotificationsStore } from '@/lib/notifications-store';
import { useSyncGeneratedEvents } from '@/lib/events';
import { useTheme } from '@/lib/theme-store';
import { useUIPreferencesStore } from '@/lib/ui-preferences-store';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [hideBalance, setHideBalance] = React.useState(false);
  const hidePerformanceMetrics = useUIPreferencesStore((s) => s.hidePerformanceMetrics);
  const [isReady, setIsReady] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  useSyncGeneratedEvents();

  // Check onboarding status
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const registeredAccountsEnabled = useOnboardingStore((s) => s.registeredAccountsEnabled);
  const selectedRegisteredAccounts = useOnboardingStore((s) => s.selectedRegisteredAccounts);
  const selectedCurrency = useOnboardingStore((s) => s.selectedCurrency);
  const selectedCountry = useOnboardingStore((s) => s.selectedCountry);

  // Rooms data
  const getAccountsForJurisdiction = useRoomStore((s) => s.getAccountsForJurisdiction);
  const getRemainingRoom = useRoomStore((s) => s.getRemainingRoom);
  const jurisdictionProfile = useRoomStore((s) => s.jurisdictionProfile);

  useEffect(() => {
    // Small delay to ensure layout is mounted before navigating
    const timer = setTimeout(() => {
      if (!hasCompletedOnboarding) {
        router.replace('/onboarding');
      } else {
        setIsReady(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [hasCompletedOnboarding]);

  // Select primitive values and arrays directly from store
  const assets = usePortfolioStore((s) => s.assets);
  const events = useNotificationsStore((s) => s.events);

  // Use unified entitlement status
  const { isPremium } = useEntitlementStatus();

  // Asset limit checking
  const assetLimit = isPremium ? Infinity : FREE_TIER_LIMITS.maxAssets;
  const isAtLimit = !isPremium && assets.length >= assetLimit;

  const handleAddAsset = () => {
    if (isAtLimit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowPaywall(true);
    } else {
      router.push('/add-asset');
    }
  };

  // Compute derived values with useMemo
  const summary = React.useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.currentPrice * asset.quantity, 0);
    const totalInvested = assets.reduce((sum, asset) => sum + asset.purchasePrice * asset.quantity, 0);
    const totalGain = totalValue - totalInvested;
    const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
    const dayChange = totalValue * 0.0085;
    const dayChangePercent = 0.85;

    return { totalValue, totalInvested, totalGain, totalGainPercent, dayChange, dayChangePercent };
  }, [assets]);

  const allocation = React.useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.currentPrice * asset.quantity, 0);
    const categoryTotals: Record<string, number> = {};

    assets.forEach((asset) => {
      const value = asset.currentPrice * asset.quantity;
      categoryTotals[asset.category] = (categoryTotals[asset.category] || 0) + value;
    });

    return Object.entries(categoryTotals)
      .map(([category, value]) => ({
        category,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: CATEGORY_INFO[category as keyof typeof CATEGORY_INFO]?.color || '#6B7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const topPerformers = React.useMemo(() => {
    return [...assets]
      .map((asset) => ({
        ...asset,
        gainPercent: ((asset.currentPrice - asset.purchasePrice) / asset.purchasePrice) * 100,
      }))
      .sort((a, b) => b.gainPercent - a.gainPercent)
      .slice(0, 3);
  }, [assets]);

  const platformCount = React.useMemo(() => {
    return new Set(assets.map((a) => a.platform).filter(Boolean)).size;
  }, [assets]);

  const unreadEventsCount = React.useMemo(() => {
    return events.reduce((count, event) => count + (event.isRead ? 0 : 1), 0);
  }, [events]);

  const upcomingEvents = React.useMemo(() => {
    const now = Date.now();
    return events
      .filter((event) => new Date(event.date).getTime() >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  const upcomingPreview = upcomingEvents.slice(0, 2);

  // Geographic allocation
  const countryAllocation = React.useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.currentPrice * asset.quantity, 0);
    const countryTotals: Record<string, number> = {};

    assets.forEach((asset) => {
      const country = asset.country || 'OTHER';
      const value = asset.currentPrice * asset.quantity;
      countryTotals[country] = (countryTotals[country] || 0) + value;
    });

    return Object.entries(countryTotals)
      .map(([code, value]) => ({
        code: code as CountryCode,
        name: COUNTRY_INFO[code as CountryCode]?.name || code,
        flag: COUNTRY_INFO[code as CountryCode]?.flag || '🏳️',
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: COUNTRY_INFO[code as CountryCode]?.color || '#6B7280',
        isHighRisk: totalValue > 0 && (value / totalValue) * 100 > 60,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [assets]);

  // Sector allocation
  const sectorAllocation = React.useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.currentPrice * asset.quantity, 0);
    const sectorTotals: Record<string, number> = {};

    assets.forEach((asset) => {
      const sector = asset.sector || 'other';
      const value = asset.currentPrice * asset.quantity;
      sectorTotals[sector] = (sectorTotals[sector] || 0) + value;
    });

    return Object.entries(sectorTotals)
      .map(([code, value]) => ({
        code: code as Sector,
        name: SECTOR_INFO[code as Sector]?.label || code,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: SECTOR_INFO[code as Sector]?.color || '#6B7280',
        isHighRisk: totalValue > 0 && (value / totalValue) * 100 > 40,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [assets]);

  // Concentration warnings
  const concentrationWarnings = React.useMemo(() => {
    const warnings: { type: string; message: string; severity: 'high' | 'medium' }[] = [];

    const topCountry = countryAllocation[0];
    if (topCountry && topCountry.percentage > 60) {
      warnings.push({
        type: 'geographic',
        message: `${topCountry.percentage.toFixed(0)}% in ${topCountry.name}`,
        severity: 'high',
      });
    } else if (topCountry && topCountry.percentage > 40) {
      warnings.push({
        type: 'geographic',
        message: `${topCountry.percentage.toFixed(0)}% in ${topCountry.name}`,
        severity: 'medium',
      });
    }

    const topSector = sectorAllocation[0];
    if (topSector && topSector.percentage > 40) {
      warnings.push({
        type: 'sector',
        message: `${topSector.percentage.toFixed(0)}% in ${topSector.name}`,
        severity: topSector.percentage > 50 ? 'high' : 'medium',
      });
    }

    return warnings;
  }, [countryAllocation, sectorAllocation]);

  const isPositive = summary.totalGain >= 0;
  const isDayPositive = summary.dayChange >= 0;

  // Show loading while checking onboarding
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }} className="items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={[theme.headerGradientStart, theme.headerGradientEnd]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 12 }} className="px-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text style={{ color: theme.textSecondary }} className="text-sm">
                Good morning
              </Text>
              <Text style={{ color: theme.text }} className="text-2xl font-bold mt-1">
                Your Portfolio
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setHideBalance(!hideBalance)}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.surfaceHover }}
              >
                {hideBalance ? (
                  <EyeOff size={20} color={theme.textTertiary} />
                ) : (
                  <Eye size={20} color={theme.textTertiary} />
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/events',
                    params: { returnTo: '/' },
                  } as any);
                }}
                className="w-10 h-10 rounded-full items-center justify-center relative"
                style={{ backgroundColor: theme.surfaceHover }}
              >
                <Bell size={20} color={theme.textTertiary} />
                {unreadEventsCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-indigo-500 rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center">
                    <Text className="text-white text-[10px] font-bold">
                      {unreadEventsCount > 99 ? '99+' : unreadEventsCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Total Value Card */}
          <View className="mt-8">
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 24 }}
            >
              <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">
                Total Portfolio Value
              </Text>
              <Text style={{ color: theme.text }} className="text-4xl font-bold">
                {hideBalance ? '••••••' : formatCurrency(summary.totalValue)}
              </Text>

              {!hidePerformanceMetrics && (
                <View className="flex-row items-center mt-4 gap-4">
                  <View className="flex-row items-center">
                    {isPositive ? (
                      <TrendingUp size={16} color="#10B981" />
                    ) : (
                      <TrendingDown size={16} color="#EF4444" />
                    )}
                    <Text
                      className="ml-1 font-semibold"
                      style={{ color: getGainColor(summary.totalGain) }}
                    >
                      {hideBalance ? '••••' : formatCurrency(Math.abs(summary.totalGain))}
                    </Text>
                    <Text
                      className="ml-1 text-sm"
                      style={{ color: getGainColor(summary.totalGain) }}
                    >
                      ({formatPercent(summary.totalGainPercent)})
                    </Text>
                  </View>

                  <View className="h-4 w-px" style={{ backgroundColor: theme.border }} />

                  <View className="flex-row items-center">
                    <View
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: isDayPositive ? '#10B981' : '#EF4444' }}
                    />
                    <Text style={{ color: theme.textSecondary }} className="text-sm">
                      Today:{' '}
                    </Text>
                    <Text style={{ color: getGainColor(summary.dayChange) }} className="text-sm font-medium">
                      {formatPercent(summary.dayChangePercent)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Mini allocation bar */}
              <View
                className="mt-6 h-2 rounded-full overflow-hidden flex-row"
                style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : theme.borderLight }}
              >
                {allocation.slice(0, 5).map((item) => (
                  <View
                    key={item.category}
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                ))}
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row px-5 mt-6 gap-3">
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
            <Text style={{ color: theme.textSecondary }} className="text-xs">
              Invested
            </Text>
            <Text style={{ color: theme.text }} className="text-lg font-semibold mt-1">
              {hideBalance ? '••••' : formatCurrency(summary.totalInvested)}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
            <Text style={{ color: theme.textSecondary }} className="text-xs">
              Assets
            </Text>
            <Text style={{ color: theme.text }} className="text-lg font-semibold mt-1">
              {assets.length}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
            <Text style={{ color: theme.textSecondary }} className="text-xs">
              Platforms
            </Text>
            <Text style={{ color: theme.text }} className="text-lg font-semibold mt-1">
              {platformCount}
            </Text>
          </View>
        </View>

        {/* Premium Banner */}
        {!isPremium && (
          <View className="px-5 mt-6">
            <Pressable
              onPress={() => {
                console.log('[Premium Debug] Upgrade button clicked:', {
                  location: 'home-tab-banner',
                  isPremium: false,
                  timestamp: new Date().toISOString(),
                });
                router.push('/premium');
              }}
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
                  <Text className="text-white font-bold">Unlock Risk Analysis</Text>
                  <Text className="text-white/80 text-sm">
                    Get AI-powered portfolio insights
                  </Text>
                </View>
                <ChevronRight size={20} color="white" />
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Concentration Warnings */}
        {concentrationWarnings.length > 0 && (
          <View className="px-5 mt-6">
            <View className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20">
              <View className="flex-row items-center mb-3">
                <AlertTriangle size={18} color="#F59E0B" />
                <Text className="text-amber-400 font-semibold ml-2">Concentration Alert</Text>
              </View>
              {concentrationWarnings.map((warning, index) => (
                <View key={index} className={cn('flex-row items-center', index > 0 && 'mt-2')}>
                  <View
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: warning.severity === 'high' ? '#EF4444' : '#F59E0B' }}
                  />
                  <Text style={{ color: theme.textSecondary }} className="text-sm flex-1">
                    {warning.message}
                  </Text>
                  {isPremium ? (
                    <Pressable onPress={() => router.push('/(tabs)/analysis')}>
                      <Text className="text-indigo-400 text-xs">View details</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        console.log('[Premium Debug] Upgrade button clicked:', {
                          location: 'home-tab-concentration-warning',
                          warningMessage: warning.message,
                          isPremium: false,
                          timestamp: new Date().toISOString(),
                        });
                        router.push('/premium');
                      }}
                    >
                      <Text className="text-amber-400 text-xs">Upgrade</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Geographic Exposure */}
        <View className="px-5 mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Globe size={18} color="#EC4899" />
              <Text style={{ color: theme.text }} className="text-lg font-semibold ml-2">
                Geographic Exposure
              </Text>
            </View>
            {isPremium && (
              <Pressable onPress={() => router.push('/(tabs)/analysis')}>
                <Text className="text-indigo-400 text-sm">Details</Text>
              </Pressable>
            )}
          </View>

          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
            {countryAllocation.map((item, index) => (
              <Pressable
                key={item.code}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/(tabs)/holdings',
                    params: { country: item.code },
                  } as any);
                }}
                className={cn('', index > 0 && 'mt-4')}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Text className="text-lg mr-2">{item.flag}</Text>
                    <Text style={{ color: theme.text }}>{item.name}</Text>
                    {item.isHighRisk && (
                      <AlertTriangle size={12} color="#EF4444" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  <Text style={{ color: theme.text }} className="font-medium">
                    {item.percentage.toFixed(1)}%
                  </Text>
                </View>
                <View
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : theme.borderLight }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(item.percentage, 100)}%`,
                      backgroundColor: item.isHighRisk ? '#EF4444' : item.color,
                    }}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Sector Allocation */}
        <View className="px-5 mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <PieChart size={18} color="#6366F1" />
              <Text style={{ color: theme.text }} className="text-lg font-semibold ml-2">
                Sector Allocation
              </Text>
            </View>
            {isPremium && (
              <Pressable onPress={() => router.push('/(tabs)/analysis')}>
                <Text className="text-indigo-400 text-sm">Details</Text>
              </Pressable>
            )}
          </View>

          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
            {/* Simple treemap-style mosaic (tap to drill down) */}
            {sectorAllocation.length > 0 && (
              <Animated.View entering={FadeInDown.delay(120)} className="mb-4">
                <View className="flex-row overflow-hidden rounded-2xl" style={{ height: 110 }}>
                  {[sectorAllocation[0], sectorAllocation[1], sectorAllocation[2]]
                    .filter(Boolean)
                    .map((item, idx, arr) => (
                    <Pressable
                      key={`mosaic-top-${item.code}`}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: '/(tabs)/holdings',
                          params: { sector: item.code },
                        } as any);
                      }}
                      style={{ flex: Math.max(1, item.percentage) }}
                      className={cn('rounded-2xl overflow-hidden', idx < arr.length - 1 && 'mr-2')}
                    >
                      <View style={{ backgroundColor: item.color }} className="flex-1 p-3 justify-end">
                        <Text className="text-white font-bold text-sm" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text className="text-white/80 text-xs">{item.percentage.toFixed(0)}%</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                <View className="flex-row overflow-hidden rounded-2xl mt-2" style={{ height: 80 }}>
                  {[sectorAllocation[3], sectorAllocation[4], sectorAllocation[5]]
                    .filter(Boolean)
                    .map((item, idx, arr) => (
                    <Pressable
                      key={`mosaic-bottom-${item.code}`}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: '/(tabs)/holdings',
                          params: { sector: item.code },
                        } as any);
                      }}
                      style={{ flex: Math.max(1, item.percentage) }}
                      className={cn('rounded-2xl overflow-hidden', idx < arr.length - 1 && 'mr-2')}
                    >
                      <View style={{ backgroundColor: item.color }} className="flex-1 p-3 justify-end">
                        <Text className="text-white font-bold text-xs" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text className="text-white/80 text-[10px]">{item.percentage.toFixed(0)}%</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}

            {sectorAllocation.map((item, index) => (
              <Pressable
                key={item.code}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/(tabs)/holdings',
                    params: { sector: item.code },
                  } as any);
                }}
                className={cn('flex-row items-center', index > 0 && 'mt-4')}
              >
                <View className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <Text style={{ color: theme.text }} className="flex-1 ml-3">
                  {item.name}
                </Text>
                {item.isHighRisk && (
                  <AlertTriangle size={12} color="#EF4444" style={{ marginRight: 8 }} />
                )}
                <Text style={{ color: theme.text }} className="font-medium w-14 text-right">
                  {item.percentage.toFixed(1)}%
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Allocation Breakdown */}
        <View className="px-5 mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text style={{ color: theme.text }} className="text-lg font-semibold">
              Asset Allocation
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/holdings')}>
              <Text className="text-indigo-400 text-sm">See all</Text>
            </Pressable>
          </View>

          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
            {allocation.length > 0 && (
              <Animated.View entering={FadeInDown.delay(140)} className="items-center mb-4">
                <View style={{ width: 180, height: 180 }}>
                  <PolarChart
                    data={allocation.slice(0, 8).map((a) => ({
                      label: CATEGORY_INFO[a.category as keyof typeof CATEGORY_INFO]?.label ?? a.category,
                      value: a.value,
                      color: a.color,
                    }))}
                    labelKey="label"
                    valueKey="value"
                    colorKey="color"
                  >
                    <Pie.Chart innerRadius={60} size={180} />
                  </PolarChart>
                </View>
                <Text style={{ color: theme.textTertiary }} className="text-xs mt-2">
                  Tap a row below to filter holdings.
                </Text>
              </Animated.View>
            )}
            {allocation.slice(0, 5).map((item, index) => (
              <Pressable
                key={item.category}
                className={cn('flex-row items-center', index > 0 && 'mt-4')}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/(tabs)/holdings',
                    params: { category: item.category },
                  } as any);
                }}
              >
                <View
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <Text style={{ color: theme.text }} className="flex-1 ml-3">
                  {CATEGORY_INFO[item.category as keyof typeof CATEGORY_INFO]?.label || item.category}
                </Text>
                <Text style={{ color: theme.textSecondary }} className="mr-3">
                  {hideBalance ? '••••' : formatCurrency(item.value)}
                </Text>
                <Text style={{ color: theme.text }} className="font-medium w-14 text-right">
                  {item.percentage.toFixed(1)}%
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Top Performers */}
        {!hidePerformanceMetrics && (
          <View className="px-5 mt-8">
            <Text style={{ color: theme.text }} className="text-lg font-semibold mb-4">
              Top Performers
            </Text>

            {topPerformers.map((asset, index) => (
              <Pressable
                key={asset.id}
                onPress={() => router.push(`/asset/${asset.id}`)}
                className={cn(
                  'rounded-2xl p-4 flex-row items-center',
                  index > 0 && 'mt-3'
                )}
                style={{ backgroundColor: theme.surface }}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: CATEGORY_INFO[asset.category].color + '20' }}
                >
                  <Text className="text-lg font-bold" style={{ color: CATEGORY_INFO[asset.category].color }}>
                    {asset.ticker?.[0] || asset.name[0]}
                  </Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text style={{ color: theme.text }} className="font-medium">
                    {asset.name}
                  </Text>
                  <Text style={{ color: theme.textSecondary }} className="text-sm">
                    {asset.ticker || CATEGORY_INFO[asset.category].label}
                  </Text>
                </View>
                <View className="items-end">
                  <Text style={{ color: theme.text }} className="font-medium">
                    {hideBalance ? '••••' : formatCurrency(asset.currentPrice * asset.quantity)}
                  </Text>
                  <Text style={{ color: getGainColor(asset.gainPercent) }} className="text-sm">
                    {formatPercent(asset.gainPercent)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View className="px-5 mt-8">
          <Text style={{ color: theme.text }} className="text-lg font-semibold mb-4">
            Quick Actions
          </Text>

          <View className="flex-row gap-3">
            <Pressable
              onPress={handleAddAsset}
              className="flex-1 bg-indigo-600 rounded-2xl p-4 items-center"
            >
              <Text className="text-white font-semibold">Add Asset</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/analysis')}
              className="flex-1 rounded-2xl p-4 items-center"
              style={{ backgroundColor: theme.surfaceHover }}
            >
              <Text style={{ color: theme.text }} className="font-semibold">
                Analyze
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Contribution Room Card - Only show if registered accounts are enabled */}
        {registeredAccountsEnabled && selectedRegisteredAccounts.length > 0 && (
          <View className="px-5 mt-8">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/rooms',
                  params: { returnTo: '/' },
                } as any);
              }}
              className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20"
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center mr-3">
                    <Shield size={20} color="#10B981" />
                  </View>
                  <View>
                    <Text style={{ color: theme.text }} className="font-semibold">
                      Contribution Room
                    </Text>
                    <Text style={{ color: theme.textSecondary }} className="text-xs">
                      {selectedRegisteredAccounts.length} account{selectedRegisteredAccounts.length !== 1 ? 's' : ''} tracked
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#10B981" />
              </View>

              {/* Progress bars for enabled accounts */}
              <View className="gap-2">
                {selectedRegisteredAccounts.slice(0, 2).map((accountType) => {
                  const accounts = getAccountsForJurisdiction();
                  const config = accounts.find((a) => a.type === accountType);
                  if (!config) return null;

                  const remaining = getRemainingRoom(accountType);
                  const limit = getEffectiveAnnualLimit(
                    accountType,
                    jurisdictionProfile?.birthDate
                  );
                  const contributed = limit - remaining;
                  const progress = limit > 0 ? Math.min((contributed / limit) * 100, 100) : 0;

                  return (
                    <View key={accountType}>
                      <View className="flex-row justify-between mb-1">
                        <Text style={{ color: theme.textSecondary }} className="text-xs">
                          {config.shortName}
                        </Text>
                        <Text className="text-emerald-400 text-xs font-medium">
                          {formatCurrency(remaining, selectedCurrency)} left
                        </Text>
                      </View>
                      <View
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : theme.borderLight }}
                      >
                        <View
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>

              {selectedRegisteredAccounts.length > 2 && (
                <Text className="text-emerald-400 text-xs mt-2 text-center">
                  +{selectedRegisteredAccounts.length - 2} more accounts
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Upcoming Events Preview */}
        {upcomingPreview.length > 0 && (
          <View className="px-5 mt-8">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/events',
                  params: { returnTo: '/' },
                } as any);
              }}
              className="bg-indigo-500/10 rounded-2xl p-4 border border-indigo-500/20"
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-indigo-500/20 items-center justify-center mr-3">
                    <Bell size={20} color="#6366F1" />
                  </View>
                  <View>
                    <Text style={{ color: theme.text }} className="font-semibold">
                      Upcoming Events
                    </Text>
                    <Text style={{ color: theme.textSecondary }} className="text-xs">
                      {upcomingEvents.length} upcoming • {unreadEventsCount} new
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#6366F1" />
              </View>

              <View className="gap-3">
                {upcomingPreview.map((event) => {
                  const eventDateMs = new Date(event.date).getTime();
                  const daysUntil = Math.ceil((eventDateMs - Date.now()) / (1000 * 60 * 60 * 24));
                  const isUrgent = daysUntil <= 3 && daysUntil >= 0;

                  const Icon =
                    event.type === 'maturity'
                      ? Calendar
                      : event.type === 'contribution_reminder'
                        ? PiggyBank
                        : event.type === 'rebalance'
                          ? RefreshCw
                          : event.type === 'dividend'
                            ? DollarSign
                            : Calendar;

                  return (
                    <View key={event.id} className="flex-row items-center">
                      <View
                        className="w-9 h-9 rounded-xl items-center justify-center"
                        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : theme.surfaceHover }}
                      >
                        <Icon size={16} color={isUrgent ? '#F59E0B' : '#9CA3AF'} />
                      </View>
                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center">
                          <Text
                            style={{ color: theme.text }}
                            className={cn('font-medium', event.isRead ? 'opacity-80' : '')}
                            numberOfLines={1}
                          >
                            {event.title}
                          </Text>
                          {!event.isRead && <View className="w-2 h-2 rounded-full bg-indigo-500 ml-2" />}
                        </View>
                        <Text style={{ color: theme.textSecondary }} className="text-xs mt-0.5" numberOfLines={1}>
                          {event.description}
                        </Text>
                      </View>
                      <View className="items-end ml-3">
                        <Text
                          style={{ color: isUrgent ? '#FBBF24' : theme.textSecondary }}
                          className="text-xs font-medium"
                        >
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Pressable>
          </View>
        )}

        {/* Asset Limit Banner */}
        {!isPremium && (
          <View className="mt-6">
            <AssetLimitBanner
              currentCount={assets.length}
              maxCount={FREE_TIER_LIMITS.maxAssets}
              onUpgrade={() => setShowPaywall(true)}
            />
          </View>
        )}
      </ScrollView>

      {/* Premium Paywall Modal */}
      <PremiumPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="asset_limit"
      />
    </View>
  );
}
