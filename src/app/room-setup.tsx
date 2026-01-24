import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ChevronLeft,
  Globe,
  Calendar,
  User,
  FileText,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import { useRoomStore } from '@/lib/room-store';
import {
  JurisdictionCode,
  JURISDICTION_INFO,
  ACCOUNT_CONFIGS,
  FilingStatus,
} from '@/lib/types';

const FILING_STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'married_jointly', label: 'Married Filing Jointly' },
  { value: 'married_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
];

export default function RoomSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const jurisdictionProfile = useRoomStore((s) => s.jurisdictionProfile);
  const setJurisdictionProfile = useRoomStore((s) => s.setJurisdictionProfile);

  const [step, setStep] = useState<'country' | 'details'>(
    jurisdictionProfile ? 'details' : 'country'
  );
  const [selectedCountry, setSelectedCountry] = useState<JurisdictionCode | null>(
    jurisdictionProfile?.countryCode ?? null
  );
  const [birthDate, setBirthDate] = useState<Date | null>(
    jurisdictionProfile?.birthDate ? new Date(jurisdictionProfile.birthDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filingStatus, setFilingStatus] = useState<FilingStatus | null>(
    jurisdictionProfile?.filingStatus ?? null
  );

  const handleCountrySelect = (country: JurisdictionCode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCountry(country);
    setStep('details');
  };

  const handleSave = () => {
    if (!selectedCountry) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setJurisdictionProfile({
      countryCode: selectedCountry,
      birthDate: birthDate?.toISOString(),
      filingStatus: selectedCountry === 'US' ? filingStatus ?? undefined : undefined,
    });

    router.back();
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('country');
    } else {
      router.back();
    }
  };

  const countryAccounts = selectedCountry
    ? ACCOUNT_CONFIGS.filter((c) => c.jurisdiction === selectedCountry)
    : [];

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      <LinearGradient
        colors={['#1a1a2e', '#0A0A0F']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 12 }} className="px-5">
          <View className="flex-row items-center">
            <Pressable
              onPress={handleBack}
              className="w-10 h-10 bg-white/10 rounded-full items-center justify-center mr-3"
            >
              <ChevronLeft size={24} color="white" />
            </Pressable>
            <View>
              <Text className="text-gray-400 text-sm">
                {step === 'country' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </Text>
              <Text className="text-white text-xl font-bold mt-0.5">
                {step === 'country' ? 'Select Country' : 'Your Details'}
              </Text>
            </View>
          </View>
        </View>

        {step === 'country' && (
          <Animated.View entering={FadeInDown.springify()} className="px-5 mt-8">
            <Text className="text-gray-400 text-sm mb-4">
              Choose your tax residency country to see relevant registered accounts.
            </Text>

            {(Object.keys(JURISDICTION_INFO) as JurisdictionCode[]).map((code, index) => {
              const info = JURISDICTION_INFO[code];
              const accounts = ACCOUNT_CONFIGS.filter((c) => c.jurisdiction === code);
              const isSelected = selectedCountry === code;

              return (
                <Animated.View
                  key={code}
                  entering={FadeInDown.delay(index * 80).springify()}
                >
                  <Pressable
                    onPress={() => handleCountrySelect(code)}
                    className="mb-4"
                  >
                    <LinearGradient
                      colors={
                        isSelected
                          ? ['rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 0.1)']
                          : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isSelected ? '#6366F1' : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <View className="p-5">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Text className="text-3xl mr-3">{info.flag}</Text>
                            <View>
                              <Text className="text-white font-bold text-lg">
                                {info.name}
                              </Text>
                              <Text className="text-gray-400 text-sm">
                                {info.taxYearLabel}
                              </Text>
                            </View>
                          </View>
                          <ChevronRight size={20} color={isSelected ? '#6366F1' : '#6B7280'} />
                        </View>

                        <View className="flex-row flex-wrap gap-2 mt-4">
                          {accounts.map((account) => (
                            <View
                              key={account.type}
                              className="px-3 py-1.5 rounded-full"
                              style={{ backgroundColor: `${account.color}20` }}
                            >
                              <Text style={{ color: account.color }} className="text-xs font-medium">
                                {account.shortName}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {step === 'details' && selectedCountry && (
          <Animated.View entering={FadeInDown.springify()} className="px-5 mt-8">
            {/* Country Summary */}
            <View className="bg-white/5 rounded-2xl p-4 flex-row items-center mb-6">
              <Text className="text-3xl mr-3">
                {JURISDICTION_INFO[selectedCountry].flag}
              </Text>
              <View className="flex-1">
                <Text className="text-white font-semibold">
                  {JURISDICTION_INFO[selectedCountry].name}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {countryAccounts.length} account types available
                </Text>
              </View>
              <Pressable
                onPress={() => setStep('country')}
                className="px-3 py-1.5 bg-white/10 rounded-full"
              >
                <Text className="text-gray-300 text-sm">Change</Text>
              </Pressable>
            </View>

            {/* Birth Date (for catch-up eligibility) */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <Calendar size={18} color="#6366F1" />
                <Text className="text-white font-semibold ml-2">Date of Birth</Text>
                <Text className="text-gray-500 text-xs ml-2">(optional)</Text>
              </View>
              <Text className="text-gray-400 text-sm mb-3">
                Used to calculate catch-up contribution eligibility for accounts like IRA and 401(k).
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="bg-white/10 rounded-xl px-4 py-4"
              >
                <Text className={birthDate ? 'text-white' : 'text-gray-500'}>
                  {birthDate
                    ? birthDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Tap to select date'}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={birthDate || new Date(1990, 0, 1)}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setBirthDate(date);
                  }}
                  maximumDate={new Date()}
                  minimumDate={new Date(1920, 0, 1)}
                />
              )}
            </View>

            {/* Filing Status (US only) */}
            {selectedCountry === 'US' && (
              <View className="mb-6">
                <View className="flex-row items-center mb-3">
                  <FileText size={18} color="#6366F1" />
                  <Text className="text-white font-semibold ml-2">Filing Status</Text>
                  <Text className="text-gray-500 text-xs ml-2">(optional)</Text>
                </View>
                <Text className="text-gray-400 text-sm mb-3">
                  Used to display Roth IRA income phase-out ranges.
                </Text>
                <View className="gap-2">
                  {FILING_STATUS_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setFilingStatus(option.value);
                      }}
                      className={`px-4 py-3 rounded-xl flex-row items-center justify-between ${
                        filingStatus === option.value ? 'bg-indigo-600' : 'bg-white/10'
                      }`}
                    >
                      <Text
                        className={
                          filingStatus === option.value ? 'text-white' : 'text-gray-300'
                        }
                      >
                        {option.label}
                      </Text>
                      {filingStatus === option.value && <Check size={18} color="white" />}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Available Accounts Preview */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <Globe size={18} color="#6366F1" />
                <Text className="text-white font-semibold ml-2">Available Accounts</Text>
              </View>
              <View className="bg-white/5 rounded-2xl overflow-hidden">
                {countryAccounts.map((account, index) => (
                  <View
                    key={account.type}
                    className={`p-4 flex-row items-center ${
                      index > 0 ? 'border-t border-white/10' : ''
                    }`}
                  >
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: `${account.color}20` }}
                    >
                      <Text style={{ color: account.color }} className="font-bold">
                        {account.shortName[0]}
                      </Text>
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-medium">{account.shortName}</Text>
                      <Text className="text-gray-400 text-xs" numberOfLines={1}>
                        {account.description}
                      </Text>
                    </View>
                    <Text className="text-gray-300 font-semibold">
                      {selectedCountry === 'UK' ? '£' : selectedCountry === 'CA' ? 'CAD ' : '$'}
                      {account.annualLimit2026.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              className="bg-indigo-600 py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-bold text-lg">Save & Continue</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
