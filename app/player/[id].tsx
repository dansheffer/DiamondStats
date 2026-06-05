import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SymbolView, SFSymbol } from 'expo-symbols';
import { findPlayer, Player } from '../../shared/data/players';
import {
  getPerson,
  getPlayerSeasonStats,
  getPlayerCareerStats,
  getPlayerYearByYearStats,
  MlbPersonLite,
  SeasonStatLine,
} from '../../shared/api/mlb';
import { useFavorites } from '../../shared/storage/favorites';
import PlayerAvatar from '../../shared/components/PlayerAvatar';
import { theme } from '../../shared/theme/colors';

type Tab = 'season' | 'career' | 'years';

function calcAge(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const diff = Date.now() - t;
  const yr = diff / (365.2425 * 24 * 60 * 60 * 1000);
  return Math.floor(yr);
}

function formatBirthplace(p: MlbPersonLite): string | null {
  const parts = [p.birthCity, p.birthStateProvince, p.birthCountry].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function formatDebut(iso?: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface ViewPlayer {
  favoriteKey: string;
  mlbId: number;
  name: string;
  team: string;
  position: string;
  curated?: Player;
}

function briefBio(view: ViewPlayer, person?: MlbPersonLite | null): string {
  const basics = `${view.name} is a ${view.position} for ${view.team}.`;
  const bats = person?.batSide?.description ? `Bats ${person.batSide.description.toLowerCase()}` : null;
  const throws = person?.pitchHand?.description ? `throws ${person.pitchHand.description.toLowerCase()}` : null;
  const handText = [bats, throws].filter(Boolean).join(', ');
  const birthplace = person ? formatBirthplace(person) : null;
  const debut = person ? formatDebut(person.mlbDebutDate) : null;
  const extras = [
    handText || null,
    birthplace ? `born in ${birthplace}` : null,
    debut ? `debuted ${debut}` : null,
  ].filter(Boolean);

  return extras.length ? `${basics} ${extras.join('; ')}.` : basics;
}

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const idStr = Array.isArray(id) ? id[0] : id;

  const isLive = !!idStr && idStr.startsWith('mlb-');
  const livePersonId = isLive ? Number(idStr!.slice(4)) : null;
  const curated = !isLive ? findPlayer(idStr) : undefined;

  const [tab, setTab] = useState<Tab>('season');
  const { isFavorite, toggle } = useFavorites();

  const [livePerson, setLivePerson] = useState<MlbPersonLite | null>(null);
  const [liveStats, setLiveStats] = useState<SeasonStatLine[]>([]);
  const [liveCareer, setLiveCareer] = useState<SeasonStatLine[]>([]);
  const [liveYears, setLiveYears] = useState<SeasonStatLine[]>([]);
  const [liveLoading, setLiveLoading] = useState(isLive);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLive || livePersonId == null || Number.isNaN(livePersonId)) return;
    let cancelled = false;
    setLiveLoading(true);
    setLiveError(null);
    Promise.all([
      getPerson(livePersonId),
      getPlayerSeasonStats(livePersonId),
      getPlayerCareerStats(livePersonId),
      getPlayerYearByYearStats(livePersonId),
    ])
      .then(([person, stats, career, years]) => {
        if (cancelled) return;
        setLivePerson(person);
        setLiveStats(stats);
        setLiveCareer(career);
        setLiveYears(years);
      })
      .catch((e) => {
        if (cancelled) return;
        setLiveError(e?.message ?? 'Could not load live stats');
      })
      .finally(() => {
        if (!cancelled) setLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLive, livePersonId]);

  const view: ViewPlayer | null = useMemo(() => {
    if (curated) {
      return {
        favoriteKey: curated.id,
        mlbId: curated.mlbId,
        name: curated.name,
        team: curated.team,
        position: curated.position,
        curated,
      };
    }
    if (isLive && livePerson) {
      return {
        favoriteKey: `mlb:${livePerson.id}`,
        mlbId: livePerson.id,
        name: livePerson.fullName,
        team: livePerson.currentTeam?.name ?? 'Free Agent',
        position: livePerson.primaryPosition?.abbreviation ?? '—',
      };
    }
    return null;
  }, [curated, isLive, livePerson]);

  const onShare = useCallback(async () => {
    if (!view) return;
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    try {
      await Share.share({
        message: `${view.name} (${view.position}, ${view.team}) — Shared from Diamond Stats.`,
      });
    } catch {}
  }, [view]);

  const onToggleFav = useCallback(() => {
    if (!view) return;
    if (Platform.OS === 'ios')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggle(view.favoriteKey);
  }, [view, toggle]);

  if (isLive && liveLoading && !livePerson) {
    return (
      <View style={styles.notFound}>
        <Stack.Screen options={{ title: 'Loading…' }} />
        <ActivityIndicator />
        <Text style={styles.notFoundHint}>Fetching live stats…</Text>
      </View>
    );
  }

  if (!view) {
    return (
      <View style={styles.notFound}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Text style={styles.notFoundTitle}>Player not found</Text>
        <Text style={styles.notFoundHint}>
          {liveError ?? "That player isn't available."}
        </Text>
      </View>
    );
  }

  const fav = isFavorite(view.favoriteKey);

  const trendIsUp = view.curated?.trend === 'Rising';
  const trendIsDown = view.curated?.trend === 'Declining';
  const trendColor = trendIsUp ? '#34c759' : trendIsDown ? '#ff3b30' : '#8e8e93';
  const trendIcon: SFSymbol = trendIsUp
    ? 'arrow.up.right.circle.fill'
    : trendIsDown
      ? 'arrow.down.right.circle.fill'
      : 'minus.circle.fill';

  const liveHitting = liveStats.find((s) => s.group === 'hitting');
  const livePitching = liveStats.find((s) => s.group === 'pitching');
  const careerHitting = liveCareer.find((s) => s.group === 'hitting');
  const careerPitching = liveCareer.find((s) => s.group === 'pitching');
  const yearsHitting = liveYears.filter((s) => s.group === 'hitting');
  const yearsPitching = liveYears.filter((s) => s.group === 'pitching');
  const showCareer = !view.curated && tab === 'career';
  const showYears = !view.curated && tab === 'years';
  const activeHitting = showCareer ? careerHitting : liveHitting;
  const activePitching = showCareer ? careerPitching : livePitching;
  const hasAnyCareer = !!(careerHitting || careerPitching);
  const hasAnyYears = yearsHitting.length > 0 || yearsPitching.length > 0;

  let bigLabel = '';
  let bigValue = '';
  let bigHint = '';
  if (view.curated) {
    bigLabel = tab === 'season' ? 'Season WAR' : 'Career WAR';
    bigValue = (tab === 'season'
      ? view.curated.seasonWAR
      : view.curated.careerWAR
    ).toFixed(1);
    bigHint = 'Wins Above Replacement';
  } else if (activePitching) {
    bigLabel = showCareer ? 'Career ERA' : `${activePitching.season} ERA`;
    bigValue = activePitching.era ?? '—';
    bigHint = 'Earned Run Average';
  } else if (activeHitting) {
    bigLabel = showCareer ? 'Career OPS' : `${activeHitting.season} OPS`;
    bigValue = activeHitting.ops ?? '—';
    bigHint = 'On-base Plus Slugging';
  } else {
    bigLabel = showCareer ? 'Career' : 'Season';
    bigValue = '—';
    bigHint = 'No stats available yet';
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: view.name,
          headerLargeTitle: false,
          headerTransparent: Platform.OS === 'ios',
          headerBlurEffect: 'systemChromeMaterial',
          headerLargeStyle: { backgroundColor: '#f2f2f7' },
          headerRight: () =>
            Platform.OS === 'ios' ? (
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable
                  onPress={onToggleFav}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={
                    fav ? 'Remove from favorites' : 'Add to favorites'
                  }
                >
                  <SymbolView
                    name={fav ? 'star.fill' : 'star'}
                    tintColor={fav ? theme.accent : theme.primary}
                    size={22}
                  />
                </Pressable>
                <Pressable
                  onPress={onShare}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Share player"
                >
                  <SymbolView
                    name="square.and.arrow.up"
                    tintColor={theme.primary}
                    size={22}
                  />
                </Pressable>
              </View>
            ) : null,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: '#f2f2f7' }}
        contentContainerStyle={styles.container}
      >
        <View style={styles.heroCard}>
          <PlayerAvatar mlbId={view.mlbId} size={96} />
          <Text style={styles.heroName}>{view.name}</Text>
          <Text style={styles.heroMeta}>
            {view.position} • {view.team}
          </Text>
          {view.curated ? (
            <View style={styles.trendPill}>
              {Platform.OS === 'ios' && (
                <SymbolView name={trendIcon} tintColor={trendColor} size={14} />
              )}
              <Text style={[styles.trendText, { color: trendColor }]}>
                {view.curated.trend}
              </Text>
            </View>
          ) : (
            <View style={styles.livePill}>
              {Platform.OS === 'ios' && (
                <SymbolView
                  name="dot.radiowaves.left.and.right"
                  tintColor={theme.primary}
                  size={12}
                />
              )}
              <Text style={styles.liveText}>Live Stats</Text>
            </View>
          )}
          <Text style={styles.heroBio}>{briefBio(view, livePerson)}</Text>
        </View>

        {(view.curated || (isLive && hasAnyCareer)) && (
          <View style={styles.segmentWrap}>
            {((isLive && hasAnyYears
              ? ['season', 'career', 'years']
              : ['season', 'career']) as Tab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  if (Platform.OS === 'ios')
                    Haptics.selectionAsync().catch(() => {});
                  setTab(t);
                }}
                style={[styles.segment, tab === t && styles.segmentActive]}
              >
                <Text
                  style={[styles.segmentText, tab === t && styles.segmentTextActive]}
                >
                  {t === 'season' ? 'Season' : t === 'career' ? 'Career' : 'Years'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {!showYears && (
          <View style={styles.bigValueCard}>
            <Text style={styles.bigValueLabel}>{bigLabel}</Text>
            <Text style={styles.bigValue}>{bigValue}</Text>
            <Text style={styles.bigValueHint}>{bigHint}</Text>
          </View>
        )}

        <BioCard view={view} person={livePerson} />

        {showYears && (
          <YearByYearTable hitting={yearsHitting} pitching={yearsPitching} />
        )}

        {view.curated && (
          <View style={styles.statsGrid}>
            <Tile label="Games Played" value={String(view.curated.gamesPlayed)} />
            <Tile label="Career WAR" value={view.curated.careerWAR.toFixed(1)} />
            <Tile label="Season WAR" value={view.curated.seasonWAR.toFixed(1)} />
            <Tile label="Position" value={view.curated.position} />
          </View>
        )}

        {!view.curated && !showYears && activeHitting && (
          <View style={styles.statsGrid}>
            <Tile label="AVG" value={activeHitting.avg ?? '—'} />
            <Tile label="HR" value={String(activeHitting.homeRuns ?? 0)} />
            <Tile label="RBI" value={String(activeHitting.rbi ?? 0)} />
            <Tile label="OPS" value={activeHitting.ops ?? '—'} />
            <Tile label="Hits" value={String(activeHitting.hits ?? 0)} />
            <Tile label="Games" value={String(activeHitting.gamesPlayed ?? 0)} />
          </View>
        )}
        {!view.curated && !showYears && activePitching && (
          <View style={styles.statsGrid}>
            <Tile label="ERA" value={activePitching.era ?? '—'} />
            <Tile
              label="W-L"
              value={`${activePitching.wins ?? 0}-${activePitching.losses ?? 0}`}
            />
            <Tile label="K" value={String(activePitching.strikeOuts ?? 0)} />
            <Tile label="WHIP" value={activePitching.whip ?? '—'} />
            <Tile label="IP" value={activePitching.inningsPitched ?? '—'} />
            <Tile label="Games" value={String(activePitching.gamesPlayed ?? 0)} />
          </View>
        )}
        {!view.curated && !showYears && !activeHitting && !activePitching && !liveError && (
          <View style={styles.emptyStats}>
            <Text style={styles.emptyHint}>
              No {new Date().getFullYear()} season stats published yet.
            </Text>
          </View>
        )}
        {liveError && (
          <View style={styles.emptyStats}>
            <Text style={styles.emptyHint}>{liveError}</Text>
          </View>
        )}

        <Pressable
          onPress={onShare}
          style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
        >
          {Platform.OS === 'ios' && (
            <SymbolView name="square.and.arrow.up" tintColor="#fff" size={18} />
          )}
          <Text style={styles.shareText}>Share Player</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const Tile = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statTile}>
    <Text style={styles.tileLabel}>{label}</Text>
    <Text style={styles.tileValue}>{value}</Text>
  </View>
);

const BioRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.bioRow}>
    <Text style={styles.bioLabel}>{label}</Text>
    <Text style={styles.bioValue}>{value}</Text>
  </View>
);

