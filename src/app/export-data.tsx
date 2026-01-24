import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileSpreadsheet, FileJson, FileText, Download, Sparkles, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usePortfolioStore } from '@/lib/store';
import { useEntitlementStatus } from '@/lib/premium-store';
import { LinearGradient } from 'expo-linear-gradient';

const EXPORT_FORMATS = [
  {
    id: 'excel',
    name: 'Excel (XLSX)',
    description: 'Spreadsheet format for detailed analysis',
    icon: FileSpreadsheet,
    color: '#10B981',
    extension: '.xlsx',
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'Raw data format for developers',
    icon: FileJson,
    color: '#6366F1',
    extension: '.json',
  },
  {
    id: 'pdf',
    name: 'PDF Report',
    description: 'Formatted report for printing or sharing',
    icon: FileText,
    color: '#EF4444',
    extension: '.pdf',
  },
];

export default function ExportDataScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPremium } = useEntitlementStatus();
  const assets = usePortfolioStore((s) => s.assets);

  const handleExport = (format: string) => {
    if (!isPremium) {
      console.log('[Premium Debug] Premium feature blocked - Export Data:', {
        location: 'export-data-screen',
        requestedFormat: format,
        isPremium: false,
        timestamp: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/premium');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // TODO: Implement actual export logic
    Alert.alert(
      'Export Data',
      `Exporting ${assets.length} assets to ${format.toUpperCase()} format...`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Export',
          onPress: () => {
            // This would trigger file save dialog
            console.log(`Exporting to ${format}`);
          },
        },
      ]
    );
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
          <Text className="text-white text-xl font-bold">Export Data</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Banner */}
        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(50)}>
            <Pressable
              onPress={() => {
                console.log('[Premium Debug] Upgrade button clicked:', {
                  location: 'export-data-banner',
                  isPremium: false,
                  timestamp: new Date().toISOString(),
                });
                router.push('/premium');
              }}
              className="mb-6"
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, padding: 16 }}
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
                    <Lock size={24} color="white" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-white font-bold">Premium Feature</Text>
                    <Text className="text-white/80 text-sm">
                      Upgrade to export your portfolio data
                    </Text>
                  </View>
                  <Sparkles size={20} color="white" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        <Text className="text-gray-400 text-sm mb-4">
          Export your portfolio data in your preferred format
        </Text>

        {/* Summary */}
        <Animated.View entering={FadeInDown.delay(100)} className="bg-white/5 rounded-xl p-4 mb-6">
          <Text className="text-gray-400 text-sm">Ready to export</Text>
          <Text className="text-white text-2xl font-bold mt-1">
            {assets.length} {assets.length === 1 ? 'Asset' : 'Assets'}
          </Text>
        </Animated.View>

        {/* Export Formats */}
        {EXPORT_FORMATS.map((format, index) => {
          const Icon = format.icon;
          return (
            <Animated.View key={format.id} entering={FadeInDown.delay(150 + index * 50)}>
              <Pressable
                onPress={() => handleExport(format.id)}
                className="bg-white/5 rounded-2xl p-4 mb-3"
                disabled={!isPremium}
                style={{ opacity: !isPremium ? 0.5 : 1 }}
              >
                <View className="flex-row items-center">
                  <View
                    className="w-14 h-14 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${format.color}20` }}
                  >
                    <Icon size={28} color={format.color} />
                  </View>
                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center">
                      <Text className="text-white font-semibold">{format.name}</Text>
                      {!isPremium && (
                        <View className="bg-amber-500/20 px-2 py-0.5 rounded ml-2">
                          <Text className="text-amber-500 text-[10px] font-medium">
                            PREMIUM
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-400 text-sm mt-1">
                      {format.description}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      {format.extension}
                    </Text>
                  </View>
                  <Download size={20} color="#6B7280" />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Info Box */}
        <Animated.View entering={FadeInDown.delay(350)} className="bg-indigo-500/10 rounded-xl p-4 mt-4">
          <Text className="text-indigo-300 text-sm leading-5">
            Exported data includes all asset details, purchase prices, current values, and transaction history.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
