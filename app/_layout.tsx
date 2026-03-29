import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { theme } from '../src/theme/colors';

function GlassHeaderBackground() {
  return (
    <BlurView
      intensity={90}
      tint="systemChromeMaterialDark"
      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 42, 102, 0.72)' }]}
    />
  );
}

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.primary },
        headerBackground: Platform.OS === 'ios' ? GlassHeaderBackground : undefined,
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="player/[playerId]" options={{ title: 'Player Card', headerBackTitle: 'Back' }} />
      <Stack.Screen name="game/[gamePk]" options={{ title: 'Box Score', headerBackTitle: 'Back' }} />
      <Stack.Screen name="support" options={{ title: 'Support', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
