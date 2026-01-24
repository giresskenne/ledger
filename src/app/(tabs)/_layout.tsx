import React from 'react';
import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Wallet, PieChart, MoreHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0F',
          borderTopColor: 'rgba(255,255,255,0.1)',
          borderTopWidth: 1,
          height: 85,
          paddingTop: 10,
          paddingBottom: 25,
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <LayoutDashboard size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="holdings"
        options={{
          title: 'Holdings',
          tabBarIcon: ({ color, focused }) => (
            <Wallet size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: 'Analysis',
          tabBarIcon: ({ color, focused }) => (
            <PieChart size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <MoreHorizontal size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      {/* Hidden screens - accessible via More menu */}
      <Tabs.Screen
        name="events"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
