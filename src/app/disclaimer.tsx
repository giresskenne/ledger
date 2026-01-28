import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle, Info, TrendingUp, DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLegalStore } from '@/lib/legal-store';

export default function DisclaimerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const acceptDisclaimer = useLegalStore((s) => s.acceptDisclaimer);

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="px-5 pb-4 border-b border-white/10"
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/10 rounded-full items-center justify-center mr-3"
          >
            <ArrowLeft size={20} color="white" />
          </Pressable>
          <Text className="text-white text-xl font-bold">
            Investment Disclaimer
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Important Warning Banner */}
        <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-8">
          <View className="flex-row items-center mb-3">
            <AlertTriangle size={24} color="#F59E0B" />
            <Text className="text-amber-400 font-bold text-lg ml-2">
              Important Notice
            </Text>
          </View>
          <Text className="text-gray-300 leading-6">
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
          />
          <DisclaimerCard
            icon={<Info size={20} color="#6366F1" />}
            title="No Professional Advice"
            description="This app does not provide investment, financial, legal, or tax advice. Always consult qualified professionals before making investment decisions."
            color="#6366F1"
          />
          <DisclaimerCard
            icon={<DollarSign size={20} color="#10B981" />}
            title="Data Accuracy"
            description="Market data is sourced from third parties and may be delayed, incomplete, or inaccurate. Always verify information with official sources."
            color="#10B981"
          />
        </View>

        <Section title="Not Financial Advice">
          The content, tools, and analytics provided by Ledger are for
          informational and educational purposes only. Nothing in this app
          constitutes a recommendation to buy, sell, or hold any investment or
          security.
          {'\n\n'}The app's risk analysis, allocation recommendations, and
          portfolio suggestions are based on general principles and algorithms.
          They do not take into account your individual financial situation,
          goals, or risk tolerance.
        </Section>

        <Section title="Past Performance">
          Historical performance data shown in the app is not indicative of
          future results. The stock market and other investment markets are
          inherently unpredictable, and past gains do not guarantee future
          returns.
        </Section>

        <Section title="Market Data Sources">
          Price data is provided by:
          {'\n\n'}• <Text className="text-white">Stooq</Text> - Global stock prices (may be delayed)
          {'\n'}• <Text className="text-white">Alpha Vantage</Text> - FX and cryptocurrency rates
          {'\n\n'}We make no warranties about the accuracy, reliability, or
          completeness of this data. For time-sensitive decisions, always verify
          prices with your broker or official exchanges.
        </Section>

        <Section title="Manual Data Entry">
          For assets you track manually (real estate, private investments,
          etc.), the app displays values you enter. These values may not reflect
          current market conditions. It is your responsibility to keep this data
          updated and accurate.
        </Section>

        <Section title="Tax Implications">
          The app may display gains, losses, and other metrics that could have
          tax implications. This information is for tracking purposes only and
          should not be used for tax preparation. Consult a qualified tax
          professional for tax advice.
        </Section>

        <Section title="Risk Analysis Limitations">
          The risk analysis features in Ledger Premium use simplified models and
          general financial principles. They do not account for:
          {'\n\n'}• Your complete financial picture
          {'\n'}• Individual tax situations
          {'\n'}• Personal risk tolerance
          {'\n'}• Investment time horizon
          {'\n'}• Liquidity needs
          {'\n'}• Specific investment objectives
        </Section>

        <Section title="Regulatory Notice">
          Ledger is not registered as an investment advisor, broker-dealer, or
          financial planner with any regulatory authority. The app does not
          provide regulated financial services.
        </Section>

        <Section title="Your Responsibility">
          By using Ledger, you acknowledge that:
          {'\n\n'}• You are solely responsible for your investment decisions
          {'\n'}• You will verify information before acting on it
          {'\n'}• You understand the risks involved in investing
          {'\n'}• You will seek professional advice when needed
        </Section>

        {/* Agreement Footer */}
        <View className="bg-white/5 rounded-2xl p-4 mt-4">
          <Text className="text-gray-400 text-sm text-center leading-5">
            By continuing to use Ledger, you acknowledge that you have read,
            understood, and agree to this Investment Disclaimer.
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            acceptDisclaimer();
            router.replace('/(tabs)');
          }}
          className="mt-6 bg-indigo-600 rounded-2xl py-4 items-center justify-center"
        >
          <Text className="text-white font-bold text-base">I Understand</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/terms');
          }}
          className="mt-3 py-3 items-center justify-center"
        >
          <Text className="text-gray-400 text-sm">Read Terms of Service</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function DisclaimerCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <View className="bg-white/5 rounded-xl p-4 mb-3">
      <View className="flex-row items-center mb-2">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </View>
        <Text className="text-white font-semibold ml-3">{title}</Text>
      </View>
      <Text className="text-gray-400 text-sm leading-5 ml-13">
        {description}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-white font-semibold text-base mb-3">{title}</Text>
      <Text className="text-gray-400 leading-6">{children}</Text>
    </View>
  );
}
