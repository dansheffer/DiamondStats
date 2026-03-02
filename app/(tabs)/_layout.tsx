import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { theme, METS_ORANGE } from '../src/theme/colors';

/* ── Icon config ─────────────────────────────────────────────────── */

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface TabMeta {
  filled: IoniconsName;
  outline: IoniconsName;
}

const TAB_ICONS: Record<string, TabMeta> = {
  index:     { filled: 'baseball',          outline: 'baseball-outline' },
  standings: { filled: 'stats-chart',       outline: 'stats-chart-outline' },
  myteam:    { filled: 'shield',            outline: 'shield-outline' },
  search:    { filled: 'search',            outline: 'search-outline' },
};

/* ── Frosted glass tab bar background ────────────────────────────── */

function GlassTabBarBackground() {
  return (
    <BlurView
      intensity={80}
      tint="systemChromeMaterial"
      style={StyleSheet.absoluteFill}
    />
  );
}

/* ── Active glow dot under the icon ──────────────────────────────── */

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const meta = TAB_ICONS[name] ?? TAB_ICONS.index;
  const iconName = focused ? meta.filled : meta.outline;
  const color = focused ? METS_ORANGE : '#8e8e93';

  return (
    <View style={styles.iconWrap}>
      <Ionicons name={iconName} size={24} color={color} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

/* ── Layout ──────────────────────────────────────────────────────── */

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '800', letterSpacing: 0.3 },
        tabBarActiveTintColor: METS_ORANGE,
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255,255,255,0.92)',
          height: 88,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarBackground: Platform.OS === 'ios' ? GlassTabBarBackground : undefined,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Diamond Stats',
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: 'Standings',
          tabBarIcon: ({ focused }) => <TabIcon name="standings" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="myteam"
        options={{
          title: 'My Team',
          tabBarIcon: ({ focused }) => <TabIcon name="myteam" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

/* ── Styles ──────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: METS_ORANGE,
    marginTop: 2,
    shadowColor: METS_ORANGE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 3,
  },
});
