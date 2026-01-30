/**
 * Edit Asset screen: updates an existing holding and its recurring contribution settings.
 * Country selection is only shown for manual categories where it can't be derived from a ticker.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, ChevronDown, Calendar, Check, Search } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePortfolioStore } from '@/lib/store';
import { AssetCategory, CountryCode, Currency, CATEGORY_INFO, COUNTRY_INFO } from '@/lib/types';
import { searchTicker } from '@/lib/market-data';
import { cn } from '@/lib/cn';
import * as Haptics from 'expo-haptics';
import { PlatformPicker } from '@/components/PlatformPicker';
import { useOnboardingStore } from '@/lib/onboarding-store';

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'Fr' },
];

const COUNTRY_CODES = Object.keys(COUNTRY_INFO) as CountryCode[];

const PAYCHECK_FREQUENCIES: { key: 'weekly' | 'biweekly' | 'monthly'; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Bi-weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const WEEKDAYS: { key: number; label: string }[] = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' },
  { key: 0, label: 'Sun' },
];

function clampDayOfMonth(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(28, Math.floor(value)));
}

function getCategoryFormCopy(category: AssetCategory): {
  namePlaceholder: string;
  quantityLabel: string;
  quantityPlaceholder: string;
  purchasePriceLabel: string;
  purchasePriceOptional?: boolean;
  currentPriceLabel: string;
  currentPriceHint: string;
  hideTicker: boolean;
  hideQuantity: boolean;
  supportsRecurringContribution: boolean;
} {
  switch (category) {
    case 'cash':
      return {
        namePlaceholder: 'e.g., Checking account, Emergency fund',
        quantityLabel: 'Accounts',
        quantityPlaceholder: '1',
        purchasePriceLabel: 'Starting Balance (optional)',
        purchasePriceOptional: true,
        currentPriceLabel: 'Current Balance *',
        currentPriceHint: 'Update this occasionally to keep your cash total accurate.',
        hideTicker: true,
        hideQuantity: true,
        supportsRecurringContribution: true,
      };
    case 'real_estate':
      return {
        namePlaceholder: 'e.g., Condo — Downtown, Rental property',
        quantityLabel: 'Units',
        quantityPlaceholder: '1',
        purchasePriceLabel: 'Purchase Price *',
        currentPriceLabel: 'Current Estimated Value *',
        currentPriceHint: 'Update this occasionally based on comps or an appraisal.',
        hideTicker: true,
        hideQuantity: true,
        supportsRecurringContribution: false,
      };
    case 'bonds':
    case 'fixed_income':
      return {
        namePlaceholder: 'e.g., Government bond, GIC, CD',
        quantityLabel: 'Face Value / Units *',
        quantityPlaceholder: '0',
        purchasePriceLabel: 'Purchase Price (per unit) *',
        currentPriceLabel: 'Current Price (per unit) *',
        currentPriceHint: 'If you don’t have a live quote, use a manual estimate and update later.',
        hideTicker: true,
        hideQuantity: false,
        supportsRecurringContribution: true,
      };
    case 'gold':
    case 'physical_metals':
      return {
        namePlaceholder: 'e.g., Gold (oz), Silver bar',
        quantityLabel: 'Quantity (e.g., oz) *',
        quantityPlaceholder: '0',
        purchasePriceLabel: 'Purchase Price (per unit) *',
        currentPriceLabel: 'Current Price (per unit) *',
        currentPriceHint: 'Tip: use spot price per ounce and your quantity.',
        hideTicker: true,
        hideQuantity: false,
        supportsRecurringContribution: true,
      };
    case 'derivatives':
      return {
        namePlaceholder: 'e.g., SPY call option, Futures contract',
        quantityLabel: 'Contracts *',
        quantityPlaceholder: '0',
        purchasePriceLabel: 'Entry Price (per contract) *',
        currentPriceLabel: 'Current Price (per contract) *',
        currentPriceHint: 'Update manually to track P&L.',
        hideTicker: true,
        hideQuantity: false,
        supportsRecurringContribution: false,
      };
    case 'stocks':
    case 'funds':
    case 'crypto':
      return {
        namePlaceholder: 'e.g., Apple Inc., S&P 500 ETF, Bitcoin',
        quantityLabel: 'Quantity *',
        quantityPlaceholder: '0',
        purchasePriceLabel: 'Purchase Price *',
        currentPriceLabel: 'Current Price *',
        currentPriceHint: 'For market-traded assets, prices update automatically. Manual assets require periodic updates.',
        hideTicker: false,
        hideQuantity: false,
        supportsRecurringContribution: true,
      };
    default:
      return {
        namePlaceholder: 'e.g., Investment',
        quantityLabel: 'Quantity *',
        quantityPlaceholder: '0',
        purchasePriceLabel: 'Purchase Price *',
        currentPriceLabel: 'Current Price *',
        currentPriceHint: 'Update this occasionally to keep tracking accurate.',
        hideTicker: true,
        hideQuantity: false,
        supportsRecurringContribution: false,
      };
  }
}

export default function EditAssetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const selectedCountry = useOnboardingStore((s) => s.selectedCountry);

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
  const [country, setCountry] = React.useState<CountryCode>(() => {
    const fallback = 'US';
    const code = (selectedCountry ?? fallback).toUpperCase();
    return (code in COUNTRY_INFO ? (code as CountryCode) : fallback) as CountryCode;
  });
  const [customCountryName, setCustomCountryName] = React.useState('');

  const [monthlyContributionEnabled, setMonthlyContributionEnabled] = React.useState(false);
  const [monthlyContributionAmount, setMonthlyContributionAmount] = React.useState('');
  const [monthlyContributionDay, setMonthlyContributionDay] = React.useState('1');
  const [paycheckFrequency, setPaycheckFrequency] = React.useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [paycheckWeekday, setPaycheckWeekday] = React.useState<number>(() => new Date().getDay());
  const [monthlyContributionAutoApply, setMonthlyContributionAutoApply] = React.useState(true);

  const [showCategoryPicker, setShowCategoryPicker] = React.useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = React.useState(false);
  const [showCountryPicker, setShowCountryPicker] = React.useState(false);
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
      if (asset.country) setCountry(asset.country);
      setCustomCountryName(asset.countryName || '');

      const recurring = asset.recurringContribution;
      setMonthlyContributionEnabled(Boolean(recurring?.enabled));
      setMonthlyContributionAmount(recurring?.amount ? String(recurring.amount) : '');
      const freq = (recurring?.frequency as 'weekly' | 'biweekly' | 'monthly' | undefined) ?? 'monthly';
      setPaycheckFrequency(freq);
      setMonthlyContributionDay(recurring?.dayOfMonth ? String(recurring.dayOfMonth) : '1');
      setPaycheckWeekday(typeof recurring?.weekday === 'number' ? recurring.weekday : new Date().getDay());
      setMonthlyContributionAutoApply(recurring?.autoApply ?? true);
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
  const isGlobalByDefault = category === 'gold' || category === 'physical_metals';
  const shouldShowCountryField =
    category === 'real_estate' ||
    category === 'bonds' ||
    category === 'fixed_income' ||
    category === 'derivatives' ||
    category === 'cash';

  const formCopy = React.useMemo(() => getCategoryFormCopy(category), [category]);

  // Some categories behave like "single position" entries.
  React.useEffect(() => {
    if (!formCopy.hideQuantity) return;
    if (!quantity || Number(quantity) !== 1) setQuantity('1');
  }, [formCopy.hideQuantity, quantity]);

  React.useEffect(() => {
    if (monthlyContributionEnabled && !formCopy.supportsRecurringContribution) {
      setMonthlyContributionEnabled(false);
    }
  }, [formCopy.supportsRecurringContribution, monthlyContributionEnabled]);

  const resolvedQuantity = formCopy.hideQuantity ? 1 : parseFloat(quantity);
  const resolvedCurrentPrice = parseFloat(currentPrice);
  const resolvedPurchasePriceRaw = purchasePrice || (formCopy.purchasePriceOptional ? currentPrice : '');
  const resolvedPurchasePrice = parseFloat(resolvedPurchasePriceRaw);

  const canSubmit =
    name.trim() &&
    Number.isFinite(resolvedQuantity) &&
    resolvedQuantity > 0 &&
    Number.isFinite(resolvedCurrentPrice) &&
    resolvedCurrentPrice > 0 &&
    Number.isFinite(resolvedPurchasePrice) &&
    resolvedPurchasePrice > 0;

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
    const parsedMonthlyAmount = parseFloat(monthlyContributionAmount);
    const recurringContribution =
      monthlyContributionEnabled && Number.isFinite(parsedMonthlyAmount) && parsedMonthlyAmount > 0
        ? paycheckFrequency === 'monthly'
          ? {
              enabled: true,
              frequency: 'monthly' as const,
              dayOfMonth: clampDayOfMonth(parseInt(monthlyContributionDay || '1', 10)),
              amount: parsedMonthlyAmount,
              autoApply: monthlyContributionAutoApply,
              lastAppliedId: asset.recurringContribution?.lastAppliedId,
              lastValidatedId: asset.recurringContribution?.lastValidatedId,
            }
          : {
              enabled: true,
              frequency: paycheckFrequency,
              weekday: paycheckWeekday,
              amount: parsedMonthlyAmount,
              autoApply: monthlyContributionAutoApply,
              lastAppliedId: asset.recurringContribution?.lastAppliedId,
              lastValidatedId: asset.recurringContribution?.lastValidatedId,
            }
        : undefined;

    updateAsset(asset.id, {
      name: name.trim(),
      ticker: ticker.trim() || undefined,
      category,
      quantity: resolvedQuantity,
      purchasePrice: resolvedPurchasePrice,
      currentPrice: resolvedCurrentPrice,
      purchaseDate: purchaseDate.toISOString(),
      currency,
      maturityDate: maturityDate?.toISOString(),
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      platform: platformValue.trim() || undefined,
      notes: notes.trim() || undefined,
      address: address.trim() || undefined,
      country: shouldShowCountryField ? country : isGlobalByDefault ? 'GLOBAL' : undefined,
      countryName:
        shouldShowCountryField && country === 'OTHER'
          ? customCountryName.trim() || undefined
          : undefined,
      recurringContribution,
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
              placeholder={formCopy.namePlaceholder}
              placeholderTextColor="#6B7280"
              className="bg-white/10 rounded-xl p-4 text-white"
            />
          </Animated.View>

          {/* Ticker (optional) - with live data search */}
          {!formCopy.hideTicker && (
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
                  placeholder="e.g., AAPL, VOO, BTC"
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
          )}

          {/* Quantity & Price Row */}
          <Animated.View entering={FadeInDown.delay(250)} className="mt-6 flex-row gap-4">
            {!formCopy.hideQuantity && (
              <View className="flex-1">
                <Text className="text-gray-400 text-sm mb-2">{formCopy.quantityLabel}</Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder={formCopy.quantityPlaceholder}
                  placeholderTextColor="#6B7280"
                  className="bg-white/10 rounded-xl p-4 text-white"
                  keyboardType="decimal-pad"
                />
              </View>
            )}
            <View className={cn('flex-1', formCopy.hideQuantity && 'w-full')}>
              <Text className="text-gray-400 text-sm mb-2">{formCopy.purchasePriceLabel}</Text>
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
            <Text className="text-gray-400 text-sm mb-2">{formCopy.currentPriceLabel}</Text>
            <TextInput
              value={currentPrice}
              onChangeText={setCurrentPrice}
              placeholder="0.00"
              placeholderTextColor="#6B7280"
              className="bg-white/10 rounded-xl p-4 text-white"
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-2">
              {formCopy.currentPriceHint}
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

          {shouldShowCountryField && (
            <Animated.View entering={FadeInDown.delay(375)} className="mt-6">
              <Text className="text-gray-400 text-sm mb-2">
                {isRealEstate ? 'Property Country' : 'Country / Region'}
              </Text>
              <Pressable
                onPress={() => setShowCountryPicker(!showCountryPicker)}
                className="bg-white/10 rounded-xl p-4 flex-row items-center justify-between"
              >
                <Text className="text-white">
                  {COUNTRY_INFO[country]?.flag}{' '}
                  {country === 'OTHER' ? (customCountryName || 'Other') : COUNTRY_INFO[country]?.name} ({country})
                </Text>
                <ChevronDown size={20} color="#9CA3AF" />
              </Pressable>

              {showCountryPicker && (
                <Animated.View entering={FadeIn} className="bg-white/5 rounded-xl mt-2 overflow-hidden">
                  {COUNTRY_CODES.map((code) => (
                    <Pressable
                      key={code}
                      onPress={() => {
                        setCountry(code);
                        if (code !== 'OTHER') setCustomCountryName('');
                        setShowCountryPicker(false);
                        Haptics.selectionAsync();
                      }}
                      className={cn(
                        'flex-row items-center p-4 border-b border-white/5',
                        country === code && 'bg-indigo-600/20'
                      )}
                    >
                      <Text className="text-gray-400 w-10">{COUNTRY_INFO[code].flag}</Text>
                      <Text className="text-white flex-1">{COUNTRY_INFO[code].name}</Text>
                      {country === code && <Check size={16} color="#6366F1" />}
                    </Pressable>
                  ))}
                </Animated.View>
              )}

              {country === 'OTHER' && (
                <View className="mt-3">
                  <TextInput
                    value={customCountryName}
                    onChangeText={setCustomCountryName}
                    placeholder="Enter country name"
                    placeholderTextColor="#6B7280"
                    className="bg-white/10 rounded-xl p-4 text-white"
                  />
                </View>
              )}
            </Animated.View>
          )}

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

          {/* Monthly contribution */}
          {formCopy.supportsRecurringContribution && (
            <Animated.View entering={FadeInDown.delay(650)} className="mt-6">
              <Text className="text-gray-400 text-sm mb-2">Paycheck Contribution (optional)</Text>
              <View className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMonthlyContributionEnabled((v) => !v);
                  }}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-white font-medium">Enable recurring contribution</Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Get a reminder and keep your position updated over time.
                    </Text>
                  </View>
                  <View
                    className={cn(
                      'w-6 h-6 rounded-lg items-center justify-center border-2',
                      monthlyContributionEnabled ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'
                    )}
                  >
                    {monthlyContributionEnabled && <Check size={14} color="white" strokeWidth={3} />}
                  </View>
                </Pressable>

                {monthlyContributionEnabled && (
                  <View className="mt-4">
                    <Text className="text-gray-400 text-xs mb-2">Paycheck frequency</Text>
                    <View className="flex-row gap-2 mb-3">
                      {PAYCHECK_FREQUENCIES.map((item) => (
                        <Pressable
                          key={item.key}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setPaycheckFrequency(item.key);
                          }}
                          className={cn(
                            'flex-1 rounded-xl py-2.5 items-center border',
                            paycheckFrequency === item.key
                              ? 'bg-indigo-600/20 border-indigo-500/40'
                              : 'bg-white/5 border-white/10'
                          )}
                        >
                          <Text
                            className={cn(
                              'text-xs font-semibold',
                              paycheckFrequency === item.key ? 'text-indigo-200' : 'text-gray-300'
                            )}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Text className="text-gray-400 text-xs mb-2">Amount</Text>
                        <TextInput
                          value={monthlyContributionAmount}
                          onChangeText={setMonthlyContributionAmount}
                          placeholder="0.00"
                          placeholderTextColor="#6B7280"
                          className="bg-white/10 rounded-xl p-3 text-white"
                          keyboardType="decimal-pad"
                        />
                      </View>
                      {paycheckFrequency === 'monthly' ? (
                        <View style={{ width: 110 }}>
                          <Text className="text-gray-400 text-xs mb-2">Day (1–28)</Text>
                          <TextInput
                            value={monthlyContributionDay}
                            onChangeText={setMonthlyContributionDay}
                            placeholder="1"
                            placeholderTextColor="#6B7280"
                            className="bg-white/10 rounded-xl p-3 text-white"
                            keyboardType="number-pad"
                          />
                        </View>
                      ) : (
                        <View style={{ width: 160 }}>
                          <Text className="text-gray-400 text-xs mb-2">Weekday</Text>
                          <View className="flex-row flex-wrap gap-2">
                            {WEEKDAYS.map((d) => (
                              <Pressable
                                key={d.key}
                                onPress={() => {
                                  Haptics.selectionAsync();
                                  setPaycheckWeekday(d.key);
                                }}
                                className={cn(
                                  'px-2.5 py-2 rounded-lg border',
                                  paycheckWeekday === d.key
                                    ? 'bg-indigo-600/20 border-indigo-500/40'
                                    : 'bg-white/5 border-white/10'
                                )}
                              >
                                <Text
                                  className={cn(
                                    'text-[11px] font-semibold',
                                    paycheckWeekday === d.key ? 'text-indigo-200' : 'text-gray-300'
                                  )}
                                >
                                  {d.label}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>

                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setMonthlyContributionAutoApply((v) => !v);
                      }}
                      className="mt-3 flex-row items-center justify-between"
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-white text-sm font-medium">Auto-apply updates</Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          When due, Ledger will update your position and ask you to validate it.
                        </Text>
                      </View>
                      <View
                        className={cn(
                          'w-6 h-6 rounded-lg items-center justify-center border-2',
                          monthlyContributionAutoApply ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'
                        )}
                      >
                        {monthlyContributionAutoApply && <Check size={14} color="white" strokeWidth={3} />}
                      </View>
                    </Pressable>

                    <Text className="text-gray-500 text-[11px] mt-3">
                      You can confirm each contribution from the Events screen.
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

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
