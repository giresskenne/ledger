import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { PlatformPicker } from '@/components/PlatformPicker';
import {
  Layers,
  Shield,
  TrendingUp,
  PieChart,
  Sparkles,
  ArrowRight,
  Check,
  Search,
  ChevronLeft,
  ChevronDown,
  Calendar,
  DollarSign,
  Target,
  Coins,
  Home,
  Briefcase,
  Wallet,
  Bell,
  Plus,
  Info,
  Crown,
  Zap,
  BarChart3,
  Globe,
  AlertCircle,
  Settings,
  Infinity,
  X,
} from 'lucide-react-native';
import {
  useOnboardingStore,
  COUNTRY_DATA,
  TrackingIntent,
  TRACKING_INTENT_OPTIONS,
  OnboardingStep,
} from '@/lib/onboarding-store';
import { useRoomStore, getCurrentTaxYearId, countPeriodsUntilEnd, getEffectiveAnnualLimit } from '@/lib/room-store';
import { usePortfolioStore } from '@/lib/store';
import { useNotificationsStore } from '@/lib/notifications-store';
import { searchTicker as searchTickerAPI } from '@/lib/market-data';
import {
  Currency,
  PayFrequency,
  ACCOUNT_CONFIGS,
  JurisdictionCode,
  AssetCategory,
  CATEGORY_INFO,
  CountryCode,
  COUNTRY_INFO,
  POPULAR_BROKERS,
  RegisteredAccountType,
} from '@/lib/types';
import { cn } from '@/lib/cn';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ==================== CINEMATIC SLIDES ====================

const CINEMATIC_SLIDES = [
  {
    id: 'chaos',
    emotion: 'recognition',
    headline: 'Your wealth is\nscattered',
    subheadline: 'Across apps. Across accounts.\nAcross your mind.',
    description: "Stocks here. Savings there. Real estate somewhere else. You're wealthy—but you can't see it.",
    gradient: ['#1a0a0a', '#0A0A0F', '#0a0a1a'] as const,
    accentColor: '#EF4444',
    visualType: 'scattered',
  },
  {
    id: 'unified',
    emotion: 'relief',
    headline: 'One view.\nTotal clarity.',
    subheadline: 'Every asset. Every account.\nOne beautiful dashboard.',
    description: 'Stocks, bonds, gold, real estate, crypto—all unified. Finally see your complete financial picture.',
    gradient: ['#0a1a1a', '#0A0A0F', '#0a0a2a'] as const,
    accentColor: '#10B981',
    visualType: 'unified',
  },
  {
    id: 'insights',
    emotion: 'empowerment',
    headline: 'Know your\nreal risk',
    subheadline: 'AI-powered analysis.\nSmart diversification.',
    description: 'Avoid concentration gaps. Get smart rebalancing tips. Prevent costly portfolio blind spots.',
    gradient: ['#0a0a2a', '#0A0A0F', '#1a0a1a'] as const,
    accentColor: '#6366F1',
    visualType: 'analysis',
  },
  {
    id: 'action',
    emotion: 'motivation',
    headline: 'Your wealth\nawaits',
    subheadline: 'Join thousands taking control\nof their financial future.',
    description: 'Start in seconds. Add your first asset. Begin your journey to financial clarity.',
    gradient: ['#0a0a1a', '#0A0A0F', '#1a0a2a'] as const,
    accentColor: '#8B5CF6',
    visualType: 'cta',
  },
];

const PAY_FREQUENCIES: { value: PayFrequency; label: string; description: string }[] = [
  { value: 'weekly', label: 'Weekly', description: 'Every week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month' },
];

// Icon mapping for tracking intents
const TRACKING_ICONS: Record<TrackingIntent, React.ComponentType<{ size: number; color: string }>> = {
  stocks: TrendingUp,
  crypto: Coins,
  real_estate: Home,
  private_investments: Briefcase,
  cash_savings: Wallet,
  registered_accounts: Shield,
};

// ==================== CINEMATIC VISUALS ====================

function FloatingOrb({
  delay,
  size,
  color,
  startX,
  startY,
}: {
  delay: number;
  size: number;
  color: string;
  startX: number;
  startY: number;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  // Default visible so the UI doesn't depend on Reanimated "entering" behavior.
  const orbOpacity = useSharedValue(0.6);

  React.useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSequence(
        withTiming(-20, { duration: 2500 }),
        withTiming(20, { duration: 2500 }),
        withTiming(-20, { duration: 2500 })
      )
    );
    translateX.value = withDelay(
      delay,
      withSequence(
        withTiming(10, { duration: 3000 }),
        withTiming(-10, { duration: 3000 }),
        withTiming(10, { duration: 3000 })
      )
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.1, { duration: 2000 }),
        withTiming(0.9, { duration: 2000 }),
        withTiming(1.1, { duration: 2000 })
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: orbOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: startY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

function ScatteredVisual({ accentColor }: { accentColor: string }) {
  const items = [
    { IconComponent: TrendingUp, x: 30, y: 60, delay: 0 },
    { IconComponent: Home, x: SCREEN_WIDTH - 100, y: 40, delay: 100 },
    { IconComponent: Wallet, x: 50, y: 180, delay: 200 },
    { IconComponent: Coins, x: SCREEN_WIDTH - 80, y: 160, delay: 300 },
    { IconComponent: BarChart3, x: SCREEN_WIDTH / 2 - 20, y: 100, delay: 400 },
    { IconComponent: Zap, x: 80, y: 280, delay: 500 },
  ];

  return (
    <View style={{ height: 320, position: 'relative' }}>
      {items.map((item, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            opacity: 0.7,
          }}
        >
          <item.IconComponent size={32} color={accentColor} />
        </View>
      ))}
      <FloatingOrb delay={0} size={120} color={`${accentColor}15`} startX={20} startY={50} />
      <FloatingOrb delay={300} size={80} color={`${accentColor}10`} startX={SCREEN_WIDTH - 120} startY={200} />
    </View>
  );
}

