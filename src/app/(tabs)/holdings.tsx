import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  Filter,
  TrendingUp,
  TrendingDown,
  Home,
  Landmark,
  PieChart,
  Circle,
  Coins,
  Activity,
  Diamond,
  Wallet,
  FileText,
  ChevronRight,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePortfolioStore } from '@/lib/store';
import { FREE_TIER_LIMITS, useEntitlementStatus } from '@/lib/premium-store';
import { formatCurrency, formatPercent, getGainColor } from '@/lib/formatters';
import { CATEGORY_INFO, AssetCategory, Asset } from '@/lib/types';
import { cn } from '@/lib/cn';
import { AssetLimitBanner, PremiumPaywall } from '@/components/PremiumPaywall';
import { usePriceDisplay } from '@/lib/market-data/hooks';
import { StatusIndicator } from '@/components/DataAttribution';
import { NoAssetsEmptyState, NoSearchResultsEmptyState } from '@/components/EmptyState';
import { useTheme } from '@/lib/theme-store';

const CATEGORY_ICONS: Record<AssetCategory, React.ReactNode> = {
  stocks: <TrendingUp size={18} color="#10B981" />,
  bonds: <FileText size={18} color="#6366F1" />,
  funds: <PieChart size={18} color="#8B5CF6" />,
  gold: <Circle size={18} color="#F59E0B" />,
  real_estate: <Home size={18} color="#EC4899" />,
  crypto: <Coins size={18} color="#F97316" />,
  fixed_income: <Landmark size={18} color="#14B8A6" />,
  derivatives: <Activity size={18} color="#EF4444" />,
  physical_metals: <Diamond size={18} color="#A3A3A3" />,
  cash: <Wallet size={18} color="#22C55E" />,
};

type SortOption = 'value' | 'gain' | 'name' | 'category';
type FilterOption = AssetCategory | 'all';

