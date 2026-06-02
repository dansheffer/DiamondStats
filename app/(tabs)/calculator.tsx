import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { theme } from '../src/theme/colors';

/**
 * Player Value Calculator
 *
 * Unique sabermetric tool: enter a player's projected WAR, current annual
 * salary (in $M), and the league $/WAR rate, and get an instant verdict on
 * whether the contract is a surplus, fair, or overpay.
 *
 * Rate presets reflect commonly cited public estimates of the open-market
 * cost of one win above replacement.
 */

const RATE_PRESETS: { label: string; value: number }[] = [
  { label: 'Conservative', value: 7 },
  { label: 'Standard', value: 9 },
  { label: 'Premium', value: 11 },
];

function fmtMoney(m: number): string {
  if (Math.abs(m) >= 1000) return `$${(m / 1000).toFixed(2)}B`;
  return `$${m.toFixed(1)}M`;
}

export default function CalculatorScreen() {
  const [warStr, setWarStr] = useState('5.0');
  const [salaryStr, setSalaryStr] = useState('25');
  const [rate, setRate] = useState(9);

  const war = parseFloat(warStr) || 0;
  const salary = parseFloat(salaryStr) || 0;

  const result = useMemo(() => {
    const marketValue = war * rate; // in $M
    const surplus = marketValue - salary;
    const pct = salary > 0 ? (surplus / salary) * 100 : 0;
    let verdict: 'Bargain' | 'Fair Value' | 'Overpay';
    let color: string;
    if (pct >= 25) {
      verdict = 'Bargain';
      color = '#34c759';
    } else if (pct <= -25) {
      verdict = 'Overpay';
      color = '#ff3b30';
    } else {
      verdict = 'Fair Value';
      color = '#f59e0b';
    }
    return { marketValue, surplus, pct, verdict, color };
  }, [war, salary, rate]);

  const onPickRate = (v: number) => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    setRate(v);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Value Calculator',
          headerLargeTitle: true,
          headerTransparent: Platform.OS === 'ios',
          headerBlurEffect: 'systemChromeMaterial',
          headerLargeStyle: { backgroundColor: '#f2f2f7' },
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={120}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ backgroundColor: '#f2f2f7' }}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            {Platform.OS === 'ios' && (
              <SymbolView
                name="dollarsign.circle.fill"
                tintColor={theme.primary}
                size={36}
              />
            )}
            <Text style={styles.introTitle}>Is this contract worth it?</Text>
            <Text style={styles.introSub}>
              Enter a player&apos;s projected WAR and salary. We&apos;ll compute
              their open-market value and surplus.
            </Text>
          </View>

          <Text style={styles.section}>INPUTS</Text>
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Projected WAR</Text>
              <TextInput
                value={warStr}
                onChangeText={setWarStr}
                keyboardType="decimal-pad"
                style={styles.input}
                returnKeyType="done"
                accessibilityLabel="Projected WAR"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Annual Salary ($M)</Text>
              <TextInput
                value={salaryStr}
                onChangeText={setSalaryStr}
                keyboardType="decimal-pad"
                style={styles.input}
                returnKeyType="done"
                accessibilityLabel="Annual Salary in millions"
              />
            </View>
          </View>

          <Text style={styles.section}>$ / WAR RATE</Text>
          <View style={styles.segmentWrap}>
            {RATE_PRESETS.map((p) => (
              <Pressable
                key={p.value}
                onPress={() => onPickRate(p.value)}
                style={[
                  styles.segment,
                  rate === p.value && styles.segmentActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${p.label} rate, $${p.value} million per WAR`}
              >
                <Text
                  style={[
                    styles.segmentTop,
                    rate === p.value && styles.segmentTopActive,
                  ]}
                >
                  ${p.value}M
                </Text>
                <Text
                  style={[
                    styles.segmentBot,
                    rate === p.value && styles.segmentBotActive,
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.section}>VERDICT</Text>
          <View style={styles.resultCard}>
            <View
              style={[styles.verdictPill, { backgroundColor: result.color }]}
            >
              <Text style={styles.verdictText}>{result.verdict}</Text>
            </View>

            <View style={styles.bigRow}>
              <Text style={styles.bigLabel}>Market Value</Text>
              <Text style={styles.bigValue}>{fmtMoney(result.marketValue)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.bigRow}>
              <Text style={styles.bigLabel}>Salary</Text>
              <Text style={styles.bigValue}>{fmtMoney(salary)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.bigRow}>
              <Text style={styles.bigLabel}>Surplus / Deficit</Text>
              <Text style={[styles.bigValue, { color: result.color }]}>
                {result.surplus >= 0 ? '+' : ''}
                {fmtMoney(result.surplus)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.bigRow}>
              <Text style={styles.bigLabel}>Delta vs. Salary</Text>
              <Text style={[styles.bigValue, { color: result.color }]}>
                {result.pct >= 0 ? '+' : ''}
                {result.pct.toFixed(0)}%
              </Text>
            </View>
          </View>

          <Text style={styles.footnote}>
            Open-market value uses the rate above × projected WAR. Estimates
            only — not investment advice. Bargain ≥ +25%, Overpay ≤ −25%.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 160 },
  intro: { alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 8 },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.primary,
    textAlign: 'center',
  },
  introSub: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8e8e93',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  inputLabel: { fontSize: 15, color: theme.text, fontWeight: '500' },
  input: {
    minWidth: 90,
    fontSize: 17,
    fontWeight: '700',
    color: theme.primary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f2f2f7',
    borderRadius: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d1d6',
  },
  segmentWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentActive: {
    borderColor: theme.primary,
    backgroundColor: '#eef2ff',
  },
  segmentTop: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    fontVariant: ['tabular-nums'],
  },
  segmentTopActive: { color: theme.primary },
  segmentBot: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  segmentBotActive: { color: theme.primary, fontWeight: '600' },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  verdictPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginVertical: 10,
  },
  verdictText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  bigLabel: { fontSize: 15, color: theme.text, fontWeight: '500' },
  bigValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.primary,
    fontVariant: ['tabular-nums'],
  },
  footnote: {
    marginTop: 14,
    fontSize: 11,
    color: '#8e8e93',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 16,
  },
});
