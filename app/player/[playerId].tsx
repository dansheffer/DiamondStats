import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import PlayerAvatar from '../src/components/PlayerAvatar';
import { fetchPlayerCardData, type AdvancedSabermetrics, type PlayerCardData } from '../src/api/mlb';
import { theme } from '../src/theme/colors';
import { useResponsive } from '../src/utils/useResponsive';

const HITTING_STAT_KEYS: Array<{ key: string; label: string }> = [
  { key: 'gamesPlayed', label: 'Games' },
  { key: 'homeRuns', label: 'HR' },
  { key: 'rbi', label: 'RBI' },
  { key: 'avg', label: 'AVG' },
  { key: 'obp', label: 'OBP' },
  { key: 'slg', label: 'SLG' },
  { key: 'ops', label: 'OPS' },
  { key: 'stolenBases', label: 'SB' },
];

const PITCHING_STAT_KEYS: Array<{ key: string; label: string }> = [
  { key: 'gamesPlayed', label: 'Games' },
  { key: 'gamesStarted', label: 'GS' },
  { key: 'era', label: 'ERA' },
  { key: 'strikeOuts', label: 'SO' },
  { key: 'wins', label: 'Wins' },
  { key: 'losses', label: 'Losses' },
  { key: 'whip', label: 'WHIP' },
  { key: 'inningsPitched', label: 'IP' },
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
  const isTwoWay = playerData?.isTwoWay ?? (String(resolvedPosition).toUpperCase() === 'TWP');
  const isPitcher = ['P', 'SP', 'RP', 'CP'].includes(String(resolvedPosition).toUpperCase());
  const statKeys = (isPitcher && !isTwoWay) ? PITCHING_STAT_KEYS : HITTING_STAT_KEYS;

  const seasonRows = useMemo(() => buildRows(playerData?.seasonStats ?? {}, statKeys), [
    playerData?.seasonStats,
    statKeys,
  ]);
  const careerRows = useMemo(() => buildRows(playerData?.careerStats ?? {}, statKeys), [
    playerData?.careerStats,
    statKeys,
  ]);

  // Two-way player: show both sides
  const twoWaySeasonHitting = useMemo(
    () => (isTwoWay ? buildRows(playerData?.seasonHittingStats ?? {}, HITTING_STAT_KEYS) : []),
    [isTwoWay, playerData?.seasonHittingStats],
  );
  const twoWaySeasonPitching = useMemo(
    () => (isTwoWay ? buildRows(playerData?.seasonPitchingStats ?? {}, PITCHING_STAT_KEYS) : []),
    [isTwoWay, playerData?.seasonPitchingStats],
  );
  const twoWayCareerHitting = useMemo(
    () => (isTwoWay ? buildRows(playerData?.careerHittingStats ?? {}, HITTING_STAT_KEYS) : []),
    [isTwoWay, playerData?.careerHittingStats],
  );
  const twoWayCareerPitching = useMemo(
    () => (isTwoWay ? buildRows(playerData?.careerPitchingStats ?? {}, PITCHING_STAT_KEYS) : []),
    [isTwoWay, playerData?.careerPitchingStats],
  );

  const currentYear = new Date().getFullYear();
  const { isTablet, saberCols, maxContentWidth, outerPadding } = useResponsive();
  const yearByYearHitting = playerData?.yearByYearHitting ?? [];
  const yearByYearPitching = playerData?.yearByYearPitching ?? [];
  const yearByYear = isTwoWay
    ? yearByYearHitting
    : isPitcher
      ? yearByYearPitching
      : yearByYearHitting;
  const yearSummaryKeys = (isPitcher && !isTwoWay) ? PITCHING_YEAR_SUMMARY_KEYS : HITTING_YEAR_SUMMARY_KEYS;
  const seasonHasData = seasonRows.length > 0;

  return (
    <ScrollView contentContainerStyle={[styles.container, { padding: outerPadding, alignItems: isTablet ? 'center' : undefined }]}>
      <View style={[styles.cardFrame, maxContentWidth ? { maxWidth: maxContentWidth, width: '100%' } : undefined]}>
        <View style={styles.cardRibbon}>
          <Text style={styles.cardRibbonText}>DIAMOND STATS PLAYER CARD</Text>
        </View>

        <View style={styles.card}>
        <View style={styles.headerRow}>
          <PlayerAvatar mlbId={Number(playerId)} size={isTablet ? 100 : 78} />
          <View style={styles.headerTextWrap}>
            <Text style={[styles.playerName, isTablet && { fontSize: 30 }]}>{resolvedName}</Text>
            <Text style={[styles.playerMeta, isTablet && { fontSize: 16 }]}>
              {resolvedPosition} • {resolvedTeam}
            </Text>
          </View>
        </View>

        {loading ? <ActivityIndicator color={theme.primary} style={styles.loader} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && !error ? (
          <>
            {/* ── Season Stats ─────────────────────────────────── */}
            {isTwoWay ? (
              <>
                <Section title={`${currentYear} Hitting`}>
                  {twoWaySeasonHitting.length > 0 ? (
                    twoWaySeasonHitting.map((row) => (
                      <StatRow key={`sh-${row.label}`} label={row.label} value={row.value} />
                    ))
                  ) : (
                    <PreSeasonNote year={currentYear} />
                  )}
                </Section>
                <Section title={`${currentYear} Pitching`}>
                  {twoWaySeasonPitching.length > 0 ? (
                    twoWaySeasonPitching.map((row) => (
                      <StatRow key={`sp-${row.label}`} label={row.label} value={row.value} />
                    ))
                  ) : (
                    <PreSeasonNote year={currentYear} />
                  )}
                </Section>
              </>
            ) : (
              <Section title={`Season Stats • ${currentYear}`}>
                {seasonHasData ? (
                  seasonRows.map((row) => (
                    <StatRow key={`season-${row.label}`} label={row.label} value={row.value} />
                  ))
                ) : (
                  <PreSeasonNote year={currentYear} />
                )}
              </Section>
            )}

            {/* ── Career Stats ─────────────────────────────────── */}
            {isTwoWay ? (
              <>
                <Section title="Career Hitting">
                  {twoWayCareerHitting.length > 0 ? (
                    twoWayCareerHitting.map((row) => (
                      <StatRow key={`ch-${row.label}`} label={row.label} value={row.value} />
                    ))
                  ) : (
                    <Text style={styles.emptyText}>Career hitting data unavailable.</Text>
                  )}
                </Section>
                <Section title="Career Pitching">
                  {twoWayCareerPitching.length > 0 ? (
                    twoWayCareerPitching.map((row) => (
                      <StatRow key={`cp-${row.label}`} label={row.label} value={row.value} />
                    ))
                  ) : (
                    <Text style={styles.emptyText}>Career pitching data unavailable.</Text>
                  )}
                </Section>
              </>
            ) : (
              <Section title="Career Stats">
                {careerRows.length > 0 ? (
                  careerRows.map((row) => (
                    <StatRow key={`career-${row.label}`} label={row.label} value={row.value} />
                  ))
                ) : (
                  <Text style={styles.emptyText}>Career data currently unavailable.</Text>
                )}
              </Section>
            )}

            {/* ── Advanced Sabermetrics ────────────────────────── */}
            {playerData?.careerAdvancedHitting && hasAnySabermetric(playerData.careerAdvancedHitting) && (
              <Section title="Advanced Sabermetrics • Hitting">
                <SabermetricGrid stats={playerData.careerAdvancedHitting} type="hitting" cols={saberCols} />
                <Text style={styles.saberNote}>Career advanced metrics via MLB Stats API</Text>
              </Section>
            )}
            {playerData?.careerAdvancedPitching && hasAnySabermetric(playerData.careerAdvancedPitching) && (
              <Section title={isTwoWay ? 'Advanced Sabermetrics • Pitching' : 'Advanced Sabermetrics'}>
                <SabermetricGrid stats={playerData.careerAdvancedPitching} type="pitching" cols={saberCols} />
                <Text style={styles.saberNote}>Career advanced metrics via MLB Stats API</Text>
              </Section>
            )}

            {/* ── Year-by-Year ─────────────────────────────────── */}
            <Section title={isTwoWay ? 'Career Snapshot • Hitting (Last 10)' : 'Career Snapshot • Last 10 Seasons'}>
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

            {/* Two-way: also show pitching year-by-year */}
            {isTwoWay && yearByYearPitching.length > 0 && (
              <Section title="Career Snapshot • Pitching (Last 10)">
                {yearByYearPitching.map((line) => (
                  <View key={`p-${line.season}-${line.teamName}`} style={styles.yearRow}>
                    <View style={styles.yearHeaderRow}>
                      <Text style={styles.yearSeason}>{line.season}</Text>
                      <Text style={styles.yearTeam}>{line.teamName}</Text>
                    </View>
                    <View style={styles.yearStatsRow}>
                      {PITCHING_YEAR_SUMMARY_KEYS.map((key) => (
                        <Text key={`p-${line.season}-${key.key}`} style={styles.yearStatText}>
                          {key.label}:{' '}
                          <Text style={styles.yearStatValue}>
                            {formatStatValue(line.stats[key.key])}
                          </Text>
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              </Section>
            )}

            {/* ── WAR Stats ────────────────────────────────────── */}
            <Section title="WAR Stats">
              <StatRow
                label="Season WAR"
                value={
                  playerData?.seasonWar !== null && playerData?.seasonWar !== undefined
                    ? playerData.seasonWar.toFixed(1)
                    : seasonHasData ? 'Pending' : 'Pre-Season'
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
              <Text style={styles.warNote}>
                WAR is not directly provided by the MLB Stats API. Values shown when available from the feed.
              </Text>
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

function PreSeasonNote({ year }: { year: number }) {
  return (
    <View style={styles.preSeasonBox}>
      <Text style={styles.preSeasonEmoji}>⚾</Text>
      <Text style={styles.preSeasonTitle}>{year} Season Has Not Started</Text>
      <Text style={styles.preSeasonText}>
        Regular season stats will appear here once the {year} MLB season begins.
        Spring Training is underway!
      </Text>
    </View>
  );
}

function hasAnySabermetric(stats: AdvancedSabermetrics): boolean {
  return Object.values(stats).some((v) => v !== null && v !== undefined);
}

const HITTING_SABER_ITEMS: Array<{ key: keyof AdvancedSabermetrics; label: string; description: string }> = [
  { key: 'babip', label: 'BABIP', description: 'Batting Average on Balls in Play' },
  { key: 'iso', label: 'ISO', description: 'Isolated Power (SLG − AVG)' },
  { key: 'kPercent', label: 'K%', description: 'Strikeout Rate' },
  { key: 'bbPercent', label: 'BB%', description: 'Walk Rate' },
  { key: 'bbPerK', label: 'BB/K', description: 'Walk-to-Strikeout Ratio' },
  { key: 'hrPerPA', label: 'HR/PA', description: 'Home Runs per Plate Appearance' },
];

const PITCHING_SABER_ITEMS: Array<{ key: keyof AdvancedSabermetrics; label: string; description: string }> = [
  { key: 'babip', label: 'BABIP', description: 'Batting Average on Balls in Play' },
  { key: 'kPer9', label: 'K/9', description: 'Strikeouts per 9 Innings' },
  { key: 'bbPer9', label: 'BB/9', description: 'Walks per 9 Innings' },
  { key: 'hrPer9', label: 'HR/9', description: 'Home Runs per 9 Innings' },
  { key: 'hPer9', label: 'H/9', description: 'Hits per 9 Innings' },
  { key: 'whiffPercent', label: 'Whiff%', description: 'Swing-and-Miss Rate' },
  { key: 'strikePercent', label: 'Strike%', description: 'Strike Percentage' },
  { key: 'qualityStarts', label: 'QS', description: 'Quality Starts' },
];

function SabermetricGrid({ stats, type, cols = 2 }: { stats: AdvancedSabermetrics; type: 'hitting' | 'pitching'; cols?: number }) {
  const items = type === 'hitting' ? HITTING_SABER_ITEMS : PITCHING_SABER_ITEMS;
  const available = items.filter((item) => stats[item.key] !== null && stats[item.key] !== undefined);

  if (available.length === 0) {
    return <Text style={styles.emptyText}>Advanced metrics not available.</Text>;
  }

  const cellWidth = `${Math.floor(100 / cols) - 3}%` as unknown as number;

  return (
    <View style={styles.saberGrid}>
      {available.map((item) => (
        <View key={item.key} style={[styles.saberCell, { width: cellWidth }]}>
          <Text style={styles.saberValue}>{String(stats[item.key])}</Text>
          <Text style={styles.saberLabel}>{item.label}</Text>
          <Text style={styles.saberDesc}>{item.description}</Text>
        </View>
      ))}
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
  preSeasonBox: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  preSeasonEmoji: {
    fontSize: 28,
  },
  preSeasonTitle: {
    color: theme.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  preSeasonText: {
    color: theme.mutedText,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  saberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  saberCell: {
    backgroundColor: '#f0f5ff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#dbe7f8',
  },
  saberValue: {
    color: theme.accent,
    fontWeight: '900',
    fontSize: 18,
  },
  saberLabel: {
    color: theme.primary,
    fontWeight: '800',
    fontSize: 12,
    marginTop: 2,
  },
  saberDesc: {
    color: theme.mutedText,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  saberNote: {
    color: theme.mutedText,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
