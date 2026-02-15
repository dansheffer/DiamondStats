import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import PlayerAvatar from '../src/components/PlayerAvatar';
import { fetchPlayerCardData, type PlayerCardData } from '../src/api/mlb';
import { theme } from '../src/theme/colors';

const HITTING_STAT_KEYS: Array<{ key: string; label: string }> = [
  { key: 'gamesPlayed', label: 'Games' },
  { key: 'homeRuns', label: 'HR' },
  { key: 'rbi', label: 'RBI' },
  { key: 'avg', label: 'AVG' },
  { key: 'ops', label: 'OPS' },
];

const PITCHING_STAT_KEYS: Array<{ key: string; label: string }> = [
  { key: 'gamesPlayed', label: 'Games' },
  { key: 'era', label: 'ERA' },
  { key: 'strikeOuts', label: 'SO' },
  { key: 'wins', label: 'Wins' },
  { key: 'losses', label: 'Losses' },
  { key: 'whip', label: 'WHIP' },
];

const HITTING_YEAR_SUMMARY_KEYS: Array<{ key: string; label: string }> = [
  { key: 'homeRuns', label: 'HR' },
  { key: 'rbi', label: 'RBI' },
  { key: 'avg', label: 'AVG' },
  { key: 'ops', label: 'OPS' },
];

const PITCHING_YEAR_SUMMARY_KEYS: Array<{ key: string; label: string }> = [
  { key: 'wins', label: 'W' },
  { key: 'losses', label: 'L' },
  { key: 'era', label: 'ERA' },
  { key: 'whip', label: 'WHIP' },
];

