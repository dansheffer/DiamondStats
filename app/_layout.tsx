import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../shared/theme/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerTintColor: theme.primary,
          headerTitleStyle: { fontWeight: '700' },
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="player/[id]"
          options={{
            title: 'Player',
            headerTransparent: Platform.OS === 'ios',
            headerBlurEffect: 'systemChromeMaterial',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
