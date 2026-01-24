import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  Settings,
  Shield,
  CalendarClock,
  ChevronRight,
  Sparkles,
  HelpCircle,
  FileText,
  Lock,
  CreditCard,
  Bell,
} from 'lucide-react-native';
import { usePortfolioStore } from '@/lib/store';
import { useEntitlementStatus } from '@/lib/premium-store';
import { useRoomStore } from '@/lib/room-store';
import { useOnboardingStore } from '@/lib/onboarding-store';
import { cn } from '@/lib/cn';

// Generate upcoming event count
function useUpcomingEventCount() {
  const assets = usePortfolioStore((s) => s.assets);

  return React.useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    let count = 0;

    assets.forEach((asset) => {
      if (asset.maturityDate) {
        const maturityDate = new Date(asset.maturityDate);
        if (maturityDate >= now && maturityDate <= weekFromNow) {
          count++;
        }
      }
    });

    count += 2; // Mock events
    return count;
  }, [assets]);
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPremium, isDebugOverride } = useEntitlementStatus();
  const upcomingEventCount = useUpcomingEventCount();
  const registeredAccountsEnabled = useOnboardingStore((s) => s.registeredAccountsEnabled);

  const handlePress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      <LinearGradient
        colors={['#1a1a2e', '#0A0A0F']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top }} className="px-5">
          <Text className="text-white text-2xl font-bold">More</Text>

          {/* Profile Card */}
          <Animated.View entering={FadeInDown.delay(100)} className="mt-6 bg-white/5 rounded-2xl p-4">
            <View className="flex-row items-center">
              <View className="w-16 h-16 rounded-full bg-indigo-600 items-center justify-center">
                <User size={28} color="white" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-white text-lg font-semibold">Investor</Text>
                <Text className="text-gray-400 text-sm">investor@email.com</Text>
              </View>
              {isPremium && (
                <View className={cn(
                  "flex-row items-center px-3 py-1 rounded-full",
                  isDebugOverride ? "bg-purple-500/20" : "bg-amber-500/20"
                )}>
                  <Sparkles size={14} color={isDebugOverride ? "#A855F7" : "#F59E0B"} />
                  <Text className={cn(
                    "text-sm font-medium ml-1",
                    isDebugOverride ? "text-purple-500" : "text-amber-500"
                  )}>
                    {isDebugOverride ? 'Debug' : 'Premium'}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Premium Banner (if not premium) */}
          {!isPremium && (
            <Animated.View entering={FadeInDown.delay(150)}>
              <Pressable
                onPress={() => handlePress('/premium')}
                className="mt-4"
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16, padding: 16 }}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                      <Sparkles size={20} color="white" />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-semibold">Upgrade to Premium</Text>
                      <Text className="text-white/80 text-sm">Unlock advanced analytics</Text>
                    </View>
                    <ChevronRight size={20} color="white" />
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}

          {/* Features Section */}
          <Text className="text-gray-400 text-sm mt-8 mb-3 px-1">FEATURES</Text>
          <Animated.View entering={FadeInDown.delay(200)} className="bg-white/5 rounded-2xl overflow-hidden">
            {/* Events */}
            <Pressable
              onPress={() => handlePress('/(tabs)/events')}
              className="flex-row items-center p-4 border-b border-white/5"
            >
              <View className="w-9 h-9 rounded-full bg-rose-500/20 items-center justify-center">
                <CalendarClock size={20} color="#F43F5E" />
              </View>
              <Text className="text-white flex-1 ml-3">Events & Calendar</Text>
              {upcomingEventCount > 0 && (
                <View className="bg-rose-500 rounded-full px-2 py-0.5 mr-2">
                  <Text className="text-white text-xs font-semibold">
                    {upcomingEventCount > 9 ? '9+' : upcomingEventCount}
                  </Text>
                </View>
              )}
              <ChevronRight size={18} color="#6B7280" />
            </Pressable>

            {/* Rooms - Only show if registered accounts are enabled */}
            {registeredAccountsEnabled && (
              <Pressable
                onPress={() => handlePress('/(tabs)/rooms')}
                className="flex-row items-center p-4 border-b border-white/5"
              >
                <View className="w-9 h-9 rounded-full bg-emerald-500/20 items-center justify-center">
                  <Shield size={20} color="#10B981" />
                </View>
                <Text className="text-white flex-1 ml-3">Contribution Room</Text>
                <ChevronRight size={18} color="#6B7280" />
              </Pressable>
            )}

            {/* Notifications */}
            <Pressable
              onPress={() => handlePress('/(tabs)/settings')}
              className="flex-row items-center p-4"
            >
              <View className="w-9 h-9 rounded-full bg-indigo-500/20 items-center justify-center">
                <Bell size={20} color="#6366F1" />
              </View>
              <Text className="text-white flex-1 ml-3">Notifications</Text>
              <ChevronRight size={18} color="#6B7280" />
            </Pressable>
          </Animated.View>

          {/* Account Section */}
          <Text className="text-gray-400 text-sm mt-8 mb-3 px-1">ACCOUNT</Text>
          <Animated.View entering={FadeInDown.delay(300)} className="bg-white/5 rounded-2xl overflow-hidden">
            {/* Settings */}
            <Pressable
              onPress={() => handlePress('/(tabs)/settings')}
              className="flex-row items-center p-4 border-b border-white/5"
            >
              <View className="w-9 h-9 rounded-full bg-gray-500/20 items-center justify-center">
                <Settings size={20} color="#9CA3AF" />
              </View>
              <Text className="text-white flex-1 ml-3">Settings</Text>
              <ChevronRight size={18} color="#6B7280" />
            </Pressable>

            {/* Subscription */}
            <Pressable
              onPress={() => handlePress('/premium')}
              className="flex-row items-center p-4 border-b border-white/5"
            >
              <View className="w-9 h-9 rounded-full bg-amber-500/20 items-center justify-center">
                <CreditCard size={20} color="#F59E0B" />
              </View>
              <Text className="text-white flex-1 ml-3">Subscription</Text>
              <Text className="text-gray-400 text-sm mr-2">
                {isPremium ? 'Premium' : 'Free'}
              </Text>
              <ChevronRight size={18} color="#6B7280" />
            </Pressable>

            {/* Privacy */}
            <Pressable
              onPress={() => handlePress('/privacy')}
              className="flex-row items-center p-4"
            >
              <View className="w-9 h-9 rounded-full bg-blue-500/20 items-center justify-center">
                <Lock size={20} color="#3B82F6" />
              </View>
              <Text className="text-white flex-1 ml-3">Privacy Policy</Text>
              <ChevronRight size={18} color="#6B7280" />
            </Pressable>
          </Animated.View>

          {/* Support Section */}
          <Text className="text-gray-400 text-sm mt-8 mb-3 px-1">SUPPORT</Text>
          <Animated.View entering={FadeInDown.delay(400)} className="bg-white/5 rounded-2xl overflow-hidden">
            {/* Help */}
            <Pressable
              onPress={() => handlePress('/help-center')}
              className="flex-row items-center p-4 border-b border-white/5"
            >
              <View className="w-9 h-9 rounded-full bg-cyan-500/20 items-center justify-center">
                <HelpCircle size={20} color="#06B6D4" />
              </View>
              <Text className="text-white flex-1 ml-3">Help Center</Text>
              <ChevronRight size={18} color="#6B7280" />
            </Pressable>

            {/* Terms */}
            <Pressable
              onPress={() => handlePress('/terms')}
              className="flex-row items-center p-4"
            >
              <View className="w-9 h-9 rounded-full bg-violet-500/20 items-center justify-center">
                <FileText size={20} color="#8B5CF6" />
              </View>
              <Text className="text-white flex-1 ml-3">Terms of Service</Text>
              <ChevronRight size={18} color="#6B7280" />
            </Pressable>
          </Animated.View>

          {/* App Version */}
          <Animated.View entering={FadeInDown.delay(500)} className="mt-8 items-center">
            <Text className="text-gray-500 text-sm">Ledger v1.0.0</Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
