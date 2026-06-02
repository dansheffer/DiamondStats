import React from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SymbolView, SFSymbol } from 'expo-symbols';
import Constants from 'expo-constants';
import { theme } from '../src/theme/colors';
import { PLAYERS } from '../src/data/players';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type RowProps = {
  symbol: SFSymbol;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  color?: string;
};

const Row = ({ symbol, title, subtitle, onPress, color = theme.primary }: RowProps) => (
  <Pressable
    onPress={() => {
      if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
      onPress?.();
    }}
    style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    accessibilityRole={onPress ? 'button' : undefined}
  >
    <View style={[styles.iconBox, { backgroundColor: color }]}>
      {Platform.OS === 'ios' && (
        <SymbolView name={symbol} tintColor="#fff" size={18} />
      )}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
    </View>
    {onPress && Platform.OS === 'ios' && (
      <SymbolView name="chevron.right" tintColor="#c7c7cc" size={14} />
    )}
  </Pressable>
);

export default function AboutScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'About',
          headerLargeTitle: true,
          headerTransparent: Platform.OS === 'ios',
          headerBlurEffect: 'systemChromeMaterial',
          headerLargeStyle: { backgroundColor: '#f2f2f7' },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: '#f2f2f7' }}
        contentContainerStyle={styles.container}
      >
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            {Platform.OS === 'ios' && (
              <SymbolView name="baseball.fill" tintColor="#fff" size={36} />
            )}
          </View>
          <Text style={styles.heroTitle}>Diamond Stats Pro</Text>
          <Text style={styles.heroSub}>
            The source for baseball stats. Live data, deep context, zero noise.
          </Text>
          <Text style={styles.heroByline}>by Backstreets Technology</Text>
        </View>

        <Text style={styles.section}>ABOUT</Text>
        <View style={styles.card}>
          <Row symbol="number.square" title="Version" subtitle={APP_VERSION} />
          <View style={styles.divider} />
          <Row
            symbol="person.2.fill"
            title="Roster Size"
            subtitle={`${PLAYERS.length} players bundled offline`}
          />
        </View>

        <Text style={styles.section}>SUPPORT</Text>
        <View style={styles.card}>
          <Row
            symbol="envelope.fill"
            title="Contact Support"
            subtitle="support@backstreetstechnology.com"
            color={theme.primary}
            onPress={() => Linking.openURL('mailto:support@backstreetstechnology.com')}
          />
          <View style={styles.divider} />
          <Row
            symbol="lock.shield.fill"
            title="Privacy Policy"
            color="#34c759"
            onPress={() =>
              Linking.openURL('https://dsheffer.github.io/diamondstats/privacy.html')
            }
          />
          <View style={styles.divider} />
          <Row
            symbol="doc.text.fill"
            title="Terms of Use"
            color="#8e8e93"
            onPress={() =>
              Linking.openURL(
                'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
              )
            }
          />
        </View>

        <Text style={styles.section}>DATA</Text>
        <View style={styles.card}>
          <Row
            symbol="wifi.slash"
            title="Works Offline"
            subtitle="All player data is bundled with the app — no network required."
            color="#34c759"
          />
          <View style={styles.divider} />
          <Row
            symbol="hand.raised.fill"
            title="No Tracking"
            subtitle="No analytics, ads, or in-app purchases."
            color={theme.primary}
          />
        </View>

        <Text style={styles.footer}>
          © 2026 Backstreets Technology. Live stats via the public MLB Stats API.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#002D72',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#002D72',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  heroTitle: { marginTop: 12, fontSize: 24, fontWeight: '800', color: theme.primary },
  heroSub: { marginTop: 4, fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 24 },
  heroByline: { marginTop: 8, fontSize: 12, fontWeight: '600', color: theme.accent, letterSpacing: 0.5, textTransform: 'uppercase' },
  section: {
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  rowSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5ea',
    marginLeft: 56,
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 11,
    color: '#9ca3af',
  },
});
