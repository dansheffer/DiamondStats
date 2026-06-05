import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getPerson,
  getPlayerCareerStats,
  getPlayerSeasonStats,
  MlbPersonLite,
  searchPlayers,
  SeasonStatLine,
} from '../../shared/api/mlb';
import { PLAYERS, Player } from '../../shared/data/players';
import PlayerAvatar from '../../shared/components/PlayerAvatar';
import { theme } from '../../shared/theme/colors';

type Side = 'left' | 'right';
type WinnerMode = 'higher' | 'lower' | 'none';

interface CompareProfile {
  key: string;
  mlbId: number;
  name: string;
  team: string;
  position: string;
  curated?: Player;
  person?: MlbPersonLite;
  seasonHitting?: SeasonStatLine;
  seasonPitching?: SeasonStatLine;
  careerHitting?: SeasonStatLine;
  careerPitching?: SeasonStatLine;
  loading: boolean;
  error?: string;
}

interface Metric {
  label: string;
  left: string;
  right: string;
  leftScore?: number;
  rightScore?: number;
  mode?: WinnerMode;
}

function findFeatured(mlbId: number): Player | undefined {
  return PLAYERS.find((p) => p.mlbId === mlbId);
}

function playerNameForLoading(mlbId: number): string {
  return findFeatured(mlbId)?.name ?? 'Player';
}

function emptyProfile(mlbId: number): CompareProfile {
  const curated = findFeatured(mlbId);
  return {
    key: `mlb:${mlbId}`,
    mlbId,
    name: curated?.name ?? playerNameForLoading(mlbId),
    team: curated?.team ?? 'Loading',
    position: curated?.position ?? '--',
    curated,
    loading: true,
  };
}

function primaryLine(lines: SeasonStatLine[], group: 'hitting' | 'pitching') {
  return lines.find((line) => line.group === group);
}

async function loadCompareProfile(mlbId: number): Promise<CompareProfile> {
  const curated = findFeatured(mlbId);
  const [person, season, career] = await Promise.all([
    getPerson(mlbId),
    getPlayerSeasonStats(mlbId),
    getPlayerCareerStats(mlbId),
  ]);

  return {
    key: `mlb:${mlbId}`,
    mlbId,
    name: person?.fullName ?? curated?.name ?? `MLB ${mlbId}`,
    team: person?.currentTeam?.name ?? curated?.team ?? 'Free Agent',
    position: person?.primaryPosition?.abbreviation ?? curated?.position ?? '--',
    curated,
    person: person ?? undefined,
    seasonHitting: primaryLine(season, 'hitting'),
    seasonPitching: primaryLine(season, 'pitching'),
    careerHitting: primaryLine(career, 'hitting'),
    careerPitching: primaryLine(career, 'pitching'),
    loading: false,
  };
}

function parseRate(value?: string): number | undefined {
  if (!value || value === '.---') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function fmtRate(value?: string): string {
  return value && value !== '.---' ? value : '--';
}

function fmtNumber(value?: number, decimals = 0): string {
  if (value == null || !Number.isFinite(value)) return '--';
  return value.toFixed(decimals);
}

function pct(part?: number, total?: number): { label: string; score?: number } {
  if (!part || !total) return { label: '--' };
  const value = part / total;
  return { label: `${(value * 100).toFixed(1)}%`, score: value };
}

function iso(line?: SeasonStatLine): { label: string; score?: number } {
  const slg = parseRate(line?.slg);
  const avg = parseRate(line?.avg);
  if (slg == null || avg == null) return { label: '--' };
  const value = slg - avg;
  return { label: value.toFixed(3).replace(/^0/, ''), score: value };
}

function hrPace(line?: SeasonStatLine): { label: string; score?: number } {
  if (!line?.homeRuns || !line.gamesPlayed) return { label: '--' };
  const value = (line.homeRuns / line.gamesPlayed) * 162;
  return { label: value.toFixed(0), score: value };
}

function xbh(line?: SeasonStatLine): { label: string; score?: number } {
  const value = (line?.doubles ?? 0) + (line?.triples ?? 0) + (line?.homeRuns ?? 0);
  return value ? { label: String(value), score: value } : { label: '--' };
}

function inningsToNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const [wholeRaw, outsRaw] = value.split('.');
  const whole = Number(wholeRaw);
  const outs = Number(outsRaw ?? 0);
  if (!Number.isFinite(whole) || !Number.isFinite(outs)) return undefined;
  return whole + outs / 3;
}

