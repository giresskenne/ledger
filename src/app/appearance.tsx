import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Sun, Moon, Smartphone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

const THEME_OPTIONS = [
  {
    id: 'dark',
    name: 'Dark',
    description: 'Dark theme for comfortable viewing',
    icon: Moon,
    color: '#8B5CF6',
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Light theme for daytime use',
    icon: Sun,
    color: '#F59E0B',
    comingSoon: true,
  },
  {
    id: 'system',
    name: 'System',
    description: 'Follow device settings',
    icon: Smartphone,
    color: '#6366F1',
    comingSoon: true,
  },
];

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = React.useState('dark');

  const handleSelect = (id: string, comingSoon?: boolean) => {
    if (comingSoon) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTheme(id);
    // TODO: Save to theme store
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
          <Text className="text-white text-xl font-bold">Appearance</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-gray-400 text-sm mb-4">
          Choose your preferred theme
        </Text>

        {THEME_OPTIONS.map((option, index) => {
          const Icon = option.icon;
          return (
            <Animated.View key={option.id} entering={FadeInDown.delay(index * 50)}>
              <Pressable
                onPress={() => handleSelect(option.id, option.comingSoon)}
                className="bg-white/5 rounded-2xl p-4 mb-3 overflow-hidden"
              >
                <View className="flex-row items-center">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${option.color}20` }}
                  >
                    <Icon size={24} color={option.color} />
                  </View>
                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center">
                      <Text className="text-white font-semibold">{option.name}</Text>
                      {option.comingSoon && (
                        <View className="bg-amber-500/20 px-2 py-0.5 rounded ml-2">
                          <Text className="text-amber-500 text-[10px] font-medium">
                            Coming Soon
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-400 text-sm mt-1">
                      {option.description}
                    </Text>
                  </View>
                  {selectedTheme === option.id && !option.comingSoon && (
                    <View className="w-8 h-8 bg-indigo-600 rounded-full items-center justify-center ml-2">
                      <Check size={18} color="white" />
                    </View>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}
