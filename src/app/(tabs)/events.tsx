import React from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Bell,
  ChevronRight,
  Check,
  AlertCircle,
  Sparkles,
  PiggyBank,
  RefreshCw,
  X,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react-native';
import { usePortfolioStore } from '@/lib/store';
import { useEntitlementStatus } from '@/lib/premium-store';
import {
  useNotificationsStore,
  PortfolioEvent,
  EventType,
  EVENT_TYPE_INFO,
} from '@/lib/notifications-store';
import { cn } from '@/lib/cn';

// Generate events from assets with maturity dates
function generateMaturityEvents(assets: any[]): PortfolioEvent[] {
  const events: PortfolioEvent[] = [];
  const now = new Date();

  assets.forEach((asset) => {
    if (asset.maturityDate) {
      const maturityDate = new Date(asset.maturityDate);
      const daysUntil = Math.ceil(
        (maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil > -30 && daysUntil < 365) {
        events.push({
          id: `maturity_${asset.id}`,
          type: 'maturity',
          title: `${asset.name} Matures`,
          description:
            daysUntil <= 0
              ? 'Matured - action required'
              : daysUntil === 1
              ? 'Matures tomorrow'
              : daysUntil <= 7
              ? `Matures in ${daysUntil} days`
              : `Matures on ${maturityDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}`,
          date: asset.maturityDate,
          assetId: asset.id,
          assetName: asset.name,
          amount: asset.currentPrice * asset.quantity,
          currency: asset.currency,
          isRead: daysUntil > 30,
          createdAt: now.toISOString(),
        });
      }
    }
  });

  return events;
}

// Mock upcoming events for demo
const MOCK_EVENTS: PortfolioEvent[] = [
  {
    id: 'div_1',
    type: 'dividend',
    title: 'AAPL Dividend',
    description: 'Expected quarterly dividend payment',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    assetId: '1', // Links to Apple Inc. in mock data
    assetName: 'Apple Inc.',
    amount: 12.0,
    currency: 'USD',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'contrib_1',
    type: 'contribution_reminder',
    title: 'TFSA Contribution Due',
    description: 'Monthly contribution to maximize room',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 583.33,
    currency: 'USD',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rebal_1',
    type: 'rebalance',
    title: 'Portfolio Review',
    description: 'Tech sector above target allocation',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

const EventIcon = ({ type }: { type: EventType }) => {
  const info = EVENT_TYPE_INFO[type];
  const iconProps = { size: 18, color: info.color };

  switch (type) {
    case 'maturity':
      return <Calendar {...iconProps} />;
    case 'dividend':
      return <DollarSign {...iconProps} />;
    case 'price_alert':
      return <TrendingUp {...iconProps} />;
    case 'contribution_reminder':
      return <PiggyBank {...iconProps} />;
    case 'rebalance':
      return <RefreshCw {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
};

function EventCard({
  event,
  index,
  onPress,
}: {
  event: PortfolioEvent;
  index: number;
  onPress: () => void;
}) {
  const info = EVENT_TYPE_INFO[event.type];
  const eventDate = new Date(event.date);
  const now = new Date();
  const daysUntil = Math.ceil(
    (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isPast = daysUntil < 0;
  const isUrgent = daysUntil <= 3 && daysUntil >= 0;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={animatedStyle}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          className={cn(
            'mx-5 mb-3 rounded-2xl overflow-hidden',
            isPast ? 'opacity-60' : ''
          )}
        >
          {/* Glass background */}
          <View className="absolute inset-0 bg-white/[0.04]" />

          {/* Urgent indicator */}
          {isUrgent && (
            <LinearGradient
              colors={['#F59E0B20', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
              }}
            />
          )}

          <View className="p-4 flex-row items-center">
            {/* Icon */}
            <View
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: info.bgColor }}
            >
              <EventIcon type={event.type} />
            </View>

            {/* Content */}
            <View className="flex-1 ml-3">
              <View className="flex-row items-center">
                <Text
                  className={cn(
                    'font-semibold',
                    event.isRead ? 'text-gray-300' : 'text-white'
                  )}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
                {!event.isRead && (
                  <View className="w-2 h-2 rounded-full bg-indigo-500 ml-2" />
                )}
              </View>
              <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>
                {event.description}
              </Text>
            </View>

            {/* Right side */}
            <View className="items-end ml-3">
              {event.amount && (
                <Text className="text-white font-medium">
                  ${event.amount.toLocaleString()}
                </Text>
              )}
              <View className="flex-row items-center mt-1">
                <Clock size={12} color="#6B7280" />
                <Text
                  className={cn(
                    'text-xs ml-1',
                    isUrgent ? 'text-amber-500' : 'text-gray-500'
                  )}
                >
                  {isPast
                    ? 'Past due'
                    : daysUntil === 0
                    ? 'Today'
                    : daysUntil === 1
                    ? 'Tomorrow'
                    : `${daysUntil}d`}
                </Text>
              </View>
            </View>

            <ChevronRight size={18} color="#4B5563" className="ml-2" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="flex-row items-center justify-between px-5 mb-3">
      <View className="flex-row items-center">
        <Text className="text-gray-400 text-sm font-medium uppercase tracking-wide">
          {title}
        </Text>
        {count !== undefined && count > 0 && (
          <View className="bg-indigo-500/20 px-2 py-0.5 rounded-full ml-2">
            <Text className="text-indigo-400 text-xs font-medium">{count}</Text>
          </View>
        )}
      </View>
      {action && (
        <Pressable onPress={action.onPress}>
          <Text className="text-indigo-400 text-sm">{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

function EmptyState() {
  return (
    <Animated.View
      entering={FadeIn.delay(200)}
      className="items-center justify-center py-16 px-8"
    >
      <View className="w-20 h-20 rounded-full bg-white/5 items-center justify-center mb-4">
        <Calendar size={36} color="#6B7280" />
      </View>
      <Text className="text-white text-lg font-semibold text-center">
        No Upcoming Events
      </Text>
      <Text className="text-gray-500 text-center mt-2 leading-5">
        Events will appear here when you have assets with maturity dates,
        expected dividends, or set price alerts.
      </Text>
    </Animated.View>
  );
}

// Event Detail Modal
function EventDetailModal({
  event,
  visible,
  onClose,
  onViewAsset,
}: {
  event: PortfolioEvent | null;
  visible: boolean;
  onClose: () => void;
  onViewAsset?: () => void;
}) {
  if (!event) return null;

  const info = EVENT_TYPE_INFO[event.type];
  const eventDate = new Date(event.date);
  const now = new Date();
  const daysUntil = Math.ceil(
    (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isPast = daysUntil < 0;

  const getTimeLabel = () => {
    if (isPast) return 'Past due';
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) return `In ${daysUntil} days`;
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getActionText = () => {
    switch (event.type) {
      case 'maturity':
        return 'Review your options for reinvesting or withdrawing these funds when the asset matures.';
      case 'dividend':
        return 'This dividend will be automatically credited to your account on the payment date.';
      case 'contribution_reminder':
        return 'Making regular contributions helps you maximize your tax-advantaged room.';
      case 'rebalance':
        return 'Consider rebalancing your portfolio to maintain your target allocation.';
      case 'price_alert':
        return 'Your target price has been reached. Review your trading strategy.';
      default:
        return '';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/80 items-center justify-center px-5"
        onPress={onClose}
      >
        <Pressable onPress={() => {}} className="w-full max-w-md">
          <Animated.View entering={FadeIn}>
            <View className="bg-[#1a1a2e] rounded-3xl overflow-hidden">
              {/* Header gradient */}
              <LinearGradient
                colors={[`${info.color}40`, 'transparent']}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 150,
                }}
              />

              {/* Close button */}
              <Pressable
                onPress={onClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/30 rounded-full items-center justify-center"
              >
                <X size={18} color="white" />
              </Pressable>

              <View className="p-6 pt-8">
                {/* Icon */}
                <View className="items-center">
                  <View
                    className="w-16 h-16 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: info.bgColor }}
                  >
                    <EventIcon type={event.type} />
                  </View>
                </View>

                {/* Title & Type */}
                <View className="mt-5 items-center">
                  <View
                    className="px-3 py-1 rounded-full mb-2"
                    style={{ backgroundColor: info.bgColor }}
                  >
                    <Text style={{ color: info.color }} className="text-xs font-medium">
                      {info.label}
                    </Text>
                  </View>
                  <Text className="text-white text-xl font-bold text-center">
                    {event.title}
                  </Text>
                  {event.assetName && (
                    <Text className="text-gray-400 text-sm mt-1">
                      {event.assetName}
                    </Text>
                  )}
                </View>

                {/* Details */}
                <View className="mt-6 bg-white/5 rounded-2xl p-4">
                  {/* Date */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <Calendar size={16} color="#6B7280" />
                      <Text className="text-gray-400 ml-2">Date</Text>
                    </View>
                    <Text
                      className={cn(
                        'font-medium',
                        isPast ? 'text-red-400' : daysUntil <= 7 ? 'text-amber-400' : 'text-white'
                      )}
                    >
                      {getTimeLabel()}
                    </Text>
                  </View>

                  {/* Amount if exists */}
                  {event.amount && (
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center">
                        <DollarSign size={16} color="#6B7280" />
                        <Text className="text-gray-400 ml-2">Amount</Text>
                      </View>
                      <Text className="text-white font-medium">
                        ${event.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  )}

                  {/* Description */}
                  <View className="pt-3 border-t border-white/10">
                    <Text className="text-gray-400 text-sm leading-5">
                      {event.description}
                    </Text>
                  </View>
                </View>

                {/* Action hint */}
                <View className="mt-4 bg-indigo-500/10 rounded-xl p-3">
                  <Text className="text-indigo-300 text-sm leading-5">
                    {getActionText()}
                  </Text>
                </View>

                {/* Actions */}
                <View className="mt-6 flex-row gap-3">
                  {event.assetId && onViewAsset && (
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onViewAsset();
                      }}
                      className="flex-1 bg-indigo-500 rounded-xl py-3.5 flex-row items-center justify-center"
                    >
                      <ExternalLink size={18} color="white" />
                      <Text className="text-white font-semibold ml-2">View Asset</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={onClose}
                    className={cn(
                      'rounded-xl py-3.5 items-center justify-center',
                      event.assetId ? 'flex-1 bg-white/10' : 'flex-1 bg-indigo-500'
                    )}
                  >
                    <Text className="text-white font-semibold">
                      {event.assetId ? 'Close' : 'Got it'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<EventType | 'all'>('all');
  const [selectedEvent, setSelectedEvent] = React.useState<PortfolioEvent | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);

  const assets = usePortfolioStore((s) => s.assets);
  const { isPremium } = useEntitlementStatus();
  const markEventAsRead = useNotificationsStore((s) => s.markEventAsRead);
  const markAllAsRead = useNotificationsStore((s) => s.markAllAsRead);

  // Generate events from assets and combine with mock events
  const maturityEvents = React.useMemo(
    () => generateMaturityEvents(assets),
    [assets]
  );

  const allEvents = React.useMemo(() => {
    const combined = [...maturityEvents, ...MOCK_EVENTS];
    return combined.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [maturityEvents]);

  const filteredEvents =
    filter === 'all'
      ? allEvents
      : allEvents.filter((e) => e.type === filter);

  const urgentEvents = filteredEvents.filter((e) => {
    const daysUntil = Math.ceil(
      (new Date(e.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil <= 7 && daysUntil >= 0;
  });

  const upcomingEvents = filteredEvents.filter((e) => {
    const daysUntil = Math.ceil(
      (new Date(e.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil > 7;
  });

  const unreadCount = allEvents.filter((e) => !e.isRead).length;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleEventPress = (event: PortfolioEvent) => {
    markEventAsRead(event.id);
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleViewAsset = () => {
    if (selectedEvent?.assetId) {
      setModalVisible(false);
      router.push(`/asset/${selectedEvent.assetId}`);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedEvent(null);
  };

  const filterOptions: { key: EventType | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'maturity', label: 'Maturity' },
    { key: 'dividend', label: 'Dividends' },
    { key: 'contribution_reminder', label: 'Contributions' },
    { key: 'rebalance', label: 'Rebalance' },
  ];

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      {/* Background gradient */}
      <LinearGradient
        colors={['#1a1a2e', '#0A0A0F']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 350,
        }}
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
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top }} className="px-5 pb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-2xl font-bold">Events</Text>
              <Text className="text-gray-500 text-sm mt-1">
                {unreadCount > 0
                  ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`
                  : 'All caught up'}
              </Text>
            </View>

            {unreadCount > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  markAllAsRead();
                }}
                className="bg-white/5 px-3 py-2 rounded-xl flex-row items-center"
              >
                <Check size={16} color="#6366F1" />
                <Text className="text-indigo-400 text-sm ml-1.5">Mark all</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter chips */}
        <Animated.View entering={FadeInRight.delay(100)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
            style={{ flexGrow: 0 }}
          >
            {filterOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(option.key);
                }}
                className={cn(
                  'px-4 py-2 rounded-full mr-2',
                  filter === option.key
                    ? 'bg-indigo-500'
                    : 'bg-white/5'
                )}
              >
                <Text
                  className={cn(
                    'text-sm font-medium',
                    filter === option.key ? 'text-white' : 'text-gray-400'
                  )}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Summary Card */}
        {urgentEvents.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(150).springify()}
            className="mx-5 mb-6"
          >
            <LinearGradient
              colors={['#F59E0B15', '#F59E0B05']}
              style={{
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: '#F59E0B30',
              }}
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-amber-500/20 items-center justify-center">
                  <AlertCircle size={24} color="#F59E0B" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-white font-semibold">
                    {urgentEvents.length} Upcoming This Week
                  </Text>
                  <Text className="text-amber-500/80 text-sm mt-0.5">
                    {urgentEvents.filter((e) => e.type === 'maturity').length > 0 &&
                      `${urgentEvents.filter((e) => e.type === 'maturity').length} maturity date${
                        urgentEvents.filter((e) => e.type === 'maturity').length > 1 ? 's' : ''
                      }`}
                    {urgentEvents.filter((e) => e.type === 'maturity').length > 0 &&
                      urgentEvents.filter((e) => e.type !== 'maturity').length > 0 &&
                      ', '}
                    {urgentEvents.filter((e) => e.type !== 'maturity').length > 0 &&
                      `${urgentEvents.filter((e) => e.type !== 'maturity').length} other event${
                        urgentEvents.filter((e) => e.type !== 'maturity').length > 1 ? 's' : ''
                      }`}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* This Week */}
            {urgentEvents.length > 0 && (
              <>
                <SectionHeader title="This Week" count={urgentEvents.length} />
                {urgentEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    onPress={() => handleEventPress(event)}
                  />
                ))}
              </>
            )}

            {/* Upcoming */}
            {upcomingEvents.length > 0 && (
              <>
                <View className={urgentEvents.length > 0 ? 'mt-4' : ''}>
                  <SectionHeader title="Upcoming" count={upcomingEvents.length} />
                </View>
                {upcomingEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index + urgentEvents.length}
                    onPress={() => handleEventPress(event)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* Premium upsell for more features */}
        {!isPremium && (
          <Animated.View
            entering={FadeInDown.delay(400)}
            className="mx-5 mt-6"
          >
            <Pressable
              onPress={() => {
                console.log('[Premium Debug] Upgrade button clicked:', {
                  location: 'events-tab-upsell',
                  isPremium: false,
                  timestamp: new Date().toISOString(),
                });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/premium');
              }}
            >
              <LinearGradient
                colors={['#6366F115', '#6366F105']}
                style={{
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#6366F130',
                }}
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-indigo-500/20 items-center justify-center">
                    <Sparkles size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-white font-semibold">
                      Unlock Price Alerts
                    </Text>
                    <Text className="text-gray-400 text-sm mt-0.5">
                      Get notified when assets hit your targets
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#6366F1" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        visible={modalVisible}
        onClose={handleCloseModal}
        onViewAsset={selectedEvent?.assetId ? handleViewAsset : undefined}
      />
    </View>
  );
}
