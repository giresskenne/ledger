/**
 * Rooms tab screen for registered accounts (TFSA/RRSP/FHSA/etc.).
 * Keeps the main view non-scrollable by using compact cards that expand on demand.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  Shield,
  Sparkles,
  Calendar,
  Clock,
  Info,
  X,
  Check,
  ArrowLeft,
  Minus,
  Plus,
} from 'lucide-react-native';
import { usePortfolioStore } from '@/lib/store';
import { useEntitlementStatus } from '@/lib/premium-store';
import {
  useRoomStore,
  getCurrentTaxYearId,
  formatTaxYear,
  formatRoomCurrency,
  getTaxYearEndDate,
} from '@/lib/room-store';
import {
  ACCOUNT_CONFIGS,
  JURISDICTION_INFO,
  PayFrequency,
  RegisteredAccountType,
} from '@/lib/types';
import { AccountRoomCard } from '@/components/AccountRoomCard';

const FREQUENCY_OPTIONS: { value: PayFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function RoomTrackerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const tabBarHeight = useBottomTabBarHeight();

  const { isPremium } = useEntitlementStatus();

  const jurisdictionProfile = useRoomStore((s) => s.jurisdictionProfile);
  const payFrequency = useRoomStore((s) => s.payFrequency);
  const setPayFrequency = useRoomStore((s) => s.setPayFrequency);
  const getAccountsForJurisdiction = useRoomStore((s) => s.getAccountsForJurisdiction);
  const addContribution = useRoomStore((s) => s.addContribution);
  const getRemainingRoomForTaxYear = useRoomStore((s) => s.getRemainingRoomForTaxYear);
  const getTotalContributed = useRoomStore((s) => s.getTotalContributed);
  const getSavingsTarget = useRoomStore((s) => s.getSavingsTarget);
  const setRoomOverride = useRoomStore((s) => s.setRoomOverride);
  const roomOverrides = useRoomStore((s) => s.roomOverrides);
  const autopilotSchedules = useRoomStore((s) => s.autopilotSchedules);
  const setAutopilotSchedule = useRoomStore((s) => s.setAutopilotSchedule);

  // Modal state
  const [contributionModalVisible, setContributionModalVisible] = useState(false);
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [expandedAccount, setExpandedAccount] = useState<RegisteredAccountType | null>(null);
  const [isScrollUnlocked, setIsScrollUnlocked] = useState(false);
  const [autopilotModalVisible, setAutopilotModalVisible] = useState(false);
  const [autopilotAccount, setAutopilotAccount] = useState<RegisteredAccountType | null>(null);
  const [autopilotEnabled, setAutopilotEnabled] = useState(true);
  const [autopilotAmount, setAutopilotAmount] = useState('');
  const [autopilotFrequency, setAutopilotFrequency] = useState<PayFrequency>('monthly');
  const [autopilotDayOfMonth, setAutopilotDayOfMonth] = useState(1);
  const [autopilotError, setAutopilotError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<RegisteredAccountType | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');
  const [contributionError, setContributionError] = useState<string | null>(null);

  const accounts = useMemo(() => getAccountsForJurisdiction(), [jurisdictionProfile]);

  // These hooks must be before any conditional returns
  const taxYearId = jurisdictionProfile ? getCurrentTaxYearId(jurisdictionProfile.countryCode) : '';
  const taxYearEnd = jurisdictionProfile ? getTaxYearEndDate(jurisdictionProfile.countryCode) : new Date();
  const daysUntilEnd = Math.ceil((taxYearEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const selectedAccountConfig = selectedAccount
    ? ACCOUNT_CONFIGS.find((c) => c.type === selectedAccount)
    : null;

  const totalContributedThisYear = useMemo(() => {
    if (!jurisdictionProfile) return 0;
    return accounts.reduce((sum, cfg) => sum + getTotalContributed(cfg.type, taxYearId), 0);
  }, [accounts, getTotalContributed, taxYearId, jurisdictionProfile]);

  const remainingForSelected = useMemo(() => {
    if (!selectedAccount || !jurisdictionProfile) return null;
    return getRemainingRoomForTaxYear(selectedAccount, taxYearId);
  }, [getRemainingRoomForTaxYear, selectedAccount, taxYearId, jurisdictionProfile]);

  const handleFrequencyChange = (frequency: PayFrequency) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPayFrequency(frequency);
  };

  const handleAddContribution = (accountType: RegisteredAccountType) => {
    setSelectedAccount(accountType);
    setContributionAmount('');
    setContributionError(null);
    setContributionModalVisible(true);
  };

  const handleSetOverride = (accountType: RegisteredAccountType) => {
    if (!jurisdictionProfile) return;
    setSelectedAccount(accountType);
    const taxYearId = getCurrentTaxYearId(jurisdictionProfile.countryCode);
    const overrideKey = `${accountType}_${taxYearId}`;
    const existingOverride = roomOverrides[overrideKey];
    setOverrideAmount(existingOverride ? existingOverride.toString() : '');
    setOverrideModalVisible(true);
  };

  const handleToggleAccountExpanded = (accountType: RegisteredAccountType) => {
    // Keep the initial view "no-scroll" for a clean, dashboard-like feel,
    // then unlock scrolling after the user interacts with expand/collapse.
    setIsScrollUnlocked(true);
    setExpandedAccount((prev) => (prev === accountType ? null : accountType));
  };

  const handleConfigureAutopilot = (accountType: RegisteredAccountType) => {
    // Autopilot is a Canada-first feature for now (pre-authorized style contributions).
    if (!jurisdictionProfile || jurisdictionProfile.countryCode !== 'CA') return;

    setIsScrollUnlocked(true);
    setAutopilotAccount(accountType);
    setAutopilotError(null);

    const existing = autopilotSchedules[accountType];
    const suggested = getSavingsTarget(accountType);

    setAutopilotEnabled(existing?.enabled ?? true);
    setAutopilotFrequency(existing?.frequency ?? payFrequency);
    setAutopilotDayOfMonth(existing?.dayOfMonth ?? 1);

    const defaultAmount =
      typeof existing?.amount === 'number' && existing.amount > 0
        ? existing.amount
        : suggested
          ? Math.ceil(suggested.perPeriodTarget)
          : 0;

    setAutopilotAmount(defaultAmount > 0 ? String(defaultAmount) : '');
    setAutopilotModalVisible(true);
  };

  const handleSaveAutopilot = () => {
    if (!jurisdictionProfile || jurisdictionProfile.countryCode !== 'CA') return;
    if (!autopilotAccount) return;

    if (!autopilotEnabled) {
      // Keep the schedule around (so the user can re-enable quickly) but disable it.
      setAutopilotSchedule(autopilotAccount, { enabled: false });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAutopilotModalVisible(false);
      setAutopilotAccount(null);
      return;
    }

    const amount = Number(autopilotAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setAutopilotError('Enter a valid amount.');
      return;
    }

    setAutopilotSchedule(autopilotAccount, {
      enabled: true,
      amount,
      frequency: autopilotFrequency,
      dayOfMonth: autopilotFrequency === 'monthly' ? autopilotDayOfMonth : undefined,
      // Keep weekly/biweekly on Friday for now (simple baseline).
      weekday: autopilotFrequency === 'monthly' ? undefined : 5,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAutopilotModalVisible(false);
    setAutopilotAccount(null);
  };

  const handleSaveContribution = () => {
    if (!selectedAccount || !jurisdictionProfile || !contributionAmount) return;

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) return;

    const taxYearId = getCurrentTaxYearId(jurisdictionProfile.countryCode);

    const result = addContribution({
      accountType: selectedAccount,
      taxYearId,
      amount,
      currency: JURISDICTION_INFO[jurisdictionProfile.countryCode].currency,
      date: new Date().toISOString(),
      source: 'manual',
    });

    if (!result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setContributionError(result.reason || 'Could not add contribution');
      return;
    }

    Haptics.notificationAsync(
      result.wasCapped ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
    );
    setContributionModalVisible(false);
    setSelectedAccount(null);
    setContributionAmount('');
    setContributionError(null);
  };

  const handleSaveOverride = () => {
    if (!selectedAccount || !jurisdictionProfile) return;

    const taxYearId = getCurrentTaxYearId(jurisdictionProfile.countryCode);

    if (overrideAmount === '') {
      setRoomOverride(selectedAccount, taxYearId, undefined);
    } else {
      const amount = parseFloat(overrideAmount);
      if (isNaN(amount) || amount < 0) return;
      setRoomOverride(selectedAccount, taxYearId, amount);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOverrideModalVisible(false);
    setSelectedAccount(null);
    setOverrideAmount('');
  };

  // If not premium, show upgrade prompt
  if (!isPremium) {
    return (
      <View className="flex-1 bg-[#0A0A0F]">
        <LinearGradient
          colors={['#1a1a2e', '#0A0A0F']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
        />

        <View style={{ paddingTop: insets.top + 12 }} className="flex-1 px-5">
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-gray-400 text-sm">Premium Feature</Text>
              <Text className="text-white text-2xl font-bold mt-1">Account Rooms</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.springify()} className="flex-1 items-center justify-center">
            <View className="w-20 h-20 rounded-full bg-amber-500/20 items-center justify-center mb-6">
              <Shield size={40} color="#F59E0B" />
            </View>

            <Text className="text-white text-2xl font-bold text-center mb-3">
              Track Your Tax-Advantaged Room
            </Text>
            <Text className="text-gray-400 text-center px-8 mb-8">
              Monitor TFSA, RRSP, FHSA, RESP, 529, Junior ISA, IRA, 401(k), ISA and more. See remaining contribution room and savings targets.
            </Text>

            <View className="w-full bg-white/5 rounded-2xl p-5 mb-6">
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center">
                  <Check size={16} color="#10B981" />
                </View>
                <Text className="text-white ml-3">CA, US, UK account support</Text>
              </View>
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center">
                  <Check size={16} color="#10B981" />
                </View>
                <Text className="text-white ml-3">Remaining room tracking</Text>
              </View>
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center">
                  <Check size={16} color="#10B981" />
                </View>
                <Text className="text-white ml-3">Save-to-max calculator</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center">
                  <Check size={16} color="#10B981" />
                </View>
                <Text className="text-white ml-3">Official 2026 limits</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                console.log('[Premium Debug] Upgrade button clicked:', {
                  location: 'rooms-tab-locked',
                  isPremium: false,
                  timestamp: new Date().toISOString(),
                });
                router.push('/premium');
              }}
              className="w-full"
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              >
                <Sparkles size={20} color="white" />
                <Text className="text-white font-bold ml-2">Stay On Track With Premium</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  // If no jurisdiction selected, redirect to setup
  if (!jurisdictionProfile) {
    return (
      <View className="flex-1 bg-[#0A0A0F]">
        <LinearGradient
          colors={['#1a1a2e', '#0A0A0F']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
        />

        <View style={{ paddingTop: insets.top + 12 }} className="flex-1 px-5">
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-gray-400 text-sm">Get Started</Text>
              <Text className="text-white text-2xl font-bold mt-1">Account Rooms</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.springify()} className="flex-1 items-center justify-center">
            <View className="w-20 h-20 rounded-full bg-indigo-500/20 items-center justify-center mb-6">
              <Shield size={40} color="#6366F1" />
            </View>

            <Text className="text-white text-2xl font-bold text-center mb-3">
              Set Up Your Country
            </Text>
            <Text className="text-gray-400 text-center px-8 mb-8">
              Select your tax residency to see relevant registered accounts and contribution limits.
            </Text>

            <Pressable
              onPress={() => router.push('/room-setup')}
              className="w-full bg-indigo-600 py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-bold">Select Country</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      <LinearGradient
        colors={['#1a1a2e', '#0A0A0F']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
      />

      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="px-5 py-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (typeof returnTo === 'string' && returnTo.length > 0) {
              router.replace(returnTo as any);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          className="w-10 h-10 rounded-full items-center justify-center bg-white/5"
        >
          <ArrowLeft size={20} color="#9CA3AF" />
        </Pressable>

        <Pressable
          onPress={() => router.push('/room-setup')}
          className="px-4 py-2 bg-white/10 rounded-full"
        >
          <Text className="text-gray-300 text-sm">Change</Text>
        </Pressable>
      </View>

      <Animated.ScrollView
        scrollEnabled={isScrollUnlocked}
        showsVerticalScrollIndicator={false}
        bounces={isScrollUnlocked}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + insets.bottom + 10,
        }}
      >
        {/* Title */}
        <View className="px-5">
          <Animated.View entering={FadeInDown.delay(20)}>
            <Text className="text-gray-400 text-sm">
              {JURISDICTION_INFO[jurisdictionProfile.countryCode].flag}{' '}
              {JURISDICTION_INFO[jurisdictionProfile.countryCode].name}
            </Text>
            <Text className="text-white text-3xl font-bold mt-1">Account Rooms</Text>
          </Animated.View>
        </View>

        {/* Tax Year Info */}
        <View className="px-5 mt-4">
          <Animated.View entering={FadeInDown.delay(60).springify().damping(18)}>
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, padding: 16 }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Calendar size={20} color="#6366F1" />
                  <Text className="text-white font-semibold ml-2">
                    Tax Year {formatTaxYear(taxYearId)}
                  </Text>
                </View>
                <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-full">
                  <Clock size={14} color="#9CA3AF" />
                  <Text className="text-gray-300 text-sm ml-1.5">
                    {daysUntilEnd} days left
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between mt-3">
                <Text className="text-gray-400 text-xs">
                  {JURISDICTION_INFO[jurisdictionProfile.countryCode].taxYearLabel}
                </Text>
                <Text className="text-gray-300 text-xs font-semibold">
                  Contributed: {formatRoomCurrency(totalContributedThisYear, jurisdictionProfile.countryCode)}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Pay Frequency Selector */}
        <View className="px-5 mt-4">
          <Text className="text-gray-400 text-sm mb-2">Savings Frequency</Text>
          <Animated.View entering={FadeInDown.delay(90)}>
            <View className="flex-row gap-2">
              {FREQUENCY_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleFrequencyChange(option.value)}
                  className={`flex-1 py-3 rounded-xl items-center ${
                    payFrequency === option.value ? 'bg-indigo-600' : 'bg-white/10'
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      payFrequency === option.value ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Account Cards (collapsible; designed to fit without scrolling) */}
        <View className="px-5 mt-4">
          <Text className="text-white text-lg font-semibold mb-1">Your Accounts</Text>

          {accounts.map((config, index) => {
            const isExpanded = expandedAccount === config.type;
            return (
              <AccountRoomCard
                key={config.type}
                config={config}
                index={index}
                expanded={isExpanded}
                onToggleExpanded={() => handleToggleAccountExpanded(config.type)}
                onAddContribution={() => handleAddContribution(config.type)}
                onSetOverride={() => handleSetOverride(config.type)}
                onConfigureAutopilot={
                  jurisdictionProfile.countryCode === 'CA'
                    ? () => handleConfigureAutopilot(config.type)
                    : undefined
                }
              />
            );
          })}
        </View>

        {/* Footer Info */}
        <View className="px-5 mt-2">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setInfoModalVisible(true);
            }}
            className="flex-row items-center justify-center py-2"
          >
            <Info size={14} color="#6B7280" />
            <Text className="text-gray-500 text-xs ml-2">
              Informational only • Tap for details
            </Text>
          </Pressable>
        </View>
      </Animated.ScrollView>

      {/* Info Modal */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/70 items-center justify-center px-6"
          onPress={() => setInfoModalVisible(false)}
        >
          <Pressable onPress={() => {}} className="w-full max-w-md">
            <Animated.View entering={FadeIn}>
              <View className="bg-[#1a1a2e] rounded-3xl overflow-hidden">
                <View className="p-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-white text-xl font-bold">About account rooms</Text>
                    <Pressable onPress={() => setInfoModalVisible(false)}>
                      <X size={22} color="#6B7280" />
                    </Pressable>
                  </View>

                  <View className="bg-white/5 rounded-2xl p-4">
                    <Text className="text-gray-300 leading-6">
                      Informational only. Contribution limits and eligibility can vary by individual situation.
                      Verify with official tax authorities or a qualified professional.
                    </Text>
                    <Text className="text-gray-500 text-xs mt-3">
                      Tip: If your official room differs, use “Set Room” on the account card.
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Contribution Modal */}
      <Modal
        visible={contributionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContributionModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/70 items-center justify-center"
          onPress={() => setContributionModalVisible(false)}
        >
          <Pressable onPress={() => {}} className="w-[90%] max-w-md">
            <Animated.View entering={FadeIn}>
              <View className="bg-[#1a1a2e] rounded-3xl overflow-hidden">
                <View className="p-6">
                  <View className="flex-row items-center justify-between mb-6">
                    <Text className="text-white text-xl font-bold">Add Contribution</Text>
                    <Pressable onPress={() => setContributionModalVisible(false)}>
                      <X size={24} color="#6B7280" />
                    </Pressable>
                  </View>

                  {selectedAccountConfig && (
                    <View className="mb-4">
                      <Text className="text-gray-400 text-sm mb-1">Account</Text>
                      <Text className="text-white font-semibold">
                        {selectedAccountConfig.shortName} ({selectedAccountConfig.name})
                      </Text>
                    </View>
                  )}

                  {remainingForSelected !== null && selectedAccountConfig && (
                    <View className="bg-white/5 rounded-xl p-3 mb-4">
                      <Text className="text-gray-400 text-xs">
                        Remaining room
                      </Text>
                      <Text className="text-white font-semibold mt-1">
                        {formatRoomCurrency(remainingForSelected, selectedAccountConfig.jurisdiction)}
                      </Text>
                      {(() => {
                        const next = parseFloat(contributionAmount || '0');
                        if (!Number.isFinite(next) || next <= 0) return null;
                        if (next <= remainingForSelected) return null;
                        return (
                          <Text className="text-amber-300 text-xs mt-2">
                            This contribution will be capped to your remaining room.
                          </Text>
                        );
                      })()}
                    </View>
                  )}

                  <View className="mb-6">
                    <Text className="text-gray-400 text-sm mb-2">Amount</Text>
                    <View className="bg-white/10 rounded-xl px-4 py-3 flex-row items-center">
                      <Text className="text-gray-400 mr-2">
                        {jurisdictionProfile
                          ? JURISDICTION_INFO[jurisdictionProfile.countryCode].currency === 'GBP'
                            ? '£'
                            : '$'
                          : '$'}
                      </Text>
                      <TextInput
                        value={contributionAmount}
                        onChangeText={setContributionAmount}
                        placeholder="0.00"
                        placeholderTextColor="#6B7280"
                        keyboardType="decimal-pad"
                        className="flex-1 text-white text-lg"
                      />
                    </View>
                    {contributionError && (
                      <Text className="text-amber-300 text-xs mt-2">
                        {contributionError}
                      </Text>
                    )}
                  </View>

                  <Pressable
                    onPress={handleSaveContribution}
                    className="bg-indigo-600 py-4 rounded-xl items-center"
                  >
                    <Text className="text-white font-bold">Save Contribution</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Set Override Modal */}
      <Modal
        visible={overrideModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOverrideModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/70 items-center justify-center"
          onPress={() => setOverrideModalVisible(false)}
        >
          <Pressable onPress={() => {}} className="w-[90%] max-w-md">
            <Animated.View entering={FadeIn}>
              <View className="bg-[#1a1a2e] rounded-3xl overflow-hidden">
                <View className="p-6">
                  <View className="flex-row items-center justify-between mb-6">
                    <Text className="text-white text-xl font-bold">Set Official Room</Text>
                    <Pressable onPress={() => setOverrideModalVisible(false)}>
                      <X size={24} color="#6B7280" />
                    </Pressable>
                  </View>

                  {selectedAccountConfig && (
                    <View className="mb-4">
                      <Text className="text-gray-400 text-sm mb-1">Account</Text>
                      <Text className="text-white font-semibold">
                        {selectedAccountConfig.shortName}
                      </Text>
                    </View>
                  )}

                  <View className="bg-amber-500/10 rounded-xl p-3 mb-4 flex-row items-start">
                    <Info size={16} color="#F59E0B" />
                    <Text className="text-amber-200 text-xs ml-2 flex-1">
                      Use the official value from your tax notice or account statement. Leave empty
                      to use the standard limit.
                    </Text>
                  </View>

                  <View className="mb-6">
                    <Text className="text-gray-400 text-sm mb-2">Official Room Amount</Text>
                    <View className="bg-white/10 rounded-xl px-4 py-3 flex-row items-center">
                      <Text className="text-gray-400 mr-2">
                        {jurisdictionProfile
                          ? JURISDICTION_INFO[jurisdictionProfile.countryCode].currency === 'GBP'
                            ? '£'
                            : '$'
                          : '$'}
                      </Text>
                      <TextInput
                        value={overrideAmount}
                        onChangeText={setOverrideAmount}
                        placeholder="Leave empty for default"
                        placeholderTextColor="#6B7280"
                        keyboardType="decimal-pad"
                        className="flex-1 text-white text-lg"
                      />
                    </View>
                  </View>

                  <Pressable
                    onPress={handleSaveOverride}
                    className="bg-indigo-600 py-4 rounded-xl items-center"
                  >
                    <Text className="text-white font-bold">Save</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Autopilot Modal (Canada) */}
      <Modal
        visible={autopilotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAutopilotModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/70 items-center justify-center"
          onPress={() => setAutopilotModalVisible(false)}
        >
          <Pressable onPress={() => {}} className="w-[90%] max-w-md">
            <Animated.View entering={FadeIn}>
              <View className="bg-[#1a1a2e] rounded-3xl overflow-hidden">
                <View className="p-6">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-white text-xl font-bold">Contribution Autopilot</Text>
                    <Pressable onPress={() => setAutopilotModalVisible(false)}>
                      <X size={24} color="#6B7280" />
                    </Pressable>
                  </View>

                  <View className="bg-white/5 rounded-2xl p-4 mb-5">
                    <Text className="text-gray-300 leading-6">
                      We can’t connect to your bank yet. Ledger will remind you before the scheduled debit,
                      and only log the contribution when you confirm.
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-400 text-sm mb-2">Autopilot</Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setAutopilotEnabled(false);
                        }}
                        className={`flex-1 py-3 rounded-xl items-center ${
                          !autopilotEnabled ? 'bg-white/15' : 'bg-white/10'
                        }`}
                      >
                        <Text className={`${!autopilotEnabled ? 'text-white' : 'text-gray-400'} font-semibold`}>
                          Off
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setAutopilotEnabled(true);
                        }}
                        className={`flex-1 py-3 rounded-xl items-center ${
                          autopilotEnabled ? 'bg-indigo-600' : 'bg-white/10'
                        }`}
                      >
                        <Text className={`${autopilotEnabled ? 'text-white' : 'text-gray-400'} font-semibold`}>
                          On
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-400 text-sm mb-2">Cadence</Text>
                    <View className="flex-row gap-2">
                      {FREQUENCY_OPTIONS.map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setAutopilotFrequency(option.value);
                          }}
                          className={`flex-1 py-3 rounded-xl items-center ${
                            autopilotFrequency === option.value ? 'bg-white/15' : 'bg-white/10'
                          }`}
                        >
                          <Text
                            className={`font-medium ${
                              autopilotFrequency === option.value ? 'text-white' : 'text-gray-400'
                            }`}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {autopilotFrequency === 'monthly' && (
                    <View className="mb-4">
                      <Text className="text-gray-400 text-sm mb-2">Debit Day (Monthly)</Text>
                      <View className="flex-row items-center justify-between bg-white/10 rounded-xl px-3 py-3">
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setAutopilotDayOfMonth((d) => Math.max(1, d - 1));
                          }}
                          className="w-10 h-10 rounded-full items-center justify-center bg-white/10"
                        >
                          <Minus size={18} color="#9CA3AF" />
                        </Pressable>
                        <View className="items-center">
                          <Text className="text-white text-lg font-bold">
                            Day {autopilotDayOfMonth}
                          </Text>
                          <Text className="text-gray-500 text-xs">
                            (1–28 for reliability)
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setAutopilotDayOfMonth((d) => Math.min(28, d + 1));
                          }}
                          className="w-10 h-10 rounded-full items-center justify-center bg-white/10"
                        >
                          <Plus size={18} color="#9CA3AF" />
                        </Pressable>
                      </View>
                    </View>
                  )}

                  <View className="mb-6">
                    <Text className="text-gray-400 text-sm mb-2">Amount</Text>
                    <View className="bg-white/10 rounded-xl px-4 py-3 flex-row items-center">
                      <Text className="text-gray-400 mr-2">CAD</Text>
                      <TextInput
                        value={autopilotAmount}
                        onChangeText={(v) => {
                          setAutopilotError(null);
                          setAutopilotAmount(v);
                        }}
                        placeholder="0"
                        placeholderTextColor="#6B7280"
                        keyboardType="decimal-pad"
                        className="flex-1 text-white text-lg"
                      />
                    </View>
                    {autopilotError && (
                      <Text className="text-amber-300 text-xs mt-2">
                        {autopilotError}
                      </Text>
                    )}
                    <Text className="text-gray-500 text-xs mt-2">
                      You’ll get a reminder the day before, and a confirmation on the debit day.
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleSaveAutopilot}
                    className="bg-indigo-600 py-4 rounded-xl items-center"
                  >
                    <Text className="text-white font-bold">Save Autopilot</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
