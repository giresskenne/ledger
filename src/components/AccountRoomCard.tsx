/**
 * AccountRoomCard renders a compact registered-account card (collapsed summary + expandable details).
 * Used on the Rooms screen to keep everything visible without vertical scrolling.
 */
import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeOut,
  FadeOutUp,
  Layout,
  useSharedValue,
  useAnimatedStyle,
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
  ChevronDown,
  ChevronRight,
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
  onConfigureAutopilot?: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export function AccountRoomCard({
  config,
  index,
  onAddContribution,
  onSetOverride,
  onConfigureAutopilot,
  expanded,
  onToggleExpanded,
}: AccountRoomCardProps) {
  const jurisdictionProfile = useRoomStore((s) => s.jurisdictionProfile);
  const payFrequency = useRoomStore((s) => s.payFrequency);
  const getRemainingRoom = useRoomStore((s) => s.getRemainingRoom);
  const getSavingsTarget = useRoomStore((s) => s.getSavingsTarget);
  const getTotalContributed = useRoomStore((s) => s.getTotalContributed);
  const getLifetimeContributed = useRoomStore((s) => s.getLifetimeContributed);
  const roomOverrides = useRoomStore((s) => s.roomOverrides);
  const autopilotSchedules = useRoomStore((s) => s.autopilotSchedules);

  const expandedProgress = useSharedValue(0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(expandedProgress.value, [0, 1], [0, 180])}deg` }],
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
  const lifetimeContributed = config.lifetimeLimit ? getLifetimeContributed(config.type) : 0;
  const lifetimeRemaining = config.lifetimeLimit ? Math.max(0, config.lifetimeLimit - lifetimeContributed) : null;
  const autopilot = autopilotSchedules[config.type];

  const progressPercent = effectiveLimit > 0
    ? Math.min(100, (totalContributed / effectiveLimit) * 100)
    : 0;

  const Icon = ICON_MAP[config.icon] || Landmark;

  const handleSourcePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Linking.openURL(config.sourceUrl);
  };

  const handleAddContribution = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddContribution();
  };

  React.useEffect(() => {
    // Animate chevron rotation to match the card's expanded state.
    expandedProgress.value = withTiming(expanded ? 1 : 0, { duration: 180 });
  }, [expanded, expandedProgress]);

  const handleToggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleExpanded();
  };

  // Derive gradient colors from the account color
  const baseColor = config.color;
  const gradientStart = `${baseColor}15`;
  const gradientEnd = `${baseColor}08`;

  return (
    // Reanimated warning fix: don't mix layout animations with transform-based entering/exiting
    // on the same component. Use an outer layout wrapper and an inner "entering" wrapper.
    <Animated.View layout={Layout.springify().damping(18)}>
      <Animated.View entering={FadeInDown.delay(index * 80).springify().damping(18)}>
        <View className="mb-2">
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
          {/* Collapsed summary (compact) */}
          <View className="p-4">
            {/* Header */}
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-11 h-11 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: `${baseColor}25` }}
                >
                  <Icon size={22} color={baseColor} />
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-white font-bold text-base">
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

                  {/* Show the acronym definition only when collapsed to keep expanded view tighter. */}
                  {!expanded && (
                    <Animated.Text
                      entering={FadeInDown.duration(140)}
                      exiting={FadeOut.duration(120)}
                      className="text-gray-400 text-xs mt-1"
                      numberOfLines={1}
                    >
                      {config.type === 'RRSP' ? `${config.name} (REER)` : config.name}
                    </Animated.Text>
                  )}
                </View>
              </View>

              <Pressable
                onPress={handleToggleExpanded}
                hitSlop={12}
                className="w-10 h-10 rounded-full items-center justify-center bg-white/5"
              >
                <Animated.View style={chevronStyle}>
                  <ChevronDown size={18} color="#9CA3AF" />
                </Animated.View>
              </Pressable>
            </View>

            {/* Metrics row (always visible) */}
            <View className="mt-4 flex-row">
              <View className="flex-1">
                <Text className="text-gray-400 text-[11px] uppercase tracking-wider">
                  Remaining
                </Text>
                <Text className="text-white text-xl font-bold mt-1">
                  {formatRoomCurrency(remainingRoom, config.jurisdiction)}
                </Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-gray-400 text-[11px] uppercase tracking-wider">
                  Save / {FREQUENCY_LABELS[payFrequency]}
                </Text>
                <Text className="text-white text-xl font-bold mt-1">
                  {savingsTarget
                    ? formatRoomCurrency(Math.ceil(savingsTarget.perPeriodTarget), config.jurisdiction)
                    : '—'}
                </Text>
              </View>
            </View>

            {remainingRoom <= 0 && (
              <View className="mt-3 self-start px-3 py-1 rounded-full bg-emerald-500/15">
                <Text className="text-emerald-300 text-xs font-semibold">Maxed out</Text>
              </View>
            )}
          </View>

          {/* Expanded content (actions, targets, sources) */}
          {expanded && (
            <Animated.View
              entering={FadeInDown.duration(180)}
              // Collapse used to feel abrupt; combine a short slide+fade while the outer wrapper
              // handles the card's size change with a layout animation.
              exiting={FadeOutUp.duration(160)}
              className="px-5 pb-5"
            >
              {config.lifetimeLimit !== undefined && lifetimeRemaining !== null && (
                <View className="mt-1 mb-3 rounded-xl px-3 py-2 bg-white/5">
                  <Text className="text-gray-400 text-xs">
                    Lifetime cap: {formatRoomCurrency(config.lifetimeLimit, config.jurisdiction)} • Remaining: {formatRoomCurrency(lifetimeRemaining, config.jurisdiction)}
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between mb-2">
                <View>
                  <Text className="text-gray-400 text-xs uppercase tracking-wider">
                    {formatTaxYear(taxYearId)} Limit
                  </Text>
                  <Text className="text-gray-300 text-base font-semibold mt-1">
                    {formatRoomCurrency(effectiveLimit, config.jurisdiction)}
                    {hasOverride && (
                      <Text className="text-xs text-amber-400"> (set)</Text>
                    )}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-400 text-xs uppercase tracking-wider">
                    Contributed
                  </Text>
                  <Text className="text-gray-300 text-base font-semibold mt-1">
                    {formatRoomCurrency(totalContributed, config.jurisdiction)}
                  </Text>
                </View>
              </View>

              <View className="h-3 rounded-full bg-white/10 overflow-hidden mt-3">
                <Animated.View
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: baseColor,
                  }}
                />
              </View>

              <View className="flex-row justify-between mt-2">
                <Text className="text-gray-400 text-xs">
                  {progressPercent.toFixed(0)}% used
                </Text>
                {savingsTarget && savingsTarget.remainingRoom > 0 ? (
                  <Text className="text-gray-400 text-xs">
                    {savingsTarget.periodsLeft} {FREQUENCY_LABELS[payFrequency]}s left
                  </Text>
                ) : (
                  <Text className="text-gray-400 text-xs">—</Text>
                )}
              </View>

              {savingsTarget && savingsTarget.remainingRoom > 0 && (
                <View
                  className="mt-2 p-3 rounded-xl flex-row items-center"
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

              {onConfigureAutopilot && config.jurisdiction === 'CA' && (
                <Pressable
                  onPress={onConfigureAutopilot}
                  className="mt-3 p-3 rounded-xl bg-white/5 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${baseColor}30` }}
                    >
                      <PiggyBank size={16} color={baseColor} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-semibold">Autopilot</Text>
                      <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={2}>
                        {autopilot?.enabled
                          ? `On • ${formatRoomCurrency(Math.round(autopilot.amount), config.jurisdiction)} / ${
                              FREQUENCY_LABELS[autopilot.frequency]
                            }${autopilot.frequency === 'monthly' ? ` • Day ${autopilot.dayOfMonth ?? 1}` : ''}`
                          : 'Get a reminder before the debit, then confirm to log it.'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-indigo-300 text-sm font-semibold mr-1">
                      {autopilot?.enabled ? 'Edit' : 'Set up'}
                    </Text>
                    <ChevronRight size={16} color="#A5B4FC" />
                  </View>
                </Pressable>
              )}

              <Pressable
                onPress={handleSourcePress}
                className="flex-row items-center justify-center mt-4 py-2"
              >
                <ExternalLink size={12} color="#6B7280" />
                <Text className="text-gray-500 text-xs ml-1">
                  Official source
                </Text>
              </Pressable>
            </Animated.View>
          )}
          </LinearGradient>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
