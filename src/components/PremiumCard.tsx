import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { shadows, radii, theme } from '../theme/colors';

interface PremiumCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'elevated' | 'accent' | 'glass';
}

export default function PremiumCard({
  children,
  style,
  variant = 'default',
}: PremiumCardProps) {
  // Glass variant — frosted blur on iOS, translucent fallback on Android
  if (variant === 'glass') {
    return (
      <View style={[styles.base, styles.glass, style]}>
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={50}
            tint="systemThinMaterial"
            style={StyleSheet.absoluteFill}
          />
        )}
        {children}
      </View>
    );
  }

  const variantStyle =
    variant === 'elevated'
      ? styles.elevated
      : variant === 'accent'
        ? styles.accent
        : styles.default;

  return (
    <View style={[styles.base, variantStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    padding: 16,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  elevated: {
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.md,
  },
  accent: {
    backgroundColor: theme.navyGlass,
    borderWidth: 1,
    borderColor: theme.navyGlassBorder,
    ...shadows.lg,
  },
  glass: {
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
});
