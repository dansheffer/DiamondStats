import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import {
  getStandings,
  getTodaysGames,
  DivisionStandings,
  ScheduleGame,
} from '../../shared/api/mlb';
import { theme } from '../../shared/theme/colors';

type Mode = 'standings' | 'games';

export default function LiveScreen() {
  const [mode, setMode] = useState<Mode>('standings');
  const [standings, setStandings] = useState<DivisionStandings[]>([]);
  const [games, setGames] = useState<ScheduleGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, g] = await Promise.all([getStandings(), getTodaysGames()]);
      setStandings(s);
      setGames(g);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load live data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    if (Platform.OS === 'ios')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRefreshing(true);
    load();
  }, [load]);

  const switchMode = (m: Mode) => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    setMode(m);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Live',
          headerLargeTitle: true,
          headerTransparent: Platform.OS === 'ios',
          headerBlurEffect: 'systemChromeMaterial',
          headerLargeStyle: { backgroundColor: '#f2f2f7' },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.segmentWrap}>
          {(['standings', 'games'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => switchMode(m)}
              style={[styles.segment, mode === m && styles.segmentActive]}
            >
              <Text
                style={[styles.segmentText, mode === m && styles.segmentTextActive]}
              >
                {m === 'standings' ? 'Standings' : "Today's Games"}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading && !refreshing && (
          <View style={styles.loadBox}>
            <ActivityIndicator />
            <Text style={styles.loadHint}>Loading live data…</Text>
          </View>
        )}

        {error && (
          <View style={styles.loadBox}>
            <Text style={styles.errorTitle}>Couldn&apos;t reach the stats service</Text>
            <Text style={styles.loadHint}>{error}</Text>
          </View>
        )}

        {!loading && !error && mode === 'standings' && (
          <StandingsView data={standings} />
        )}
        {!loading && !error && mode === 'games' && <GamesView data={games} />}
      </ScrollView>
    </>
  );
}

function StandingsView({ data }: { data: DivisionStandings[] }) {
  if (data.length === 0)
    return (
      <View style={styles.loadBox}>
        <Text style={styles.loadHint}>No standings available yet.</Text>
      </View>
    );
  return (
    <View style={{ gap: 16, marginTop: 16 }}>
      {data.map((div) => (
        <View key={div.divisionName} style={styles.card}>
          <Text style={styles.cardTitle}>{div.divisionName}</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Team</Text>
            <Text style={styles.th}>W</Text>
            <Text style={styles.th}>L</Text>
            <Text style={styles.th}>PCT</Text>
            <Text style={styles.th}>GB</Text>
          </View>
          {div.teams.map((t) => (
            <View key={t.teamId} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>
                {t.teamName}
              </Text>
              <Text style={styles.td}>{t.wins}</Text>
              <Text style={styles.td}>{t.losses}</Text>
              <Text style={styles.td}>{t.pct}</Text>
              <Text style={styles.td}>{t.gb}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function GamesView({ data }: { data: ScheduleGame[] }) {
  if (data.length === 0)
    return (
      <View style={styles.loadBox}>
        {Platform.OS === 'ios' && (
          <SymbolView name="calendar" tintColor="#8e8e93" size={32} />
        )}
        <Text style={styles.loadHint}>No games scheduled today.</Text>
      </View>
    );
  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      {data.map((g) => {
        const live = g.status === 'Live';
        const final = g.status === 'Final';
        return (
          <View key={g.gamePk} style={styles.gameCard}>
            <View style={styles.gameTeams}>
              <Text style={styles.teamName}>{g.awayTeam}</Text>
              <Text style={styles.teamScore}>
                {g.awayScore !== undefined ? g.awayScore : '—'}
              </Text>
            </View>
            <View style={styles.gameTeams}>
              <Text style={styles.teamName}>{g.homeTeam}</Text>
              <Text style={styles.teamScore}>
                {g.homeScore !== undefined ? g.homeScore : '—'}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                live && { backgroundColor: '#34c75922' },
                final && { backgroundColor: '#8e8e9322' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  live && { color: '#1d8c3a' },
                  final && { color: '#3a3a3c' },
                ]}
              >
                {live && g.inning ? g.inning : g.detailedStatus}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#f2f2f7' },
  content: { padding: 16, paddingBottom: 120 },
  segmentWrap: {
    marginTop: 8,
    flexDirection: 'row',
    backgroundColor: '#e9e9eb',
    borderRadius: 9,
    padding: 2,
  },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 7, alignItems: 'center' },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  segmentTextActive: { color: theme.primary },
  loadBox: { paddingVertical: 60, alignItems: 'center', gap: 8 },
  loadHint: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: theme.primary, marginBottom: 6 },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d1d6',
  },
  th: { flex: 1, fontSize: 11, fontWeight: '700', color: '#8e8e93', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 6 },
  td: { flex: 1, fontSize: 13, color: theme.text, fontVariant: ['tabular-nums'] },
  gameCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  gameTeams: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: { fontSize: 15, fontWeight: '600', color: theme.text },
  teamScore: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.primary,
    fontVariant: ['tabular-nums'],
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#002D7214',
  },
  statusText: { fontSize: 11, fontWeight: '700', color: theme.primary, letterSpacing: 0.4 },
});
