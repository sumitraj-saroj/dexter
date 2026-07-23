import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { useAppDb } from '../_layout';
import { useTeamQuery } from '../../src/hooks/useTeamQuery';

export default function TabLayout() {
  const { colorScheme } = useAppTheme();
  const db = useAppDb();
  const { data: squadMembers = [] } = useTeamQuery(db);

  const squadBadgeText = `${squadMembers.length}/6`;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colorScheme.primary,
        tabBarInactiveTintColor: colorScheme.secondary,
        tabBarStyle: {
          backgroundColor: colorScheme.surface,
          borderTopColor: colorScheme.outline,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Squad',
          tabBarBadge: squadBadgeText,
          tabBarBadgeStyle: {
            backgroundColor: colorScheme.primary,
            color: colorScheme.onPrimary,
            fontSize: 10,
            fontWeight: '700',
            height: 16,
            minWidth: 26,
            borderRadius: 8,
            paddingHorizontal: 4,
            lineHeight: Platform.OS === 'ios' ? 15 : 16,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield' : 'shield-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: 'Compare',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name="sword-cross"
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: 'Quiz',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'game-controller' : 'game-controller-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
