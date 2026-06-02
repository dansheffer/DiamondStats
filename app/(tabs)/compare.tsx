import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { PLAYERS, Player } from '../src/data/players';
import { theme } from '../src/theme/colors';
import PlayerAvatar from '../src/components/PlayerAvatar';

export default function CompareScreen() {
  const [leftId, setLeftId] = useState<string>(PLAYERS[0].id);
  const [rightId, setRightId] = useState<string>(PLAYERS[1].id);
  const [selecting, setSelecting] = useState<'left' | 'right' | null>(null);

  const left = useMemo(() => PLAYERS.find((p) => p.id === leftId)!, [leftId]);
  const right = useMemo(() => PLAYERS.find((p) => p.id === rightId)!, [rightId]);

  const pick = (id: string) => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    if (selecting === 'left') setLeftId(id);
    else if (selecting === 'right') setRightId(id);
    setSelecting(null);
  };

  const renderStat = (label: string, a: number, b: number, decimals = 1) => {
    const aWins = a > b;
    const bWins = b > a;
    return (
      <View style={styles.statRow}>
        <View style={styles.statSide}>
          {aWins && Platform.OS === 'ios' && (
            <SymbolView name="checkmark.seal.fill" tintColor="#34c759" size={16} />
          )}
          <Text style={[styles.statValue, aWins && styles.statWinner]}>
            {a.toFixed(decimals)}
          </Text>
        </View>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={[styles.statSide, styles.statSideRight]}>
          <Text style={[styles.statValue, bWins && styles.statWinner]}>
            {b.toFixed(decimals)}
          </Text>
          {bWins && Platform.OS === 'ios' && (
            <SymbolView name="checkmark.seal.fill" tintColor="#34c759" size={16} />
          )}
        </View>
      </View>
    );
  };

  if (selecting) {
    return (
      <>
        <Stack.Screen
          options={{
            title: `Pick ${selecting === 'left' ? 'first' : 'second'} player`,
            headerLargeTitle: true,
            headerTransparent: Platform.OS === 'ios',
            headerBlurEffect: 'systemChromeMaterial',
            headerLargeStyle: { backgroundColor: '#f2f2f7' },
          }}
        />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ backgroundColor: '#f2f2f7' }}
          contentContainerStyle={styles.pickerList}
        >
          {PLAYERS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => pick(p.id)}
              style={({ pressed }) => [styles.pickRow, pressed && { opacity: 0.6 }]}
            >
              <PlayerAvatar mlbId={p.mlbId} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pickName}>{p.name}</Text>
                <Text style={styles.pickMeta}>
                  {p.position} • {p.team}
                </Text>
              </View>
              {Platform.OS === 'ios' && (
                <SymbolView name="chevron.right" tintColor="#c7c7cc" size={14} />
              )}
            </Pressable>
          ))}
          <Pressable
            onPress={() => setSelecting(null)}
            style={[styles.pickRow, { justifyContent: 'center' }]}
          >
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </>
    );
  }

  const PlayerHeader = ({ p, side }: { p: Player; side: 'left' | 'right' }) => (
    <Pressable
      onPress={() => setSelecting(side)}
      style={({ pressed }) => [styles.head, pressed && { opacity: 0.6 }]}
    >
      <PlayerAvatar mlbId={p.mlbId} size={64} />
      <Text style={styles.headName} numberOfLines={1}>
        {p.name}
      </Text>
      <Text style={styles.headMeta} numberOfLines={1}>
        {p.position} • {p.team}
      </Text>
      <View style={styles.changePill}>
        {Platform.OS === 'ios' && (
          <SymbolView name="arrow.triangle.2.circlepath" tintColor={theme.primary} size={12} />
        )}
        <Text style={styles.changeText}>Change</Text>
      </View>
    </Pressable>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Compare',
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
        <View style={styles.explainer}>
          <Text style={styles.explainerTitle}>Stack two players</Text>
          <Text style={styles.explainerSub}>
            Tap a card to swap. The leader on each metric earns a check.
          </Text>
        </View>

        <View style={styles.heads}>
          <PlayerHeader p={left} side="left" />
          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <PlayerHeader p={right} side="right" />
        </View>

        <View style={styles.statsCard}>
          {renderStat('Career WAR', left.careerWAR, right.careerWAR)}
          {renderStat('Season WAR', left.seasonWAR, right.seasonWAR)}
          {renderStat('Games Played', left.gamesPlayed, right.gamesPlayed, 0)}
        </View>

        <Text style={styles.footnote}>
          Stats are illustrative season snapshots from this build.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120 },
  explainer: { paddingHorizontal: 4, paddingBottom: 14 },
  explainerTitle: { fontSize: 18, fontWeight: '800', color: theme.primary },
  explainerSub: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  heads: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  head: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  headMeta: { fontSize: 12, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  changePill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  changeText: { fontSize: 11, fontWeight: '600', color: theme.primary },
  vsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  statsCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  statLabel: { flex: 1, textAlign: 'center', fontSize: 13, color: '#6b7280', fontWeight: '600' },
  statSide: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 80, justifyContent: 'flex-start' },
  statSideRight: { justifyContent: 'flex-end' },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.text, fontVariant: ['tabular-nums'] },
  statWinner: { color: '#34c759' },
  footnote: { marginTop: 16, fontSize: 12, color: '#6b7280', textAlign: 'center' },
  pickerList: { padding: 16, paddingBottom: 120, gap: 8 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
  },
  pickName: { fontSize: 15, fontWeight: '700', color: theme.primary },
  pickMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
