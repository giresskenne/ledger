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
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { usePortfolioStore } from '@/lib/store';
import { formatCurrency, formatPercent, formatDate, getDaysUntilMaturity, getGainColor } from '@/lib/formatters';
import { CATEGORY_INFO, SECTOR_INFO, COUNTRY_INFO, Sector, CountryCode } from '@/lib/types';
import { cn } from '@/lib/cn';
import * as Haptics from 'expo-haptics';
import { usePriceDisplay } from '@/lib/market-data/hooks';
import { StatusIndicator } from '@/components/DataAttribution';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AssetDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showPriceModal, setShowPriceModal] = React.useState(false);
  const [newPrice, setNewPrice] = React.useState('');

  const assets = usePortfolioStore((s) => s.assets);
  const deleteAsset = usePortfolioStore((s) => s.deleteAsset);
  const updateAsset = usePortfolioStore((s) => s.updateAsset);

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
    updateAsset(asset.id, { currentPrice: price, isManual: true });
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
        <Animated.View entering={FadeInDown.delay(650)} className="px-5 mt-8">
          <Text className="text-white text-lg font-semibold mb-4">Performance</Text>

          <View className="bg-white/5 rounded-2xl p-4">
            {/* Simple performance bar */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-400">Return</Text>
              <Text style={{ color: getGainColor(gainPercent) }} className="font-semibold">
                {formatPercent(gainPercent)}
              </Text>
            </View>

            <View className="h-3 rounded-full bg-black/30 overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(Math.max(50 + gainPercent, 0), 100)}%`,
                  backgroundColor: getGainColor(gainPercent),
                }}
              />
            </View>

            <View className="flex-row justify-between mt-2">
              <Text className="text-gray-500 text-xs">-50%</Text>
              <Text className="text-gray-500 text-xs">0%</Text>
              <Text className="text-gray-500 text-xs">+50%</Text>
            </View>
          </View>
        </Animated.View>

        {/* Value History Chart (for manual assets) */}
        {asset.valueHistory && asset.valueHistory.length > 1 && (
          <Animated.View entering={FadeInDown.delay(700)} className="px-5 mt-8">
            <Text className="text-white text-lg font-semibold mb-4">Value History</Text>
            <View className="bg-white/5 rounded-2xl p-4">
              <SimpleLineChart data={asset.valueHistory} color={categoryInfo.color} />
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
                    {COUNTRY_INFO[asset.country as CountryCode]?.name || asset.country}
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
