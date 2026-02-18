import { Stack } from 'expo-router';
import { theme } from './src/theme/colors';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="player/[playerId]" options={{ title: 'Player Card' }} />
      <Stack.Screen name="game/[gamePk]" options={{ title: 'Box Score' }} />
    </Stack>
  );
}
