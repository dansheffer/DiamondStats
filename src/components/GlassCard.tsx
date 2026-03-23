import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { radii, shadows, theme } from '../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** light = translucent white, dark = frosted navy */
  variant?: 'light' | 'dark';
  /** blur intensity (iOS only) — 0 disables blur */
  intensity?: number;
  noPadding?: boolean;
}

/**
 * A card surface with an Apple-style liquid glass aesthetic.
 *
 * On iOS it uses BlurView for a true frosted-glass backdrop;
 * on Android it falls back to a semi-transparent surface color.
 */
export default function GlassCard({
  children,
  style,
  variant = 'light',
  intensity = 60,
  noPadding = false,
}: GlassCardProps) {
  const isLight = variant === 'light';

  const wrapStyle: ViewStyle[] = [
    styles.wrap,
    isLight ? styles.wrapLight : styles.wrapDark,
    noPadding ? undefined : styles.padding,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ].filter(Boolean) as ViewStyle[];

  if (Platform.OS === 'ios' && intensity > 0) {
    return (
      <View style={wrapStyle}>
        <BlurView
          intensity={intensity}
          tint={isLight ? 'systemThinMaterial' : 'systemChromeMaterialDark'}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  // Android / no-blur fallback
  return (
    <View
      style={[
        wrapStyle,
        {
          backgroundColor: isLight
            ? theme.surfaceElevated
            : theme.navyGlass,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.glass,
  },
  wrapLight: {
    borderWidth: 1,
    borderColor: theme.glassBorder,
    backgroundColor: theme.glass,
  },
  wrapDark: {
    borderWidth: 1,
    borderColor: theme.navyGlassBorder,
    backgroundColor: theme.navyGlass,
  },
  padding: {
    padding: 16,
  },
});
