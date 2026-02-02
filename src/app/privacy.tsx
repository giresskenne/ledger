import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Eye, Server, Trash2, Lock } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-store';

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{ paddingTop: insets.top, borderBottomColor: theme.border }}
        className="px-5 pb-4 border-b"
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            style={{ backgroundColor: theme.surface }}
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
          >
            <ArrowLeft size={20} color={theme.text} />
          </Pressable>
          <Text style={{ color: theme.text }} className="text-xl font-bold">Privacy Policy</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: theme.textSecondary }} className="text-sm mb-6">
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
            theme={theme}
          />
          <HighlightItem
            icon={<Eye size={16} color="#10B981" />}
            text="We never sell your personal information"
            theme={theme}
          />
          <HighlightItem
            icon={<Server size={16} color="#10B981" />}
            text="Minimal data collection for app functionality"
            theme={theme}
          />
          <HighlightItem
            icon={<Trash2 size={16} color="#10B981" />}
            text="Delete your data anytime from settings"
            theme={theme}
            isLast
          />
        </View>

        <Section title="1. Information We Collect" theme={theme}>
          <BulletPoint title="Data You Provide" theme={theme}>
            Portfolio data (assets, quantities, prices) that you manually enter
            into the App. This data is stored locally on your device.
          </BulletPoint>
          <BulletPoint title="Automatically Collected" theme={theme}>
            Device information, app usage analytics, and crash reports to
            improve app performance and stability.
          </BulletPoint>
          <BulletPoint title="Third-Party Services" theme={theme}>
            When fetching market data, your device may connect to Stooq and
            Alpha Vantage APIs. These requests include ticker symbols only.
            If you choose to use AI insights, the app may also connect to OpenAI
            and send an aggregated portfolio summary (no personal identifiers).
          </BulletPoint>
        </Section>

        <Section title="2. How We Use Your Information" theme={theme}>
          We use collected information to:
          {'\n\n'}• Provide and maintain the App's functionality
          {'\n'}• Fetch market prices for your tracked assets
          {'\n'}• Send notifications you've opted into
          {'\n'}• Improve app performance and fix bugs
          {'\n'}• Process subscription payments (via App Store/Play Store)
        </Section>

        <Section title="3. Data Storage & Security" theme={theme}>
          <BulletPoint title="Local Storage" theme={theme}>
            Your portfolio data is stored locally on your device using encrypted
            storage. We do not have access to your financial data.
          </BulletPoint>
          <BulletPoint title="Cloud Sync" theme={theme}>
            If you enable cloud backup, data is encrypted end-to-end before
            being stored in secure cloud infrastructure.
          </BulletPoint>
          <BulletPoint title="Security Measures" theme={theme}>
            We implement industry-standard security measures including
            encryption, secure API connections, and regular security audits.
          </BulletPoint>
        </Section>

        <Section title="4. Third-Party Services" theme={theme}>
          The App uses the following third-party services:
          {'\n\n'}• <Text style={{ color: theme.text }}>Apple App Store / Google Play</Text> - Payment processing
          {'\n'}• <Text style={{ color: theme.text }}>RevenueCat</Text> - Subscription management
          {'\n'}• <Text style={{ color: theme.text }}>Stooq</Text> - Stock market data
          {'\n'}• <Text style={{ color: theme.text }}>Alpha Vantage</Text> - FX and crypto data
          {'\n'}• <Text style={{ color: theme.text }}>OpenAI</Text> - Optional AI-generated portfolio insights
          {'\n\n'}Each service has its own privacy policy that governs their use
          of your data.
        </Section>

        <Section title="5. Your Rights" theme={theme}>
          You have the right to:
          {'\n\n'}• <Text style={{ color: theme.text }}>Access</Text> - Request a copy of your data
          {'\n'}• <Text style={{ color: theme.text }}>Correction</Text> - Update inaccurate information
          {'\n'}• <Text style={{ color: theme.text }}>Deletion</Text> - Delete your data from the App
          {'\n'}• <Text style={{ color: theme.text }}>Portability</Text> - Export your data in common formats
          {'\n'}• <Text style={{ color: theme.text }}>Opt-out</Text> - Disable analytics and notifications
        </Section>

        <Section title="6. Children's Privacy" theme={theme}>
          The App is not intended for users under 18 years of age. We do not
          knowingly collect information from children.
        </Section>

        <Section title="7. Data Retention" theme={theme}>
          Local data remains on your device until you delete it or uninstall the
          App. Analytics data is retained for up to 2 years for performance
          analysis.
        </Section>

        <Section title="8. International Users" theme={theme}>
          If you access the App from outside the United States, your data may be
          transferred to and processed in countries with different data
          protection laws. By using the App, you consent to such transfers.
        </Section>

        <Section title="9. Changes to This Policy" theme={theme}>
          We may update this Privacy Policy periodically. We will notify you of
          significant changes through the App or via email.
        </Section>

        <Section title="10. Contact Us" theme={theme}>
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
  theme,
  isLast = false,
}: {
  icon: React.ReactNode;
  text: string;
  theme: any;
  isLast?: boolean;
}) {
  return (
    <View className={`flex-row items-center ${isLast ? '' : 'mb-2'}`}>
      <View className="mr-2">{icon}</View>
      <Text style={{ color: theme.text }} className="text-sm flex-1">{text}</Text>
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

function BulletPoint({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View className="mb-3">
      <Text style={{ color: theme.text }} className="text-sm font-medium">{title}</Text>
      <Text style={{ color: theme.textSecondary }} className="text-sm mt-1 leading-5">{children}</Text>
    </View>
  );
}
