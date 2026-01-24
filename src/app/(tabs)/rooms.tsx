import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Shield,
  ChevronRight,
  Sparkles,
  Calendar,
  Clock,
  Info,
  X,
  Check,
  ArrowLeft,
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

  const { isPremium } = useEntitlementStatus();

  const jurisdictionProfile = useRoomStore((s) => s.jurisdictionProfile);
  const payFrequency = useRoomStore((s) => s.payFrequency);
  const setPayFrequency = useRoomStore((s) => s.setPayFrequency);
  const getAccountsForJurisdiction = useRoomStore((s) => s.getAccountsForJurisdiction);
  const addContribution = useRoomStore((s) => s.addContribution);
  const setRoomOverride = useRoomStore((s) => s.setRoomOverride);
  const roomOverrides = useRoomStore((s) => s.roomOverrides);

  // Modal state
  const [contributionModalVisible, setContributionModalVisible] = useState(false);
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<RegisteredAccountType | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');

  const accounts = useMemo(() => getAccountsForJurisdiction(), [jurisdictionProfile]);

  const handleFrequencyChange = (frequency: PayFrequency) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPayFrequency(frequency);
  };

  const handleAddContribution = (accountType: RegisteredAccountType) => {
    setSelectedAccount(accountType);
    setContributionAmount('');
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

  const handleSaveContribution = () => {
    if (!selectedAccount || !jurisdictionProfile || !contributionAmount) return;

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) return;

    const taxYearId = getCurrentTaxYearId(jurisdictionProfile.countryCode);

    addContribution({
      accountType: selectedAccount,
      taxYearId,
      amount,
      currency: JURISDICTION_INFO[jurisdictionProfile.countryCode].currency,
      date: new Date().toISOString(),
      source: 'manual',
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setContributionModalVisible(false);
    setSelectedAccount(null);
    setContributionAmount('');
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
              Monitor TFSA, RRSP, IRA, 401(k), ISA and more. See remaining contribution room and savings targets.
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
                <Text className="text-white font-bold ml-2">Unlock Premium</Text>
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

  const taxYearId = getCurrentTaxYearId(jurisdictionProfile.countryCode);
  const taxYearEnd = getTaxYearEndDate(jurisdictionProfile.countryCode);
  const daysUntilEnd = Math.ceil((taxYearEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const selectedAccountConfig = selectedAccount
    ? ACCOUNT_CONFIGS.find((c) => c.type === selectedAccount)
    : null;

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      <LinearGradient
        colors={['#1a1a2e', '#0A0A0F']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
      />

      {/* Header with back button */}
      <View style={{ paddingTop: insets.top }} className="px-5 py-4 flex-row items-center">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="flex-row items-center gap-2"
        >
          <ArrowLeft size={24} color="#6B7280" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 12 }} className="px-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-gray-400 text-sm">
                {JURISDICTION_INFO[jurisdictionProfile.countryCode].flag}{' '}
                {JURISDICTION_INFO[jurisdictionProfile.countryCode].name}
              </Text>
              <Text className="text-white text-2xl font-bold mt-1">Account Rooms</Text>
            </View>
            <Pressable
              onPress={() => router.push('/room-setup')}
              className="px-3 py-2 bg-white/10 rounded-full"
            >
              <Text className="text-gray-300 text-sm">Change</Text>
            </Pressable>
          </View>
        </View>

        {/* Tax Year Info */}
        <View className="px-5 mt-6">
          <Animated.View entering={FadeInDown.delay(50).springify()}>
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

              <Text className="text-gray-400 text-xs mt-3">
                {JURISDICTION_INFO[jurisdictionProfile.countryCode].taxYearLabel}
              </Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Pay Frequency Selector */}
        <View className="px-5 mt-6">
          <Text className="text-gray-400 text-sm mb-3">Savings Frequency</Text>
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
        </View>

        {/* Account Cards */}
        <View className="px-5 mt-6">
          <Text className="text-white text-lg font-semibold mb-4">Your Accounts</Text>

          {accounts.map((config, index) => (
            <AccountRoomCard
              key={config.type}
              config={config}
              index={index}
              onAddContribution={() => handleAddContribution(config.type)}
              onSetOverride={() => handleSetOverride(config.type)}
            />
          ))}
        </View>

        {/* Disclaimer */}
        <View className="px-5 mt-4">
          <View className="flex-row items-start bg-white/5 rounded-xl p-4">
            <Info size={16} color="#6B7280" />
            <Text className="text-gray-500 text-xs ml-2 flex-1">
              Informational only. Contribution limits and eligibility can vary by individual
              situation. Verify with official tax authorities or a qualified professional.
            </Text>
          </View>
        </View>
      </ScrollView>

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
    </View>
  );
}
