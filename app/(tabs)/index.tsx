import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  fetchMlbNews,
  fetchStatLeaders,
  fetchTodayGames,
  searchPlayersByName,
  type LeaderCategory,
  type MlbNewsItem,
  type PlayerSearchResult,
  type TodayGame,
} from '../src/api/mlb';
import { getCached, invalidateCache } from '../src/utils/cache';
import { theme } from '../src/theme/colors';

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
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ScoresTab() {
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

  /* ---- Render --------------------------------------------------- */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      {/* ── Player Search ──────────────────────────────────────── */}
      <View style={styles.searchWrapper}>
        <TextInput
          placeholder="🔍  Search any player…"
          placeholderTextColor={theme.mutedText}
          value={searchQuery}
          onChangeText={(t) => void handleSearch(t)}
          style={styles.searchInput}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {showDropdown && (
          <View style={styles.dropdown}>
            {searchLoading ? (
              <ActivityIndicator color={theme.primary} style={{ paddingVertical: 12 }} />
            ) : searchResults.length > 0 ? (
              searchResults.map((player) => (
                <Pressable
                  key={player.id}
                  style={({ pressed }) => [styles.dropdownRow, pressed && styles.pressed]}
                  onPress={() => selectPlayer(player)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropdownName}>{player.fullName}</Text>
                    <Text style={styles.dropdownMeta}>
                      {player.position} • {player.teamName}
                    </Text>
                  </View>
                  <Text style={styles.dropdownArrow}>→</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.dropdownEmpty}>No players found</Text>
            )}
          </View>
        )}
      </View>

      {/* ── Scoreboard ─────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Today's Games</Text>
      {games.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gameRow}
        >
          {games.map((game) => (
            <Pressable
              key={game.gamePk}
              style={({ pressed }) => [styles.gameCard, pressed && styles.pressed]}
              onPress={() =>
                router.push({
                  pathname: '/game/[gamePk]',
                  params: { gamePk: String(game.gamePk) },
                })
              }
            >
              <Text style={styles.gameStatus}>{game.detailedState}</Text>
              <View style={styles.gameTeamRow}>
                <Text style={styles.gameTeamName}>{shortTeamName(game.awayTeam)}</Text>
                <Text style={styles.gameScore}>{formatScore(game.awayScore)}</Text>
              </View>
              <View style={styles.gameTeamRow}>
                <Text style={styles.gameTeamName}>{shortTeamName(game.homeTeam)}</Text>
                <Text style={styles.gameScore}>{formatScore(game.homeScore)}</Text>
              </View>
              <Text style={styles.gameMeta}>
                {game.inning
                  ? `${game.inningState} ${game.inning}`
                  : formatGameTime(game.startTime)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No games scheduled for today</Text>
        </View>
      )}

      {/* ── Who's Hot ──────────────────────────────────────────── */}
      {leaders.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            Who's Hot 🔥{leadersSeason ? ` • ${leadersSeason}` : ''}
          </Text>
          {leadersIsFallback && (
            <Text style={styles.fallbackNote}>
              Showing last season's leaders — {new Date().getFullYear()} season hasn't started yet
            </Text>
          )}
          <View style={styles.leadersCard}>
            {leaders.map((cat) => (
              <View key={cat.category} style={styles.leaderSection}>
                <Text style={styles.leaderCatLabel}>{cat.categoryLabel}</Text>
                {cat.leaders.slice(0, 3).map((leader) => (
                  <Pressable
                    key={`${cat.category}-${leader.rank}`}
                    style={({ pressed }) => [styles.leaderRow, pressed && styles.pressed]}
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
                    <Text style={styles.leaderRank}>{leader.rank}</Text>
                    <View style={styles.leaderInfo}>
                      <Text style={styles.leaderName} numberOfLines={1}>
                        {leader.playerName}
                      </Text>
                      <Text style={styles.leaderTeam}>{leader.teamAbbrev}</Text>
                    </View>
                    <Text style={styles.leaderValue}>{leader.value}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Trivia ─────────────────────────────────────────────── */}
      <View style={styles.triviaCard}>
        <Text style={styles.triviaTitle}>⚾ Baseball Fact of the Day</Text>
        <Text style={styles.triviaText}>{dailyTrivia}</Text>
      </View>

      {/* ── News ───────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Latest News</Text>
      {news.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [styles.newsCard, pressed && styles.pressed]}
          onPress={() => void Linking.openURL(item.linkUrl)}
        >
          <Text style={styles.newsTitle}>{item.title}</Text>
          <Text style={styles.newsMeta}>{item.publishedAt}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: theme.text, marginTop: 4 },
  fallbackNote: { color: theme.mutedText, fontSize: 12, fontWeight: '600', fontStyle: 'italic', marginTop: -4 },

  /* Scoreboard */
  gameRow: { gap: 10, paddingVertical: 4, paddingRight: 8 },
  gameCard: {
    width: 170,
    backgroundColor: '#0b1020',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
    gap: 6,
  },
  gameStatus: {
    color: '#67e8f9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  gameTeamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gameTeamName: { color: '#e5e7eb', fontWeight: '700', fontSize: 14 },
  gameScore: { color: '#fbbf24', fontWeight: '900', fontSize: 20 },
  gameMeta: { color: '#9ca3af', fontWeight: '700', fontSize: 12 },

  /* Who's Hot */
  leadersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    gap: 18,
  },
  leaderSection: { gap: 4 },
  leaderCatLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  leaderRank: {
    width: 22,
    color: theme.mutedText,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  leaderInfo: { flex: 1 },
  leaderName: { color: theme.text, fontWeight: '700', fontSize: 14 },
  leaderTeam: { color: theme.mutedText, fontSize: 12, fontWeight: '600' },
  leaderValue: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '900',
    minWidth: 50,
    textAlign: 'right',
  },

  /* Trivia */
  triviaCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 14,
  },
  triviaTitle: { color: '#9a3412', fontWeight: '800', fontSize: 14, marginBottom: 4 },
  triviaText: { color: '#7c2d12', fontWeight: '600', lineHeight: 20 },

  /* News */
  newsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
  },
  newsTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  newsMeta: { color: theme.mutedText, fontSize: 12 },

  /* Player search */
  searchWrapper: { zIndex: 10 },
  searchInput: {
    backgroundColor: '#ffffff',
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomColor: theme.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownName: { color: theme.text, fontWeight: '700', fontSize: 15 },
  dropdownMeta: { color: theme.mutedText, fontSize: 12, marginTop: 1 },
  dropdownArrow: { color: theme.primary, fontWeight: '800', fontSize: 16 },
  dropdownEmpty: {
    color: theme.mutedText,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 14,
  },

  /* Shared */
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: theme.mutedText, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
