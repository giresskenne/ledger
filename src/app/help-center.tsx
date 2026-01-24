import React from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, MessageCircle, Book, ExternalLink, HelpCircle, FileText, Shield, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

const HELP_TOPICS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of tracking your portfolio',
    icon: Book,
    color: '#10B981',
  },
  {
    id: 'adding-assets',
    title: 'Adding Assets',
    description: 'How to add stocks, crypto, and other investments',
    icon: Sparkles,
    color: '#6366F1',
  },
  {
    id: 'premium-features',
    title: 'Premium Features',
    description: 'Explore risk analysis and advanced tools',
    icon: Sparkles,
    color: '#F59E0B',
  },
  {
    id: 'market-data',
    title: 'Market Data',
    description: 'Understanding live prices and data sources',
    icon: FileText,
    color: '#EC4899',
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    description: 'How we protect your financial data',
    icon: Shield,
    color: '#14B8A6',
  },
];

const CONTACT_OPTIONS = [
  {
    id: 'email',
    title: 'Email Support',
    description: 'support@ledger-app.com',
    icon: Mail,
    action: () => Linking.openURL('mailto:support@ledger-app.com'),
  },
  {
    id: 'faq',
    title: 'FAQ',
    description: 'Find answers to common questions',
    icon: HelpCircle,
    action: () => Linking.openURL('https://ledger-app.com/faq'),
  },
];

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleTopicPress = (topicId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Navigate to detailed help article
    console.log('Opening help topic:', topicId);
  };

  const handleContactPress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

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
          <Text className="text-white text-xl font-bold">Help Center</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-gray-400 text-sm mb-4">
          Get help with using Ledger
        </Text>

        {/* Help Topics */}
        <Text className="text-white font-semibold mb-3">Browse Topics</Text>
        {HELP_TOPICS.map((topic, index) => {
          const Icon = topic.icon;
          return (
            <Animated.View key={topic.id} entering={FadeInDown.delay(index * 50)}>
              <Pressable
                onPress={() => handleTopicPress(topic.id)}
                className="bg-white/5 rounded-xl p-4 mb-3"
              >
                <View className="flex-row items-center">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${topic.color}20` }}
                  >
                    <Icon size={24} color={topic.color} />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-white font-semibold">{topic.title}</Text>
                    <Text className="text-gray-400 text-sm mt-0.5">
                      {topic.description}
                    </Text>
                  </View>
                  <ExternalLink size={18} color="#6B7280" />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Contact Support */}
        <Text className="text-white font-semibold mt-6 mb-3">Contact Us</Text>
        {CONTACT_OPTIONS.map((option, index) => {
          const Icon = option.icon;
          return (
            <Animated.View
              key={option.id}
              entering={FadeInDown.delay(300 + index * 50)}
            >
              <Pressable
                onPress={() => handleContactPress(option.action)}
                className="bg-white/5 rounded-xl p-4 mb-3"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-xl bg-indigo-500/20 items-center justify-center">
                    <Icon size={24} color="#6366F1" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-white font-semibold">{option.title}</Text>
                    <Text className="text-gray-400 text-sm mt-0.5">
                      {option.description}
                    </Text>
                  </View>
                  <ExternalLink size={18} color="#6B7280" />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {/* App Version */}
        <View className="mt-8 items-center">
          <Text className="text-gray-500 text-sm">Ledger v1.0.0</Text>
          <Text className="text-gray-600 text-xs mt-1">Build 2026.01</Text>
        </View>
      </ScrollView>
    </View>
  );
}
