import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
          <Text className="text-white text-xl font-bold">Terms of Service</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-gray-400 text-sm mb-6">
          Last updated: January 2025
        </Text>

        <Section title="1. Acceptance of Terms">
          By downloading, installing, or using Ledger ("the App"), you agree to
          be bound by these Terms of Service. If you do not agree to these
          terms, please do not use the App.
        </Section>

        <Section title="2. Description of Service">
          Ledger is a personal portfolio tracking application designed to help
          users monitor and organize their investments. The App allows you to:
          {'\n\n'}• Track stocks, bonds, crypto, real estate, and other assets
          {'\n'}• View portfolio analytics and allocation breakdowns
          {'\n'}• Set up notifications for important dates
          {'\n'}• Access market data from third-party providers
        </Section>

        <Section title="3. Not Financial Advice">
          <Text className="text-amber-400 font-semibold">
            IMPORTANT DISCLAIMER:{' '}
          </Text>
          The information provided by Ledger is for informational purposes only
          and should not be considered financial, investment, tax, or legal
          advice. The App does not provide personalized investment
          recommendations.
          {'\n\n'}You should consult with qualified professionals before making
          any investment decisions. Past performance is not indicative of future
          results.
        </Section>

        <Section title="4. User Responsibilities">
          You are responsible for:
          {'\n\n'}• Maintaining the accuracy of data you enter
          {'\n'}• Keeping your account credentials secure
          {'\n'}• Complying with all applicable laws and regulations
          {'\n'}• Verifying market data with official sources before making
          decisions
        </Section>

        <Section title="5. Data Accuracy">
          Market data is provided by third-party services (Stooq, Alpha
          Vantage) and may be delayed or inaccurate. We make no warranties
          regarding the accuracy, completeness, or timeliness of market data.
          {'\n\n'}Asset values you enter manually are your responsibility to
          maintain and update.
        </Section>

        <Section title="6. Subscription & Payments">
          Certain features require a Premium subscription. Subscription fees are
          billed through Apple App Store or Google Play Store. Refunds are
          subject to the respective store's policies.
          {'\n\n'}We reserve the right to modify subscription pricing with
          reasonable notice.
        </Section>

        <Section title="7. Privacy">
          Your privacy is important to us. Please review our Privacy Policy to
          understand how we collect, use, and protect your information.
        </Section>

        <Section title="8. Intellectual Property">
          The App and its original content, features, and functionality are
          owned by Ledger and are protected by international copyright,
          trademark, and other intellectual property laws.
        </Section>

        <Section title="9. Limitation of Liability">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, LEDGER SHALL NOT BE LIABLE FOR
          ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
          INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR INVESTMENT
          LOSSES.
        </Section>

        <Section title="10. Modifications">
          We reserve the right to modify these Terms at any time. Continued use
          of the App after changes constitutes acceptance of the modified Terms.
        </Section>

        <Section title="11. Termination">
          We may terminate or suspend your access to the App immediately,
          without prior notice, for conduct that we believe violates these Terms
          or is harmful to other users.
        </Section>

        <Section title="12. Contact">
          For questions about these Terms, please contact us at:
          {'\n\n'}support@ledger-app.com
        </Section>
      </ScrollView>
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
