import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BRAND_LOGO = require('../../assets/logo-home.png');
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  fetchMlbNews,
  fetchStatLeaders,
  fetchTodayGames,
  searchPlayersByName,
  type LeaderCategory,
  type MlbNewsItem,
  type PlayerSearchResult,
  type TodayGame,
} from '../../src/api/mlb';
import { getCached, invalidateCache } from '../../src/utils/cache';
import { theme, shadows, radii, spacing } from '../../src/theme/colors';
import { useResponsive } from '../../src/utils/useResponsive';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const TRIVIA_FACTS = [
  'The MLB record for consecutive games hitting safely is 56 by Joe DiMaggio (1941).',
  'Nolan Ryan holds the all-time strikeout record with 5,714.',
  "Cal Ripken Jr. played 2,632 consecutive games — the 'Iron Man' streak.",
  "Rickey Henderson is MLB's all-time stolen base leader with 1,406.",
  'A regulation MLB game is 9 innings, but extra innings are unlimited in regular season play.',
  'The shortest complete game in MLB history lasted 51 minutes (1919).',
  'The first MLB All-Star Game was played in 1933 at Comiskey Park.',
  'Mariano Rivera has the most career saves in MLB history: 652.',
  'A perfect game means no opposing batter reaches base at all.',
  "The World Series winner receives the Commissioner's Trophy each season.",
];

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function shortTeamName(name: string): string {
  const parts = name.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

function formatScore(score: number | null): string {
  return score === null ? '-' : String(score);
}

function formatGameTime(startTime: string): string {
  if (!startTime) return 'TBD';
  const d = new Date(startTime);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const TTL = {
  games: 2 * 60 * 1000,
  news: 10 * 60 * 1000,
  leaders: 15 * 60 * 1000,
};

/* ------------------------------------------------------------------ */
/*  Section Header                                                    */
/* ------------------------------------------------------------------ */

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    fire: 'flame',
    news: 'newspaper',
    baseball: 'baseball',
    games: 'tv',
    bulb: 'bulb',
    trending: 'trending-up',
  };
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconBadge}>
        <Ionicons name={iconMap[icon] ?? 'baseball'} size={16} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function HomeScreen() {
  const router = useRouter();
  const [games, setGames] = useState<TodayGame[]>([]);
  const [news, setNews] = useState<MlbNewsItem[]>([]);
  const [leaders, setLeaders] = useState<LeaderCategory[]>([]);
  const [leadersSeason, setLeadersSeason] = useState<string>('');
  const [leadersIsFallback, setLeadersIsFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* Player search */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    setShowDropdown(true);
    try {
      const data = await searchPlayersByName(text.trim());
      setSearchResults(data.slice(0, 6));
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const selectPlayer = useCallback((player: PlayerSearchResult) => {
    setShowDropdown(false);
    setSearchQuery('');
    setSearchResults([]);
    router.push({
      pathname: '/player/[playerId]',
      params: {
        playerId: String(player.id),
        name: player.fullName,
        team: player.teamName,
        position: player.position,
      },
    });
  }, [router]);

  const loadData = useCallback(async (skipCache = false) => {
    try {
      if (skipCache) {
        await Promise.all([
          invalidateCache('todayGames'),
          invalidateCache('mlbNews'),
          invalidateCache('statLeaders'),
        ]);
      }
      const [g, n, leadersResult] = await Promise.all([
        getCached('todayGames', fetchTodayGames, TTL.games),
        getCached('mlbNews', fetchMlbNews, TTL.news),
        getCached('statLeaders', fetchStatLeaders, TTL.leaders),
      ]);
      setGames(g);
      setNews(n);
      setLeaders(leadersResult.categories);
      setLeadersSeason(leadersResult.season);
      setLeadersIsFallback(leadersResult.isFallback);
    } catch {
      /* Silently handle — show whatever we have */
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadData().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const dailyTrivia = useMemo(
    () => TRIVIA_FACTS[getDayOfYear(new Date()) % TRIVIA_FACTS.length],
    [],
  );

  const { isTablet, gridCols, maxContentWidth, outerPadding } = useResponsive();

  /* ---- Render --------------------------------------------------- */

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, { padding: outerPadding, alignItems: isTablet ? 'center' : undefined }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <View style={maxContentWidth ? { width: '100%', maxWidth: maxContentWidth } : undefined}>

      {/* ── Brand Logo ─────────────────────────────────────────── */}
      <View style={s.logoWrap}>
        <Image source={BRAND_LOGO} style={s.brandLogo} resizeMode="contain" />
      </View>

      {/* ── Player Search ──────────────────────────────────────── */}
      <View style={s.searchWrapper}>
        <View style={s.searchInputWrap}>
          {Platform.OS === 'ios' && (
            <BlurView intensity={50} tint="systemThinMaterial" style={StyleSheet.absoluteFill} />
          )}
          <Ionicons name="search" size={18} color={theme.mutedText} style={{ marginLeft: 14 }} />
          <TextInput
            placeholder="Search any player…"
            placeholderTextColor={theme.mutedText}
            value={searchQuery}
            onChangeText={(t) => void handleSearch(t)}
            style={[s.searchInput, isTablet && { fontSize: 17, paddingVertical: 14 }]}
            autoCapitalize="words"
            returnKeyType="search"
          />
        </View>
        {showDropdown && (
          <View style={s.dropdown}>
            {Platform.OS === 'ios' && (
              <BlurView intensity={70} tint="systemThinMaterial" style={StyleSheet.absoluteFill} />
            )}
            {searchLoading ? (
              <ActivityIndicator color={theme.primary} style={{ paddingVertical: 12 }} />
            ) : searchResults.length > 0 ? (
              searchResults.map((player) => (
                <Pressable
                  key={player.id}
                  style={({ pressed }) => [s.dropdownRow, pressed && s.pressed]}
                  onPress={() => selectPlayer(player)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.dropdownName}>{player.fullName}</Text>
                    <Text style={s.dropdownMeta}>
                      {player.position} · {player.teamName}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.mutedText} />
                </Pressable>
              ))
            ) : (
              <Text style={s.dropdownEmpty}>No players found</Text>
            )}
          </View>
        )}
      </View>

      {/* ── News ───────────────────────────────────────────────── */}
      <SectionHeader icon="news" title="Latest News" />
      <View style={isTablet ? { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } : { gap: 10 }}>
        {news.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              s.newsCard,
              isTablet && { width: '48%' as unknown as number },
              pressed && s.pressed,
            ]}
            onPress={() => void Linking.openURL(item.linkUrl)}
          >
            <View style={s.newsCardInner}>
              <View style={{ flex: 1 }}>
                <Text style={s.newsTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={s.newsMeta}>{item.publishedAt}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.mutedText} style={{ marginLeft: 8 }} />
            </View>
          </Pressable>
        ))}
      </View>

      {/* ── Who's Hot ──────────────────────────────────────────── */}
      {leaders.length > 0 && (
        <>
          <SectionHeader
            icon="fire"
            title="Who's Hot"
            subtitle={
              leadersIsFallback
                ? `Showing ${leadersSeason} leaders`
                : leadersSeason
                  ? `${leadersSeason} Season`
                  : undefined
            }
          />
          <View style={isTablet ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } : { gap: 12 }}>
            {leaders.map((cat) => (
              <View
                key={cat.category}
                style={[s.leaderCard, isTablet && { width: '48%' as unknown as number }]}
              >
                <View style={s.leaderCardHeader}>
                  <Ionicons
                    name={cat.categoryLabel.includes('ERA') ? 'baseball' : cat.categoryLabel.includes('HR') ? 'flash' : 'trending-up'}
                    size={14}
                    color={theme.accent}
                  />
                  <Text style={s.leaderCatLabel}>{cat.categoryLabel}</Text>
                </View>
                {cat.leaders.slice(0, 3).map((leader, idx) => (
                  <Pressable
                    key={`${cat.category}-${leader.rank}`}
                    style={({ pressed }) => [s.leaderRow, pressed && s.pressed]}
                    onPress={() => {
                      if (leader.playerId > 0) {
                        router.push({
                          pathname: '/player/[playerId]',
                          params: {
                            playerId: String(leader.playerId),
                            name: leader.playerName,
                          },
                        });
                      }
                    }}
                  >
                    <View style={[s.rankBadge, idx === 0 && s.rankBadgeFirst]}>
                      <Text style={[s.rankText, idx === 0 && s.rankTextFirst]}>{leader.rank}</Text>
                    </View>
                    <View style={s.leaderInfo}>
                      <Text style={s.leaderName} numberOfLines={1}>{leader.playerName}</Text>
                      <Text style={s.leaderTeam}>{leader.teamAbbrev}</Text>
                    </View>
                    <Text style={[s.leaderValue, idx === 0 && s.leaderValueFirst]}>{leader.value}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Trivia ─────────────────────────────────────────────── */}
      <View style={s.triviaOuter}>
        <LinearGradient
          colors={['#0A2A66', '#133A8A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.triviaGradient}
        >
          <View style={s.triviaHeader}>
            <Ionicons name="baseball" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={s.triviaTitle}>Fact of the Day</Text>
          </View>
          <Text style={s.triviaText}>{dailyTrivia}</Text>
        </LinearGradient>
      </View>

      {/* ── Scoreboard ─────────────────────────────────────────── */}
      <SectionHeader icon="games" title="Today's Games" />
      {games.length > 0 && games[0].gameType === 'S' && (
        <View style={s.springBadge}>
          <Ionicons name="leaf" size={13} color="#16A34A" />
          <Text style={s.springBadgeText}>Spring Training</Text>
        </View>
      )}
      {games.length > 0 ? (
        isTablet ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {games.map((game) => (
              <Pressable
                key={game.gamePk}
                style={({ pressed }) => [
                  s.gameCard,
                  { width: `${Math.floor(100 / gridCols) - 2}%` as unknown as number, flexGrow: 0 },
                  pressed && s.pressed,
                ]}
                onPress={() =>
                  router.push({ pathname: '/game/[gamePk]', params: { gamePk: String(game.gamePk) } })
                }
              >
                <View style={s.gameStatusRow}>
                  <View style={[s.gameStatusDot, game.detailedState === 'In Progress' && s.gameStatusLive]} />
                  <Text style={s.gameStatus}>{game.detailedState}</Text>
                </View>
                <View style={s.gameTeamRow}>
                  <Text style={s.gameTeamName}>{shortTeamName(game.awayTeam)}</Text>
                  <Text style={s.gameScore}>{formatScore(game.awayScore)}</Text>
                </View>
                <View style={s.gameTeamRow}>
                  <Text style={s.gameTeamName}>{shortTeamName(game.homeTeam)}</Text>
                  <Text style={s.gameScore}>{formatScore(game.homeScore)}</Text>
                </View>
                <Text style={s.gameMeta}>
                  {game.inning ? `${game.inningState} ${game.inning}` : formatGameTime(game.startTime)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gameRow}>
            {games.map((game) => (
              <Pressable
                key={game.gamePk}
                style={({ pressed }) => [s.gameCard, pressed && s.pressed]}
                onPress={() =>
                  router.push({ pathname: '/game/[gamePk]', params: { gamePk: String(game.gamePk) } })
                }
              >
                <View style={s.gameStatusRow}>
                  <View style={[s.gameStatusDot, game.detailedState === 'In Progress' && s.gameStatusLive]} />
                  <Text style={s.gameStatus}>{game.detailedState}</Text>
                </View>
                <View style={s.gameTeamRow}>
                  <Text style={s.gameTeamName}>{shortTeamName(game.awayTeam)}</Text>
                  <Text style={s.gameScore}>{formatScore(game.awayScore)}</Text>
                </View>
                <View style={s.gameTeamRow}>
                  <Text style={s.gameTeamName}>{shortTeamName(game.homeTeam)}</Text>
                  <Text style={s.gameScore}>{formatScore(game.homeScore)}</Text>
                </View>
                <Text style={s.gameMeta}>
                  {game.inning ? `${game.inningState} ${game.inning}` : formatGameTime(game.startTime)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )
      ) : (
        <View style={s.emptyCard}>
          <Ionicons name="calendar-outline" size={28} color={theme.mutedText} />
          <Text style={s.emptyText}>No games scheduled for today</Text>
        </View>
      )}
      </View>{/* end maxContentWidth wrapper */}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const CARD_RADIUS = radii.lg;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Brand logo */
  logoWrap: { alignItems: 'center', marginBottom: 4 },
  brandLogo: { width: 220, height: 80 },

  /* Section headers */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.sm },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 106, 19, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 12, fontWeight: '600', color: theme.mutedText, marginTop: 1 },

  /* Scoreboard */
  gameRow: { gap: 10, paddingVertical: 4, paddingRight: 8 },
  gameCard: {
    width: 175,
    backgroundColor: theme.surface,
    borderRadius: CARD_RADIUS,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  gameStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gameStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.mutedText,
  },
  gameStatusLive: { backgroundColor: '#16A34A' },
  gameStatus: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  gameTeamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gameTeamName: { color: theme.text, fontWeight: '700', fontSize: 15 },
  gameScore: { color: theme.primary, fontWeight: '900', fontSize: 22 },
  gameMeta: { color: theme.mutedText, fontWeight: '600', fontSize: 12, marginTop: -2 },

  /* Who's Hot — leader cards */
  leaderCard: {
    backgroundColor: theme.surface,
    borderRadius: CARD_RADIUS,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  leaderCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  leaderCatLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 42, 102, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeFirst: { backgroundColor: theme.accent },
  rankText: { color: theme.mutedText, fontSize: 12, fontWeight: '800' },
  rankTextFirst: { color: '#fff' },
  leaderInfo: { flex: 1 },
  leaderName: { color: theme.text, fontWeight: '700', fontSize: 14 },
  leaderTeam: { color: theme.mutedText, fontSize: 12, fontWeight: '600' },
  leaderValue: {
    color: theme.primary,
    fontSize: 17,
    fontWeight: '900',
    minWidth: 50,
    textAlign: 'right',
  },
  leaderValueFirst: { color: theme.accent },

  /* Trivia */
  triviaOuter: { borderRadius: CARD_RADIUS, overflow: 'hidden', ...shadows.lg },
  triviaGradient: { padding: 18, borderRadius: CARD_RADIUS },
  triviaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  triviaTitle: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 15 },
  triviaText: { color: '#ffffff', fontWeight: '600', fontSize: 14, lineHeight: 22 },

  /* News */
  newsCard: {
    backgroundColor: theme.surface,
    borderRadius: CARD_RADIUS,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  newsCardInner: { flexDirection: 'row', alignItems: 'center' },
  newsTitle: { color: theme.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  newsMeta: { color: theme.mutedText, fontSize: 12, marginTop: 4 },

  /* Player search */
  searchWrapper: { zIndex: 10 },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.glass,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    overflow: 'hidden',
    ...shadows.glass,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
  },
  dropdown: {
    backgroundColor: theme.surfaceElevated,
    borderRadius: radii.md,
    marginTop: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.lg,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomColor: theme.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownName: { color: theme.text, fontWeight: '700', fontSize: 15 },
  dropdownMeta: { color: theme.mutedText, fontSize: 12, marginTop: 1 },
  dropdownEmpty: {
    color: theme.mutedText,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 14,
  },

  /* Shared */
  emptyCard: {
    backgroundColor: theme.surface,
    borderRadius: CARD_RADIUS,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  emptyText: { color: theme.mutedText, fontWeight: '600' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },

  /* Spring Training badge */
  springBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(240, 253, 244, 0.75)',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  springBadgeText: {
    color: '#16A34A',
    fontWeight: '700',
    fontSize: 12,
  },
});
