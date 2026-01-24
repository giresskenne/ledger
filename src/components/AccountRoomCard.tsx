import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Leaf,
  Landmark,
  Home,
  Building,
  Sparkles,
  Briefcase,
  PiggyBank,
  Gift,
  Shield,
  ExternalLink,
  Target,
} from 'lucide-react-native';
import {
  AccountTypeConfig,
  PayFrequency,
  JURISDICTION_INFO,
} from '@/lib/types';
import {
  useRoomStore,
  getEffectiveAnnualLimit,
  formatRoomCurrency,
  getCurrentTaxYearId,
  formatTaxYear,
} from '@/lib/room-store';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Leaf,
  Landmark,
  Home,
  Building,
  Sparkles,
  Briefcase,
  PiggyBank,
  Gift,
  Shield,
};

const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: 'week',
  biweekly: '2 weeks',
  monthly: 'month',
};

interface AccountRoomCardProps {
  config: AccountTypeConfig;
  index: number;
  onAddContribution: () => void;
  onSetOverride: () => void;
}

export function AccountRoomCard({
  config,
  index,
  onAddContribution,
  onSetOverride,
}: AccountRoomCardProps) {
  const jurisdictionProfile = useRoomStore((s) => s.jurisdictionProfile);
  const payFrequency = useRoomStore((s) => s.payFrequency);
  const getRemainingRoom = useRoomStore((s) => s.getRemainingRoom);
  const getSavingsTarget = useRoomStore((s) => s.getSavingsTarget);
  const getTotalContributed = useRoomStore((s) => s.getTotalContributed);
  const roomOverrides = useRoomStore((s) => s.roomOverrides);

  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.95]),
  }));

  if (!jurisdictionProfile) return null;

  const taxYearId = getCurrentTaxYearId(jurisdictionProfile.countryCode);
  const overrideKey = `${config.type}_${taxYearId}`;
  const hasOverride = roomOverrides[overrideKey] !== undefined;

  const effectiveLimit = hasOverride
    ? roomOverrides[overrideKey]
    : getEffectiveAnnualLimit(config.type, jurisdictionProfile.birthDate);
  const totalContributed = getTotalContributed(config.type, taxYearId);
  const remainingRoom = getRemainingRoom(config.type);
  const savingsTarget = getSavingsTarget(config.type);

  const progressPercent = effectiveLimit > 0
    ? Math.min(100, (totalContributed / effectiveLimit) * 100)
    : 0;

  const Icon = ICON_MAP[config.icon] || Landmark;

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    pressed.value = withTiming(1, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    pressed.value = withTiming(0, { duration: 100 });
  };

  const handleSourcePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Linking.openURL(config.sourceUrl);
  };

  const handleAddContribution = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddContribution();
  };

  // Derive gradient colors from the account color
  const baseColor = config.color;
  const gradientStart = `${baseColor}15`;
  const gradientEnd = `${baseColor}08`;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify().damping(18)}
      style={animatedStyle}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="mb-4"
      >
        <LinearGradient
          colors={[gradientStart, gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: `${baseColor}30`,
          }}
        >
          <View className="p-5">
            {/* Header */}
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: `${baseColor}25` }}
                >
                  <Icon size={24} color={baseColor} />
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-white font-bold text-lg">
                      {config.shortName}
                    </Text>
                    <View
                      className="ml-2 px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${baseColor}25` }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: baseColor }}
                      >
                        {JURISDICTION_INFO[config.jurisdiction].flag}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-400 text-sm mt-0.5" numberOfLines={1}>
                    {config.name}
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress Section */}
            <View className="mt-5">
              {/* Labels */}
              <View className="flex-row justify-between mb-2">
                <View>
                  <Text className="text-gray-400 text-xs uppercase tracking-wider">
                    Remaining Room
                  </Text>
                  <Text className="text-white text-2xl font-bold mt-1">
                    {formatRoomCurrency(remainingRoom, config.jurisdiction)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-400 text-xs uppercase tracking-wider">
                    {formatTaxYear(taxYearId)} Limit
                  </Text>
                  <Text className="text-gray-300 text-lg font-semibold mt-1">
                    {formatRoomCurrency(effectiveLimit, config.jurisdiction)}
                    {hasOverride && (
                      <Text className="text-xs text-amber-400"> (set)</Text>
                    )}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View className="h-3 rounded-full bg-white/10 overflow-hidden mt-2">
                <Animated.View
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: baseColor,
                  }}
                />
              </View>

              {/* Progress Stats */}
              <View className="flex-row justify-between mt-2">
                <Text className="text-gray-400 text-xs">
                  {formatRoomCurrency(totalContributed, config.jurisdiction)} contributed
                </Text>
                <Text className="text-gray-400 text-xs">
                  {progressPercent.toFixed(0)}% used
                </Text>
              </View>
            </View>

            {/* Save to Max Target */}
            {savingsTarget && savingsTarget.remainingRoom > 0 && (
              <View
                className="mt-4 p-3 rounded-xl flex-row items-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${baseColor}30` }}
                >
                  <Target size={16} color={baseColor} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white font-semibold">
                    {formatRoomCurrency(
                      Math.ceil(savingsTarget.perPeriodTarget),
                      config.jurisdiction
                    )}
                    <Text className="text-gray-400 font-normal">
                      {' '}/ {FREQUENCY_LABELS[payFrequency]}
                    </Text>
                  </Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    to max out by{' '}
                    {new Date(savingsTarget.taxYearEndDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' '}({savingsTarget.periodsLeft} {FREQUENCY_LABELS[payFrequency]}s left)
                  </Text>
                </View>
              </View>
            )}

            {/* Actions Row */}
            <View className="flex-row mt-4 gap-3">
              <Pressable
                onPress={handleAddContribution}
                className="flex-1 py-3 rounded-xl items-center justify-center flex-row"
                style={{ backgroundColor: baseColor }}
              >
                <Text className="text-white font-semibold">Add Contribution</Text>
              </Pressable>
              <Pressable
                onPress={onSetOverride}
                className="px-4 py-3 rounded-xl items-center justify-center bg-white/10"
              >
                <Text className="text-white font-medium text-sm">
                  {hasOverride ? 'Edit' : 'Set'} Room
                </Text>
              </Pressable>
            </View>

            {/* Source Link */}
            <Pressable
              onPress={handleSourcePress}
              className="flex-row items-center justify-center mt-4 py-2"
            >
              <ExternalLink size={12} color="#6B7280" />
              <Text className="text-gray-500 text-xs ml-1">
                Official source
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
