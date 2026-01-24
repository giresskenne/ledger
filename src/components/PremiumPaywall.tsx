import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Crown, Lock, X, Check, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { FREE_TIER_LIMITS } from '@/lib/premium-store';

interface PremiumPaywallProps {
  visible: boolean;
  onClose: () => void;
  feature?: 'asset_limit' | 'analysis' | 'rooms' | 'price_alerts' | 'export';
}

const FEATURE_MESSAGES = {
  asset_limit: {
    title: 'Asset Limit Reached',
    description: `You've reached the ${FREE_TIER_LIMITS.maxAssets} asset limit on the free plan. Upgrade to Premium for unlimited asset tracking.`,
    icon: Lock,
  },
  analysis: {
    title: 'Premium Analysis',
    description: 'Get AI-powered risk analysis, sector breakdowns, and personalized recommendations.',
    icon: Sparkles,
  },
  rooms: {
    title: 'Account Room Tracker',
    description: 'Track your TFSA, RRSP, IRA, 401(k), ISA contribution room and maximize tax benefits.',
    icon: Crown,
  },
  price_alerts: {
    title: 'Price Alerts',
    description: 'Get notified when your assets hit target prices. Never miss an opportunity.',
    icon: Sparkles,
  },
  export: {
    title: 'Export Data',
    description: 'Export your portfolio data to CSV or PDF for tax reporting and record keeping.',
    icon: Sparkles,
  },
};

const PREMIUM_BENEFITS = [
  'Unlimited asset tracking',
  'AI risk analysis',
  'Sector & geographic insights',
  'Registered account room tracker',
  'Price alerts',
  'Data export',
];

export function PremiumPaywall({ visible, onClose, feature = 'asset_limit' }: PremiumPaywallProps) {
  const router = useRouter();
  const featureInfo = FEATURE_MESSAGES[feature];
  const IconComponent = featureInfo.icon;

  const handleUpgrade = () => {
    console.log('[Premium Debug] Upgrade button clicked:', {
      location: 'premium-paywall-modal',
      feature,
      featureTitle: featureInfo.title,
      timestamp: new Date().toISOString(),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/premium');
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
                colors={['#F59E0B40', 'transparent']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150 }}
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
                <Animated.View entering={FadeInUp.delay(100)} className="items-center">
                  <View className="w-20 h-20 rounded-full overflow-hidden">
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      style={{
                        width: 80,
                        height: 80,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComponent size={36} color="white" />
                    </LinearGradient>
                  </View>
                </Animated.View>

                {/* Title & Description */}
                <Animated.View entering={FadeInUp.delay(150)} className="mt-6">
                  <Text className="text-white text-2xl font-bold text-center">
                    {featureInfo.title}
                  </Text>
                  <Text className="text-gray-400 text-center mt-3 leading-6">
                    {featureInfo.description}
                  </Text>
                </Animated.View>

                {/* Benefits */}
                <Animated.View entering={FadeInUp.delay(200)} className="mt-6 bg-white/5 rounded-2xl p-4">
                  {PREMIUM_BENEFITS.map((benefit, index) => (
                    <View
                      key={benefit}
                      className={`flex-row items-center ${index > 0 ? 'mt-3' : ''}`}
                    >
                      <View className="w-5 h-5 rounded-full bg-amber-500/20 items-center justify-center">
                        <Check size={12} color="#F59E0B" strokeWidth={3} />
                      </View>
                      <Text className="text-white ml-3">{benefit}</Text>
                    </View>
                  ))}
                </Animated.View>

                {/* CTA */}
                <Animated.View entering={FadeInUp.delay(250)} className="mt-6">
                  <Pressable onPress={handleUpgrade}>
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: 16,
                        padding: 16,
                        alignItems: 'center',
                      }}
                    >
                      <Text className="text-white font-bold text-lg">
                        Start 7-Day Free Trial
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable onPress={onClose} className="mt-4 py-3">
                    <Text className="text-gray-500 text-center">Maybe later</Text>
                  </Pressable>
                </Animated.View>

                {/* Pricing hint */}
                <Text className="text-gray-600 text-center text-xs mt-2">
                  Starting at $4.99/month • Cancel anytime
                </Text>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Inline banner for showing asset limit warning
export function AssetLimitBanner({
  currentCount,
  maxCount,
  onUpgrade,
}: {
  currentCount: number;
  maxCount: number;
  onUpgrade: () => void;
}) {
  const remaining = maxCount - currentCount;
  const isNearLimit = remaining <= 3 && remaining > 0;
  const isAtLimit = remaining <= 0;

  if (!isNearLimit && !isAtLimit) return null;

  return (
    <Animated.View entering={FadeIn}>
      <Pressable
        onPress={() => {
          console.log('[Premium Debug] Upgrade button clicked:', {
            location: 'asset-limit-banner',
            currentCount,
            maxCount,
            remaining,
            isAtLimit,
            timestamp: new Date().toISOString(),
          });
          onUpgrade();
        }}
      >
        <LinearGradient
          colors={isAtLimit ? ['#EF444420', '#0A0A0F'] : ['#F59E0B20', '#0A0A0F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 12,
            padding: 12,
            marginHorizontal: 20,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View
            className="w-8 h-8 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: isAtLimit ? '#EF444430' : '#F59E0B30' }}
          >
            {isAtLimit ? (
              <Lock size={16} color="#EF4444" />
            ) : (
              <Crown size={16} color="#F59E0B" />
            )}
          </View>
          <View className="flex-1">
            <Text className={`font-medium ${isAtLimit ? 'text-red-400' : 'text-amber-400'}`}>
              {isAtLimit
                ? 'Asset limit reached'
                : `${remaining} asset${remaining === 1 ? '' : 's'} remaining`}
            </Text>
            <Text className="text-gray-500 text-xs mt-0.5">
              {isAtLimit ? 'Upgrade to add more' : 'Upgrade for unlimited'}
            </Text>
          </View>
          <Text className={`font-medium ${isAtLimit ? 'text-red-400' : 'text-amber-400'}`}>
            Upgrade
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
