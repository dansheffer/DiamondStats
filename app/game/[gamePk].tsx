import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { fetchGameBoxScore, type BatterLine, type BoxScoreSummary, type PitcherLine } from '../../src/api/mlb';
import { theme, shadows, radii } from '../../src/theme/colors';
import { useResponsive } from '../../src/utils/useResponsive';

export default function GameBoxScoreScreen() {
  const { gamePk } = useLocalSearchParams<{ gamePk: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<BoxScoreSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showSpinner = true) => {
    if (!gamePk) {
      setError('Missing game id.');
      setLoading(false);
      return;
    }
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await fetchGameBoxScore(Number(gamePk));
      setBox(data);
    } catch {
      setError('Could not load box score.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void loadData();
    const interval = setInterval(() => {
      if (mounted) void loadData(false);
    }, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [gamePk]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData(false);
  };

  const innings = useMemo(() => box?.inningLines ?? [], [box?.inningLines]);
  const { isTablet, maxContentWidth, outerPadding } = useResponsive();

  return (
    <>
      <Stack.Screen
        options={{
          title: box ? `${box.awayTeam} at ${box.homeTeam}` : 'Game Details',
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.container, { padding: outerPadding, alignItems: isTablet ? 'center' : undefined }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        <View style={maxContentWidth ? { maxWidth: maxContentWidth, width: '100%', gap: 12 } : { gap: 12 }}>
        {/* Score Card */}
        <View style={styles.digitalCard}>
          {loading ? <ActivityIndicator color="#67e8f9" /> : null}
          {error ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={styles.error}>{error}</Text>
              <Pressable onPress={() => void loadData()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Tap to Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {box ? (
            <>
              <Text style={styles.stateText}>{box.detailedState}</Text>
              <View style={styles.scoreRow}>
                <Text style={[styles.team, isTablet && { fontSize: 20 }]}>{box.awayTeam}</Text>
                <Text style={[styles.score, isTablet && { fontSize: 36 }]}>{box.awayRuns}</Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={[styles.team, isTablet && { fontSize: 20 }]}>{box.homeTeam}</Text>
                <Text style={[styles.score, isTablet && { fontSize: 36 }]}>{box.homeRuns}</Text>
              </View>
              <Text style={styles.inningText}>
                {box.inning ? `${box.inningState} ${box.inning}` : 'Pregame'}
              </Text>

              {/* Decisions */}
              {(box.winningPitcher || box.losingPitcher || box.savePitcher) ? (
                <View style={styles.decisionsRow}>
                  {box.winningPitcher ? <Text style={styles.decisionText}>W: {box.winningPitcher}</Text> : null}
                  {box.losingPitcher ? <Text style={styles.decisionText}>L: {box.losingPitcher}</Text> : null}
                  {box.savePitcher ? <Text style={styles.decisionText}>SV: {box.savePitcher}</Text> : null}
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        {/* R / H / E */}
        {box ? (
          <View style={[styles.infoCard, isTablet && { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }]}>
            <Text style={[styles.infoTitle, isTablet && { width: '100%' }]}>R / H / E</Text>
            <View style={[styles.rheRow, isTablet && { flex: 1 }]}>
              <Text style={styles.rheTeam}>{box.awayTeam}</Text>
              <Text style={styles.rheValue}>
                {box.awayRuns} / {box.awayHits} / {box.awayErrors}
              </Text>
            </View>
            <View style={[styles.rheRow, isTablet && { flex: 1 }]}>
              <Text style={styles.rheTeam}>{box.homeTeam}</Text>
              <Text style={styles.rheValue}>
                {box.homeRuns} / {box.homeHits} / {box.homeErrors}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Inning Lines */}
        {innings.length > 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Inning Lines</Text>
            <View style={isTablet ? { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } : undefined}>
              {innings.map((line) => (
                <View key={line.inning} style={[styles.inningRow, isTablet && { width: '48%' as unknown as number }]}>
                  <Text style={styles.inningNumber}>#{line.inning}</Text>
                  <Text style={styles.inningRuns}>Away {line.awayRuns ?? '-'}</Text>
                  <Text style={styles.inningRuns}>Home {line.homeRuns ?? '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Away Batting */}
        {box && box.awayBatters.length > 0 ? (
          <BattingTable
            title={`${box.awayTeam} Batting`}
            batters={box.awayBatters}
            isTablet={isTablet}
            onPlayerPress={(id) =>
              router.push({ pathname: '/player/[playerId]', params: { playerId: String(id) } })
            }
          />
        ) : null}

        {/* Home Batting */}
        {box && box.homeBatters.length > 0 ? (
          <BattingTable
            title={`${box.homeTeam} Batting`}
            batters={box.homeBatters}
            isTablet={isTablet}
            onPlayerPress={(id) =>
              router.push({ pathname: '/player/[playerId]', params: { playerId: String(id) } })
            }
          />
        ) : null}

        {/* Away Pitching */}
        {box && box.awayPitchers.length > 0 ? (
          <PitchingTable
            title={`${box.awayTeam} Pitching`}
            pitchers={box.awayPitchers}
            isTablet={isTablet}
            onPlayerPress={(id) =>
              router.push({ pathname: '/player/[playerId]', params: { playerId: String(id) } })
            }
          />
        ) : null}

        {/* Home Pitching */}
        {box && box.homePitchers.length > 0 ? (
          <PitchingTable
            title={`${box.homeTeam} Pitching`}
            pitchers={box.homePitchers}
            isTablet={isTablet}
            onPlayerPress={(id) =>
              router.push({ pathname: '/player/[playerId]', params: { playerId: String(id) } })
            }
          />
        ) : null}
        </View>
      </ScrollView>
    </>
  );
}

/* ── Batting Table ───────────────────────────────────────────────── */

function BattingTable({ title, batters, isTablet, onPlayerPress }: {
  title: string; batters: BatterLine[]; isTablet: boolean; onPlayerPress: (id: number) => void;
}) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      <ScrollView horizontal={!isTablet} showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: 380 }}>
          <View style={styles.tableHeader}>
            <Text style={[styles.playerCol, isTablet && { width: 180 }]}>Player</Text>
            <Text style={styles.statCol}>AB</Text>
            <Text style={styles.statCol}>R</Text>
            <Text style={styles.statCol}>H</Text>
            <Text style={styles.statCol}>RBI</Text>
            <Text style={styles.statCol}>BB</Text>
            <Text style={styles.statCol}>SO</Text>
            <Text style={[styles.statCol, { width: 44 }]}>AVG</Text>
          </View>
          {batters.map((b, idx) => (
            <Pressable
              key={`${b.playerId}-${idx}`}
              style={({ pressed }) => [styles.tableRow, pressed && { opacity: 0.7 }]}
              onPress={() => onPlayerPress(b.playerId)}
            >
              <View style={[styles.playerCol, isTablet && { width: 180 }]}>
                <Text style={styles.playerName} numberOfLines={1}>{b.name}</Text>
                <Text style={styles.playerPos}>{b.position}</Text>
              </View>
              <Text style={styles.statCell}>{b.ab}</Text>
              <Text style={styles.statCell}>{b.r}</Text>
              <Text style={[styles.statCell, b.h > 0 && styles.highlightStat]}>{b.h}</Text>
              <Text style={[styles.statCell, b.rbi > 0 && styles.highlightStat]}>{b.rbi}</Text>
              <Text style={styles.statCell}>{b.bb}</Text>
              <Text style={styles.statCell}>{b.so}</Text>
              <Text style={[styles.statCell, { width: 44 }]}>{b.avg}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ── Pitching Table ──────────────────────────────────────────────── */

function PitchingTable({ title, pitchers, isTablet, onPlayerPress }: {
  title: string; pitchers: PitcherLine[]; isTablet: boolean; onPlayerPress: (id: number) => void;
}) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      <ScrollView horizontal={!isTablet} showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: 380 }}>
          <View style={styles.tableHeader}>
            <Text style={[styles.playerCol, isTablet && { width: 180 }]}>Pitcher</Text>
            <Text style={styles.statCol}>IP</Text>
            <Text style={styles.statCol}>H</Text>
            <Text style={styles.statCol}>R</Text>
            <Text style={styles.statCol}>ER</Text>
            <Text style={styles.statCol}>BB</Text>
            <Text style={styles.statCol}>SO</Text>
            <Text style={[styles.statCol, { width: 44 }]}>ERA</Text>
          </View>
          {pitchers.map((p, idx) => (
            <Pressable
              key={`${p.playerId}-${idx}`}
              style={({ pressed }) => [styles.tableRow, pressed && { opacity: 0.7 }]}
              onPress={() => onPlayerPress(p.playerId)}
            >
              <View style={[styles.playerCol, isTablet && { width: 180 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
                  {p.decision ? <Text style={styles.decisionBadge}>{p.decision}</Text> : null}
                </View>
              </View>
              <Text style={styles.statCell}>{p.ip}</Text>
              <Text style={styles.statCell}>{p.h}</Text>
              <Text style={styles.statCell}>{p.r}</Text>
              <Text style={styles.statCell}>{p.er}</Text>
              <Text style={styles.statCell}>{p.bb}</Text>
              <Text style={[styles.statCell, p.so > 0 && styles.highlightStat]}>{p.so}</Text>
              <Text style={[styles.statCell, { width: 44 }]}>{p.era}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: theme.background, padding: 14, paddingBottom: 100, gap: 12 },
  digitalCard: { backgroundColor: theme.navyGlass, borderRadius: radii.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: theme.navyGlassBorder, ...shadows.lg },
  stateText: { color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  team: { color: '#ffffff', fontWeight: '700', fontSize: 16, flex: 1, marginRight: 8 },
  score: { color: '#ffffff', fontWeight: '900', fontSize: 28 },
  inningText: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 12 },
  decisionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.15)' },
  decisionText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  error: { color: '#fca5a5', fontWeight: '700' },
  infoCard: { backgroundColor: theme.surface, borderRadius: radii.lg, padding: 14, gap: 8, borderWidth: 1, borderColor: theme.glassBorder, ...shadows.glass },
  infoTitle: { color: theme.primary, fontSize: 16, fontWeight: '800' },
  rheRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rheTeam: { color: theme.text, fontWeight: '700', flex: 1, marginRight: 8 },
  rheValue: { color: theme.accent, fontWeight: '800' },
  inningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border, paddingTop: 8 },
  inningNumber: { color: theme.primary, fontWeight: '800', width: 42 },
  inningRuns: { color: theme.text, fontWeight: '700', flex: 1 },

  /* Table */
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderSubtle },
  playerCol: { width: 130, paddingRight: 4 },
  playerName: { color: theme.text, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  playerPos: { color: theme.mutedText, fontSize: 10, fontWeight: '600' },
  statCol: { width: 32, textAlign: 'center', color: theme.mutedText, fontSize: 11, fontWeight: '700' },
  statCell: { width: 32, textAlign: 'center', color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  highlightStat: { color: theme.accent, fontWeight: '800' },
  decisionBadge: { color: theme.accent, fontSize: 10, fontWeight: '800' },

  /* Retry */
  retryBtn: { backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: radii.sm },
  retryText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});
