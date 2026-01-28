import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Sun, Moon, Smartphone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Burnt from 'burnt';
import { useTheme, type ThemeMode } from '@/lib/theme-store';

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
  },
  {
    id: 'system',
    name: 'System',
    description: 'Follow device settings',
    icon: Smartphone,
    color: '#6366F1',
  },
] as const;

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode, setMode, theme, isDark } = useTheme();

  const handleSelect = (id: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(id);
    Burnt.toast({
      title: 'Appearance updated',
      message: `Theme set to ${id === 'dark' ? 'Dark' : id === 'light' ? 'Light' : 'System'}.`,
      preset: 'none',
      haptic: 'none',
      from: 'top',
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="px-5 pb-4"
      >
        <View
          className="flex-row items-center"
          style={{ borderBottomColor: theme.border, borderBottomWidth: 1 }}
        >
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.surfaceHover }}
          >
            <ArrowLeft size={20} color={theme.text} />
          </Pressable>
          <Text style={{ color: theme.text }} className="text-xl font-bold">
            Appearance
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: theme.textSecondary }} className="text-sm mb-4">
          Choose your preferred theme
        </Text>

        {THEME_OPTIONS.map((option, index) => {
          const Icon = option.icon;
          return (
            <Animated.View key={option.id} entering={FadeInDown.delay(index * 50)}>
              <Pressable
                onPress={() => handleSelect(option.id)}
                className="rounded-2xl p-4 mb-3 overflow-hidden"
                style={{
                  backgroundColor: isDark ? theme.surface : theme.backgroundSecondary,
                  borderWidth: 1,
                  borderColor: theme.borderLight,
                }}
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
                      <Text style={{ color: theme.text }} className="font-semibold">
                        {option.name}
                      </Text>
                    </View>
                    <Text style={{ color: theme.textSecondary }} className="text-sm mt-1">
                      {option.description}
                    </Text>
                  </View>
                  {mode === option.id && (
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center ml-2"
                      style={{ backgroundColor: theme.primary }}
                    >
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
