import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Dimensions, TextInput, Modal, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Edit3,
  Trash2,
  RefreshCw,
  ExternalLink,
  Percent,
  MapPin,
  Building2,
  FileText,
  Globe,
  Briefcase,
  X,
  Pencil,
  Trash,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { usePortfolioStore } from '@/lib/store';
import { formatCurrency, formatPercent, formatDate, getDaysUntilMaturity, getGainColor } from '@/lib/formatters';
import { CATEGORY_INFO, SECTOR_INFO, COUNTRY_INFO, Sector, CountryCode } from '@/lib/types';
import { cn } from '@/lib/cn';
import * as Haptics from 'expo-haptics';
import { usePriceDisplay } from '@/lib/market-data/hooks';
import { StatusIndicator } from '@/components/DataAttribution';
import { useUIPreferencesStore } from '@/lib/ui-preferences-store';
import { buildEstimatedAmortizationSchedule, isFixedIncomeAsset } from '@/lib/amortization';

const SCREEN_WIDTH = Dimensions.get('window').width;

type PerformanceRange = '1M' | '6M' | '1Y' | 'ALL' | 'INCEPTION';

export default function AssetDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showPriceModal, setShowPriceModal] = React.useState(false);
  const [newPrice, setNewPrice] = React.useState('');
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [editingHistoryIndex, setEditingHistoryIndex] = React.useState<number | null>(null);
  const [editingHistoryValue, setEditingHistoryValue] = React.useState('');
  const [perfRange, setPerfRange] = React.useState<PerformanceRange>('INCEPTION');
  const [perfShowPercent, setPerfShowPercent] = React.useState(true);
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);

  const assets = usePortfolioStore((s) => s.assets);
  const deleteAsset = usePortfolioStore((s) => s.deleteAsset);
  const updateAsset = usePortfolioStore((s) => s.updateAsset);
  const hidePerformanceMetrics = useUIPreferencesStore((s) => s.hidePerformanceMetrics);

  const asset = React.useMemo(() => assets.find((a) => a.id === id), [assets, id]);

  // Get live price data (pass null if asset not found - hook handles this)
  const priceData = usePriceDisplay(asset ?? null);

  if (!asset) {
    return (
      <View className="flex-1 bg-[#0A0A0F] items-center justify-center">
        <Text className="text-gray-400">Asset not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-indigo-400">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const value = asset.currentPrice * asset.quantity;
  const invested = asset.purchasePrice * asset.quantity;
  const gain = value - invested;
  const gainPercent = (gain / invested) * 100;
  const isPositive = gain >= 0;

  const categoryInfo = CATEGORY_INFO[asset.category];
  const daysUntilMaturity = asset.maturityDate ? getDaysUntilMaturity(asset.maturityDate) : null;
  const isFixedIncome = isFixedIncomeAsset(asset);

  const sortedHistory = React.useMemo(() => {
    const history = asset.valueHistory ?? [];
    return [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [asset.valueHistory]);

  const computedPerformance = React.useMemo(() => {
    const now = new Date();
    const historyAsc = [...(asset.valueHistory ?? [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const cutoff = (() => {
      if (perfRange === '1M') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (perfRange === '6M') return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      if (perfRange === '1Y') return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      if (perfRange === 'ALL') return null;
      return new Date(asset.purchaseDate);
    })();

    const endPricePerUnit = asset.currentPrice;

    const startPricePerUnit = (() => {
      if (perfRange === 'INCEPTION') return asset.purchasePrice;
      if (historyAsc.length === 0) return asset.purchasePrice;
      if (!cutoff) return historyAsc[0].value;

      const cutoffMs = cutoff.getTime();
      const eligible = historyAsc.filter((p) => new Date(p.date).getTime() <= cutoffMs);
      if (eligible.length > 0) return eligible[eligible.length - 1].value;
      return historyAsc[0].value;
    })();

    const startTotal = startPricePerUnit * asset.quantity;
    const endTotal = endPricePerUnit * asset.quantity;
    const abs = endTotal - startTotal;
    const pct = startTotal > 0 ? (abs / startTotal) * 100 : 0;

    const label =
      perfRange === 'INCEPTION'
        ? 'Since inception'
        : perfRange === 'ALL'
          ? 'All time'
          : perfRange;

    const usesHistory = perfRange !== 'INCEPTION' && historyAsc.length > 1;
    const isManualContext = asset.isManual || priceData.provider === 'manual';

    return {
      label,
      abs,
      pct,
      startPricePerUnit,
      endPricePerUnit,
      usesHistory,
      isManualContext,
      hasHistory: historyAsc.length > 1,
    };
  }, [asset.currentPrice, asset.isManual, asset.purchaseDate, asset.purchasePrice, asset.quantity, asset.valueHistory, perfRange, priceData.provider]);

  const schedule = React.useMemo(() => {
    if (!isFixedIncome) return null;
    if (!asset.maturityDate) return null;
    if (asset.interestRate === undefined || asset.interestRate === null) return null;

    const maturity = new Date(asset.maturityDate);
    if (Number.isNaN(maturity.getTime())) return null;

    const start = new Date();
    start.setHours(9, 0, 0, 0);

    const principal = (Number(asset.purchasePrice) || 0) * (Number(asset.quantity) || 0);
    const { rows, totalInterest, totalPrincipal } = buildEstimatedAmortizationSchedule({
      principal,
      annualInterestRatePercent: asset.interestRate,
      startDate: start,
      maturityDate: maturity,
    });

    if (rows.length === 0) return null;

    return {
      rows,
      totalInterest,
      totalPrincipal,
      principal,
      maturity,
      monthlyAvgPayment: rows.reduce((s, r) => s + r.totalPayment, 0) / rows.length,
    };
  }, [asset.interestRate, asset.maturityDate, asset.purchasePrice, asset.quantity, isFixedIncome]);

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to remove "${asset.name}" from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAsset(asset.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleUpdatePrice = () => {
    setNewPrice(asset.currentPrice.toString());
    setShowPriceModal(true);
  };

  const handleSavePrice = () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = new Date().toISOString();
    updateAsset(asset.id, {
      currentPrice: price,
      isManual: true,
      valueHistory: [...(asset.valueHistory ?? []), { date: now, value: price }],
    });
    setShowPriceModal(false);
  };

  const handleViewChart = () => {
    if (asset.ticker) {
      // Open Yahoo Finance chart
      const url = `https://finance.yahoo.com/quote/${asset.ticker}`;
      Linking.openURL(url);
    } else {
      Alert.alert('No Ticker', 'This asset does not have a ticker symbol for chart viewing.');
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      <LinearGradient
        colors={[categoryInfo.color + '30', '#0A0A0F']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 350 }}
      />

      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="px-5 pb-4 flex-row items-center justify-between"
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-black/30 rounded-full items-center justify-center"
        >
          <ArrowLeft size={20} color="white" />
        </Pressable>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => router.push(`/edit-asset/${id}`)}
            className="w-10 h-10 bg-black/30 rounded-full items-center justify-center"
          >
            <Edit3 size={18} color="white" />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            className="w-10 h-10 bg-black/30 rounded-full items-center justify-center"
          >
            <Trash2 size={18} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Asset Header */}
        <Animated.View entering={FadeInDown.delay(100)} className="px-5 items-center">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: categoryInfo.color + '30' }}
          >
            <Text className="text-3xl font-bold" style={{ color: categoryInfo.color }}>
              {asset.ticker?.[0] || asset.name[0]}
            </Text>
          </View>

          <Text className="text-white text-2xl font-bold text-center">{asset.name}</Text>

          <View className="flex-row items-center mt-2">
            {asset.ticker && (
              <View className="bg-white/10 px-3 py-1 rounded-full mr-2">
                <Text className="text-gray-300">{asset.ticker}</Text>
              </View>
            )}
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: categoryInfo.color + '20' }}
            >
              <Text style={{ color: categoryInfo.color }}>{categoryInfo.label}</Text>
            </View>
          </View>

          {asset.isManual && (
            <View className="flex-row items-center mt-3 bg-amber-500/20 px-3 py-1 rounded-full">
              <RefreshCw size={12} color="#F59E0B" />
              <Text className="text-amber-500 text-sm ml-1">Manual tracking</Text>
            </View>
          )}
        </Animated.View>

        {/* Value Card */}
        <Animated.View entering={FadeInDown.delay(200)} className="mx-5 mt-8">
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={{ borderRadius: 20, padding: 20 }}
          >
            <Text className="text-gray-400 text-sm">Current Value</Text>
            <Text className="text-white text-4xl font-bold mt-1">{formatCurrency(value)}</Text>

            <View className="flex-row items-center mt-4">
              {isPositive ? (
                <TrendingUp size={20} color="#10B981" />
              ) : (
                <TrendingDown size={20} color="#EF4444" />
              )}
              <Text className="ml-2 text-lg font-semibold" style={{ color: getGainColor(gain) }}>
                {formatCurrency(Math.abs(gain))}
              </Text>
              <Text className="ml-2" style={{ color: getGainColor(gain) }}>
                ({formatPercent(gainPercent)})
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View entering={FadeInDown.delay(300)} className="px-5 mt-6">
          <View className="flex-row gap-3">
            <StatCard label="Quantity" value={asset.quantity.toLocaleString()} delay={350} />
            <StatCard
              label="Avg. Cost"
              value={formatCurrency(asset.purchasePrice)}
              delay={400}
            />
          </View>
          <View className="flex-row gap-3 mt-3">
            <StatCard
              label="Current Price"
              value={formatCurrency(asset.currentPrice)}
              delay={450}
            />
            <StatCard label="Total Invested" value={formatCurrency(invested)} delay={500} />
          </View>
        </Animated.View>

        {/* Details Section */}
        <Animated.View entering={FadeInDown.delay(550)} className="px-5 mt-8">
          <Text className="text-white text-lg font-semibold mb-4">Details</Text>

          <View className="bg-white/5 rounded-2xl overflow-hidden">
            <DetailRow
              icon={<Calendar size={18} color="#6366F1" />}
              label="Purchase Date"
              value={formatDate(asset.purchaseDate)}
            />

            {asset.maturityDate && (
              <DetailRow
                icon={<Clock size={18} color="#F59E0B" />}
                label="Maturity"
                value={`${formatDate(asset.maturityDate)} (${daysUntilMaturity} days)`}
              />
            )}

            {asset.interestRate !== undefined && (
              <DetailRow
                icon={<Percent size={18} color="#10B981" />}
                label="Interest Rate"
                value={`${asset.interestRate}%`}
              />
            )}

            {asset.platform && (
              <DetailRow
                icon={<Building2 size={18} color="#EC4899" />}
                label="Platform"
                value={asset.platform}
              />
            )}

            {asset.address && (
              <DetailRow
                icon={<MapPin size={18} color="#EF4444" />}
                label="Address"
                value={asset.address}
              />
            )}

            <DetailRow
              icon={<RefreshCw size={18} color="#9CA3AF" />}
              label="Last Updated"
              value={formatDate(asset.lastUpdated)}
              isLast
            />
          </View>
        </Animated.View>

        {/* Fixed income schedule */}
        {isFixedIncome && (
          <Animated.View entering={FadeInDown.delay(600)} className="px-5 mt-8">
            <Text className="text-white text-lg font-semibold mb-4">Amortization Schedule</Text>
            <View className="bg-white/5 rounded-2xl p-4">
              {schedule ? (
                <>
                  <View className="flex-row">
                    <View className="flex-1">
                      <Text className="text-gray-400 text-xs">Principal</Text>
                      <Text className="text-white font-semibold mt-1">
                        {formatCurrency(schedule.totalPrincipal, asset.currency)}
                      </Text>
                    </View>
                    <View className="flex-1 items-end">
                      <Text className="text-gray-400 text-xs">Estimated Interest</Text>
                      <Text className="text-white font-semibold mt-1">
                        {formatCurrency(schedule.totalInterest, asset.currency)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row mt-4">
                    <View className="flex-1">
                      <Text className="text-gray-400 text-xs">Avg. Monthly Payment</Text>
                      <Text className="text-white font-semibold mt-1">
                        {formatCurrency(schedule.monthlyAvgPayment, asset.currency)}
                      </Text>
                    </View>
                    <View className="flex-1 items-end">
                      <Text className="text-gray-400 text-xs">Matures</Text>
                      <Text className="text-white font-semibold mt-1">
                        {formatDate(schedule.maturity.toISOString())}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowScheduleModal(true);
                    }}
                    className="mt-5 bg-white/10 rounded-xl py-3 items-center"
                  >
                    <Text className="text-white font-semibold">View schedule</Text>
                  </Pressable>

                  <Text className="text-gray-500 text-xs mt-3 leading-5">
                    Estimate assumes equal monthly principal payments and interest accruing monthly.
                  </Text>
                </>
              ) : (
                <Text className="text-gray-400 leading-6">
                  Add a maturity date and interest rate to see an estimated schedule.
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* Notes Section */}
        {asset.notes && (
          <Animated.View entering={FadeInDown.delay(600)} className="px-5 mt-8">
            <Text className="text-white text-lg font-semibold mb-4">Notes</Text>
            <View className="bg-white/5 rounded-2xl p-4">
              <View className="flex-row items-start">
                <FileText size={18} color="#9CA3AF" />
                <Text className="text-gray-300 ml-3 flex-1 leading-6">{asset.notes}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Performance Metrics */}
        {!hidePerformanceMetrics && (
          <Animated.View entering={FadeInDown.delay(650)} className="px-5 mt-8">
            <Text className="text-white text-lg font-semibold mb-4">Performance</Text>

            {/* Time period selector */}
            <View className="flex-row mb-3">
              {(['1M', '6M', '1Y', 'ALL', 'INCEPTION'] as PerformanceRange[]).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPerfRange(r);
                  }}
                  className={cn(
                    'px-3 py-2 rounded-full mr-2',
                    perfRange === r ? 'bg-indigo-600' : 'bg-white/10'
                  )}
                >
                  <Text className={cn('text-xs font-semibold', perfRange === r ? 'text-white' : 'text-gray-300')}>
                    {r === 'INCEPTION' ? 'Since' : r}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Absolute vs percent */}
            <View className="flex-row mb-4">
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setPerfShowPercent(false);
                }}
                className={cn(
                  'flex-1 py-3 rounded-xl items-center justify-center mr-2',
                  !perfShowPercent ? 'bg-white/15' : 'bg-white/5'
                )}
              >
                <Text className={cn('text-sm font-semibold', !perfShowPercent ? 'text-white' : 'text-gray-400')}>
                  Amount
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setPerfShowPercent(true);
                }}
                className={cn(
                  'flex-1 py-3 rounded-xl items-center justify-center ml-2',
                  perfShowPercent ? 'bg-white/15' : 'bg-white/5'
                )}
              >
                <Text className={cn('text-sm font-semibold', perfShowPercent ? 'text-white' : 'text-gray-400')}>
                  %
                </Text>
              </Pressable>
            </View>

            <View className="bg-white/5 rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-400">{computedPerformance.label}</Text>
                <Text
                  style={{
                    color: getGainColor(perfShowPercent ? computedPerformance.pct : computedPerformance.abs),
                  }}
                  className="font-semibold"
                >
                  {perfShowPercent ? formatPercent(computedPerformance.pct) : formatCurrency(computedPerformance.abs)}
                </Text>
              </View>

              <Text className="text-gray-500 text-xs">
                {computedPerformance.isManualContext
                  ? 'Manual performance uses the values you enter over time.'
                  : perfRange === 'INCEPTION'
                    ? 'Based on your stored purchase price and current price.'
                    : computedPerformance.hasHistory
                      ? 'Based on your saved valuation history.'
                      : 'No history available for this period yet.'}
              </Text>

              <View className="h-3 rounded-full bg-black/30 overflow-hidden mt-4">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(Math.max(50 + computedPerformance.pct, 0), 100)}%`,
                    backgroundColor: getGainColor(computedPerformance.pct),
                  }}
                />
              </View>

              <View className="flex-row justify-between mt-2">
                <Text className="text-gray-500 text-xs">
                  Start: {formatCurrency(computedPerformance.startPricePerUnit)}
                </Text>
                <Text className="text-gray-500 text-xs">
                  Now: {formatCurrency(computedPerformance.endPricePerUnit)}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Value History Chart (for manual assets) */}
        {!hidePerformanceMetrics && asset.valueHistory && asset.valueHistory.length > 0 && (
          <Animated.View entering={FadeInDown.delay(700)} className="px-5 mt-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-lg font-semibold">Value History</Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowHistoryModal(true);
                }}
                className="px-3 py-2 rounded-full bg-white/10"
              >
                <Text className="text-gray-300 text-xs font-semibold">Manage</Text>
              </Pressable>
            </View>
            <View className="bg-white/5 rounded-2xl p-4">
              {asset.valueHistory.length > 1 ? (
                <SimpleLineChart data={asset.valueHistory} color={categoryInfo.color} />
              ) : (
                <View>
                  <Text className="text-gray-400">
                    Add another valuation update to see a chart.
                  </Text>
                  <Text className="text-gray-500 text-xs mt-2">
                    Tip: tap “Update Price” after you re-value this asset.
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Asset Info (Country/Sector) */}
        {(asset.country || asset.sector) && (
          <Animated.View entering={FadeInDown.delay(750)} className="px-5 mt-8">
            <Text className="text-white text-lg font-semibold mb-4">Asset Info</Text>
            <View className="bg-white/5 rounded-2xl overflow-hidden">
              {asset.country && (
                <View className="flex-row items-center p-4 border-b border-white/5">
                  <Globe size={18} color="#EC4899" />
                  <Text className="text-gray-400 ml-3 flex-1">Country</Text>
                  <Text className="text-lg mr-2">
                    {COUNTRY_INFO[asset.country as CountryCode]?.flag || '🏳️'}
                  </Text>
                  <Text className="text-white">
                    {asset.country === 'OTHER'
                      ? asset.countryName || 'Other'
                      : COUNTRY_INFO[asset.country as CountryCode]?.name || asset.country}
                  </Text>
                </View>
              )}
              {asset.sector && (
                <View className="flex-row items-center p-4">
                  <Briefcase size={18} color="#6366F1" />
                  <Text className="text-gray-400 ml-3 flex-1">Sector</Text>
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: SECTOR_INFO[asset.sector as Sector]?.color || '#6B7280' }}
                  />
                  <Text className="text-white">
                    {SECTOR_INFO[asset.sector as Sector]?.label || asset.sector}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(800)} className="px-5 mt-8">
          {/* Price Status */}
          {priceData && (
            <View className="flex-row items-center justify-center mb-4">
              <StatusIndicator
                status={priceData.provider === 'manual' ? 'manual' : priceData.isFresh ? 'fresh' : 'stale'}
              />
              <Text className="text-gray-500 text-xs ml-2">
                {priceData.provider === 'manual'
                  ? 'Manual price entry'
                  : priceData.isFresh
                    ? `Live from ${priceData.provider}`
                    : 'Cached price'
                }
              </Text>
            </View>
          )}
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleUpdatePrice}
              className="flex-1 bg-indigo-600 rounded-2xl p-4 items-center"
            >
              <Text className="text-white font-semibold">Update Price</Text>
            </Pressable>
            <Pressable
              onPress={handleViewChart}
              className="flex-1 bg-white/10 rounded-2xl p-4 items-center flex-row justify-center"
            >
              <ExternalLink size={16} color="white" />
              <Text className="text-white font-semibold ml-2">View Chart</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Update Price Modal */}
        <Modal
          visible={showPriceModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPriceModal(false)}
        >
          <View className="flex-1 bg-black/70 items-center justify-center px-5">
            <View className="bg-[#1a1a2e] rounded-3xl p-6 w-full max-w-sm">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-white text-xl font-bold">Update Price</Text>
                <Pressable onPress={() => setShowPriceModal(false)}>
                  <X size={24} color="#9CA3AF" />
                </Pressable>
              </View>

              <Text className="text-gray-400 mb-2">New price for {asset.name}</Text>
              <View className="bg-white/10 rounded-xl px-4 py-3 flex-row items-center">
                <Text className="text-gray-400 text-lg mr-2">$</Text>
                <TextInput
                  value={newPrice}
                  onChangeText={setNewPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#6B7280"
                  className="flex-1 text-white text-xl"
                  autoFocus
                />
              </View>

              <View className="flex-row gap-3 mt-6">
                <Pressable
                  onPress={() => setShowPriceModal(false)}
                  className="flex-1 bg-white/10 rounded-xl py-3 items-center"
                >
                  <Text className="text-gray-300 font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSavePrice}
                  className="flex-1 bg-indigo-600 rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-semibold">Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Amortization Schedule Modal */}
        <Modal
          visible={showScheduleModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowScheduleModal(false)}
        >
          <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View className="w-full bg-[#111827] rounded-2xl p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-lg font-bold">Schedule</Text>
                <Pressable
                  onPress={() => setShowScheduleModal(false)}
                  className="w-9 h-9 items-center justify-center"
                >
                  <X size={20} color="#9CA3AF" />
                </Pressable>
              </View>

              {!schedule ? (
                <Text className="text-gray-400 mt-4">No schedule available.</Text>
              ) : (
                <ScrollView className="mt-4" style={{ maxHeight: 420 }}>
                  {schedule.rows.map((row, idx) => (
                    <View
                      key={`${row.date}-${idx}`}
                      className={cn('py-3', idx > 0 && 'border-t border-white/10')}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-white font-semibold">{formatDate(row.date)}</Text>
                        <Text className="text-gray-300">
                          {formatCurrency(row.totalPayment, asset.currency)}
                        </Text>
                      </View>

                      <View className="flex-row mt-2">
                        <View className="flex-1">
                          <Text className="text-gray-500 text-xs">Principal</Text>
                          <Text className="text-gray-300 text-sm">
                            {formatCurrency(row.principalPayment, asset.currency)}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-gray-500 text-xs">Interest</Text>
                          <Text className="text-gray-300 text-sm">
                            {formatCurrency(row.interestPayment, asset.currency)}
                          </Text>
                        </View>
                        <View className="flex-1 items-end">
                          <Text className="text-gray-500 text-xs">Remaining</Text>
                          <Text className="text-gray-300 text-sm">
                            {formatCurrency(row.remainingPrincipal, asset.currency)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <Modal
          visible={showHistoryModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHistoryModal(false)}
        >
          <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View className="w-full bg-[#111827] rounded-2xl p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-lg font-bold">Valuation History</Text>
                <Pressable
                  onPress={() => setShowHistoryModal(false)}
                  className="w-9 h-9 items-center justify-center"
                >
                  <X size={20} color="#9CA3AF" />
                </Pressable>
              </View>

              {sortedHistory.length === 0 ? (
                <Text className="text-gray-400 mt-4">No valuations yet.</Text>
              ) : (
                <ScrollView className="mt-4" style={{ maxHeight: 360 }}>
                  {sortedHistory.map((point, idx) => (
                    <View
                      key={`${point.date}-${idx}`}
                      className={cn(
                        'flex-row items-center py-3',
                        idx > 0 && 'border-t border-white/10'
                      )}
                    >
                      <View className="flex-1">
                        <Text className="text-white font-semibold">{formatCurrency(point.value)}</Text>
                        <Text className="text-gray-400 text-xs mt-1">{formatDate(point.date)}</Text>
                      </View>

                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setEditingHistoryIndex(idx);
                          setEditingHistoryValue(String(point.value));
                        }}
                        className="w-10 h-10 bg-white/10 rounded-full items-center justify-center mr-2"
                      >
                        <Pencil size={16} color="#9CA3AF" />
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          const next = sortedHistory.filter((_, i) => i !== idx);
                          updateAsset(asset.id, { valueHistory: next });
                        }}
                        className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
                      >
                        <Trash size={16} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}

              {editingHistoryIndex !== null && (
                <View className="mt-5 pt-5 border-t border-white/10">
                  <Text className="text-gray-400 text-sm mb-2">Edit valuation</Text>
                  <TextInput
                    value={editingHistoryValue}
                    onChangeText={setEditingHistoryValue}
                    placeholder="0.00"
                    placeholderTextColor="#6B7280"
                    className="bg-white/10 rounded-xl p-4 text-white"
                    keyboardType="decimal-pad"
                  />
                  <View className="flex-row mt-4 gap-3">
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditingHistoryIndex(null);
                        setEditingHistoryValue('');
                      }}
                      className="flex-1 bg-white/10 rounded-xl py-3 items-center"
                    >
                      <Text className="text-gray-300 font-semibold">Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const nextValue = Number(editingHistoryValue);
                        if (!Number.isFinite(nextValue) || nextValue <= 0) return;

                        const next = [...sortedHistory];
                        next[editingHistoryIndex] = { ...next[editingHistoryIndex], value: nextValue };
                        updateAsset(asset.id, { valueHistory: next });
                        setEditingHistoryIndex(null);
                        setEditingHistoryValue('');
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }}
                      className="flex-1 bg-indigo-600 rounded-xl py-3 items-center"
                    >
                      <Text className="text-white font-semibold">Save</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <Animated.View entering={FadeInRight.delay(delay)} className="flex-1 bg-white/5 rounded-2xl p-4">
      <Text className="text-gray-400 text-xs">{label}</Text>
      <Text className="text-white text-lg font-semibold mt-1">{value}</Text>
    </Animated.View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={cn(
        'flex-row items-center p-4',
        !isLast && 'border-b border-white/5'
      )}
    >
      {icon}
      <Text className="text-gray-400 ml-3 flex-1">{label}</Text>
      <Text className="text-white">{value}</Text>
    </View>
  );
}

// Simple line chart component for value history
function SimpleLineChart({
  data,
  color,
}: {
  data: { date: string; value: number }[];
  color: string;
}) {
  const chartWidth = SCREEN_WIDTH - 72; // Padding accounted for
  const chartHeight = 120;

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Generate points for the line
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((d.value - minValue) / range) * chartHeight;
    return { x, y, value: d.value, date: d.date };
  });

  // Calculate change
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const change = lastValue - firstValue;
  const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

  return (
    <View>
      {/* Chart header */}
      <View className="flex-row justify-between mb-4">
        <View>
          <Text className="text-gray-400 text-xs">Current</Text>
          <Text className="text-white text-lg font-semibold">
            {formatCurrency(lastValue)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-gray-400 text-xs">Change</Text>
          <Text
            className="text-lg font-semibold"
            style={{ color: getGainColor(change) }}
          >
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* SVG Chart */}
      <View style={{ height: chartHeight, width: chartWidth }}>
        <View
          style={{
            position: 'absolute',
            width: chartWidth,
            height: chartHeight,
          }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <View
              key={ratio}
              style={{
                position: 'absolute',
                top: ratio * chartHeight,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            />
          ))}

          {/* Line segments */}
          {points.map((point, i) => {
            if (i === 0) return null;
            const prevPoint = points[i - 1];
            const dx = point.x - prevPoint.x;
            const dy = point.y - prevPoint.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: prevPoint.x,
                  top: prevPoint.y,
                  width: length,
                  height: 2,
                  backgroundColor: color,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          })}

          {/* Data points */}
          {points.map((point, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: point.x - 4,
                top: point.y - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: color,
                borderWidth: 2,
                borderColor: '#0A0A0F',
              }}
            />
          ))}
        </View>
      </View>

      {/* Date labels */}
      <View className="flex-row justify-between mt-2">
        <Text className="text-gray-500 text-xs">
          {new Date(data[0]?.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
        </Text>
        <Text className="text-gray-500 text-xs">
          {new Date(data[data.length - 1]?.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}
