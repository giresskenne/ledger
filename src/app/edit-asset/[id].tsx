import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, ChevronDown, Calendar, Check, Search } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePortfolioStore } from '@/lib/store';
import { AssetCategory, Currency, CATEGORY_INFO } from '@/lib/types';
import { searchTicker } from '@/lib/market-data';
import { cn } from '@/lib/cn';
import * as Haptics from 'expo-haptics';
import { PlatformPicker } from '@/components/PlatformPicker';

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'Fr' },
];

export default function EditAssetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const assets = usePortfolioStore((s) => s.assets);
  const updateAsset = usePortfolioStore((s) => s.updateAsset);

  const asset = React.useMemo(() => assets.find((a) => a.id === id), [assets, id]);

  const [name, setName] = React.useState('');
  const [ticker, setTicker] = React.useState('');
  const [category, setCategory] = React.useState<AssetCategory>('stocks');
  const [quantity, setQuantity] = React.useState('');
  const [purchasePrice, setPurchasePrice] = React.useState('');
  const [currentPrice, setCurrentPrice] = React.useState('');
  const [currency, setCurrency] = React.useState<Currency>('USD');
  const [purchaseDate, setPurchaseDate] = React.useState(new Date());
  const [maturityDate, setMaturityDate] = React.useState<Date | null>(null);
  const [interestRate, setInterestRate] = React.useState('');
  const [platform, setPlatform] = React.useState('');
  const [customPlatform, setCustomPlatform] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [address, setAddress] = React.useState('');

  const [showCategoryPicker, setShowCategoryPicker] = React.useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = React.useState(false);
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = React.useState(false);
  const [showMaturityDatePicker, setShowMaturityDatePicker] = React.useState(false);

  const [isSearchingTicker, setIsSearchingTicker] = React.useState(false);
  const [tickerSearchError, setTickerSearchError] = React.useState<string | null>(null);

  // Initialize form with asset data
  React.useEffect(() => {
    if (asset) {
      setName(asset.name);
      setTicker(asset.ticker || '');
      setCategory(asset.category);
      setQuantity(asset.quantity.toString());
      setPurchasePrice(asset.purchasePrice.toString());
      setCurrentPrice(asset.currentPrice.toString());
      setCurrency(asset.currency);
      setPurchaseDate(new Date(asset.purchaseDate));
      setMaturityDate(asset.maturityDate ? new Date(asset.maturityDate) : null);
      setInterestRate(asset.interestRate?.toString() || '');
      setPlatform(asset.platform || '');
      setNotes(asset.notes || '');
      setAddress(asset.address || '');
    }
  }, [asset]);

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

  const isFixedIncome = category === 'fixed_income' || category === 'bonds';
  const isRealEstate = category === 'real_estate';
  const canSearchTicker = category === 'stocks' || category === 'funds' || category === 'crypto';

  const canSubmit =
    name.trim() &&
    parseFloat(quantity) > 0 &&
    parseFloat(purchasePrice) > 0 &&
    parseFloat(currentPrice) > 0;

  const handleTickerSearch = async () => {
    if (!ticker.trim() || !canSearchTicker) return;

    setIsSearchingTicker(true);
    setTickerSearchError(null);

    try {
      const result = await searchTicker(ticker.trim(), category, undefined, currency);

      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (result.data.currentPrice) {
          setCurrentPrice(result.data.currentPrice.toString());
        }
        if (result.data.name && !name) {
          setName(result.data.name);
        }
        if (result.data.currency) {
          setCurrency(result.data.currency);
        }

        setTickerSearchError(null);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTickerSearchError(result.reason || 'Unable to fetch price data');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTickerSearchError('Failed to search ticker');
    } finally {
      setIsSearchingTicker(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const platformValue = platform === 'Other' ? customPlatform : platform;

    updateAsset(asset.id, {
      name: name.trim(),
      ticker: ticker.trim() || undefined,
      category,
      quantity: parseFloat(quantity),
      purchasePrice: parseFloat(purchasePrice),
      currentPrice: parseFloat(currentPrice),
      purchaseDate: purchaseDate.toISOString(),
      currency,
      maturityDate: maturityDate?.toISOString(),
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      platform: platformValue.trim() || undefined,
      notes: notes.trim() || undefined,
      address: address.trim() || undefined,
    });

    router.back();
  };

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View
          style={{ paddingTop: insets.top }}
          className="px-5 pb-4 border-b border-white/10 flex-row items-center justify-between"
        >
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <X size={24} color="white" />
          </Pressable>
          <Text className="text-white text-lg font-semibold">Edit Asset</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={cn('w-10 h-10 items-center justify-center rounded-full', canSubmit && 'bg-indigo-600')}
          >
            {canSubmit && <Check size={20} color="white" />}
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category Selector */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <Text className="text-gray-400 text-sm mb-2">Asset Category *</Text>
            <Pressable
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              className="bg-white/10 rounded-xl p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: CATEGORY_INFO[category].color + '30' }}
                >
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CATEGORY_INFO[category].color }}
                  />
                </View>
                <Text className="text-white">{CATEGORY_INFO[category].label}</Text>
              </View>
              <ChevronDown size={20} color="#9CA3AF" />
            </Pressable>

            {showCategoryPicker && (
              <Animated.View entering={FadeIn} className="bg-white/5 rounded-xl mt-2 overflow-hidden">
                {(Object.keys(CATEGORY_INFO) as AssetCategory[]).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                      Haptics.selectionAsync();
                    }}
                    className={cn(
                      'flex-row items-center p-4 border-b border-white/5',
                      category === cat && 'bg-indigo-600/20'
                    )}
                  >
                    <View
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: CATEGORY_INFO[cat].color }}
                    />
                    <Text className="text-white flex-1">{CATEGORY_INFO[cat].label}</Text>
                    {category === cat && <Check size={16} color="#6366F1" />}
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </Animated.View>

          {/* Name */}
          <Animated.View entering={FadeInDown.delay(150)} className="mt-6">
            <Text className="text-gray-400 text-sm mb-2">Asset Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g., Apple Inc., Gold Bar, etc."
              placeholderTextColor="#6B7280"
              className="bg-white/10 rounded-xl p-4 text-white"
            />
          </Animated.View>

          {/* Ticker (optional) - with live data search */}
          <Animated.View entering={FadeInDown.delay(200)} className="mt-6">
            <Text className="text-gray-400 text-sm mb-2">
              Ticker Symbol {canSearchTicker && '(Search for live price)'}
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                value={ticker}
                onChangeText={(text) => {
                  setTicker(text.toUpperCase());
                  setTickerSearchError(null);
                }}
                placeholder={canSearchTicker ? "e.g., AAPL, VOO, BTC" : "Not applicable"}
                placeholderTextColor="#6B7280"
                className="bg-white/10 rounded-xl p-4 text-white flex-1"
                autoCapitalize="characters"
                editable={canSearchTicker}
                onSubmitEditing={handleTickerSearch}
              />
              {canSearchTicker && (
                <Pressable
                  onPress={handleTickerSearch}
                  disabled={!ticker.trim() || isSearchingTicker}
                  className={cn(
                    'bg-white/10 rounded-xl p-4 items-center justify-center',
                    ticker.trim() && !isSearchingTicker && 'bg-indigo-600'
                  )}
                  style={{ width: 56 }}
                >
                  {isSearchingTicker ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Search size={20} color="white" />
                  )}
                </Pressable>
              )}
            </View>
            {tickerSearchError && (
              <Text className="text-red-400 text-xs mt-2">{tickerSearchError}</Text>
            )}
            {canSearchTicker && !tickerSearchError && (
              <Text className="text-gray-500 text-xs mt-2">
                Enter a ticker and tap search to fetch live price data
              </Text>
            )}
          </Animated.View>

          {/* Quantity & Price Row */}
          <Animated.View entering={FadeInDown.delay(250)} className="mt-6 flex-row gap-4">
            <View className="flex-1">
              <Text className="text-gray-400 text-sm mb-2">Quantity *</Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                placeholderTextColor="#6B7280"
                className="bg-white/10 rounded-xl p-4 text-white"
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-sm mb-2">Purchase Price *</Text>
              <TextInput
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                placeholder="0.00"
                placeholderTextColor="#6B7280"
                className="bg-white/10 rounded-xl p-4 text-white"
                keyboardType="decimal-pad"
              />
            </View>
          </Animated.View>

          {/* Current Price */}
          <Animated.View entering={FadeInDown.delay(300)} className="mt-6">
            <Text className="text-gray-400 text-sm mb-2">Current Price *</Text>
            <TextInput
              value={currentPrice}
              onChangeText={setCurrentPrice}
              placeholder="0.00"
              placeholderTextColor="#6B7280"
              className="bg-white/10 rounded-xl p-4 text-white"
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-2">
              For market-traded assets, prices update automatically. Manual assets require periodic updates.
            </Text>
          </Animated.View>

          {/* Currency */}
          <Animated.View entering={FadeInDown.delay(350)} className="mt-6">
            <Text className="text-gray-400 text-sm mb-2">Currency</Text>
            <Pressable
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
              className="bg-white/10 rounded-xl p-4 flex-row items-center justify-between"
            >
              <Text className="text-white">
                {CURRENCIES.find((c) => c.value === currency)?.label} ({currency})
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </Pressable>

            {showCurrencyPicker && (
              <Animated.View entering={FadeIn} className="bg-white/5 rounded-xl mt-2 overflow-hidden">
                {CURRENCIES.map((curr) => (
                  <Pressable
                    key={curr.value}
                    onPress={() => {
                      setCurrency(curr.value);
                      setShowCurrencyPicker(false);
                      Haptics.selectionAsync();
                    }}
                    className={cn(
                      'flex-row items-center p-4 border-b border-white/5',
                      currency === curr.value && 'bg-indigo-600/20'
                    )}
                  >
                    <Text className="text-gray-400 w-10">{curr.symbol}</Text>
                    <Text className="text-white flex-1">{curr.label}</Text>
                    {currency === curr.value && <Check size={16} color="#6366F1" />}
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </Animated.View>

          {/* Purchase Date */}
          <Animated.View entering={FadeInDown.delay(400)} className="mt-6">
            <Text className="text-gray-400 text-sm mb-2">Purchase Date</Text>
            <Pressable
              onPress={() => setShowPurchaseDatePicker(true)}
              className="bg-white/10 rounded-xl p-4 flex-row items-center justify-between"
            >
              <Text className="text-white">
                {purchaseDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Calendar size={20} color="#9CA3AF" />
            </Pressable>
            {showPurchaseDatePicker && (
              <DateTimePicker
                value={purchaseDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowPurchaseDatePicker(false);
                  }
                  if (date) setPurchaseDate(date);
                }}
                themeVariant="dark"
              />
            )}
          </Animated.View>

          {/* Fixed Income Fields */}
          {isFixedIncome && (
            <>
              <Animated.View entering={FadeInDown.delay(450)} className="mt-6">
                <Text className="text-gray-400 text-sm mb-2">Maturity Date</Text>
                <Pressable
                  onPress={() => setShowMaturityDatePicker(true)}
                  className="bg-white/10 rounded-xl p-4 flex-row items-center justify-between"
                >
                  <Text className="text-white">
                    {maturityDate
                      ? maturityDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Select maturity date'}
                  </Text>
                  <Calendar size={20} color="#9CA3AF" />
                </Pressable>
                {showMaturityDatePicker && (
                  <DateTimePicker
                    value={maturityDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      if (Platform.OS === 'android') {
                        setShowMaturityDatePicker(false);
                      }
                      if (date) setMaturityDate(date);
                    }}
                    themeVariant="dark"
                  />
                )}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(500)} className="mt-6">
                <Text className="text-gray-400 text-sm mb-2">Interest Rate (%)</Text>
                <TextInput
                  value={interestRate}
                  onChangeText={setInterestRate}
                  placeholder="e.g., 5.25"
                  placeholderTextColor="#6B7280"
                  className="bg-white/10 rounded-xl p-4 text-white"
                  keyboardType="decimal-pad"
                />
              </Animated.View>
            </>
          )}

          {/* Real Estate Address */}
          {isRealEstate && (
            <Animated.View entering={FadeInDown.delay(450)} className="mt-6">
              <Text className="text-gray-400 text-sm mb-2">Property Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="123 Main St, City, State"
                placeholderTextColor="#6B7280"
                className="bg-white/10 rounded-xl p-4 text-white"
              />
            </Animated.View>
          )}

          {/* Platform */}
          <Animated.View entering={FadeInDown.delay(550)} className="mt-6">
            <Text className="text-gray-400 text-sm mb-2">Platform / Broker (optional)</Text>
            <PlatformPicker
              value={platform}
              onValueChange={setPlatform}
              customValue={customPlatform}
              onCustomValueChange={setCustomPlatform}
            />
          </Animated.View>

          {/* Notes */}
          <Animated.View entering={FadeInDown.delay(600)} className="mt-6">
            <Text className="text-gray-400 text-sm mb-2">Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional information..."
              placeholderTextColor="#6B7280"
              className="bg-white/10 rounded-xl p-4 text-white min-h-[100px]"
              multiline
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Submit Button */}
          <Animated.View entering={FadeInDown.delay(700)} className="mt-8">
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                'rounded-2xl p-4 items-center',
                canSubmit ? 'bg-indigo-600' : 'bg-white/10'
              )}
            >
              <Text className={cn('font-semibold text-lg', canSubmit ? 'text-white' : 'text-gray-500')}>
                Save Changes
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