function perNine(count?: number, innings?: string): { label: string; score?: number } {
  const ip = inningsToNumber(innings);
  if (!count || !ip) return { label: '--' };
  const value = (count / ip) * 9;
  return { label: value.toFixed(1), score: value };
}

function ratio(top?: number, bottom?: number): { label: string; score?: number } {
  if (!top || !bottom) return { label: '--' };
  const value = top / bottom;
  return { label: value.toFixed(2), score: value };
}

function hittingLine(profile: CompareProfile): SeasonStatLine | undefined {
  return profile.seasonHitting ?? profile.careerHitting;
}

function pitchingLine(profile: CompareProfile): SeasonStatLine | undefined {
  return profile.seasonPitching ?? profile.careerPitching;
}

function bioSentence(profile: CompareProfile): string {
  const person = profile.person;
  const throws = person?.pitchHand?.code ? `throws ${person.pitchHand.code}` : null;
  const bats = person?.batSide?.code ? `bats ${person.batSide.code}` : null;
  const body = [bats, throws].filter(Boolean).join(', ');
  const debut = person?.mlbDebutDate ? ` MLB debut: ${person.mlbDebutDate}.` : '';
  const basics = `${profile.name} is a ${profile.position} for ${profile.team}.`;
  return body ? `${basics} ${body}.${debut}` : `${basics}${debut}`;
}

function hittingMetrics(left: CompareProfile, right: CompareProfile): Metric[] {
  const a = hittingLine(left);
  const b = hittingLine(right);
  const aIso = iso(a);
  const bIso = iso(b);
  const aBb = pct(a?.baseOnBalls, a?.plateAppearances);
  const bBb = pct(b?.baseOnBalls, b?.plateAppearances);
  const aK = pct(a?.strikeOuts, a?.plateAppearances);
  const bK = pct(b?.strikeOuts, b?.plateAppearances);
  const aPace = hrPace(a);
  const bPace = hrPace(b);
  const aXbh = xbh(a);
  const bXbh = xbh(b);

  return [
    {
      label: 'OPS',
      left: fmtRate(a?.ops),
      right: fmtRate(b?.ops),
      leftScore: parseRate(a?.ops),
      rightScore: parseRate(b?.ops),
    },
    {
      label: 'OBP',
      left: fmtRate(a?.obp),
      right: fmtRate(b?.obp),
      leftScore: parseRate(a?.obp),
      rightScore: parseRate(b?.obp),
    },
    {
      label: 'SLG',
      left: fmtRate(a?.slg),
      right: fmtRate(b?.slg),
      leftScore: parseRate(a?.slg),
      rightScore: parseRate(b?.slg),
    },
    {
      label: 'AVG',
      left: fmtRate(a?.avg),
      right: fmtRate(b?.avg),
      leftScore: parseRate(a?.avg),
      rightScore: parseRate(b?.avg),
    },
    {
      label: 'ISO',
      left: aIso.label,
      right: bIso.label,
      leftScore: aIso.score,
      rightScore: bIso.score,
    },
    {
      label: 'HR',
      left: fmtNumber(a?.homeRuns),
      right: fmtNumber(b?.homeRuns),
      leftScore: a?.homeRuns,
      rightScore: b?.homeRuns,
    },
    {
      label: 'HR Pace',
      left: aPace.label,
      right: bPace.label,
      leftScore: aPace.score,
      rightScore: bPace.score,
    },
    {
      label: 'XBH',
      left: aXbh.label,
      right: bXbh.label,
      leftScore: aXbh.score,
      rightScore: bXbh.score,
    },
    {
      label: 'RBI',
      left: fmtNumber(a?.rbi),
      right: fmtNumber(b?.rbi),
      leftScore: a?.rbi,
      rightScore: b?.rbi,
    },
    {
      label: 'SB',
      left: fmtNumber(a?.stolenBases),
      right: fmtNumber(b?.stolenBases),
      leftScore: a?.stolenBases,
      rightScore: b?.stolenBases,
    },
    {
      label: 'BB%',
      left: aBb.label,
      right: bBb.label,
      leftScore: aBb.score,
      rightScore: bBb.score,
    },
    {
      label: 'K%',
      left: aK.label,
      right: bK.label,
      leftScore: aK.score,
      rightScore: bK.score,
      mode: 'lower',
    },
  ];
}

