import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { theme } from '../src/theme/colors';

const TAB_ICONS: Record<string, string> = {
  Scores: '⚾',
  Standings: '📊',
  'My Team': '⭐',
  Search: '🔍',
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>
      {TAB_ICONS[label] ?? '•'}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 58,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scores',
          headerTitle: 'Diamond Stats',
          tabBarIcon: ({ focused }) => <TabIcon label="Scores" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: 'Standings',
          tabBarIcon: ({ focused }) => <TabIcon label="Standings" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="myteam"
        options={{
          title: 'My Team',
          tabBarIcon: ({ focused }) => <TabIcon label="My Team" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <TabIcon label="Search" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
