import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$', flag: '🇨🇦' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
];

export default function CurrencySelectorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCurrency, setSelectedCurrency] = React.useState('USD');

  const handleSelect = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCurrency(code);
    // TODO: Save to store
    setTimeout(() => {
      router.back();
    }, 300);
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
          <Text className="text-white text-xl font-bold">Display Currency</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-gray-400 text-sm mb-4">
          Select the currency for displaying values throughout the app
        </Text>

        {CURRENCIES.map((currency, index) => (
          <Animated.View key={currency.code} entering={FadeInDown.delay(index * 30)}>
            <Pressable
              onPress={() => handleSelect(currency.code)}
              className="bg-white/5 rounded-xl p-4 mb-3 flex-row items-center"
            >
              <Text className="text-3xl mr-3">{currency.flag}</Text>
              <View className="flex-1">
                <Text className="text-white font-semibold">{currency.name}</Text>
                <Text className="text-gray-400 text-sm mt-0.5">
                  {currency.code} ({currency.symbol})
                </Text>
              </View>
              {selectedCurrency === currency.code && (
                <View className="w-8 h-8 bg-indigo-600 rounded-full items-center justify-center">
                  <Check size={18} color="white" />
                </View>
              )}
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}