function pitchingMetrics(left: CompareProfile, right: CompareProfile): Metric[] {
  const a = pitchingLine(left);
  const b = pitchingLine(right);
  const aK9 = perNine(a?.strikeOuts, a?.inningsPitched);
  const bK9 = perNine(b?.strikeOuts, b?.inningsPitched);
  const aBb9 = perNine(a?.baseOnBallsPitching, a?.inningsPitched);
  const bBb9 = perNine(b?.baseOnBallsPitching, b?.inningsPitched);
  const aKbb = ratio(a?.strikeOuts, a?.baseOnBallsPitching);
  const bKbb = ratio(b?.strikeOuts, b?.baseOnBallsPitching);

  return [
    {
      label: 'ERA',
      left: fmtRate(a?.era),
      right: fmtRate(b?.era),
      leftScore: parseRate(a?.era),
      rightScore: parseRate(b?.era),
      mode: 'lower',
    },
    {
      label: 'WHIP',
      left: fmtRate(a?.whip),
      right: fmtRate(b?.whip),
      leftScore: parseRate(a?.whip),
      rightScore: parseRate(b?.whip),
      mode: 'lower',
    },
    {
      label: 'K/9',
      left: aK9.label,
      right: bK9.label,
      leftScore: aK9.score,
      rightScore: bK9.score,
    },
    {
      label: 'BB/9',
      left: aBb9.label,
      right: bBb9.label,
      leftScore: aBb9.score,
      rightScore: bBb9.score,
      mode: 'lower',
    },
    {
      label: 'K/BB',
      left: aKbb.label,
      right: bKbb.label,
      leftScore: aKbb.score,
      rightScore: bKbb.score,
    },
    {
      label: 'IP',
      left: a?.inningsPitched ?? '--',
      right: b?.inningsPitched ?? '--',
      leftScore: inningsToNumber(a?.inningsPitched),
      rightScore: inningsToNumber(b?.inningsPitched),
    },
    {
      label: 'W-L',
      left: a ? `${a.wins ?? 0}-${a.losses ?? 0}` : '--',
      right: b ? `${b.wins ?? 0}-${b.losses ?? 0}` : '--',
      mode: 'none',
    },
    {
      label: 'SV/HLD',
      left: a ? `${a.saves ?? 0}/${a.holds ?? 0}` : '--',
      right: b ? `${b.saves ?? 0}/${b.holds ?? 0}` : '--',
      mode: 'none',
    },
  ];
}

function profileMetrics(left: CompareProfile, right: CompareProfile): Metric[] {
  return [
    {
      label: 'Career WAR',
      left: left.curated ? left.curated.careerWAR.toFixed(1) : '--',
      right: right.curated ? right.curated.careerWAR.toFixed(1) : '--',
      leftScore: left.curated?.careerWAR,
      rightScore: right.curated?.careerWAR,
    },
    {
      label: 'Season WAR',
      left: left.curated ? left.curated.seasonWAR.toFixed(1) : '--',
      right: right.curated ? right.curated.seasonWAR.toFixed(1) : '--',
      leftScore: left.curated?.seasonWAR,
      rightScore: right.curated?.seasonWAR,
    },
    {
      label: 'Games',
      left: fmtNumber(hittingLine(left)?.gamesPlayed ?? pitchingLine(left)?.gamesPlayed),
      right: fmtNumber(hittingLine(right)?.gamesPlayed ?? pitchingLine(right)?.gamesPlayed),
      leftScore: hittingLine(left)?.gamesPlayed ?? pitchingLine(left)?.gamesPlayed,
      rightScore: hittingLine(right)?.gamesPlayed ?? pitchingLine(right)?.gamesPlayed,
    },
  ];
}

