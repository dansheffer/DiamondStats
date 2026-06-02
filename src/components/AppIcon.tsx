import React from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = keyof typeof Ionicons.glyphMap;

/**
 * Centralized icon mapping — replaces all emoji with Ionicons.
 * Maps semantic names to Ionicons glyph names.
 */
const ICON_MAP: Record<string, IoniconsName> = {
  // Navigation
  home: 'home',
  'home-outline': 'home-outline',
  standings: 'stats-chart',
  'standings-outline': 'stats-chart-outline',
  team: 'shield',
  'team-outline': 'shield-outline',
  search: 'search',
  'search-outline': 'search-outline',

  // Content
  fire: 'flame',
  'fire-outline': 'flame-outline',
  news: 'newspaper',
  'news-outline': 'newspaper-outline',
  baseball: 'baseball',
  'baseball-outline': 'baseball-outline',
  trophy: 'trophy',
  'trophy-outline': 'trophy-outline',
  trending: 'trending-up',
  calendar: 'calendar',
  'calendar-outline': 'calendar-outline',
  time: 'time',
  'time-outline': 'time-outline',
  person: 'person',
  'person-outline': 'person-outline',
  lightning: 'flash',
  'lightning-outline': 'flash-outline',
  bulb: 'bulb',
  'bulb-outline': 'bulb-outline',
  palm: 'leaf',
  chevron: 'chevron-forward',
  arrow: 'arrow-forward',
  stats: 'analytics',
  'stats-outline': 'analytics-outline',
  chart: 'bar-chart',
  'chart-outline': 'bar-chart-outline',
  swap: 'swap-horizontal',
  alert: 'alert-circle',
  checkmark: 'checkmark-circle',
};

interface AppIconProps {
  name: string;
  size?: number;
  color?: string;
}

export default function AppIcon({ name, size = 20, color = '#7C8698' }: AppIconProps) {
  const iconName = ICON_MAP[name] ?? ('baseball' as IoniconsName);
  return <Ionicons name={iconName} size={size} color={color} />;
}

export { ICON_MAP };