export default function PlayerCardScreen() {
  const { playerId, name, team, position } = useLocalSearchParams<{
    playerId: string;
    name?: string;
    team?: string;
    position?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<PlayerCardData | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPlayer = async () => {
      if (!playerId) {
        setError('Missing player id.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchPlayerCardData(Number(playerId));
        if (mounted) {
          setPlayerData(data);
        }
      } catch (_error) {
        if (mounted) {
          setError('Could not load player stats right now.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadPlayer();

    return () => {
      mounted = false;
    };
  }, [playerId]);

  const resolvedName = playerData?.fullName ?? (typeof name === 'string' ? name : 'Player');
  const resolvedTeam = playerData?.teamName ?? (typeof team === 'string' ? team : 'N/A');
  const resolvedPosition =
    playerData?.position ?? (typeof position === 'string' ? position : 'N/A');
  const isPitcher = ['P', 'SP', 'RP', 'CP', 'TWP'].includes(String(resolvedPosition).toUpperCase());
  const statKeys = isPitcher ? PITCHING_STAT_KEYS : HITTING_STAT_KEYS;

  const seasonRows = useMemo(() => buildRows(playerData?.seasonStats ?? {}, statKeys), [
    playerData?.seasonStats,
    statKeys,
  ]);
  const careerRows = useMemo(() => buildRows(playerData?.careerStats ?? {}, statKeys), [
    playerData?.careerStats,
    statKeys,
  ]);
  const currentYear = new Date().getFullYear();
  const yearByYear = isPitcher
    ? (playerData?.yearByYearPitching ?? [])
    : (playerData?.yearByYearHitting ?? []);
  const yearSummaryKeys = isPitcher ? PITCHING_YEAR_SUMMARY_KEYS : HITTING_YEAR_SUMMARY_KEYS;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.cardFrame}>
        <View style={styles.cardRibbon}>
          <Text style={styles.cardRibbonText}>DIAMOND STATS PLAYER CARD</Text>
        </View>

        <View style={styles.card}>
        <View style={styles.headerRow}>
          <PlayerAvatar mlbId={Number(playerId)} size={78} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.playerName}>{resolvedName}</Text>
            <Text style={styles.playerMeta}>
              {resolvedPosition} • {resolvedTeam}
            </Text>
          </View>
        </View>

        {loading ? <ActivityIndicator color={theme.primary} style={styles.loader} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && !error ? (
          <>
            <Section title={`Season Stats • ${currentYear}`}>
              {seasonRows.length > 0 ? (
                seasonRows.map((row) => (
                  <StatRow key={`season-${row.label}`} label={row.label} value={row.value} />
                ))
              ) : (
                <Text style={styles.emptyText}>Season has not started yet.</Text>
              )}
            </Section>

            <Section title="Career Stats">
              {careerRows.length > 0 ? (
                careerRows.map((row) => (
                  <StatRow key={`career-${row.label}`} label={row.label} value={row.value} />
                ))
              ) : (
                <Text style={styles.emptyText}>Career data currently unavailable.</Text>
              )}
            </Section>

            <Section title="Career Snapshot • Last 10 Seasons">
              {yearByYear.length > 0 ? (
                yearByYear.map((line) => (
                  <View key={`${line.season}-${line.teamName}`} style={styles.yearRow}>
                    <View style={styles.yearHeaderRow}>
                      <Text style={styles.yearSeason}>{line.season}</Text>
                      <Text style={styles.yearTeam}>{line.teamName}</Text>
                    </View>
                    <View style={styles.yearStatsRow}>
                      {yearSummaryKeys.map((key) => (
                        <Text key={`${line.season}-${key.key}`} style={styles.yearStatText}>
                          {key.label}:{' '}
                          <Text style={styles.yearStatValue}>
                            {formatStatValue(line.stats[key.key])}
                          </Text>
                        </Text>
                      ))}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Not enough historical MLB data available.</Text>
              )}
            </Section>

            <Section title="WAR Stats">
              <StatRow
                label="Season WAR"
                value={
                  playerData?.seasonWar !== null && playerData?.seasonWar !== undefined
                    ? playerData.seasonWar.toFixed(1)
                    : 'N/A'
                }
              />
              <StatRow
                label="Career WAR"
                value={
                  playerData?.careerWar !== null && playerData?.careerWar !== undefined
                    ? playerData.careerWar.toFixed(1)
                    : 'N/A'
                }
              />
              <Text style={styles.warNote}>WAR availability depends on MLB Stats API feed.</Text>
            </Section>
          </>
        ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function buildRows(
  stats: Record<string, string | number>,
  keys: Array<{ key: string; label: string }>,
): Array<{ label: string; value: string | number }> {
  const rows: Array<{ label: string; value: string | number }> = [];

  keys.forEach((item) => {
    const value = stats[item.key];
    if (typeof value === 'string' || typeof value === 'number') {
      rows.push({ label: item.label, value });
    }
  });

  return rows;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{String(value)}</Text>
    </View>
  );
}

function formatStatValue(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') {
    return '—';
  }
  return String(value);
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.background,
    padding: 14,
  },
  cardFrame: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.primary,
    backgroundColor: '#f5f9ff',
    padding: 6,
    gap: 6,
  },
  cardRibbon: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardRibbonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  playerName: {
    color: theme.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  playerMeta: {
    color: theme.mutedText,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  loader: {
    marginVertical: 8,
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  section: {
    borderWidth: 1,
    borderColor: '#dbe7f8',
    borderRadius: 10,
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: theme.primary,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  yearRow: {
    borderWidth: 1,
    borderColor: '#e5edf9',
    borderRadius: 8,
    padding: 8,
    gap: 5,
    backgroundColor: '#fbfdff',
  },
  yearHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yearSeason: {
    color: theme.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  yearTeam: {
    color: theme.mutedText,
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
    textAlign: 'right',
  },
  yearStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearStatText: {
    color: theme.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  yearStatValue: {
    color: theme.text,
    fontWeight: '800',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: theme.text,
    fontWeight: '600',
  },
  statValue: {
    color: theme.accent,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.mutedText,
    fontStyle: 'italic',
  },
  warNote: {
    color: theme.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
});