function winner(metric: Metric): 'left' | 'right' | null {
  if (metric.mode === 'none') return null;
  if (metric.leftScore == null || metric.rightScore == null) return null;
  if (metric.leftScore === metric.rightScore) return null;
  const lower = metric.mode === 'lower';
  if (lower) return metric.leftScore < metric.rightScore ? 'left' : 'right';
  return metric.leftScore > metric.rightScore ? 'left' : 'right';
}

export default function CompareScreen() {
  const [leftMlbId, setLeftMlbId] = useState<number>(PLAYERS[0].mlbId);
  const [rightMlbId, setRightMlbId] = useState<number>(PLAYERS[1].mlbId);
  const [left, setLeft] = useState<CompareProfile>(() => emptyProfile(PLAYERS[0].mlbId));
  const [right, setRight] = useState<CompareProfile>(() => emptyProfile(PLAYERS[1].mlbId));
  const [selecting, setSelecting] = useState<Side | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MlbPersonLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchToken = useRef(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;
    setLeft(emptyProfile(leftMlbId));
    loadCompareProfile(leftMlbId)
      .then((profile) => {
        if (!cancelled) setLeft(profile);
      })
      .catch((e) => {
        if (cancelled) return;
        setLeft({ ...emptyProfile(leftMlbId), loading: false, error: e?.message ?? 'Stats unavailable' });
      });
    return () => {
      cancelled = true;
    };
  }, [leftMlbId]);

  useEffect(() => {
    let cancelled = false;
    setRight(emptyProfile(rightMlbId));
    loadCompareProfile(rightMlbId)
      .then((profile) => {
        if (!cancelled) setRight(profile);
      })
      .catch((e) => {
        if (cancelled) return;
        setRight({ ...emptyProfile(rightMlbId), loading: false, error: e?.message ?? 'Stats unavailable' });
      });
    return () => {
      cancelled = true;
    };
  }, [rightMlbId]);

  useEffect(() => {
    if (!selecting) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [selecting]);

  useEffect(() => {
    if (!selecting) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    const token = ++searchToken.current;
    setSearching(true);
    setSearchError(null);
    const timer = setTimeout(() => {
      searchPlayers(q)
        .then((rows) => {
          if (searchToken.current === token) setResults(rows);
        })
        .catch((e) => {
          if (searchToken.current !== token) return;
          setResults([]);
          setSearchError(e?.message ?? 'Search failed');
        })
        .finally(() => {
          if (searchToken.current === token) setSearching(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selecting]);

  const metrics = useMemo(() => {
    const rows = [...profileMetrics(left, right), ...hittingMetrics(left, right)];
    if (pitchingLine(left) || pitchingLine(right)) rows.push(...pitchingMetrics(left, right));
    return rows;
  }, [left, right]);

  const choose = (mlbId: number) => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    if (selecting === 'left') setLeftMlbId(mlbId);
    if (selecting === 'right') setRightMlbId(mlbId);
    setSelecting(null);
    setQuery('');
    setResults([]);
  };

  const openPicker = (side: Side) => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    setSelecting(side);
    setQuery('');
    setResults([]);
    setSearchError(null);
  };

  if (selecting) {
    return (
      <>
        <Stack.Screen
          options={{
            title: selecting === 'left' ? 'Swap left player' : 'Swap right player',
            headerLargeTitle: false,
            headerTransparent: false,
            headerStyle: { backgroundColor: '#f2f2f7' },
            headerLargeStyle: { backgroundColor: '#f2f2f7' },
          }}
        />
        <SafeAreaView style={styles.pickerScreen} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.pickerFlex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.searchWrap}>
              <View style={styles.searchBar}>
                {Platform.OS === 'ios' && (
                  <SymbolView name="magnifyingglass" tintColor="#8e8e93" size={18} />
                )}
                <TextInput
                  ref={inputRef}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search any MLB player"
                  placeholderTextColor="#8e8e93"
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                  selectionColor={theme.primary}
                  showSoftInputOnFocus
                  style={styles.searchInput}
                />
              </View>
            </View>
            <FlatList
              data={query.trim().length >= 2 ? results : []}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="interactive"
              contentContainerStyle={styles.pickerList}
              ListHeaderComponent={
                query.trim().length < 2 ? (
                  <View style={styles.featuredBlock}>
                    <Text style={styles.featuredTitle}>Featured starters</Text>
                    {PLAYERS.map((p) => (
                      <PickerRow
                        key={p.id}
                        mlbId={p.mlbId}
                        name={p.name}
                        meta={`${p.position} - ${p.team}`}
                        onPress={() => choose(p.mlbId)}
                      />
                    ))}
                  </View>
                ) : null
              }
              ListEmptyComponent={
                query.trim().length >= 2 ? (
                  <View style={styles.emptyPicker}>
                    {searching ? (
                      <>
                        <ActivityIndicator />
                        <Text style={styles.emptyHint}>Searching player index...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.emptyTitle}>
                          {searchError ? 'Search unavailable' : 'No players found'}
                        </Text>
                        <Text style={styles.emptyHint}>{searchError ?? 'Try another spelling.'}</Text>
                      </>
                    )}
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <PickerRow
                  mlbId={item.id}
                  name={item.fullName}
                  meta={`${item.primaryPosition?.abbreviation ?? '--'} - ${item.currentTeam?.name ?? 'Free Agent'}`}
                  onPress={() => choose(item.id)}
                />
              )}
            />
            <Pressable onPress={() => setSelecting(null)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </>
    );
  }

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
        <View style={styles.heads}>
          <PlayerHeader profile={left} side="left" onPress={() => openPicker('left')} />
          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <PlayerHeader profile={right} side="right" onPress={() => openPicker('right')} />
        </View>

        <View style={styles.bioGrid}>
          <MiniBio profile={left} />
          <MiniBio profile={right} />
        </View>

        {(left.error || right.error) && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>{left.error ?? right.error}</Text>
          </View>
        )}

        <View style={styles.statsCard}>
          <View style={styles.cardHeader}>
            {Platform.OS === 'ios' && (
              <SymbolView name="chart.bar.xaxis" tintColor={theme.primary} size={18} />
            )}
            <Text style={styles.cardTitle}>Fan Comparison</Text>
          </View>
          {metrics.map((metric) => (
            <MetricRow key={metric.label} metric={metric} />
          ))}
        </View>

        <Text style={styles.footnote}>
          Rows use current season when available, then career totals.
        </Text>
      </ScrollView>
    </>
  );
}