function UnifiedVisual({ accentColor }: { accentColor: string }) {
  const categories = [
    { label: 'Stocks', percent: 35, color: '#10B981' },
    { label: 'Real Estate', percent: 25, color: '#EC4899' },
    { label: 'Bonds', percent: 20, color: '#6366F1' },
    { label: 'Gold', percent: 12, color: '#F59E0B' },
    { label: 'Cash', percent: 8, color: '#22C55E' },
  ];

  return (
    <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: SCREEN_WIDTH - 80,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: 24,
          padding: 24,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>TOTAL PORTFOLIO</Text>
        <Text style={{ color: 'white', fontSize: 32, fontWeight: '700' }}>$847,350</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accentColor }} />
          <Text style={{ color: accentColor, marginLeft: 6, fontWeight: '600' }}>+12.4%</Text>
          <Text style={{ color: '#6B7280', marginLeft: 4 }}>all time</Text>
        </View>

        <View style={{ height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden', marginTop: 20 }}>
          {categories.map((cat, i) => (
            <View
              key={cat.label}
              style={{
                width: `${cat.percent}%`,
                height: '100%',
                backgroundColor: cat.color,
              }}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 12 }}>
          {categories.slice(0, 4).map((cat) => (
            <View key={cat.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: cat.color,
                  marginRight: 6,
                }}
              />
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{cat.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <FloatingOrb delay={0} size={100} color={`${accentColor}12`} startX={-20} startY={80} />
    </View>
  );
}

function AnalysisVisual({ accentColor }: { accentColor: string }) {
  const riskScore = 6.2;

  return (
    <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 160,
            height: 160,
            borderRadius: 80,
            borderWidth: 12,
            borderColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: 80,
              borderWidth: 12,
              borderColor: 'transparent',
              borderTopColor: accentColor,
              borderRightColor: accentColor,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <Text style={{ color: 'white', fontSize: 48, fontWeight: '700' }}>{riskScore}</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12 }}>RISK SCORE</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
          {['Tech: 45%', 'US: 85%', 'Equity: 60%'].map((insight, i) => (
            <View
              key={insight}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: i === 0 ? '#EF444440' : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text style={{ color: i === 0 ? '#EF4444' : '#9CA3AF', fontSize: 13, fontWeight: '500' }}>
                {insight}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <FloatingOrb delay={200} size={80} color={`${accentColor}15`} startX={SCREEN_WIDTH - 100} startY={40} />
    </View>
  );
}

function CTAVisual({ accentColor }: { accentColor: string }) {
  const features = [
    { icon: Check, label: '10+ Asset Types' },
    { icon: Check, label: 'AI Risk Analysis' },
    { icon: Check, label: 'Tax Room Tracking' },
    { icon: Check, label: 'Multi-Currency' },
  ];

  return (
    <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
      <View>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 32,
            backgroundColor: `${accentColor}20`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <Zap size={48} color={accentColor} />
        </View>
      </View>

      <View style={{ gap: 16 }}>
        {features.map((feature, i) => (
          <View
            key={feature.label}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: `${accentColor}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <feature.icon size={16} color={accentColor} />
            </View>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '500' }}>{feature.label}</Text>
          </View>
        ))}
      </View>
      <FloatingOrb delay={100} size={120} color={`${accentColor}10`} startX={SCREEN_WIDTH - 80} startY={0} />
      <FloatingOrb delay={300} size={80} color={`${accentColor}08`} startX={-20} startY={200} />
    </View>
  );
}

function SlideVisual({ visualType, accentColor }: { visualType: string; accentColor: string }) {
  switch (visualType) {
    case 'scattered':
      return <ScatteredVisual accentColor={accentColor} />;
    case 'unified':
      return <UnifiedVisual accentColor={accentColor} />;
    case 'analysis':
      return <AnalysisVisual accentColor={accentColor} />;
    case 'cta':
      return <CTAVisual accentColor={accentColor} />;
    default:
      return null;
  }
}

// ==================== STEP COMPONENTS ====================

// Country Selection Step
function CountrySelectionStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const selectedCountry = useOnboardingStore((s) => s.selectedCountry);
  const setCountry = useOnboardingStore((s) => s.setCountry);
  const selectedCurrency = useOnboardingStore((s) => s.selectedCurrency);
  const [searchQuery, setSearchQuery] = useState('');

  const countries = Object.entries(COUNTRY_DATA);
  const popular = ['US', 'UK', 'CA'];

  const filteredCountries = countries.filter(([code, data]) =>
    data.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.setupStep}>
      <LinearGradient colors={['#6366F1', '#4F46E5']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.setupHeader, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ChevronLeft size={24} color="white" />
        </Pressable>
        <Text style={styles.setupHeaderTitle}>Select Country</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color="#999" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Find your country"
            placeholderTextColor="#999"
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Country List */}
      <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
        {/* Popular */}
        <View style={styles.countrySection}>
          <Text style={styles.sectionLabel}>Popular</Text>
          {countries
            .filter(([code]) => popular.includes(code))
            .map(([code, data]) => {
              const isSelected = selectedCountry === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCountry(code);
                  }}
                  style={styles.countryItem}
                >
                  <Text style={styles.countryFlag}>{data.flag}</Text>
                  <Text style={styles.countryLabel}>{data.name}</Text>
                  {isSelected && (
                    <View style={styles.radioSelected}>
                      <View style={styles.radioDot} />
                    </View>
                  )}
                  {!isSelected && <View style={styles.radioUnselected} />}
                </Pressable>
              );
            })}
        </View>

        {/* All */}
        <View style={styles.countrySection}>
          <Text style={styles.sectionLabel}>All Countries</Text>
          {filteredCountries
            .filter(([code]) => !popular.includes(code))
            .map(([code, data]) => {
              const isSelected = selectedCountry === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCountry(code);
                  }}
                  style={styles.countryItem}
                >
                  <Text style={styles.countryFlag}>{data.flag}</Text>
                  <Text style={styles.countryLabel}>{data.name}</Text>
                  {isSelected && (
                    <View style={styles.radioSelected}>
                      <View style={styles.radioDot} />
                    </View>
                  )}
                  {!isSelected && <View style={styles.radioUnselected} />}
                </Pressable>
              );
            })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Next Button with currency notice */}
      <View style={[styles.setupFooter, { paddingBottom: insets.bottom + 16 }]}>
        {selectedCountry && (
          <Animated.View entering={FadeInUp.duration(200)} style={styles.currencyNotice}>
            <Info size={14} color="#6366F1" />
            <Text style={styles.currencyNoticeText}>
              Currency set to {selectedCurrency}. You can change this in Settings.
            </Text>
          </Animated.View>
        )}
        <Pressable
          onPress={() => {
            if (selectedCountry) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }
          }}
          disabled={!selectedCountry}
          style={{ opacity: selectedCountry ? 1 : 0.5 }}
        >
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.setupButton}>
            <Text style={styles.setupButtonText}>Continue</Text>
            <ArrowRight size={20} color="white" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// Tracking Intent Step
function TrackingIntentStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const trackingIntents = useOnboardingStore((s) => s.trackingIntents);
  const toggleTrackingIntent = useOnboardingStore((s) => s.toggleTrackingIntent);
  const registeredAccountsEnabled = useOnboardingStore((s) => s.registeredAccountsEnabled);

  const visibleOptions = TRACKING_INTENT_OPTIONS.filter(
    (opt) => !opt.requiresEligibility || registeredAccountsEnabled
  );

  return (
    <View style={styles.setupDarkStep}>
      <LinearGradient
        colors={['#1a1a2e', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onBack} style={styles.darkBackButton}>
          <ChevronLeft size={24} color="white" />
        </Pressable>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepIndicatorText}>Step 1 of 4</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.setupDarkContent}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.setupDarkTitle}>What do you want to track?</Text>
          <Text style={styles.setupDarkSubtitle}>
            Pick what matters now. You can add more later.
          </Text>
        </Animated.View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.intentListContainer}>
            {visibleOptions.map((option, index) => {
              const isSelected = trackingIntents.includes(option.id);
              const IconComponent = TRACKING_ICONS[option.id];
              const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
              const bgColor = colors[index % colors.length];

              return (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.delay(200 + index * 50)}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleTrackingIntent(option.id);
                    }}
                  >
                    <View style={styles.intentListItem}>
                      <View
                        style={[
                          styles.intentListCircle,
                          {
                            backgroundColor: isSelected ? bgColor : 'rgba(255,255,255,0.1)',
                            borderWidth: isSelected ? 0 : 2,
                            borderColor: 'rgba(255,255,255,0.2)',
                          },
                        ]}
                      >
                        <IconComponent
                          size={24}
                          color={isSelected ? 'white' : '#6B7280'}
                        />
                        {isSelected && (
                          <View
                            style={[
                              styles.intentListCheck,
                              { backgroundColor: bgColor },
                            ]}
                          >
                            <Check size={12} color="white" />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.intentListLabel,
                          isSelected && styles.intentListLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.setupDarkFooter, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
            disabled={trackingIntents.length === 0}
            style={{ opacity: trackingIntents.length > 0 ? 1 : 0.5 }}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.setupButton}>
              <Text style={styles.setupButtonText}>Continue</Text>
              <ArrowRight size={20} color="white" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// First Asset Step
// Currency list for add asset
const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'Fr' },
];

const ASSET_COUNTRY_CODES = Object.keys(COUNTRY_INFO) as CountryCode[];

function clampDayOfMonth(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(28, Math.floor(value)));
}

const WEEKDAYS: { key: number; label: string }[] = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' },
  { key: 0, label: 'Sun' },
];

// First Asset Step - Matches add-asset.tsx exactly
function FirstAssetStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const addAsset = usePortfolioStore((s) => s.addAsset);
  const markFirstAssetAdded = useOnboardingStore((s) => s.markFirstAssetAdded);
  const selectedCurrency = useOnboardingStore((s) => s.selectedCurrency);
  const selectedCountry = useOnboardingStore((s) => s.selectedCountry);

  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [category, setCategory] = useState<AssetCategory>('stocks');
  const [quantity, setQuantity] = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currency, setCurrency] = useState<Currency>(selectedCurrency);
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [maturityDate, setMaturityDate] = useState<Date | null>(null);
  const [interestRate, setInterestRate] = useState('');
  const [platform, setPlatform] = useState('');
  const [customPlatform, setCustomPlatform] = useState('');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState<CountryCode>(() => {
    const fallback: CountryCode = 'US';
    const code = (selectedCountry ?? fallback).toUpperCase();
    return (code in COUNTRY_INFO ? (code as CountryCode) : fallback) as CountryCode;
  });
  const [customCountryName, setCustomCountryName] = useState('');

  const [monthlyContributionEnabled, setMonthlyContributionEnabled] = useState(false);
  const [monthlyContributionAmount, setMonthlyContributionAmount] = useState('');
  const [monthlyContributionDay, setMonthlyContributionDay] = useState('1');
  const [paycheckFrequency, setPaycheckFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [paycheckWeekday, setPaycheckWeekday] = useState<number>(() => new Date().getDay());
  const [monthlyContributionAutoApply, setMonthlyContributionAutoApply] = useState(true);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showMaturityDatePicker, setShowMaturityDatePicker] = useState(false);

  // Ticker search state
  const [isSearchingTicker, setIsSearchingTicker] = useState(false);
  const [tickerSearchError, setTickerSearchError] = useState<string | null>(null);

  const isFixedIncome = category === 'fixed_income' || category === 'bonds';
  const isRealEstate = category === 'real_estate';
  const canSearchTicker = category === 'stocks' || category === 'funds' || category === 'crypto';
  const hideQuantity = category === 'cash' || category === 'real_estate';
  const purchasePriceOptional = category === 'cash';

  const namePlaceholder =
    category === 'cash'
      ? 'e.g., Checking account, Emergency fund'
      : isRealEstate
        ? 'e.g., Condo — Downtown, Rental property'
        : 'e.g., Apple Inc., Gold Bar, etc.';

  const purchasePriceLabel =
    category === 'cash' ? 'Starting Balance (optional)' : 'Purchase Price *';

  const currentPriceLabel =
    category === 'cash'
      ? 'Current Balance *'
      : isRealEstate
        ? 'Current Estimated Value *'
        : 'Current Price *';

  const currentPriceHint =
    category === 'cash'
      ? 'Update this occasionally to keep your cash total accurate.'
      : 'For market-traded assets, prices update automatically. Manual assets require periodic updates.';

  // Enforce "single" quantity for certain categories.
  React.useEffect(() => {
    if (!hideQuantity) return;
    if (!quantity || Number(quantity) !== 1) setQuantity('1');
  }, [hideQuantity, quantity]);

  const resolvedQuantity = hideQuantity ? 1 : parseFloat(quantity);
  const resolvedCurrentPrice = parseFloat(currentPrice);
  const resolvedPurchasePrice = parseFloat(purchasePrice || (purchasePriceOptional ? currentPrice : ''));

  const canSubmit =
    name.trim() &&
    Number.isFinite(resolvedQuantity) &&
    resolvedQuantity > 0 &&
    Number.isFinite(resolvedPurchasePrice) &&
    resolvedPurchasePrice > 0 &&
    Number.isFinite(resolvedCurrentPrice) &&
    resolvedCurrentPrice > 0;

  // Search ticker and fetch live price
  const handleTickerSearch = async () => {
    if (!ticker.trim() || !canSearchTicker) return;

    setIsSearchingTicker(true);
    setTickerSearchError(null);

    try {
      const result = await searchTickerAPI(ticker.trim(), category, undefined, currency);

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

    const finalPlatform = platform === 'Other' ? customPlatform.trim() : platform.trim();
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

    addAsset({
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
      platform: finalPlatform || undefined,
      notes: notes.trim() || undefined,
      address: address.trim() || undefined,
      country,
      countryName: country === 'OTHER' ? customCountryName.trim() || undefined : undefined,
      isManual: !canSearchTicker,
      recurringContribution,
    });

    markFirstAssetAdded();
    onNext();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.1)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable onPress={onBack} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={24} color="white" />
          </Pressable>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepIndicatorText}>Step 2 of 4</Text>
          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor: canSubmit ? '#6366F1' : 'transparent',
            }}
          >
            {canSubmit && <Check size={20} color="white" />}
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(100)}>
            <Text style={styles.setupDarkTitle}>Add your first asset</Text>
            <Text style={styles.setupDarkSubtitle}>
              This unlocks your dashboard. You can modify or add more later.
            </Text>
          </Animated.View>

          {/* Category Selector */}
          <Animated.View entering={FadeInDown.delay(150)} style={{ marginTop: 24 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Asset Category *</Text>
            <Pressable
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    backgroundColor: CATEGORY_INFO[category].color + '30',
                  }}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: CATEGORY_INFO[category].color,
                    }}
                  />
                </View>
                <Text style={{ color: 'white', fontSize: 16 }}>{CATEGORY_INFO[category].label}</Text>
              </View>
              <ChevronDown size={20} color="#9CA3AF" />
            </Pressable>

            {showCategoryPicker && (
              <Animated.View entering={FadeIn} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginTop: 8, overflow: 'hidden' }}>
                {(Object.keys(CATEGORY_INFO) as AssetCategory[]).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                      Haptics.selectionAsync();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: 'rgba(255,255,255,0.05)',
                      backgroundColor: category === cat ? 'rgba(99,102,241,0.2)' : 'transparent',
                    }}
                  >
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        marginRight: 12,
                        backgroundColor: CATEGORY_INFO[cat].color,
                      }}
                    />
                    <Text style={{ color: 'white', flex: 1, fontSize: 16 }}>{CATEGORY_INFO[cat].label}</Text>
                    {category === cat && <Check size={16} color="#6366F1" />}
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </Animated.View>

          {/* Name */}
          <Animated.View entering={FadeInDown.delay(200)} style={{ marginTop: 24 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Asset Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={namePlaceholder}
              placeholderTextColor="#6B7280"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                color: 'white',
                fontSize: 16,
              }}
            />
          </Animated.View>

          {/* Ticker (optional) - with live data search */}
          {canSearchTicker && (
            <Animated.View entering={FadeInDown.delay(250)} style={{ marginTop: 24 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>
                Ticker Symbol (Search for live price)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={ticker}
                  onChangeText={(text) => {
                    setTicker(text.toUpperCase());
                    setTickerSearchError(null);
                  }}
                  placeholder="e.g., AAPL, VOO, BTC"
                  placeholderTextColor="#6B7280"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 16,
                    color: 'white',
                    fontSize: 16,
                    flex: 1,
                  }}
                  autoCapitalize="characters"
                  onSubmitEditing={handleTickerSearch}
                />
                <Pressable
                  onPress={handleTickerSearch}
                  disabled={!ticker.trim() || isSearchingTicker}
                  style={{
                    backgroundColor: ticker.trim() && !isSearchingTicker ? '#6366F1' : 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 56,
                  }}
                >
                  {isSearchingTicker ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Search size={20} color="white" />
                  )}
                </Pressable>
              </View>
              {tickerSearchError && (
                <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>{tickerSearchError}</Text>
              )}
              {!tickerSearchError && (
                <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>
                  Enter a ticker and tap search to fetch live price data
                </Text>
              )}
            </Animated.View>
          )}

          {/* Quantity & Price Row */}
          <Animated.View entering={FadeInDown.delay(300)} style={{ marginTop: 24, flexDirection: 'row', gap: 16 }}>
            {!hideQuantity && (
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Quantity *</Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor="#6B7280"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 16,
                    color: 'white',
                    fontSize: 16,
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>{purchasePriceLabel}</Text>
              <TextInput
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                placeholder="0.00"
                placeholderTextColor="#6B7280"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: 16,
                  color: 'white',
                  fontSize: 16,
                }}
                keyboardType="decimal-pad"
              />
            </View>
          </Animated.View>

          {/* Current Price */}
          <Animated.View entering={FadeInDown.delay(350)} style={{ marginTop: 24 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>{currentPriceLabel}</Text>
            <TextInput
              value={currentPrice}
              onChangeText={setCurrentPrice}
              placeholder="0.00"
              placeholderTextColor="#6B7280"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                color: 'white',
                fontSize: 16,
              }}
              keyboardType="decimal-pad"
            />
            <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>
              {currentPriceHint}
            </Text>
          </Animated.View>

          {/* Currency */}
          <Animated.View entering={FadeInDown.delay(400)} style={{ marginTop: 24 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Currency</Text>
            <Pressable
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>
                {CURRENCIES.find((c) => c.value === currency)?.label} ({currency})
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </Pressable>

            {showCurrencyPicker && (
              <Animated.View entering={FadeIn} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginTop: 8, overflow: 'hidden' }}>
                {CURRENCIES.map((curr) => (
                  <Pressable
                    key={curr.value}
                    onPress={() => {
                      setCurrency(curr.value);
                      setShowCurrencyPicker(false);
                      Haptics.selectionAsync();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: 'rgba(255,255,255,0.05)',
                      backgroundColor: currency === curr.value ? 'rgba(99,102,241,0.2)' : 'transparent',
                    }}
                  >
                    <Text style={{ color: '#9CA3AF', width: 40, fontSize: 16 }}>{curr.symbol}</Text>
                    <Text style={{ color: 'white', flex: 1, fontSize: 16 }}>{curr.label}</Text>
                    {currency === curr.value && <Check size={16} color="#6366F1" />}
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </Animated.View>

          {/* Country / Region */}
          <Animated.View entering={FadeInDown.delay(425)} style={{ marginTop: 24 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>
              {isRealEstate ? 'Property Country' : 'Country / Region'}
            </Text>
            <Pressable
              onPress={() => setShowCountryPicker(!showCountryPicker)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>
                {COUNTRY_INFO[country]?.flag}{' '}
                {country === 'OTHER' ? (customCountryName || 'Other') : COUNTRY_INFO[country]?.name} ({country})
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </Pressable>

            {showCountryPicker && (
              <Animated.View
                entering={FadeIn}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 12,
                  marginTop: 8,
                  overflow: 'hidden',
                }}
              >
                {ASSET_COUNTRY_CODES.map((code) => (
                  <Pressable
                    key={code}
                    onPress={() => {
                      setCountry(code);
                      if (code !== 'OTHER') setCustomCountryName('');
                      setShowCountryPicker(false);
                      Haptics.selectionAsync();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: 'rgba(255,255,255,0.05)',
                      backgroundColor: country === code ? 'rgba(99,102,241,0.2)' : 'transparent',
                    }}
                  >
                    <Text style={{ color: '#9CA3AF', width: 40, fontSize: 16 }}>
                      {COUNTRY_INFO[code].flag}
                    </Text>
                    <Text style={{ color: 'white', flex: 1, fontSize: 16 }}>
                      {COUNTRY_INFO[code].name}
                    </Text>
                    {country === code && <Check size={16} color="#6366F1" />}
                  </Pressable>
                ))}
              </Animated.View>
            )}

            {country === 'OTHER' && (
              <View style={{ marginTop: 12 }}>
                <TextInput
                  value={customCountryName}
                  onChangeText={setCustomCountryName}
                  placeholder="Enter country name"
                  placeholderTextColor="#6B7280"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 16,
                    color: 'white',
                    fontSize: 16,
                  }}
                />
              </View>
            )}
          </Animated.View>

          {/* Purchase Date */}
          <Animated.View entering={FadeInDown.delay(450)} style={{ marginTop: 24 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Purchase Date</Text>
            <Pressable
              onPress={() => setShowPurchaseDatePicker(true)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>
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
              <Animated.View entering={FadeInDown.delay(500)} style={{ marginTop: 24 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Maturity Date</Text>
                <Pressable
                  onPress={() => setShowMaturityDatePicker(true)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 16 }}>
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

              <Animated.View entering={FadeInDown.delay(550)} style={{ marginTop: 24 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Interest Rate (%)</Text>
                <TextInput
                  value={interestRate}
                  onChangeText={setInterestRate}
                  placeholder="e.g., 5.25"
                  placeholderTextColor="#6B7280"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 16,
                    color: 'white',
                    fontSize: 16,
                  }}
                  keyboardType="decimal-pad"
                />
              </Animated.View>
            </>
          )}

          {/* Real Estate Address */}
          {isRealEstate && (
            <Animated.View entering={FadeInDown.delay(500)} style={{ marginTop: 24 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Property Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="123 Main St, City, State"
                placeholderTextColor="#6B7280"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: 16,
                  color: 'white',
                  fontSize: 16,
                }}
              />
            </Animated.View>
          )}

          {/* Platform / Broker with autocomplete */}
          <Animated.View entering={FadeInDown.delay(600)} style={{ marginTop: 24 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Platform / Broker (optional)</Text>
            <PlatformPicker
              value={platform}
              onValueChange={setPlatform}
              customValue={customPlatform}
              onCustomValueChange={setCustomPlatform}
            />
          </Animated.View>

          {/* Notes */}
          <Animated.View entering={FadeInDown.delay(650)} style={{ marginTop: 24 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional information..."
              placeholderTextColor="#6B7280"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                color: 'white',
                fontSize: 16,
                minHeight: 100,
              }}
              multiline
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Monthly contribution */}
          {(category === 'stocks' ||
            category === 'funds' ||
            category === 'crypto' ||
            category === 'bonds' ||
            category === 'fixed_income' ||
            category === 'gold' ||
            category === 'physical_metals' ||
            category === 'cash') && (
            <Animated.View entering={FadeInDown.delay(675)} style={{ marginTop: 24 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>
                Paycheck Contribution (optional)
              </Text>
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                      Enable recurring contribution
                    </Text>
                    <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 6 }}>
                      Get a reminder and keep your position updated over time.
                    </Text>
                  </View>
                  <Switch
                    value={monthlyContributionEnabled}
                    onValueChange={(v) => setMonthlyContributionEnabled(v)}
                    trackColor={{ false: '#374151', true: '#6366F1' }}
                    thumbColor="white"
                  />
                </View>

                {monthlyContributionEnabled && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>Paycheck frequency</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      {(['weekly', 'biweekly', 'monthly'] as const).map((f) => (
                        <Pressable
                          key={f}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setPaycheckFrequency(f);
                          }}
                          style={{
                            flex: 1,
                            borderRadius: 12,
                            paddingVertical: 10,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor:
                              paycheckFrequency === f ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.12)',
                            backgroundColor:
                              paycheckFrequency === f ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                          }}
                        >
                          <Text
                            style={{
                              color: paycheckFrequency === f ? '#C7D2FE' : '#D1D5DB',
                              fontSize: 12,
                              fontWeight: '700',
                            }}
                          >
                            {f === 'weekly' ? 'Weekly' : f === 'biweekly' ? 'Bi-weekly' : 'Monthly'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>Amount</Text>
                        <TextInput
                          value={monthlyContributionAmount}
                          onChangeText={setMonthlyContributionAmount}
                          placeholder="0.00"
                          placeholderTextColor="#6B7280"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 12,
                            padding: 14,
                            color: 'white',
                            fontSize: 16,
                          }}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      {paycheckFrequency === 'monthly' ? (
                        <View style={{ width: 120 }}>
                          <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>Day (1–28)</Text>
                          <TextInput
                            value={monthlyContributionDay}
                            onChangeText={setMonthlyContributionDay}
                            placeholder="1"
                            placeholderTextColor="#6B7280"
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              borderRadius: 12,
                              padding: 14,
                              color: 'white',
                              fontSize: 16,
                            }}
                            keyboardType="number-pad"
                          />
                        </View>
                      ) : (
                        <View style={{ width: 160 }}>
                          <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>Weekday</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {WEEKDAYS.map((d) => (
                              <Pressable
                                key={d.key}
                                onPress={() => {
                                  Haptics.selectionAsync();
                                  setPaycheckWeekday(d.key);
                                }}
                                style={{
                                  borderRadius: 10,
                                  paddingVertical: 8,
                                  paddingHorizontal: 10,
                                  borderWidth: 1,
                                  borderColor:
                                    paycheckWeekday === d.key
                                      ? 'rgba(99,102,241,0.5)'
                                      : 'rgba(255,255,255,0.12)',
                                  backgroundColor:
                                    paycheckWeekday === d.key
                                      ? 'rgba(99,102,241,0.18)'
                                      : 'rgba(255,255,255,0.05)',
                                }}
                              >
                                <Text
                                  style={{
                                    color: paycheckWeekday === d.key ? '#C7D2FE' : '#D1D5DB',
                                    fontSize: 11,
                                    fontWeight: '700',
                                  }}
                                >
                                  {d.label}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                          Auto-apply updates
                        </Text>
                        <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 6 }}>
                          When due, Ledger will update your position and ask you to validate it.
                        </Text>
                      </View>
                      <Switch
                        value={monthlyContributionAutoApply}
                        onValueChange={(v) => setMonthlyContributionAutoApply(v)}
                        trackColor={{ false: '#374151', true: '#6366F1' }}
                        thumbColor="white"
                      />
                    </View>

                    <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 12 }}>
                      You can confirm each contribution from the Events screen.
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Submit Button */}
          <Animated.View entering={FadeInDown.delay(700)} style={{ marginTop: 32 }}>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={{
                borderRadius: 14,
                padding: 16,
                alignItems: 'center',
                backgroundColor: canSubmit ? '#6366F1' : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text
                style={{
                  fontWeight: '600',
                  fontSize: 18,
                  color: canSubmit ? 'white' : '#6B7280',
                }}
              >
                Add to Portfolio
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Registered Accounts Step
function RegisteredAccountsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const selectedCountry = useOnboardingStore((s) => s.selectedCountry);
  const selectedRegisteredAccounts = useOnboardingStore((s) => s.selectedRegisteredAccounts);
  const toggleRegisteredAccount = useOnboardingStore((s) => s.toggleRegisteredAccount);
  const setJurisdictionProfile = useRoomStore((s) => s.setJurisdictionProfile);
  const addContribution = useRoomStore((s) => s.addContribution);

  const [contributionAmounts, setContributionAmounts] = useState<Record<string, string>>({});

  const countryAccounts = useMemo(() => {
    if (!selectedCountry) return [];
    return ACCOUNT_CONFIGS.filter((c) => c.jurisdiction === selectedCountry);
  }, [selectedCountry]);

  const handleToggleAccount = (accountType: RegisteredAccountType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleRegisteredAccount(accountType);
    // Clear contribution amount if deselecting
    if (selectedRegisteredAccounts.includes(accountType)) {
      const newAmounts = { ...contributionAmounts };
      delete newAmounts[accountType];
      setContributionAmounts(newAmounts);
    }
  };

  const handleContributionChange = (accountType: string, value: string) => {
    setContributionAmounts({
      ...contributionAmounts,
      [accountType]: value,
    });
  };

  const handleContinue = () => {
    if (selectedCountry && selectedRegisteredAccounts.length > 0) {
      setJurisdictionProfile({
        countryCode: selectedCountry as JurisdictionCode,
      });

      // Add contributions for each selected account with an amount
      const taxYearId = getCurrentTaxYearId(selectedCountry as JurisdictionCode);
      const currencyMap: Record<string, Currency> = {
        UK: 'GBP',
        CA: 'USD', // Using USD as CAD is not in Currency type
        US: 'USD',
      };

      selectedRegisteredAccounts.forEach((accountType) => {
        const amountStr = contributionAmounts[accountType];
        if (amountStr) {
          const amount = parseFloat(amountStr);
          if (!isNaN(amount) && amount > 0) {
            const accountConfig = ACCOUNT_CONFIGS.find(a => a.type === accountType);
            if (accountConfig) {
              addContribution({
                accountType: accountConfig.type,
                taxYearId,
                amount,
                currency: currencyMap[selectedCountry] || 'USD',
                date: new Date().toISOString(),
                source: 'manual',
              });
            }
          }
        }
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <View style={styles.setupDarkStep}>
      <LinearGradient
        colors={['#1a1a2e', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onBack} style={styles.darkBackButton}>
          <ChevronLeft size={24} color="white" />
        </Pressable>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepIndicatorText}>Step 3 of 4</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.setupDarkContent}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <View style={styles.iconCircleSmall}>
            <Shield size={32} color="#6366F1" />
          </View>
          <Text style={styles.setupDarkTitle}>Track contribution room?</Text>
          <Text style={styles.setupDarkSubtitle}>
            Add your tax-advantaged accounts to see remaining room and savings targets.
          </Text>
        </Animated.View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.accountsList}>
            {countryAccounts.map((account, index) => {
              const isSelected = selectedRegisteredAccounts.includes(account.type);

              return (
                <Animated.View key={account.type} entering={FadeInDown.delay(200 + index * 50)}>
                  <View style={{ marginBottom: 12 }}>
                    <Pressable
                      onPress={() => handleToggleAccount(account.type)}
                      style={[
                        styles.accountCard,
                        isSelected && { borderColor: account.color, backgroundColor: `${account.color}10` },
                      ]}
                    >
                      <View style={[styles.accountIconBox, { backgroundColor: `${account.color}20` }]}>
                        <Shield size={20} color={account.color} />
                      </View>
                      <View style={styles.accountCardInfo}>
                        <Text style={styles.accountCardName}>{account.shortName}</Text>
                        <Text style={styles.accountCardDesc} numberOfLines={1}>
                          {account.description}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.accountToggle,
                          isSelected && { backgroundColor: account.color },
                        ]}
                      />
                    </Pressable>

                    {/* Contribution Input - Show when selected */}
                    {isSelected && (
                      <Animated.View entering={FadeInDown.springify()} style={{ marginTop: 8 }}>
                        <View style={styles.contributionInputContainer}>
                          <Text style={styles.contributionLabel}>
                            Current contribution (optional)
                          </Text>
                          <View style={styles.contributionInputWrapper}>
                            <Text style={styles.currencySymbol}>
                              {selectedCountry === 'UK' ? '£' : '$'}
                            </Text>
                            <TextInput
                              value={contributionAmounts[account.type] || ''}
                              onChangeText={(value) => handleContributionChange(account.type, value)}
                              placeholder="0"
                              placeholderTextColor="#6B7280"
                              keyboardType="decimal-pad"
                              style={styles.contributionInput}
                            />
                          </View>
                        </View>
                      </Animated.View>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.setupDarkFooter, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable onPress={handleContinue}>
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.setupButton}>
              <Text style={styles.setupButtonText}>
                {selectedRegisteredAccounts.length > 0 ? 'Continue' : 'Skip for Now'}
              </Text>
              <ArrowRight size={20} color="white" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Pay Frequency Step
function PayFrequencyStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const payFrequency = useOnboardingStore((s) => s.payFrequency);
  const setPayFrequency = useOnboardingStore((s) => s.setPayFrequency);
  const roomSetPayFrequency = useRoomStore((s) => s.setPayFrequency);

  const handleSelect = (freq: PayFrequency) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPayFrequency(freq);
    roomSetPayFrequency(freq);
  };

  return (
    <View style={styles.setupDarkStep}>
      <LinearGradient
        colors={['#1a1a2e', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onBack} style={styles.darkBackButton}>
          <ChevronLeft size={24} color="white" />
        </Pressable>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepIndicatorText}>Step 4 of 4</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.setupDarkContent}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <View style={styles.iconCircleSmall}>
            <Calendar size={32} color="#6366F1" />
          </View>

          <Text style={styles.setupDarkTitle}>How often do you get paid?</Text>
          <Text style={styles.setupDarkSubtitle}>
            We use this to calculate "save per paycheck" targets.
          </Text>
        </Animated.View>

        <View style={styles.frequencyList}>
          {PAY_FREQUENCIES.map((freq, index) => {
            const isSelected = payFrequency === freq.value;

            return (
              <Animated.View key={freq.value} entering={FadeInDown.delay(200 + index * 50)}>
                <Pressable
                  onPress={() => handleSelect(freq.value)}
                  style={[styles.frequencyCard, isSelected && styles.frequencyCardSelected]}
                >
                  <View style={styles.frequencyCardInfo}>
                    <Text style={[styles.frequencyCardLabel, isSelected && styles.frequencyCardLabelSelected]}>
                      {freq.label}
                    </Text>
                    <Text style={styles.frequencyCardDesc}>{freq.description}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.frequencyCheck}>
                      <Check size={16} color="white" />
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <View style={[styles.setupDarkFooter, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.setupButton}>
              <Text style={styles.setupButtonText}>Continue</Text>
              <ArrowRight size={20} color="white" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Notifications Consent Step
function NotificationsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const setNotificationsConsent = useOnboardingStore((s) => s.setNotificationsConsent);
  const enabledNotificationTypes = useOnboardingStore((s) => s.enabledNotificationTypes);
  const setEnabledNotificationTypes = useOnboardingStore((s) => s.setEnabledNotificationTypes);
  const storeSetPreferences = useNotificationsStore((s) => s.setPreferences);
  const registeredAccountsEnabled = useOnboardingStore((s) => s.registeredAccountsEnabled);

  const notificationTypes = [
    {
      id: 'contributionReminders' as const,
      label: 'Contribution Reminders',
      description: 'Remind you to contribute to registered accounts',
      icon: Shield,
      color: '#6366F1',
      showIf: registeredAccountsEnabled,
    },
    {
      id: 'maturityAlerts' as const,
      label: 'Maturity Alerts',
      description: 'When bonds or fixed income mature',
      icon: Calendar,
      color: '#F59E0B',
      showIf: true,
    },
    {
      id: 'investmentReminders' as const,
      label: 'Investment Reminders',
      description: 'Regular check-ins on your portfolio',
      icon: TrendingUp,
      color: '#10B981',
      showIf: true,
    },
  ];

  const visibleTypes = notificationTypes.filter((t) => t.showIf);

  const handleEnable = async () => {
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
        setNotificationsConsent(true);
        storeSetPreferences({
          enabled: true,
          contributionReminders: enabledNotificationTypes.contributionReminders,
          maturityAlerts: enabledNotificationTypes.maturityAlerts,
        });
        onNext();
      } else {
        // Permission denied - show alert
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alert('Push notifications permission denied. You can enable them in Settings later.');
        // Still mark as attempted but disabled
        setNotificationsConsent(false);
        storeSetPreferences({ enabled: false });
        onNext();
      }
    } catch (error) {
      console.log('Error requesting notification permissions:', error);
      // Fallback: proceed without notifications
      setNotificationsConsent(false);
      storeSetPreferences({ enabled: false });
      onNext();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationsConsent(false);
    storeSetPreferences({ enabled: false });
    onNext();
  };

  return (
    <View style={styles.setupDarkStep}>
      <LinearGradient
        colors={['#1a1a2e', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onBack} style={styles.darkBackButton}>
          <ChevronLeft size={24} color="white" />
        </Pressable>
        <View style={{ width: 36 }} />
        <Pressable onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.setupDarkContent}>
        <Animated.View entering={FadeInDown.delay(100)} style={{ alignItems: 'center' }}>
          <View style={[styles.iconCircleSmall, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Bell size={32} color="#EF4444" />
          </View>

          <Text style={[styles.setupDarkTitle, { textAlign: 'center' }]}>Stay on track</Text>
          <Text style={[styles.setupDarkSubtitle, { textAlign: 'center' }]}>
            Get helpful reminders to reach your goals faster.
          </Text>
        </Animated.View>

        <View style={styles.notificationTypesList}>
          {visibleTypes.map((type, index) => (
            <Animated.View key={type.id} entering={FadeInDown.delay(200 + index * 50)}>
              <View style={styles.notificationTypeCard}>
                <View style={styles.notificationTypeInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <type.icon size={16} color={type.color} style={{ marginRight: 8 }} />
                    <Text style={styles.notificationTypeLabel}>{type.label}</Text>
                  </View>
                  <Text style={styles.notificationTypeDesc}>{type.description}</Text>
                </View>
                <Switch
                  value={enabledNotificationTypes[type.id]}
                  onValueChange={(value) => setEnabledNotificationTypes({ [type.id]: value })}
                  trackColor={{ false: '#374151', true: type.color }}
                  thumbColor="white"
                />
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={[styles.setupDarkFooter, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable onPress={handleEnable}>
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.setupButton}>
              <Text style={styles.setupButtonText}>Enable Notifications</Text>
              <Bell size={20} color="white" />
            </LinearGradient>
          </Pressable>
          <Text style={styles.notificationDisclaimer}>
            You can change these in Settings anytime.
          </Text>
        </View>
      </View>
    </View>
  );
}

// Room Reveal Step (for registered accounts users)
function RoomRevealStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const selectedRegisteredAccounts = useOnboardingStore((s) => s.selectedRegisteredAccounts);
  const selectedCountry = useOnboardingStore((s) => s.selectedCountry);
  const payFrequency = useOnboardingStore((s) => s.payFrequency);

  // Get room store functions to calculate real data
  const getRemainingRoom = useRoomStore((s) => s.getRemainingRoom);
  const getSavingsTarget = useRoomStore((s) => s.getSavingsTarget);
  const getTotalContributed = useRoomStore((s) => s.getTotalContributed);
  const jurisdictionProfile = useRoomStore((s) => s.jurisdictionProfile);

  // Calculate savings targets using REAL room store data
  const accountsData = useMemo(() => {
    if (!selectedCountry || !jurisdictionProfile) return [];

    const taxYearId = getCurrentTaxYearId(selectedCountry as JurisdictionCode);

    return selectedRegisteredAccounts.map((accountType) => {
      const config = ACCOUNT_CONFIGS.find((c) => c.type === accountType);
      if (!config) return null;

      // Get the ACTUAL remaining room from room store (accounts for contributions)
      const remainingRoom = getRemainingRoom(accountType);

      // Get the ACTUAL savings target from room store
      const savingsTarget = getSavingsTarget(accountType);

      // Get total contributed and calculate progress
      const totalContributed = getTotalContributed(accountType, taxYearId);
      const annualLimit = getEffectiveAnnualLimit(accountType, jurisdictionProfile.birthDate);
      const progressPercent = annualLimit > 0 ? Math.min(100, (totalContributed / annualLimit) * 100) : 0;

      const perPeriodTarget = savingsTarget?.perPeriodTarget || 0;
      const periodsLeft = savingsTarget?.periodsLeft || 0;

      return {
        accountType,
        config,
        remainingRoom,
        perPeriodTarget,
        periodsLeft,
        progressPercent,
      };
    }).filter(Boolean);
  }, [selectedRegisteredAccounts, selectedCountry, jurisdictionProfile, getRemainingRoom, getSavingsTarget, getTotalContributed]);

  const frequencyLabel = payFrequency === 'weekly' ? 'week' : payFrequency === 'biweekly' ? '2 weeks' : 'month';

  // Get currency symbol for formatting
  const getCurrencySymbol = (jurisdiction: JurisdictionCode) => {
    return jurisdiction === 'UK' ? '£' : '$';
  };

  return (
    <View style={styles.setupDarkStep}>
      <LinearGradient
        colors={['#0a1a1a', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onBack} style={styles.darkBackButton}>
          <ChevronLeft size={24} color="white" />
        </Pressable>
        <View style={{ width: 36 }} />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.setupDarkContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)} style={{ alignItems: 'center' }}>
          <View style={[styles.iconCircleSmall, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Target size={32} color="#10B981" />
          </View>

          <Text style={[styles.setupDarkTitle, { textAlign: 'center' }]}>Your savings plan</Text>
          <Text style={[styles.setupDarkSubtitle, { textAlign: 'center' }]}>
            Here's how much to save each {frequencyLabel} to max out your accounts.
          </Text>
        </Animated.View>

        <View style={styles.roomRevealList}>
          {accountsData.map((data, index) => {
            if (!data) return null;
            const { config, remainingRoom, perPeriodTarget, periodsLeft, progressPercent } = data;

            return (
              <Animated.View key={config.type} entering={FadeInDown.delay(200 + index * 100)}>
                <View style={styles.roomRevealCard}>
                  <View style={styles.roomRevealHeader}>
                    <View style={[styles.roomRevealIcon, { backgroundColor: `${config.color}20` }]}>
                      <Shield size={20} color={config.color} />
                    </View>
                    <Text style={styles.roomRevealName}>{config.shortName}</Text>
                  </View>

                  <View style={styles.roomRevealStats}>
                    <View style={styles.roomRevealStat}>
                      <Text style={styles.roomRevealStatLabel}>Remaining Room</Text>
                      <Text style={styles.roomRevealStatValue}>
                        {selectedCountry ? getCurrencySymbol(selectedCountry as JurisdictionCode) : '$'}
                        {remainingRoom.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.roomRevealStatDivider} />
                    <View style={styles.roomRevealStat}>
                      <Text style={styles.roomRevealStatLabel}>Save per {frequencyLabel}</Text>
                      <Text style={[styles.roomRevealStatValue, { color: '#10B981' }]}>
                        {selectedCountry ? getCurrencySymbol(selectedCountry as JurisdictionCode) : '$'}
                        {Math.ceil(perPeriodTarget).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.roomRevealProgress}>
                    <View style={styles.roomRevealProgressTrack}>
                      <View
                        style={[
                          styles.roomRevealProgressFill,
                          { width: `${progressPercent}%`, backgroundColor: config.color },
                        ]}
                      />
                    </View>
                    <Text style={styles.roomRevealProgressText}>
                      {periodsLeft} {frequencyLabel}s left
                    </Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.setupDarkFooter, { paddingBottom: insets.bottom + 16, paddingHorizontal: 24 }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
        >
          <LinearGradient colors={['#10B981', '#059669']} style={styles.setupButton}>
            <Text style={styles.setupButtonText}>See My Dashboard</Text>
            <ArrowRight size={20} color="white" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// Dashboard Reveal / Congratulations Step
function DashboardRevealStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const assets = usePortfolioStore((s) => s.assets);
  const selectedCountry = useOnboardingStore((s) => s.selectedCountry);
  const getCountryFlag = useOnboardingStore((s) => s.getCountryFlag);
  const registeredAccountsEnabled = useOnboardingStore((s) => s.registeredAccountsEnabled);
  const selectedRegisteredAccounts = useOnboardingStore((s) => s.selectedRegisteredAccounts);

  const totalValue = assets.reduce((sum, asset) => sum + asset.currentPrice * asset.quantity, 0);

  return (
    <View style={styles.setupDarkStep}>
      <LinearGradient
        colors={['#0a0a2a', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top + 12 }]}>
        <View style={{ width: 36 }} />
        <View style={{ width: 36 }} />
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.setupDarkContent}>
        <Animated.View entering={FadeInDown.delay(100)} style={{ alignItems: 'center' }}>
          <Text style={styles.congratsEmoji}>🎉</Text>
          <Text style={[styles.setupDarkTitle, { textAlign: 'center', fontSize: 32 }]}>
            You're all set!
          </Text>
          <Text style={[styles.setupDarkSubtitle, { textAlign: 'center' }]}>
            Your portfolio is ready. Here's a preview.
          </Text>
        </Animated.View>

        {/* Mini Dashboard Preview */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.dashboardPreview}>
          <View style={styles.dashboardPreviewCard}>
            <Text style={styles.dashboardPreviewLabel}>Total Net Worth</Text>
            <Text style={styles.dashboardPreviewValue}>
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>

            <View style={styles.dashboardPreviewStats}>
              <View style={styles.dashboardPreviewStat}>
                <PieChart size={16} color="#6366F1" />
                <Text style={styles.dashboardPreviewStatText}>{assets.length} Asset{assets.length !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.dashboardPreviewStat}>
                <Globe size={16} color="#10B981" />
                <Text style={styles.dashboardPreviewStatText}>{getCountryFlag()} {selectedCountry}</Text>
              </View>
              {registeredAccountsEnabled && selectedRegisteredAccounts.length > 0 && (
                <View style={styles.dashboardPreviewStat}>
                  <Shield size={16} color="#F59E0B" />
                  <Text style={styles.dashboardPreviewStatText}>
                    {selectedRegisteredAccounts.length} Account{selectedRegisteredAccounts.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        <View style={{ flex: 1 }} />

        <View style={[styles.setupDarkFooter, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.setupButton}>
              <Text style={styles.setupButtonText}>Continue</Text>
              <ArrowRight size={20} color="white" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Premium Nudge Step - Navigate to real premium screen
function PremiumNudgeStep({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();

  // Navigate immediately to the real premium screen
  React.useEffect(() => {
    // Mark onboarding as complete first
    onComplete();
    // Then navigate to premium screen
    router.replace('/premium');
  }, []);

  // Show a loading state while navigating
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#F59E0B" />
    </View>
  );
}

// ==================== MAIN ONBOARDING ====================

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const currentStep = useOnboardingStore((s) => s.currentStep);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const registeredAccountsEnabled = useOnboardingStore((s) => s.registeredAccountsEnabled);
  const shouldShowRegisteredAccountsModule = useOnboardingStore((s) => s.shouldShowRegisteredAccountsModule);
  const selectedRegisteredAccounts = useOnboardingStore((s) => s.selectedRegisteredAccounts);

  // Cinematic state
  const [cinematicIndex, setCinematicIndex] = useState(0);
  const progress = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const currentSlide = CINEMATIC_SLIDES[cinematicIndex];
  const isLastCinematicSlide = cinematicIndex === CINEMATIC_SLIDES.length - 1;

  // Navigation handlers
  const handleCinematicNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isLastCinematicSlide) {
      setCurrentStep('country');
    } else {
      setCinematicIndex((prev) => prev + 1);
      progress.value = withTiming((cinematicIndex + 1) / (CINEMATIC_SLIDES.length - 1));
    }
  }, [cinematicIndex, isLastCinematicSlide]);

  const handleCinematicSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep('country');
  }, []);

  // Step navigation
  const goToStep = (step: OnboardingStep) => {
    setCurrentStep(step);
  };

  // Determine next step based on current step and user selections
  const getNextStep = (current: OnboardingStep): OnboardingStep => {
    switch (current) {
      case 'country':
        return 'tracking_intent';
      case 'tracking_intent':
        return 'first_asset';
      case 'first_asset':
        if (shouldShowRegisteredAccountsModule()) {
          return 'registered_accounts';
        }
        return 'notifications';
      case 'registered_accounts':
        return 'pay_frequency';
      case 'pay_frequency':
        return 'notifications';
      case 'notifications':
        if (shouldShowRegisteredAccountsModule() && selectedRegisteredAccounts.length > 0) {
          return 'room_reveal';
        }
        return 'dashboard_reveal';
      case 'room_reveal':
        return 'dashboard_reveal';
      case 'dashboard_reveal':
        return 'premium_nudge';
      default:
        return 'premium_nudge';
    }
  };

  const getPreviousStep = (current: OnboardingStep): OnboardingStep | 'cinematic' => {
    switch (current) {
      case 'country':
        return 'cinematic';
      case 'tracking_intent':
        return 'country';
      case 'first_asset':
        return 'tracking_intent';
      case 'registered_accounts':
        return 'first_asset';
      case 'pay_frequency':
        return 'registered_accounts';
      case 'notifications':
        if (shouldShowRegisteredAccountsModule()) {
          return 'pay_frequency';
        }
        return 'first_asset';
      case 'room_reveal':
        return 'notifications';
      case 'dashboard_reveal':
        if (shouldShowRegisteredAccountsModule() && selectedRegisteredAccounts.length > 0) {
          return 'room_reveal';
        }
        return 'notifications';
      default:
        return 'dashboard_reveal';
    }
  };

  const handleNext = () => {
    const nextStep = getNextStep(currentStep);
    goToStep(nextStep);
  };

  const handleBack = () => {
    const prevStep = getPreviousStep(currentStep);
    if (prevStep === 'cinematic') {
      // Go back to the last cinematic slide instead of trying to navigate back in router
      setCurrentStep('cinematic');
      setCinematicIndex(CINEMATIC_SLIDES.length - 1);
    } else {
      goToStep(prevStep);
    }
  };

  const handleComplete = () => {
    completeOnboarding();
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  // RENDER CINEMATIC PHASE
  if (currentStep === 'cinematic') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[...currentSlide.gradient]} style={StyleSheet.absoluteFill} />

        {/* Back button - only show if not on first slide */}
        {cinematicIndex > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCinematicIndex((prev) => Math.max(0, prev - 1));
            }}
            style={[styles.skipButton, { top: insets.top + 12, left: 20, right: 'auto' }]}
          >
            <ChevronLeft size={24} color="white" />
          </Pressable>
        )}

        {/* Skip button */}
        {!isLastCinematicSlide && (
          <Pressable onPress={handleCinematicSkip} style={[styles.skipButton, { top: insets.top + 12 }]}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}

        {/* Progress bar */}
        <View style={[styles.progressContainer, { top: insets.top + 12 }]}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { backgroundColor: currentSlide.accentColor, width: `${((cinematicIndex + 1) / CINEMATIC_SLIDES.length) * 100}%` }]}
            />
          </View>
        </View>

        {/* Content */}
        <View key={currentSlide.id} style={styles.content}>
          <View style={styles.visualContainer}>
            <SlideVisual visualType={currentSlide.visualType} accentColor={currentSlide.accentColor} />
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.headline, { color: 'white' }]}>
              {currentSlide.headline}
            </Text>

            <Text style={styles.subheadline}>
              {currentSlide.subheadline}
            </Text>

            <Text style={styles.description}>
              {currentSlide.description}
            </Text>
          </View>
        </View>

        {/* Bottom actions */}
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.dotsContainer}>
            {CINEMATIC_SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === cinematicIndex ? currentSlide.accentColor : 'rgba(255,255,255,0.2)',
                    width: index === cinematicIndex ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              onPress={handleCinematicNext}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
            >
              <LinearGradient
                colors={[currentSlide.accentColor, `${currentSlide.accentColor}CC`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaText}>{isLastCinematicSlide ? 'Get Started' : 'Continue'}</Text>
                <ArrowRight size={20} color="white" />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  // RENDER SETUP STEPS
  return (
    <>
      {currentStep === 'country' && (
        <CountrySelectionStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 'tracking_intent' && (
        <TrackingIntentStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 'first_asset' && (
        <FirstAssetStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 'registered_accounts' && (
        <RegisteredAccountsStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 'pay_frequency' && (
        <PayFrequencyStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 'notifications' && (
        <NotificationsStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 'room_reveal' && (
        <RoomRevealStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 'dashboard_reveal' && (
        <DashboardRevealStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 'premium_nudge' && (
        <PremiumNudgeStep onComplete={handleComplete} />
      )}
    </>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    position: 'absolute',
    left: 20,
    right: 80,
    zIndex: 10,
    paddingVertical: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingTop: 80,
  },
  visualContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  textContainer: {
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  headline: {
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 48,
    letterSpacing: -1,
    marginBottom: 16,
  },
  subheadline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 26,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  ctaText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },

  // Setup Step Styles
  setupStep: {
    flex: 1,
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  countryList: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  countrySection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 24,
    marginBottom: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
  },
  countryFlag: {
    fontSize: 28,
  },
  countryLabel: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  radioUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
  },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  setupFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  currencyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  currencyNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#6366F1',
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },

  // Dark Setup Step Styles
  setupDarkStep: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  darkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  darkBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stepIndicatorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  setupDarkContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  setupDarkTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  setupDarkSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
    lineHeight: 22,
  },
  setupDarkFooter: {
    paddingTop: 16,
  },
  iconCircleSmall: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    alignSelf: 'center',
  },
  iconCircleLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tracking Intent
  intentGrid: {
    gap: 12,
    paddingBottom: 24,
  },
  intentGridInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: 'flex-start',
  },
  intentListContainer: {
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  intentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  intentListCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentListCheck: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentListLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  intentListLabelSelected: {
    color: 'white',
  },
  intentInlineWrapper: {
    alignItems: 'center',
    width: '33.333%',
  },
  intentInlineCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  intentInlineCheck: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentInlineLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  intentInlineLabelSelected: {
    color: 'white',
  },
  intentCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  intentCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  intentIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  intentIconBoxSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  intentLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  intentLabelSelected: {
    color: 'white',
  },
  intentDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  intentCheck: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // First Asset
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modeButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#6366F1',
  },
  quickPicksSection: {
    marginBottom: 24,
  },
  quickPicksTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickPicksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPickCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickPickSymbol: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  quickPickName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  assetSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  assetSearchInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
  },
  manualForm: {
    marginTop: 8,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryPills: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryPillSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
  },
  categoryPillText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryPillTextSelected: {
    color: '#6366F1',
  },

  // Registered Accounts
  accountsList: {
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accountIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  accountCardInfo: {
    flex: 1,
  },
  accountCardName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  accountCardDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  accountToggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  contributionInputContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
  },
  contributionLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  contributionInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currencySymbol: {
    color: '#9CA3AF',
    fontSize: 16,
    marginRight: 8,
  },
  contributionInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },

  // Pay Frequency
  frequencyList: {
    gap: 12,
    flex: 1,
  },
  frequencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  frequencyCardInfo: {
    flex: 1,
  },
  frequencyCardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  frequencyCardLabelSelected: {
    color: 'white',
  },
  frequencyCardDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  frequencyCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notifications
  notificationTypesList: {
    gap: 12,
    marginTop: 24,
  },
  notificationTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notificationTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  notificationTypeInfo: {
    flex: 1,
  },
  notificationTypeLabel: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  notificationTypeDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  notificationDisclaimer: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },

  // Room Reveal
  roomRevealList: {
    gap: 16,
    marginTop: 24,
  },
  roomRevealCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
  },
  roomRevealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  roomRevealIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roomRevealName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  roomRevealStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomRevealStat: {
    flex: 1,
  },
  roomRevealStatLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 4,
  },
  roomRevealStatValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  roomRevealStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  roomRevealProgress: {
    marginTop: 16,
  },
  roomRevealProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  roomRevealProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  roomRevealProgressText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },

  // Dashboard Reveal
  congratsEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  dashboardPreview: {
    marginTop: 32,
  },
  dashboardPreviewCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dashboardPreviewLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 4,
  },
  dashboardPreviewValue: {
    color: 'white',
    fontSize: 36,
    fontWeight: '700',
  },
  dashboardPreviewStats: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 16,
  },
  dashboardPreviewStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dashboardPreviewStatText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },

  // Premium Nudge
  premiumFeaturesList: {
    marginTop: 32,
    gap: 16,
  },
  premiumFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  premiumFeatureText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  skipButtonSecondary: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '500',
  },
});
