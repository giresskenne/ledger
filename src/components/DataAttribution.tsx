import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { cn } from '../lib/cn';
import type { MarketDataProvider } from '../lib/market-data/types';
import { DATA_ATTRIBUTIONS } from '../lib/market-data/types';

interface DataAttributionProps {
  provider: MarketDataProvider;
  className?: string;
  compact?: boolean;
}

export function DataAttribution({
  provider,
  className,
  compact = false,
}: DataAttributionProps) {
  const attribution = DATA_ATTRIBUTIONS[provider];

  if (!attribution.requiresAttribution && compact) {
    return null;
  }

  const handlePress = () => {
    if (attribution.url) {
      Linking.openURL(attribution.url);
    }
  };

  if (compact) {
    return (
      <Pressable onPress={handlePress} className={cn('flex-row items-center', className)}>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Data by{' '}
        </Text>
        <Text className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          {attribution.name}
        </Text>
        {attribution.url && (
          <ExternalLink
            size={10}
            className="ml-1 text-blue-600 dark:text-blue-400"
          />
        )}
      </Pressable>
    );
  }

  return (
    <View className={cn('bg-gray-50 dark:bg-gray-900 rounded-lg p-3', className)}>
      <View className="flex-row items-start gap-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-1">
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {attribution.name}
            </Text>
            {attribution.url && (
              <Pressable onPress={handlePress}>
                <ExternalLink size={14} className="text-blue-600 dark:text-blue-400" />
              </Pressable>
            )}
          </View>
          <Text className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            {attribution.disclaimer}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ============================================
// Attribution Footer
// ============================================

interface AttributionFooterProps {
  providers: MarketDataProvider[];
  className?: string;
}

export function AttributionFooter({
  providers,
  className,
}: AttributionFooterProps) {
  const uniqueProviders = Array.from(new Set(providers));
  const attributionProviders = uniqueProviders.filter(
    (p) => DATA_ATTRIBUTIONS[p].requiresAttribution
  );

  if (attributionProviders.length === 0) {
    return null;
  }

  return (
    <View className={cn('border-t border-gray-200 dark:border-gray-800 pt-4', className)}>
      <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
        Data Sources
      </Text>
      <View className="gap-2">
        {attributionProviders.map((provider) => (
          <DataAttribution
            key={provider}
            provider={provider}
            compact
          />
        ))}
      </View>
    </View>
  );
}

// ============================================
// Provider Badge
// ============================================

interface ProviderBadgeProps {
  provider: MarketDataProvider;
  status?: 'fresh' | 'stale' | 'error' | 'manual';
  className?: string;
}

export function ProviderBadge({
  provider,
  status = 'fresh',
  className,
}: ProviderBadgeProps) {
  const colors = {
    fresh: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    stale: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    manual: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  const attribution = DATA_ATTRIBUTIONS[provider];
  const statusLabel = status === 'fresh' ? 'Live' : status === 'stale' ? 'Cached' : 'Manual';

  return (
    <View className={cn('flex-row items-center gap-1', className)}>
      <View
        className={cn(
          'px-2 py-1 rounded',
          colors[status]
        )}
      >
        <Text className="text-xs font-medium">
          {attribution.name} • {statusLabel}
        </Text>
      </View>
    </View>
  );
}

// ============================================
// Status Indicator
// ============================================

interface StatusIndicatorProps {
  status: 'fresh' | 'stale' | 'error' | 'manual';
  className?: string;
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const config = {
    fresh: { color: 'bg-green-500', label: 'Live' },
    stale: { color: 'bg-yellow-500', label: 'Cached' },
    error: { color: 'bg-red-500', label: 'Error' },
    manual: { color: 'bg-gray-400', label: 'Manual' },
  };

  const { color, label } = config[status];

  return (
    <View className={cn('flex-row items-center gap-1', className)}>
      <View className={cn('w-2 h-2 rounded-full', color)} />
      <Text className="text-xs text-gray-600 dark:text-gray-400">{label}</Text>
    </View>
  );
}