function PlayerHeader({
  profile,
  side,
  onPress,
}: {
  profile: CompareProfile;
  side: Side;
  onPress: () => void;
}) {
  const pitching = pitchingLine(profile);
  const hitting = hittingLine(profile);
  const headline = pitching ? `${fmtRate(pitching.era)} ERA` : `${fmtRate(hitting?.ops)} OPS`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.head, pressed && { opacity: 0.65 }]}
      accessibilityRole="button"
      accessibilityLabel={`Change ${side} player`}
    >
      <PlayerAvatar mlbId={profile.mlbId} size={64} />
      <Text style={styles.headName} numberOfLines={1}>
        {profile.name}
      </Text>
      <Text style={styles.headMeta} numberOfLines={1}>
        {profile.position} - {profile.team}
      </Text>
      <View style={styles.headlinePill}>
        {profile.loading ? <ActivityIndicator size="small" /> : <Text style={styles.headlineText}>{headline}</Text>}
      </View>
      <View style={styles.changePill}>
        {Platform.OS === 'ios' && (
          <SymbolView name="arrow.triangle.2.circlepath" tintColor={theme.primary} size={12} />
        )}
        <Text style={styles.changeText}>Swap</Text>
      </View>
    </Pressable>
  );
}

function MiniBio({ profile }: { profile: CompareProfile }) {
  return (
    <View style={styles.bioCard}>
      <Text style={styles.bioName} numberOfLines={1}>
        {profile.name}
      </Text>
      <Text style={styles.bioText}>{bioSentence(profile)}</Text>
    </View>
  );
}