export default function HoldingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<SortOption>('value');
  const [filterCategory, setFilterCategory] = React.useState<FilterOption>('all');
  const [showFilters, setShowFilters] = React.useState(false);
  const [showPaywall, setShowPaywall] = React.useState(false);

  const assets = usePortfolioStore((s) => s.assets);
  const { isPremium } = useEntitlementStatus();

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

  const filteredAssets = React.useMemo(() => {
    let result = [...assets];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.ticker?.toLowerCase().includes(query) ||
          a.platform?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (filterCategory !== 'all') {
      result = result.filter((a) => a.category === filterCategory);
    }

    // Sort
    result.sort((a, b) => {
      const aValue = a.currentPrice * a.quantity;
      const bValue = b.currentPrice * b.quantity;
      const aGain = ((a.currentPrice - a.purchasePrice) / a.purchasePrice) * 100;
      const bGain = ((b.currentPrice - b.purchasePrice) / b.purchasePrice) * 100;

      switch (sortBy) {
        case 'value':
          return bValue - aValue;
        case 'gain':
          return bGain - aGain;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return result;
  }, [assets, searchQuery, sortBy, filterCategory]);

  const categories: FilterOption[] = ['all', ...Object.keys(CATEGORY_INFO) as AssetCategory[]];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{ paddingTop: insets.top, borderBottomColor: theme.border, borderBottomWidth: 1 }}
        className="px-5 pb-4"
      >
        <Animated.View entering={FadeInDown.delay(100)} className="flex-row items-center justify-between">
          <Text style={{ color: theme.text }} className="text-2xl font-bold">
            Holdings
          </Text>
          <Pressable
            onPress={handleAddAsset}
            className="w-10 h-10 bg-indigo-600 rounded-full items-center justify-center"
          >
            <Plus size={20} color="white" />
          </Pressable>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          className="mt-4 flex-row items-center rounded-xl px-4 py-3"
          style={{ backgroundColor: theme.surfaceHover }}
        >
          <Search size={18} color={theme.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search assets, tickers, platforms..."
            placeholderTextColor={theme.textTertiary}
            className="flex-1 ml-3"
            style={{ color: theme.text }}
          />
          <Pressable onPress={() => setShowFilters(!showFilters)}>
            <Filter size={18} color={showFilters ? theme.primary : theme.textTertiary} />
          </Pressable>
        </Animated.View>

        {/* Filters */}
        {showFilters && (
          <Animated.View entering={FadeInDown.delay(100)} className="mt-4">
            {/* Sort Options */}
            <Text style={{ color: theme.textSecondary }} className="text-xs mb-2">
              Sort by
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {(['value', 'gain', 'name', 'category'] as SortOption[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setSortBy(option)}
                  className="px-4 py-2 rounded-full mr-2"
                  style={{
                    backgroundColor: sortBy === option ? theme.primary : theme.surfaceHover,
                  }}
                >
                  <Text
                    style={{ color: sortBy === option ? '#FFFFFF' : theme.textSecondary }}
                    className="text-sm capitalize"
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Category Filters */}
            <Text style={{ color: theme.textSecondary }} className="text-xs mt-4 mb-2">
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {categories.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => setFilterCategory(category)}
                  className="px-4 py-2 rounded-full mr-2"
                  style={{
                    backgroundColor:
                      filterCategory === category ? theme.primary : theme.surfaceHover,
                  }}
                >
                  <Text
                    style={{
                      color: filterCategory === category ? '#FFFFFF' : theme.textSecondary,
                    }}
                    className="text-sm"
                  >
                    {category === 'all' ? 'All' : CATEGORY_INFO[category].label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Asset Limit Banner */}
        {!isPremium && (
          <AssetLimitBanner
            currentCount={assets.length}
            maxCount={FREE_TIER_LIMITS.maxAssets}
            onUpgrade={() => setShowPaywall(true)}
          />
        )}

        {/* Summary */}
        <Animated.View entering={FadeInDown.delay(300)} className="flex-row items-center justify-between mb-4">
          <Text style={{ color: theme.textSecondary }}>
            {filteredAssets.length} {filteredAssets.length === 1 ? 'asset' : 'assets'}
          </Text>
          <Text style={{ color: theme.textSecondary }}>
            Total: {formatCurrency(filteredAssets.reduce((sum, a) => sum + a.currentPrice * a.quantity, 0))}
          </Text>
        </Animated.View>

        {/* Asset List */}
        {filteredAssets.map((asset, index) => (
          <AssetCard key={asset.id} asset={asset} index={index} />
        ))}

        {/* Empty States */}
        {filteredAssets.length === 0 && assets.length === 0 && (
          <NoAssetsEmptyState onAdd={handleAddAsset} />
        )}

        {filteredAssets.length === 0 && assets.length > 0 && searchQuery && (
          <NoSearchResultsEmptyState query={searchQuery} onClear={() => setSearchQuery('')} />
        )}

        {filteredAssets.length === 0 && assets.length > 0 && !searchQuery && filterCategory !== 'all' && (
          <Animated.View entering={FadeInDown.delay(300)} className="items-center py-12">
            <Text style={{ color: theme.textSecondary }} className="text-center">
              No {CATEGORY_INFO[filterCategory as AssetCategory].label.toLowerCase()} in your portfolio
            </Text>
            <Pressable
              onPress={() => setFilterCategory('all')}
              className="mt-4 px-6 py-3 rounded-full"
              style={{ backgroundColor: theme.surfaceHover }}
            >
              <Text style={{ color: theme.text }} className="font-semibold">
                Show All Assets
              </Text>
            </Pressable>
          </Animated.View>
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

function AssetCard({ asset, index }: { asset: Asset; index: number }) {
  const router = useRouter();
  const updateAsset = usePortfolioStore((s) => s.updateAsset);
  const { theme } = useTheme();

  // Fetch live price data
  const priceData = usePriceDisplay(asset);

  // Debug logging
  React.useEffect(() => {
    console.log(`[Market Data] ${asset.name} (${asset.ticker})`, {
      provider: priceData.provider,
      isFresh: priceData.isFresh,
      price: priceData.price,
      error: priceData.error,
    });
  }, [asset.name, asset.ticker, priceData]);

  // Use live price if available, otherwise fall back to stored price
  const currentPrice = priceData.price || asset.currentPrice;
  const value = currentPrice * asset.quantity;
  const invested = asset.purchasePrice * asset.quantity;
  const gain = value - invested;
  const gainPercent = (gain / invested) * 100;
  const isPositive = gain >= 0;

  // Update stored price when we get fresh data from API
  React.useEffect(() => {
    if (priceData.isFresh && priceData.price !== asset.currentPrice && priceData.provider !== 'manual') {
      console.log(`[Market Data] Updating ${asset.ticker} price: ${asset.currentPrice} -> ${priceData.price}`);
      updateAsset(asset.id, { currentPrice: priceData.price });
    }
  }, [priceData.isFresh, priceData.price, priceData.provider, asset.id, asset.currentPrice, asset.ticker, updateAsset]);

  // Determine status for badge
  const getStatus = (): 'fresh' | 'stale' | 'manual' => {
    if (priceData.provider === 'manual' || asset.isManual) return 'manual';
    return priceData.isFresh ? 'fresh' : 'stale';
  };

  return (
    <Animated.View entering={FadeInDown.delay(400 + index * 50)}>
      <Pressable
        onPress={() => router.push(`/asset/${asset.id}`)}
        className="rounded-2xl p-4 mb-3"
        style={{ backgroundColor: theme.surface }}
      >
        <View className="flex-row items-center">
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: CATEGORY_INFO[asset.category].color + '20' }}
          >
            {CATEGORY_ICONS[asset.category]}
          </View>

          <View className="flex-1 ml-3">
            <View className="flex-row items-center">
              <Text style={{ color: theme.text }} className="font-semibold flex-1" numberOfLines={1}>
                {asset.name}
              </Text>
              {/* Price Status Badge */}
              <StatusIndicator status={getStatus()} />
            </View>
            <View className="flex-row items-center mt-1">
              {asset.ticker && (
                <Text style={{ color: theme.textSecondary }} className="text-sm mr-2">
                  {asset.ticker}
                </Text>
              )}
              <Text style={{ color: theme.textTertiary }} className="text-sm">
                {asset.platform || CATEGORY_INFO[asset.category].label}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text style={{ color: theme.text }} className="font-semibold">
              {formatCurrency(value)}
            </Text>
            <View className="flex-row items-center mt-1">
              {isPositive ? (
                <TrendingUp size={12} color="#10B981" />
              ) : (
                <TrendingDown size={12} color="#EF4444" />
              )}
              <Text className="text-sm ml-1" style={{ color: getGainColor(gain) }}>
                {formatPercent(gainPercent)}
              </Text>
            </View>
          </View>

          <ChevronRight size={16} color={theme.textTertiary} style={{ marginLeft: 8 }} />
        </View>

        {/* Additional Info Row */}
        <View
          className="flex-row items-center mt-3 pt-3"
          style={{ borderTopColor: theme.borderLight, borderTopWidth: 1 }}
        >
          <View className="flex-1">
            <Text style={{ color: theme.textTertiary }} className="text-xs">
              Quantity
            </Text>
            <Text style={{ color: theme.textSecondary }} className="text-sm">
              {asset.quantity.toLocaleString()}
            </Text>
          </View>
          <View className="flex-1">
            <Text style={{ color: theme.textTertiary }} className="text-xs">
              Avg. Cost
            </Text>
            <Text style={{ color: theme.textSecondary }} className="text-sm">
              {formatCurrency(asset.purchasePrice)}
            </Text>
          </View>
          <View className="flex-1">
            <Text style={{ color: theme.textTertiary }} className="text-xs">
              Current
            </Text>
            <Text style={{ color: theme.textSecondary }} className="text-sm">
              {formatCurrency(currentPrice)}
            </Text>
          </View>
          <View className="flex-1 items-end">
            <Text style={{ color: theme.textTertiary }} className="text-xs">
              P&L
            </Text>
            <Text className="text-sm" style={{ color: getGainColor(gain) }}>
              {formatCurrency(gain)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
