import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle, Info, TrendingUp, DollarSign, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLegalStore } from '@/lib/legal-store';
import Animated, { FadeInDown, FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-store';

export default function DisclaimerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const acceptDisclaimer = useLegalStore((s) => s.acceptDisclaimer);
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Animation values for transition
  const overlayOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);

  const navigateToDashboard = () => {
    router.replace('/(tabs)');
  };

  const handleAcknowledge = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptDisclaimer();
    setIsTransitioning(true);
    
    // Animate out with scale and fade
    cardScale.value = withTiming(0.9, { duration: 250, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
    overlayOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(navigateToDashboard)();
    });
  };
  
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  // Compact notice modal
  if (!showFullDisclaimer) {
    return (
      <Animated.View style={[{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' }, overlayStyle]}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={[{ 
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              borderRadius: 24,
              padding: 24,
              borderWidth: 2,
              borderColor: '#F59E0B',
            }, cardAnimatedStyle]}
          >
            {/* Warning Icon */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View 
                style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 40, 
                  backgroundColor: '#F59E0B20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={40} color="#F59E0B" />
              </View>
            </View>

            {/* Title */}
            <Text 
              style={{ 
                color: '#F59E0B',
                fontSize: 24,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              Important Notice
            </Text>

            {/* Message */}
            <Text 
              style={{ 
                color: theme.text,
                fontSize: 16,
                lineHeight: 24,
                textAlign: 'center',
                marginBottom: 28,
              }}
            >
              Ledger is a portfolio tracking tool, not an investment advisor. The information displayed in this app should not be used as the sole basis for making investment decisions.
            </Text>

            {/* Buttons */}
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={handleAcknowledge}
                disabled={isTransitioning}
                style={{
                  backgroundColor: '#6366F1',
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: isTransitioning ? 0.7 : 1,
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  I Understand
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowFullDisclaimer(true);
                }}
                disabled={isTransitioning}
                style={{
                  backgroundColor: theme.surfaceHover,
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                  Read Full Disclaimer
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    );
  }

  // Full disclaimer view

  // Full disclaimer view
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{ paddingTop: insets.top, borderBottomColor: theme.border }}
        className="px-5 pb-4 border-b"
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => setShowFullDisclaimer(false)}
            style={{ backgroundColor: theme.surface }}
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
          >
            <ArrowLeft size={20} color={theme.text} />
          </Pressable>
          <Text style={{ color: theme.text }} className="text-xl font-bold">
            Investment Disclaimer
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={true}
      >
        {/* Important Warning Banner */}
        <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-8">
          <View className="flex-row items-center mb-3">
            <AlertTriangle size={24} color="#F59E0B" />
            <Text className="text-amber-400 font-bold text-lg ml-2">
              Important Notice
            </Text>
          </View>
          <Text style={{ color: theme.text }} className="leading-6">
            Ledger is a portfolio tracking tool, not an investment advisor. The
            information displayed in this app should not be used as the sole
            basis for making investment decisions.
          </Text>
        </View>

        {/* Key Points */}
        <View className="mb-8">
          <DisclaimerCard
            icon={<TrendingUp size={20} color="#EF4444" />}
            title="Investment Risk"
            description="All investments carry risk. The value of your investments can go down as well as up. You may get back less than you invest."
            color="#EF4444"
            theme={theme}
          />
          <DisclaimerCard
            icon={<Info size={20} color="#6366F1" />}
            title="No Professional Advice"
            description="This app does not provide investment, financial, legal, or tax advice. Always consult qualified professionals before making investment decisions."
            color="#6366F1"
            theme={theme}
          />
          <DisclaimerCard
            icon={<DollarSign size={20} color="#10B981" />}
            title="Data Accuracy"
            description="Market data is sourced from third parties and may be delayed, incomplete, or inaccurate. Always verify information with official sources."
            color="#10B981"
            theme={theme}
          />
        </View>

        <Section title="Not Financial Advice" theme={theme}>
          The content, tools, and analytics provided by Ledger are for
          informational and educational purposes only. Nothing in this app
          constitutes a recommendation to buy, sell, or hold any investment or
          security.
          {'\n\n'}The app's risk analysis, allocation recommendations, and
          portfolio suggestions are based on general principles and algorithms.
          They do not take into account your individual financial situation,
          goals, or risk tolerance.
        </Section>

        <Section title="Past Performance" theme={theme}>
          Historical performance data shown in the app is not indicative of
          future results. The stock market and other investment markets are
          inherently unpredictable, and past gains do not guarantee future
          returns.
        </Section>

        <Section title="Market Data Sources" theme={theme}>
          Price data is provided by:
          {'\n\n'}• <Text style={{ color: theme.text }}>Stooq</Text> - Global stock prices (may be delayed)
          {'\n'}• <Text style={{ color: theme.text }}>Alpha Vantage</Text> - FX and cryptocurrency rates
          {'\n\n'}We make no warranties about the accuracy, reliability, or
          completeness of this data. For time-sensitive decisions, always verify
          prices with your broker or official exchanges.
        </Section>

        <Section title="Manual Data Entry" theme={theme}>
          For assets you track manually (real estate, private investments,
          etc.), the app displays values you enter. These values may not reflect
          current market conditions. It is your responsibility to keep this data
          updated and accurate.
        </Section>

        <Section title="Tax Implications" theme={theme}>
          The app may display gains, losses, and other metrics that could have
          tax implications. This information is for tracking purposes only and
          should not be used for tax preparation. Consult a qualified tax
          professional for tax advice.
        </Section>

        <Section title="Risk Analysis Limitations" theme={theme}>
          The risk analysis features in Ledger Premium use simplified models and
          general financial principles. They do not account for:
          {'\n\n'}• Your complete financial picture
          {'\n'}• Individual tax situations
          {'\n'}• Personal risk tolerance
          {'\n'}• Investment time horizon
          {'\n'}• Liquidity needs
          {'\n'}• Specific investment objectives
        </Section>

        <Section title="Regulatory Notice" theme={theme}>
          Ledger is not registered as an investment advisor, broker-dealer, or
          financial planner with any regulatory authority. The app does not
          provide regulated financial services.
        </Section>

        <Section title="Your Responsibility" theme={theme}>
          By using Ledger, you acknowledge that:
          {'\n\n'}• You are solely responsible for your investment decisions
          {'\n'}• You will verify information before acting on it
          {'\n'}• You understand the risks involved in investing
          {'\n'}• You will seek professional advice when needed
        </Section>

        {/* Agreement Footer */}
        <View style={{ backgroundColor: theme.surfaceHover }} className="rounded-2xl p-4 mt-4">
          <Text style={{ color: theme.textSecondary }} className="text-sm text-center leading-5">
            By continuing to use Ledger, you acknowledge that you have read,
            understood, and agree to this Investment Disclaimer.
          </Text>
        </View>

        <Animated.View entering={FadeInDown.delay(120)}>
          <Pressable
            onPress={handleAcknowledge}
            className="mt-6 bg-indigo-600 rounded-2xl py-4 items-center justify-center"
          >
            <Text className="text-white font-bold text-base">I Understand</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(170)}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/terms');
            }}
            className="mt-3 py-3 items-center justify-center"
          >
            <Text style={{ color: theme.textSecondary }} className="text-sm">Read Terms of Service</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function DisclaimerCard({
  icon,
  title,
  description,
  color,
  theme,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  theme: any;
}) {
  return (
    <View style={{ backgroundColor: theme.surfaceHover }} className="rounded-xl p-4 mb-3">
      <View className="flex-row items-center mb-2">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </View>
        <Text style={{ color: theme.text }} className="font-semibold ml-3">{title}</Text>
      </View>
      <Text style={{ color: theme.textSecondary }} className="text-sm leading-5 ml-13">
        {description}
      </Text>
    </View>
  );
}

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View className="mb-6">
      <Text style={{ color: theme.text }} className="font-semibold text-base mb-3">{title}</Text>
      <Text style={{ color: theme.textSecondary }} className="leading-6">{children}</Text>
    </View>
  );
}