function MetricRow({ metric }: { metric: Metric }) {
  const win = winner(metric);
  return (
    <View style={styles.statRow}>
      <View style={styles.statSide}>
        {win === 'left' && Platform.OS === 'ios' && (
          <SymbolView name="checkmark.seal.fill" tintColor="#34c759" size={15} />
        )}
        <Text style={[styles.statValue, win === 'left' && styles.statWinner]} numberOfLines={1}>
          {metric.left}
        </Text>
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>
        {metric.label}
      </Text>
      <View style={[styles.statSide, styles.statSideRight]}>
        <Text style={[styles.statValue, win === 'right' && styles.statWinner]} numberOfLines={1}>
          {metric.right}
        </Text>
        {win === 'right' && Platform.OS === 'ios' && (
          <SymbolView name="checkmark.seal.fill" tintColor="#34c759" size={15} />
        )}
      </View>
    </View>
  );
}

function PickerRow({
  mlbId,
  name,
  meta,
  onPress,
}: {
  mlbId: number;
  name: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pickRow, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`Compare ${name}`}
    >
      <PlayerAvatar mlbId={mlbId} size={42} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.pickName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.pickMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {Platform.OS === 'ios' && (
        <SymbolView name="chevron.right" tintColor="#c7c7cc" size={14} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120 },
  heads: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  head: {
    flex: 1,
    minHeight: 202,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.primary,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '100%',
  },
  headMeta: { fontSize: 12, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  headlinePill: {
    marginTop: 10,
    minHeight: 28,
    minWidth: 86,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineText: { fontSize: 13, fontWeight: '800', color: theme.text },
  changePill: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  changeText: { fontSize: 11, fontWeight: '700', color: theme.primary },
  vsCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  bioGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  bioCard: {
    flex: 1,
    minHeight: 126,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bioName: { fontSize: 13, fontWeight: '800', color: theme.primary },
  bioText: { marginTop: 6, fontSize: 12, lineHeight: 17, color: '#4b5563' },
  warningCard: {
    marginTop: 12,
    backgroundColor: '#fff4e6',
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ffd7a8',
  },
  warningText: { fontSize: 12, color: '#8a4b00', lineHeight: 17 },
  statsCard: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: theme.primary },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5ea',
  },
  statLabel: { flex: 1, textAlign: 'center', fontSize: 12, color: '#6b7280', fontWeight: '800' },
  statSide: {
    width: 98,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'flex-start',
  },
  statSideRight: { justifyContent: 'flex-end' },
  statValue: {
    maxWidth: 78,
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    fontVariant: ['tabular-nums'],
  },
  statWinner: { color: '#34c759' },
  footnote: { marginTop: 14, fontSize: 11, color: '#6b7280', textAlign: 'center', lineHeight: 16 },
  pickerScreen: { flex: 1, backgroundColor: '#f2f2f7' },
  pickerFlex: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, zIndex: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(118,118,128,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 17, color: theme.text, padding: 0 },
  pickerList: { paddingHorizontal: 16, paddingBottom: 96, gap: 8 },
  featuredBlock: { gap: 8 },
  featuredTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
    paddingHorizontal: 4,
    paddingBottom: 2,
    textTransform: 'uppercase',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  pickName: { fontSize: 15, fontWeight: '800', color: theme.primary },
  pickMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  emptyPicker: { paddingVertical: 70, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
  emptyHint: { fontSize: 13, color: '#6b7280', textAlign: 'center', paddingHorizontal: 24 },
  cancelButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
