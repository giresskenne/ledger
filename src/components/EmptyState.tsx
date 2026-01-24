import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  iconColor = '#6366F1',
  iconBgColor,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  const bgColor = iconBgColor || `${iconColor}20`;

  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        className="w-20 h-20 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: bgColor }}
      >
        <Icon size={36} color={iconColor} />
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.delay(200)}
        className="text-white text-xl font-bold text-center mb-2"
      >
        {title}
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(300)}
        className="text-gray-400 text-center leading-6 mb-8"
      >
        {description}
      </Animated.Text>

      {actionLabel && onAction && (
        <Animated.View entering={FadeInUp.delay(400)}>
          <Pressable
            onPress={onAction}
            className="bg-indigo-600 px-8 py-4 rounded-2xl"
          >
            <Text className="text-white font-semibold text-base">{actionLabel}</Text>
          </Pressable>
        </Animated.View>
      )}

      {secondaryActionLabel && onSecondaryAction && (
        <Animated.View entering={FadeInUp.delay(500)}>
          <Pressable onPress={onSecondaryAction} className="mt-4 py-2">
            <Text className="text-gray-400">{secondaryActionLabel}</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// Pre-configured empty states for common scenarios
export function NoAssetsEmptyState({ onAdd }: { onAdd: () => void }) {
  const PieChartIcon = require('lucide-react-native').PieChart;
  return (
    <EmptyState
      icon={PieChartIcon}
      iconColor="#6366F1"
      title="No Assets Yet"
      description="Start building your portfolio by adding your first investment. Track stocks, crypto, real estate, and more."
      actionLabel="Add Your First Asset"
      onAction={onAdd}
    />
  );
}

export function NoSearchResultsEmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  const SearchX = require('lucide-react-native').SearchX;
  return (
    <EmptyState
      icon={SearchX}
      iconColor="#9CA3AF"
      title="No Results Found"
      description={`We couldn't find any assets matching "${query}". Try a different search term.`}
      actionLabel="Clear Search"
      onAction={onClear}
    />
  );
}

export function NoEventsEmptyState() {
  const Calendar = require('lucide-react-native').Calendar;
  return (
    <EmptyState
      icon={Calendar}
      iconColor="#F59E0B"
      title="No Upcoming Events"
      description="Add bonds with maturity dates or dividend-paying stocks to see upcoming financial events here."
    />
  );
}

export function NoRoomsEmptyState({ onSetup }: { onSetup: () => void }) {
  const Wallet = require('lucide-react-native').Wallet;
  return (
    <EmptyState
      icon={Wallet}
      iconColor="#EC4899"
      title="No Rooms Created"
      description="Organize your investments by creating rooms like 'Retirement', 'Emergency Fund', or 'College Savings'."
      actionLabel="Create Your First Room"
      onAction={onSetup}
    />
  );
}

export function ErrorState({
  title = 'Something Went Wrong',
  description = 'We encountered an error loading this content. Please try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const AlertCircle = require('lucide-react-native').AlertCircle;
  return (
    <EmptyState
      icon={AlertCircle}
      iconColor="#EF4444"
      title={title}
      description={description}
      actionLabel={onRetry ? 'Try Again' : undefined}
      onAction={onRetry}
    />
  );
}

export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  const WifiOff = require('lucide-react-native').WifiOff;
  return (
    <EmptyState
      icon={WifiOff}
      iconColor="#F97316"
      title="No Connection"
      description="Please check your internet connection and try again."
      actionLabel={onRetry ? 'Retry' : undefined}
      onAction={onRetry}
    />
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  const Loader = require('lucide-react-native').Loader;
  return (
    <View className="flex-1 items-center justify-center">
      <View className="w-16 h-16 rounded-full bg-indigo-500/20 items-center justify-center mb-4">
        <Loader size={28} color="#6366F1" />
      </View>
      <Text className="text-gray-400">{message}</Text>
    </View>
  );
}
