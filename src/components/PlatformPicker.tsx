import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { POPULAR_BROKERS } from '@/lib/types';
import * as Haptics from 'expo-haptics';

interface PlatformPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  customValue?: string;
  onCustomValueChange?: (value: string) => void;
}

export function PlatformPicker({
  value,
  onValueChange,
  customValue = '',
  onCustomValueChange,
}: PlatformPickerProps) {
  const [showPicker, setShowPicker] = React.useState(false);

  return (
    <View>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setShowPicker(!showPicker);
        }}
        style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: value ? 'white' : '#6B7280', fontSize: 16 }}>
          {value || 'Select a broker...'}
        </Text>
        <ChevronDown size={20} color="#9CA3AF" />
      </Pressable>

      {showPicker && (
        <Animated.View entering={FadeIn} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginTop: 8, overflow: 'hidden', maxHeight: 300 }}>
          <ScrollView style={{ maxHeight: 300 }}>
            {POPULAR_BROKERS.map((broker) => (
              <Pressable
                key={broker}
                onPress={() => {
                  onValueChange(broker);
                  setShowPicker(false);
                  Haptics.selectionAsync();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255,255,255,0.05)',
                  backgroundColor: value === broker ? 'rgba(99,102,241,0.2)' : 'transparent',
                }}
              >
                <Text style={{ color: 'white', flex: 1, fontSize: 16 }}>{broker}</Text>
                {value === broker && <Check size={16} color="#6366F1" />}
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {value === 'Other' && (
        <Animated.View entering={FadeIn} style={{ marginTop: 8 }}>
          <TextInput
            value={customValue}
            onChangeText={onCustomValueChange}
            placeholder="Enter custom platform name"
            placeholderTextColor="#6B7280"
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 16,
              color: 'white',
              fontSize: 16,
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}
