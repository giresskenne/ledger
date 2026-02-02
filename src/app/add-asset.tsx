/**
 * Add Asset screen: creates a new holding and optionally configures recurring contributions.
 * Country selection is only shown for manual categories where it can't be derived from a ticker.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ChevronDown, Calendar, Check, Search } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePortfolioStore } from '@/lib/store';
import {
  ACCOUNT_CONFIGS,
  AssetCategory,
  CountryCode,
  Currency,
  CATEGORY_INFO,
  COUNTRY_INFO,
  JurisdictionCode,
  RegisteredAccountType,
} from '@/lib/types';
import { searchTicker } from '@/lib/market-data';
import { cn } from '@/lib/cn';
import * as Haptics from 'expo-haptics';
import { PlatformPicker } from '@/components/PlatformPicker';
import { useOnboardingStore } from '@/lib/onboarding-store';
import { useRoomStore } from '@/lib/room-store';
import { useTheme } from '@/lib/theme-store';
import { useAppRatingStore } from '@/lib/app-rating-store';

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'Fr' },
];

const COUNTRY_CODES = Object.keys(COUNTRY_INFO) as CountryCode[];

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

export default function AddAssetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const addAsset = usePortfolioStore((s) => s.addAsset);
  const incrementAssetsAdded = useAppRatingStore((s) => s.incrementAssetsAdded);
  const selectedCountry = useOnboardingStore((s) => s.selectedCountry);
  const jurisdictionProfile = useRoomStore((s) => s.jurisdictionProfile);

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
  const [startTrackingToday, setStartTrackingToday] = React.useState(false);
  const [sector, setSector] = React.useState('');
  const [heldIn, setHeldIn] = React.useState<RegisteredAccountType | null>(null);
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

  // Ticker search state
  const [isSearchingTicker, setIsSearchingTicker] = React.useState(false);
  const [tickerSearchError, setTickerSearchError] = React.useState<string | null>(null);

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

  const jurisdiction = React.useMemo<JurisdictionCode>(() => {
    // Prefer the saved room-tracker jurisdiction (post-onboarding). Fall back to onboarding country if needed.
    const fromProfile = jurisdictionProfile?.countryCode;
    if (fromProfile) return fromProfile;
    const code = (selectedCountry ?? 'US').toUpperCase();
    return (code === 'CA' || code === 'US' || code === 'UK') ? (code as JurisdictionCode) : 'US';
  }, [jurisdictionProfile?.countryCode, selectedCountry]);

  const heldInOptions = React.useMemo(() => {
    return ACCOUNT_CONFIGS.filter((c) => c.jurisdiction === jurisdiction);
  }, [jurisdiction]);

  // Keep country in sync with onboarding (only if user hasn't chosen yet).
  const hasManuallyPickedCountry = React.useRef(false);
  React.useEffect(() => {
    if (!shouldShowCountryField) return;
    if (hasManuallyPickedCountry.current) return;
    if (!selectedCountry) return;
    const code = selectedCountry.toUpperCase();
    if (code in COUNTRY_INFO) {
      setCountry(code as CountryCode);
    }
  }, [selectedCountry, shouldShowCountryField]);

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
  const resolvedPurchasePriceRaw = startTrackingToday
    ? currentPrice
    : purchasePrice || (formCopy.purchasePriceOptional ? currentPrice : '');
  const resolvedPurchasePrice = parseFloat(resolvedPurchasePriceRaw);

  const canSubmit =
    name.trim() &&
    Number.isFinite(resolvedQuantity) &&
    resolvedQuantity > 0 &&
    Number.isFinite(resolvedCurrentPrice) &&
    resolvedCurrentPrice > 0 &&
    Number.isFinite(resolvedPurchasePrice) &&
    resolvedPurchasePrice > 0;

  // Search ticker and fetch live price
  const handleTickerSearch = async () => {
    if (!ticker.trim() || !canSearchTicker) return;

    setIsSearchingTicker(true);
    setTickerSearchError(null);

    try {
      const result = await searchTicker(ticker.trim(), category, undefined, currency);

        if (result.ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Populate fields with fetched data
          if (result.data.currentPrice) {
            setCurrentPrice(result.data.currentPrice.toString());
            // If purchase price is empty, use current price as default
            if (!purchasePrice) {
              setPurchasePrice(result.data.currentPrice.toString());
            }
          }
          if (result.data.name && !name) {
            setName(result.data.name);
          }
          if (result.data.currency) {
            setCurrency(result.data.currency);
          }
          if (result.data.sector) {
            setSector(result.data.sector);
          }

          setTickerSearchError(null);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTickerSearchError(result.reason || 'Unable to fetch price data');
        setSector('');
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

    // Apply "start tracking today" logic
    const finalPurchaseDate = startTrackingToday ? new Date() : purchaseDate;
    const finalPurchasePrice = startTrackingToday ? resolvedCurrentPrice : resolvedPurchasePrice;
    const finalQuantity = resolvedQuantity;

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
            }
          : {
              enabled: true,
              frequency: paycheckFrequency,
              weekday: paycheckWeekday,
              amount: parsedMonthlyAmount,
              autoApply: monthlyContributionAutoApply,
            }
        : undefined;

    // Avoid using onboarding country for listed assets (e.g., AAPL shouldn't become "Canada" by default).
    const countryToPersist: CountryCode | undefined = shouldShowCountryField
      ? country
      : isGlobalByDefault
        ? 'GLOBAL'
        : undefined;

    addAsset({
      name: name.trim(),
      ticker: ticker.trim() || undefined,
      category,
      quantity: finalQuantity,
      purchasePrice: finalPurchasePrice,
      currentPrice: resolvedCurrentPrice,
      purchaseDate: finalPurchaseDate.toISOString(),
      currency,
      maturityDate: maturityDate?.toISOString(),
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      platform: platformValue.trim() || undefined,
      notes: notes.trim() || undefined,
      address: address.trim() || undefined,
      sector: sector.trim() || undefined,
      country: countryToPersist,
      countryName:
        shouldShowCountryField && country === 'OTHER'
          ? customCountryName.trim() || undefined
          : undefined,
      isManual: !canSearchTicker, // Mark as manual if it's not a searchable category
      costBasisEstimated: startTrackingToday ? true : undefined,
      recurringContribution,
      heldIn,
    });

    // Track asset addition for rating prompt
    incrementAssetsAdded();

    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View
          style={{ paddingTop: insets.top, borderBottomColor: theme.border }}
          className="px-5 pb-4 border-b flex-row items-center justify-between"
        >
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <X size={24} color={theme.text} />
          </Pressable>
          <Text style={{ color: theme.text }} className="text-lg font-semibold">Add Asset</Text>
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
            <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Asset Category *</Text>
            <Pressable
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              style={{ backgroundColor: theme.surface }}
              className="rounded-xl p-4 flex-row items-center justify-between"
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
                <Text style={{ color: theme.text }}>{CATEGORY_INFO[category].label}</Text>
              </View>
              <ChevronDown size={20} color={theme.textSecondary} />
            </Pressable>

            {showCategoryPicker && (
              <Animated.View entering={FadeIn} style={{ backgroundColor: theme.surfaceHover }} className="rounded-xl mt-2 overflow-hidden">
                {(Object.keys(CATEGORY_INFO) as AssetCategory[]).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                      Haptics.selectionAsync();
                    }}
                    style={{ borderBottomColor: theme.border }}
                    className={cn(
                      'flex-row items-center p-4 border-b',
                      category === cat && 'bg-indigo-600/20'
                    )}
                  >
                    <View
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: CATEGORY_INFO[cat].color }}
                    />
                    <Text style={{ color: theme.text }} className="flex-1">{CATEGORY_INFO[cat].label}</Text>
                    {category === cat && <Check size={16} color="#6366F1" />}
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </Animated.View>

          {/* Name */}
          <Animated.View entering={FadeInDown.delay(150)} className="mt-6">
            <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Asset Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={formCopy.namePlaceholder}
              placeholderTextColor="#6B7280"
              style={{ backgroundColor: theme.surface, color: theme.text }}
              className="rounded-xl p-4"
            />
          </Animated.View>

          {/* Ticker (optional) - with live data search */}
          {!formCopy.hideTicker && (
            <Animated.View entering={FadeInDown.delay(200)} className="mt-6">
              <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">
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
                  style={{ backgroundColor: theme.surface, color: theme.text }}
                  className="rounded-xl p-4 flex-1"
                  autoCapitalize="characters"
                  editable={canSearchTicker}
                  onSubmitEditing={handleTickerSearch}
                />
                {canSearchTicker && (
                  <Pressable
                    onPress={handleTickerSearch}
                    disabled={!ticker.trim() || isSearchingTicker}
                    className={cn(
                      'rounded-xl p-4 items-center justify-center',
                      ticker.trim() && !isSearchingTicker && 'bg-indigo-600'
                    )}
                    style={{ width: 56, backgroundColor: ticker.trim() && !isSearchingTicker ? undefined : theme.surface }}
                  >
                    {isSearchingTicker ? (
                      <ActivityIndicator size="small" color={theme.text} />
                    ) : (
                      <Search size={20} color={theme.text} />
                    )}
                  </Pressable>
                )}
              </View>
              {tickerSearchError && (
                <Text className="text-red-400 text-xs mt-2">{tickerSearchError}</Text>
              )}
              {canSearchTicker && !tickerSearchError && (
                <Text style={{ color: theme.textSecondary }} className="text-xs mt-2">
                  Enter a ticker and tap search to fetch live price data
                </Text>
              )}
            </Animated.View>
          )}

          {/* Quantity & Price Row */}
          <Animated.View entering={FadeInDown.delay(250)} className="mt-6 flex-row gap-4">
            {!formCopy.hideQuantity && (
              <View className="flex-1">
                <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">{formCopy.quantityLabel}</Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder={formCopy.quantityPlaceholder}
                  placeholderTextColor="#6B7280"
                  style={{ backgroundColor: theme.surface, color: theme.text }}
                  className="rounded-xl p-4"
                  keyboardType="decimal-pad"
                />
              </View>
            )}
            <View className={cn('flex-1', formCopy.hideQuantity && 'w-full')}>
              <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">{formCopy.purchasePriceLabel}</Text>
              <TextInput
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                placeholder="0.00"
                placeholderTextColor="#6B7280"
                style={{ backgroundColor: theme.surface, color: theme.text }}
                className={cn('rounded-xl p-4', startTrackingToday && 'opacity-50')}
                keyboardType="decimal-pad"
                editable={!startTrackingToday}
              />
            </View>
          </Animated.View>

          {/* Current Price */}
          <Animated.View entering={FadeInDown.delay(300)} className="mt-6">
            <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">{formCopy.currentPriceLabel}</Text>
            <TextInput
              value={currentPrice}
              onChangeText={setCurrentPrice}
              placeholder="0.00"
              placeholderTextColor="#6B7280"
              style={{ backgroundColor: theme.surface, color: theme.text }}
              className="rounded-xl p-4"
              keyboardType="decimal-pad"
            />
            <Text style={{ color: theme.textSecondary }} className="text-xs mt-2">
              {formCopy.currentPriceHint}
            </Text>
          </Animated.View>

          {/* Currency */}
          <Animated.View entering={FadeInDown.delay(350)} className="mt-6">
            <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Currency</Text>
            <Pressable
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
              style={{ backgroundColor: theme.surface }}
              className="rounded-xl p-4 flex-row items-center justify-between"
            >
              <Text style={{ color: theme.text }}>
                {CURRENCIES.find((c) => c.value === currency)?.label} ({currency})
              </Text>
              <ChevronDown size={20} color={theme.textSecondary} />
            </Pressable>

            {showCurrencyPicker && (
              <Animated.View entering={FadeIn} style={{ backgroundColor: theme.surfaceHover, borderColor: theme.border }} className="rounded-xl mt-2 overflow-hidden">
                {CURRENCIES.map((curr) => (
                  <Pressable
                    key={curr.value}
                    onPress={() => {
                      setCurrency(curr.value);
                      setShowCurrencyPicker(false);
                      Haptics.selectionAsync();
                    }}
                    style={{ borderBottomColor: theme.border }}
                    className={cn(
                      'flex-row items-center p-4 border-b',
                      currency === curr.value && 'bg-indigo-600/20'
                    )}
                  >
                    <Text style={{ color: theme.textSecondary }} className="w-10">{curr.symbol}</Text>
                    <Text style={{ color: theme.text }} className="flex-1">{curr.label}</Text>
                    {currency === curr.value && <Check size={16} color="#6366F1" />}
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </Animated.View>

          {shouldShowCountryField && (
            <Animated.View entering={FadeInDown.delay(375)} className="mt-6">
              <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">
                {isRealEstate ? 'Property Country' : 'Country / Region'}
              </Text>
              <Pressable
                onPress={() => setShowCountryPicker(!showCountryPicker)}
                style={{ backgroundColor: theme.surface }}
                className="rounded-xl p-4 flex-row items-center justify-between"
              >
                <Text style={{ color: theme.text }}>
                  {COUNTRY_INFO[country]?.flag}{' '}
                  {country === 'OTHER' ? (customCountryName || 'Other') : COUNTRY_INFO[country]?.name} ({country})
                </Text>
                <ChevronDown size={20} color={theme.textSecondary} />
              </Pressable>

              {showCountryPicker && (
                <Animated.View entering={FadeIn} style={{ backgroundColor: theme.surfaceHover }} className="rounded-xl mt-2 overflow-hidden">
                  {COUNTRY_CODES.map((code) => (
                    <Pressable
                      key={code}
                      onPress={() => {
                        hasManuallyPickedCountry.current = true;
                        setCountry(code);
                        if (code !== 'OTHER') setCustomCountryName('');
                        setShowCountryPicker(false);
                        Haptics.selectionAsync();
                      }}
                      style={{ borderBottomColor: theme.border }}
                      className={cn(
                        'flex-row items-center p-4 border-b',
                        country === code && 'bg-indigo-600/20'
                      )}
                    >
                      <Text style={{ color: theme.textSecondary }} className="w-10">{COUNTRY_INFO[code].flag}</Text>
                      <Text style={{ color: theme.text }} className="flex-1">{COUNTRY_INFO[code].name}</Text>
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
                    style={{ backgroundColor: theme.surface, color: theme.text }}
                    className="rounded-xl p-4"
                  />
                </View>
              )}
            </Animated.View>
          )}

          {/* Purchase Date */}
          <Animated.View entering={FadeInDown.delay(400)} className="mt-6">
            <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Purchase Date</Text>
            <Pressable
              onPress={() => setShowPurchaseDatePicker(true)}
              style={{ backgroundColor: theme.surface }}
              className="rounded-xl p-4 flex-row items-center justify-between"
              disabled={startTrackingToday}
            >
              <Text style={{ color: startTrackingToday ? theme.textSecondary : theme.text }}>
                {purchaseDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Calendar size={20} color={startTrackingToday ? theme.textSecondary : theme.textSecondary} />
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

          {/* Start Tracking Today Toggle */}
          {canSearchTicker && (
            <Animated.View entering={FadeInDown.delay(425)} className="mt-4">
              <Pressable
                onPress={() => {
                  setStartTrackingToday(!startTrackingToday);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{ backgroundColor: theme.surfaceHover }}
                className="rounded-xl p-4 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <Text style={{ color: theme.text }} className="text-sm font-medium">Start tracking from today</Text>
                  <Text style={{ color: theme.textSecondary }} className="text-xs mt-1">
                    Use this if you don't know your original purchase date/price
                  </Text>
                </View>
                <View
                  className={cn(
                    "w-6 h-6 rounded-lg items-center justify-center border-2",
                    startTrackingToday ? "bg-indigo-600 border-indigo-600" : "border-gray-600"
                  )}
                >
                  {startTrackingToday && <Check size={14} color="white" strokeWidth={3} />}
                </View>
              </Pressable>
            </Animated.View>
          )}

          {/* Fixed Income Fields */}
          {isFixedIncome && (
            <>
              <Animated.View entering={FadeInDown.delay(450)} className="mt-6">
                <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Maturity Date</Text>
                <Pressable
                  onPress={() => setShowMaturityDatePicker(true)}
                  style={{ backgroundColor: theme.surface }}
                  className="rounded-xl p-4 flex-row items-center justify-between"
                >
                  <Text style={{ color: theme.text }}>
                    {maturityDate
                      ? maturityDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Select maturity date'}
                  </Text>
                  <Calendar size={20} color={theme.textSecondary} />
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
                <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Interest Rate (%)</Text>
                <TextInput
                  value={interestRate}
                  onChangeText={setInterestRate}
                  placeholder="e.g., 5.25"
                  placeholderTextColor="#6B7280"
                  style={{ backgroundColor: theme.surface, color: theme.text }}
                  className="rounded-xl p-4"
                  keyboardType="decimal-pad"
                />
              </Animated.View>
            </>
          )}

          {/* Real Estate Address */}
          {isRealEstate && (
            <Animated.View entering={FadeInDown.delay(450)} className="mt-6">
              <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Property Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="123 Main St, City, State"
                placeholderTextColor="#6B7280"
                style={{ backgroundColor: theme.surface, color: theme.text }}
                className="rounded-xl p-4"
              />
            </Animated.View>
          )}

          {/* Platform */}
          <Animated.View entering={FadeInDown.delay(550)} className="mt-6">
            <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Platform / Broker (optional)</Text>
            <PlatformPicker
              value={platform}
              onValueChange={setPlatform}
              customValue={customPlatform}
              onCustomValueChange={setCustomPlatform}
            />
          </Animated.View>

          {/* Held in (registered account) */}
          <Animated.View entering={FadeInDown.delay(575)} className="mt-6">
            <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Held in (optional)</Text>
            <Text style={{ color: theme.textSecondary }} className="text-xs mb-3">
              Tag this holding so Ledger can update your contribution room when you log contributions.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setHeldIn(null);
                }}
                style={{
                  backgroundColor: heldIn === null ? undefined : theme.surfaceHover,
                  borderColor: heldIn === null ? undefined : theme.border
                }}
                className={cn(
                  'px-4 py-2 rounded-full mr-2 border',
                  heldIn === null && 'bg-indigo-600/20 border-indigo-500/40'
                )}
              >
                <Text className={cn('text-xs font-semibold', heldIn === null ? 'text-indigo-200' : 'text-gray-300')}>
                  Taxable
                </Text>
              </Pressable>
              {heldInOptions.map((opt) => (
                <Pressable
                  key={opt.type}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setHeldIn(opt.type);
                  }}
                  style={{
                    borderColor: heldIn === opt.type ? 'rgba(255,255,255,0.2)' : theme.border
                  }}
                  className={cn(
                    'px-4 py-2 rounded-full mr-2 border'
                  )}
                  style={{
                    backgroundColor: heldIn === opt.type ? `${opt.color}22` : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: heldIn === opt.type ? opt.color : '#D1D5DB' }}
                  >
                    {opt.shortName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Notes */}
          <Animated.View entering={FadeInDown.delay(600)} className="mt-6">
            <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional information..."
              placeholderTextColor="#6B7280"
              style={{ backgroundColor: theme.surface, color: theme.text }}
              className="rounded-xl p-4 min-h-[100px]"
              multiline
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Monthly contribution */}
          {formCopy.supportsRecurringContribution && (
            <Animated.View entering={FadeInDown.delay(650)} className="mt-6">
              <Text style={{ color: theme.textSecondary }} className="text-sm mb-2">Paycheck Contribution (optional)</Text>
              <View style={{ backgroundColor: theme.surfaceHover, borderColor: theme.border }} className="rounded-2xl p-4 border">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMonthlyContributionEnabled((v) => !v);
                  }}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-1 pr-3">
                    <Text style={{ color: theme.text }} className="font-medium">Enable recurring contribution</Text>
                    <Text style={{ color: theme.textSecondary }} className="text-xs mt-1">
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
                    <Text style={{ color: theme.textSecondary }} className="text-xs mb-2">Paycheck frequency</Text>
                    <View className="flex-row gap-2 mb-3">
                      {PAYCHECK_FREQUENCIES.map((item) => (
                        <Pressable
                          key={item.key}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setPaycheckFrequency(item.key);
                          }}
                          style={{
                            backgroundColor: paycheckFrequency === item.key ? undefined : theme.surfaceHover,
                            borderColor: paycheckFrequency === item.key ? undefined : theme.border
                          }}
                          className={cn(
                            'flex-1 rounded-xl py-2.5 items-center border',
                            paycheckFrequency === item.key && 'bg-indigo-600/20 border-indigo-500/40'
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
                        <Text style={{ color: theme.textSecondary }} className="text-xs mb-2">Amount</Text>
                        <TextInput
                          value={monthlyContributionAmount}
                          onChangeText={setMonthlyContributionAmount}
                          placeholder="0.00"
                          placeholderTextColor="#6B7280"
                          style={{ backgroundColor: theme.surface, color: theme.text }}
                          className="rounded-xl p-3"
                          keyboardType="decimal-pad"
                        />
                      </View>
                      {paycheckFrequency === 'monthly' ? (
                        <View style={{ width: 110 }}>
                          <Text style={{ color: theme.textSecondary }} className="text-xs mb-2">Day (1–28)</Text>
                          <TextInput
                            value={monthlyContributionDay}
                            onChangeChange={setMonthlyContributionDay}
                            placeholder="1"
                            placeholderTextColor="#6B7280"
                            style={{ backgroundColor: theme.surface, color: theme.text }}
                            className="rounded-xl p-3"
                            keyboardType="number-pad"
                          />
                        </View>
                      ) : (
                        <View style={{ width: 160 }}>
                          <Text style={{ color: theme.textSecondary }} className="text-xs mb-2">Weekday</Text>
                          <View className="flex-row flex-wrap gap-2">
                            {WEEKDAYS.map((d) => (
                              <Pressable
                                key={d.key}
                                onPress={() => {
                                  Haptics.selectionAsync();
                                  setPaycheckWeekday(d.key);
                                }}
                                style={{
                                  backgroundColor: paycheckWeekday === d.key ? undefined : theme.surfaceHover,
                                  borderColor: paycheckWeekday === d.key ? undefined : theme.border
                                }}
                                className={cn(
                                  'px-2.5 py-2 rounded-lg border',
                                  paycheckWeekday === d.key && 'bg-indigo-600/20 border-indigo-500/40'
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
                        <Text style={{ color: theme.text }} className="text-sm font-medium">Auto-apply updates</Text>
                        <Text style={{ color: theme.textSecondary }} className="text-xs mt-1">
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

                    <Text style={{ color: theme.textSecondary }} className="text-[11px] mt-3">
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
              style={{ backgroundColor: canSubmit ? undefined : theme.surface }}
              className={cn(
                'rounded-2xl p-4 items-center',
                canSubmit && 'bg-indigo-600'
              )}
            >
              <Text style={{ color: canSubmit ? 'white' : theme.textSecondary }} className="font-semibold text-lg">
                Add to Portfolio
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