const HITTING_COLS: Array<{ key: keyof SeasonStatLine; label: string; width?: number }> = [
  { key: 'gamesPlayed', label: 'G' },
  { key: 'avg',         label: 'AVG' },
  { key: 'hits',        label: 'H' },
  { key: 'homeRuns',    label: 'HR' },
  { key: 'rbi',         label: 'RBI' },
  { key: 'obp',         label: 'OBP' },
  { key: 'slg',         label: 'SLG' },
  { key: 'ops',         label: 'OPS' },
];

const PITCHING_COLS: Array<{ key: keyof SeasonStatLine; label: string; width?: number }> = [
  { key: 'gamesPlayed',    label: 'G' },
  { key: 'wins',           label: 'W' },
  { key: 'losses',         label: 'L' },
  { key: 'era',            label: 'ERA' },
  { key: 'inningsPitched', label: 'IP' },
  { key: 'strikeOuts',     label: 'K' },
  { key: 'whip',           label: 'WHIP' },
];

function fmtCell(v: unknown): string {
  if (v == null || v === '') return '—';
  return String(v);
}

function StatTable({
  title,
  rows,
  cols,
}: {
  title: string;
  rows: SeasonStatLine[];
  cols: typeof HITTING_COLS;
}) {
  if (!rows.length) return null;
  const CELL_W = 56;
  const YEAR_W = 56;
  const TEAM_W = 130;
  return (
    <View style={styles.tableCard}>
      <Text style={styles.tableTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeadCell, { width: YEAR_W }]}>YEAR</Text>
            <Text style={[styles.tableHeadCell, { width: TEAM_W, textAlign: 'left' }]}>TEAM</Text>
            {cols.map((c) => (
              <Text key={c.label} style={[styles.tableHeadCell, { width: CELL_W }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {rows.map((r, i) => (
            <View
              key={`${r.season}-${r.team}-${i}`}
              style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
            >
              <Text style={[styles.tableCellYear, { width: YEAR_W }]}>{r.season}</Text>
              <Text
                style={[styles.tableCellTeam, { width: TEAM_W }]}
                numberOfLines={1}
              >
                {r.team ?? '—'}
              </Text>
              {cols.map((c) => (
                <Text key={c.label} style={[styles.tableCell, { width: CELL_W }]}>
                  {fmtCell((r as any)[c.key])}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function YearByYearTable({
  hitting,
  pitching,
}: {
  hitting: SeasonStatLine[];
  pitching: SeasonStatLine[];
}) {
  if (!hitting.length && !pitching.length) {
    return (
      <View style={styles.emptyStats}>
        <Text style={styles.emptyHint}>No year-by-year history available.</Text>
      </View>
    );
  }
  return (
    <>
      <StatTable title="Hitting — Year by Year" rows={hitting} cols={HITTING_COLS} />
      <StatTable title="Pitching — Year by Year" rows={pitching} cols={PITCHING_COLS} />
    </>
  );
}

function BioCard({ view, person }: { view: ViewPlayer; person: MlbPersonLite | null }) {
  const age = calcAge(person?.birthDate);
  const birthplace = person ? formatBirthplace(person) : null;
  const debut = formatDebut(person?.mlbDebutDate);
  const bats = person?.batSide?.description;
  const throws = person?.pitchHand?.description;
  const height = person?.height;
  const weight = person?.weight ? `${person.weight} lbs` : null;
  const number = person?.primaryNumber ? `#${person.primaryNumber}` : null;

  const rows = ([
    ['Team', view.team],
    ['Position', view.position],
    ['Number', number],
    ['Age', age != null ? `${age} years` : null],
    ['Birthplace', birthplace],
    ['Height / Weight', [height, weight].filter(Boolean).join(' \u00b7 ') || null],
    ['Bats / Throws', bats && throws ? `${bats} / ${throws}` : null],
    ['MLB Debut', debut],
  ] as Array<[string, string | null]>).filter((r): r is [string, string] => !!r[1]);

  return (
    <View style={styles.bioCard}>
      <View style={styles.bioHeader}>
        {Platform.OS === 'ios' && (
          <SymbolView name="person.text.rectangle.fill" tintColor={theme.primary} size={18} />
        )}
        <Text style={styles.bioHeaderText}>Player Bio</Text>
      </View>
      {rows.map(([label, value], i) => (
        <React.Fragment key={label}>
          {i > 0 && <View style={styles.bioDivider} />}
          <BioRow label={label} value={value} />
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  heroName: { marginTop: 12, fontSize: 22, fontWeight: '800', color: theme.primary },
  heroMeta: { marginTop: 4, fontSize: 14, color: '#6b7280' },
  heroBio: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: '#4b5563',
    textAlign: 'center',
  },
  trendPill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  trendText: { fontSize: 12, fontWeight: '700' },
  livePill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#002D7214',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveText: { fontSize: 12, fontWeight: '700', color: theme.primary },
  segmentWrap: {
    marginTop: 16,
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
  bigValueCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  bigValueLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.4,
  },
  bigValue: {
    marginTop: 6,
    fontSize: 64,
    fontWeight: '900',
    color: theme.primary,
    fontVariant: ['tabular-nums'],
  },
  bigValueHint: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  statsGrid: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statTile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tileLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  tileValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: theme.text,
    fontVariant: ['tabular-nums'],
  },
  emptyStats: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  emptyHint: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  bioCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  bioHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  bioLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  bioValue: {
    fontSize: 15,
    color: theme.text,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  bioDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e5ea' },
  tableCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingTop: 14,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tableTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d1d6',
    backgroundColor: '#f8f8fa',
  },
  tableHeadCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.4,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tableCell: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  tableCellYear: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.primary,
    fontVariant: ['tabular-nums'],
    textAlign: 'left',
    paddingHorizontal: 4,
  },
  tableCellTeam: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    paddingHorizontal: 4,
  },
  shareBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  notFound: {
    flex: 1,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  notFoundTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  notFoundHint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },
});
