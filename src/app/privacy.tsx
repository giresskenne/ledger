import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Eye, Server, Trash2, Lock } from 'lucide-react-native';

export default function PrivacyScreen() {
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
          <Text className="text-white text-xl font-bold">Privacy Policy</Text>
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

        {/* Privacy Highlights */}
        <View className="bg-emerald-500/10 rounded-2xl p-4 mb-8">
          <Text className="text-emerald-400 font-semibold mb-3">
            Privacy Highlights
          </Text>
          <HighlightItem
            icon={<Lock size={16} color="#10B981" />}
            text="Your financial data stays on your device"
          />
          <HighlightItem
            icon={<Eye size={16} color="#10B981" />}
            text="We never sell your personal information"
          />
          <HighlightItem
            icon={<Server size={16} color="#10B981" />}
            text="Minimal data collection for app functionality"
          />
          <HighlightItem
            icon={<Trash2 size={16} color="#10B981" />}
            text="Delete your data anytime from settings"
            isLast
          />
        </View>

        <Section title="1. Information We Collect">
          <BulletPoint title="Data You Provide">
            Portfolio data (assets, quantities, prices) that you manually enter
            into the App. This data is stored locally on your device.
          </BulletPoint>
          <BulletPoint title="Automatically Collected">
            Device information, app usage analytics, and crash reports to
            improve app performance and stability.
          </BulletPoint>
          <BulletPoint title="Third-Party Services">
            When fetching market data, your device may connect to Stooq and
            Alpha Vantage APIs. These requests include ticker symbols only.
          </BulletPoint>
        </Section>

        <Section title="2. How We Use Your Information">
          We use collected information to:
          {'\n\n'}• Provide and maintain the App's functionality
          {'\n'}• Fetch market prices for your tracked assets
          {'\n'}• Send notifications you've opted into
          {'\n'}• Improve app performance and fix bugs
          {'\n'}• Process subscription payments (via App Store/Play Store)
        </Section>

        <Section title="3. Data Storage & Security">
          <BulletPoint title="Local Storage">
            Your portfolio data is stored locally on your device using encrypted
            storage. We do not have access to your financial data.
          </BulletPoint>
          <BulletPoint title="Cloud Sync">
            If you enable cloud backup, data is encrypted end-to-end before
            being stored in secure cloud infrastructure.
          </BulletPoint>
          <BulletPoint title="Security Measures">
            We implement industry-standard security measures including
            encryption, secure API connections, and regular security audits.
          </BulletPoint>
        </Section>

        <Section title="4. Third-Party Services">
          The App uses the following third-party services:
          {'\n\n'}• <Text className="text-white">Apple App Store / Google Play</Text> - Payment processing
          {'\n'}• <Text className="text-white">RevenueCat</Text> - Subscription management
          {'\n'}• <Text className="text-white">Stooq</Text> - Stock market data
          {'\n'}• <Text className="text-white">Alpha Vantage</Text> - FX and crypto data
          {'\n\n'}Each service has its own privacy policy that governs their use
          of your data.
        </Section>

        <Section title="5. Your Rights">
          You have the right to:
          {'\n\n'}• <Text className="text-white">Access</Text> - Request a copy of your data
          {'\n'}• <Text className="text-white">Correction</Text> - Update inaccurate information
          {'\n'}• <Text className="text-white">Deletion</Text> - Delete your data from the App
          {'\n'}• <Text className="text-white">Portability</Text> - Export your data in common formats
          {'\n'}• <Text className="text-white">Opt-out</Text> - Disable analytics and notifications
        </Section>

        <Section title="6. Children's Privacy">
          The App is not intended for users under 18 years of age. We do not
          knowingly collect information from children.
        </Section>

        <Section title="7. Data Retention">
          Local data remains on your device until you delete it or uninstall the
          App. Analytics data is retained for up to 2 years for performance
          analysis.
        </Section>

        <Section title="8. International Users">
          If you access the App from outside the United States, your data may be
          transferred to and processed in countries with different data
          protection laws. By using the App, you consent to such transfers.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this Privacy Policy periodically. We will notify you of
          significant changes through the App or via email.
        </Section>

        <Section title="10. Contact Us">
          For privacy-related questions or to exercise your rights:
          {'\n\n'}Email: privacy@ledger-app.com
          {'\n'}Address: [Company Address]
        </Section>
      </ScrollView>
    </View>
  );
}

function HighlightItem({
  icon,
  text,
  isLast = false,
}: {
  icon: React.ReactNode;
  text: string;
  isLast?: boolean;
}) {
  return (
    <View className={`flex-row items-center ${isLast ? '' : 'mb-2'}`}>
      <View className="mr-2">{icon}</View>
      <Text className="text-gray-300 text-sm flex-1">{text}</Text>
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

function BulletPoint({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-3">
      <Text className="text-white text-sm font-medium">{title}</Text>
      <Text className="text-gray-400 text-sm mt-1 leading-5">{children}</Text>
    </View>
  );
}
