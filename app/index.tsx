import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  fetchTodayGames,
  fetchMlbNews,
  fetchMlbTeams,
  fetchStandings,
  fetchTeamRoster,
  type MlbNewsItem,
  type PlayerSearchResult,
  type StandingRow,
  type TeamOption,
  type TeamRosterPlayer,
  type TodayGame,
  searchPlayersByName,
} from './src/api/mlb';
import AppLogo from './src/components/AppLogo';
import { theme } from './src/theme/colors';

type Section = 'news' | 'standings' | 'rosters';
const LAST_TEAM_STORAGE_KEY = 'diamondstats:lastTeamId';

const TRIVIA_FACTS = [
  'The MLB record for consecutive games hitting safely is 56 by Joe DiMaggio (1941).',
  'Nolan Ryan holds the all-time strikeout record with 5,714.',
  'Cal Ripken Jr. played 2,632 consecutive games — the “Iron Man” streak.',
  'Rickey Henderson is MLB’s all-time stolen base leader with 1,406.',
  'A regulation MLB game is 9 innings, but extra innings are unlimited in regular season play.',
  'The shortest complete game in MLB history lasted 51 minutes (1919).',
  'The first MLB All-Star Game was played in 1933 at Comiskey Park.',
  'Mariano Rivera has the most career saves in MLB history: 652.',
  'A perfect game means no opposing batter reaches base at all.',
  'The World Series winner receives the Commissioner’s Trophy each season.',
];

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function shortTeamName(name: string): string {
  const parts = name.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

function formatScore(score: number | null): string {
  return score === null ? '-' : String(score);
}

function formatGameTime(startTime: string): string {
  if (!startTime) {
    return 'TBD';
  }
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return 'TBD';
  }
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function mapPositionGroup(position: string): string {
  const pos = position.toUpperCase();
  if (['SP', 'RP', 'CP', 'P'].includes(pos)) {
    return 'Pitchers';
  }
  if (pos === 'C') {
    return 'Catchers';
  }
  if (['1B', '2B', '3B', 'SS', 'IF'].includes(pos)) {
    return 'Infielders';
  }
  if (['LF', 'CF', 'RF', 'OF'].includes(pos)) {
    return 'Outfielders';
  }
  if (pos === 'DH') {
    return 'Designated Hitters';
  }
  return 'Other';
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>('news');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [news, setNews] = useState<MlbNewsItem[]>([]);
  const [todayGames, setTodayGames] = useState<TodayGame[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number>(121);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [roster, setRoster] = useState<TeamRosterPlayer[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadHomeData = async () => {
      setLoadingSections(true);
      try {
        const [newsData, gamesData, standingsData, teamsData] = await Promise.all([
          fetchMlbNews(),
          fetchTodayGames(),
          fetchStandings(),
          fetchMlbTeams(),
        ]);

        const preferredTeamIdRaw = await AsyncStorage.getItem(LAST_TEAM_STORAGE_KEY);
        const preferredTeamId = preferredTeamIdRaw ? Number(preferredTeamIdRaw) : NaN;

        const defaultTeamId = Number.isFinite(preferredTeamId)
          ? preferredTeamId
          : teamsData.some((team) => team.id === 121)
            ? 121
            : teamsData[0]?.id ?? 121;

        const resolvedTeamId = teamsData.some((team) => team.id === defaultTeamId)
          ? defaultTeamId
          : teamsData[0]?.id ?? 121;

        const rosterData = await fetchTeamRoster(resolvedTeamId);

        if (!mounted) {
          return;
        }

        setNews(newsData);
        setTodayGames(gamesData);
        setStandings(standingsData);
        setTeams(teamsData);
        setSelectedTeamId(resolvedTeamId);
        setRoster(rosterData);
      } finally {
        if (mounted) {
          setLoadingSections(false);
        }
      }
    };

    void loadHomeData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearch = useCallback(async () => {
    const query = searchInput.trim();
    if (query.length < 2) {
      setSearchError('Type at least 2 letters.');
      setSearchResults([]);
      return;
    }

    setSearchError(null);
    setSearchLoading(true);
    try {
      const results = await searchPlayersByName(query);
      setSearchResults(results.slice(0, 8));
      if (results.length === 0) {
        setSearchError('No players found.');
      }
    } catch (_error) {
      setSearchError('Could not search players right now.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchInput]);

  const selectedTeamName = useMemo(
    () => teams.find((team) => team.id === selectedTeamId)?.name ?? 'Select Team',
    [selectedTeamId, teams],
  );

  const standingsByLeague = useMemo(() => {
    const grouped = standings.reduce<Record<string, Record<string, StandingRow[]>>>((acc, row) => {
      if (!acc[row.leagueName]) {
        acc[row.leagueName] = {};
      }
      if (!acc[row.leagueName][row.divisionName]) {
        acc[row.leagueName][row.divisionName] = [];
      }
      acc[row.leagueName][row.divisionName].push(row);
      return acc;
    }, {});

    const divOrder = (name: string) => {
      if (name.includes('East')) return 0;
      if (name.includes('Central')) return 1;
      if (name.includes('West')) return 2;
      return 3;
    };

    return Object.entries(grouped)
      .sort(([a], [b]) => {
        if (a.includes('National')) return -1;
        if (b.includes('National')) return 1;
        return a.localeCompare(b);
      })
      .map(([league, divisions]) => ({
        league,
        divisions: Object.entries(divisions)
          .sort(([a], [b]) => divOrder(a) - divOrder(b))
          .map(([division, rows]) => ({ division, rows })),
      }));
  }, [standings]);

  const rosterByGroup = useMemo(() => {
    const grouped = roster.reduce<Record<string, TeamRosterPlayer[]>>((acc, player) => {
      const group = mapPositionGroup(player.position);
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(player);
      return acc;
    }, {});

    const order = ['Pitchers', 'Catchers', 'Infielders', 'Outfielders', 'Designated Hitters', 'Other'];
    return order
      .filter((group) => grouped[group]?.length)
      .map((group) => ({
        group,
        players: grouped[group].sort((a, b) => a.fullName.localeCompare(b.fullName)),
      }));
  }, [roster]);

  const handleSelectTeam = useCallback(async (team: TeamOption) => {
    setSelectedTeamId(team.id);
    setShowTeamDropdown(false);
    setRosterLoading(true);
    void AsyncStorage.setItem(LAST_TEAM_STORAGE_KEY, String(team.id));
    try {
      const rosterData = await fetchTeamRoster(team.id);
      setRoster(rosterData);
    } finally {
      setRosterLoading(false);
    }
  }, []);

  const sectionTitle = useMemo(() => {
    switch (activeSection) {
      case 'standings':
        return 'MLB Standings';
      case 'rosters':
        return `${selectedTeamName} Roster`;
      default:
        return 'MLB News';
    }
  }, [activeSection, selectedTeamName]);

  const dailyTrivia = useMemo(() => {
    const index = getDayOfYear(new Date()) % TRIVIA_FACTS.length;
    return TRIVIA_FACTS[index];
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.sidebar}>
        <AppLogo />

        <NavItem
          label="News"
          active={activeSection === 'news'}
          onPress={() => setActiveSection('news')}
        />
        <NavItem
          label="Standings"
          active={activeSection === 'standings'}
          onPress={() => setActiveSection('standings')}
        />
        <NavItem
          label="Rosters"
          active={activeSection === 'rosters'}
          onPress={() => setActiveSection('rosters')}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeading}>Today’s Scoreboard</Text>
        {todayGames.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scoreboardRow}>
            {todayGames.map((game) => (
              <Pressable
                key={game.gamePk}
                style={({ pressed }) => [styles.scoreCard, pressed ? styles.buttonPressed : null]}
                onPress={() => {
                  router.push({ pathname: '/game/[gamePk]', params: { gamePk: String(game.gamePk) } });
                }}
              >
                <Text style={styles.scoreStatus}>{game.detailedState}</Text>
                <View style={styles.scoreTeamRow}>
                  <Text style={styles.scoreTeamName}>{shortTeamName(game.awayTeam)}</Text>
                  <Text style={styles.scoreNumber}>{formatScore(game.awayScore)}</Text>
                </View>
                <View style={styles.scoreTeamRow}>
                  <Text style={styles.scoreTeamName}>{shortTeamName(game.homeTeam)}</Text>
                  <Text style={styles.scoreNumber}>{formatScore(game.homeScore)}</Text>
                </View>
                <Text style={styles.scoreMeta}>
                  {game.inning ? `${game.inningState} ${game.inning}` : formatGameTime(game.startTime)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.dataCard}>
            <Text style={styles.cardTitle}>No games scheduled for today.</Text>
          </View>
        )}

        <Text style={styles.heading}>Find a Player</Text>
        <Text style={styles.subheading}>
          Enter a player name to open their baseball-card style profile.
        </Text>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="e.g. Francisco Lindor"
            placeholderTextColor={theme.mutedText}
            value={searchInput}
            onChangeText={setSearchInput}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={() => {
              void handleSearch();
            }}
          />
          <Pressable
            style={({ pressed }) => [styles.searchButton, pressed && styles.buttonPressed]}
            onPress={() => {
              void handleSearch();
            }}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        {searchLoading ? <ActivityIndicator color={theme.primary} /> : null}
        {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

        {searchResults.map((player) => (
          <Pressable
            key={player.id}
            style={({ pressed }) => [styles.playerRow, pressed && styles.buttonPressed]}
            onPress={() => {
              router.push({
                pathname: '/player/[playerId]',
                params: {
                  playerId: String(player.id),
                  name: player.fullName,
                  team: player.teamName,
                  position: player.position,
                },
              });
            }}
          >
            <View>
              <Text style={styles.playerName}>{player.fullName}</Text>
              <Text style={styles.playerMeta}>
                {player.position} • {player.teamName}
              </Text>
            </View>
            <Text style={styles.openText}>Open</Text>
          </Pressable>
        ))}

        <View style={styles.triviaCard}>
          <Text style={styles.triviaTitle}>Baseball Fact of the Day</Text>
          <Text style={styles.triviaText}>{dailyTrivia}</Text>
        </View>

        <Text style={styles.sectionHeading}>{sectionTitle}</Text>
        {loadingSections ? <ActivityIndicator color={theme.primary} /> : null}

        {!loadingSections && activeSection === 'news'
          ? news.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.dataCard, pressed ? styles.buttonPressed : null]}
                onPress={() => {
                  void Linking.openURL(item.linkUrl);
                }}
              >
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.publishedAt}</Text>
              </Pressable>
            ))
          : null}

        {!loadingSections && activeSection === 'standings' && (
          <View style={styles.standingsSurface}>
            <View style={styles.standingsTopTabs}>
              <View style={[styles.standingsTopTab, styles.standingsTopTabActive]}>
                <Text style={[styles.standingsTopTabText, styles.standingsTopTabTextActive]}>Divisional</Text>
              </View>
              <View style={styles.standingsTopTab}>
                <Text style={styles.standingsTopTabText}>Wild Card</Text>
              </View>
            </View>

            {standingsByLeague.map((leagueBlock) => (
              <View key={leagueBlock.league}>
                <View style={styles.leagueHeaderRow}>
                  <Text style={styles.leagueHeaderText}>{leagueBlock.league}</Text>
                </View>

                {leagueBlock.divisions.map((divisionBlock) => (
                  <View key={`${leagueBlock.league}-${divisionBlock.division}`}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.standingsTable}>
                        <View style={styles.divisionHeaderRow}>
                          <View style={styles.divTeamCol}>
                            <Text style={styles.divisionLabel}>{divisionBlock.division}</Text>
                          </View>
                          <Text style={[styles.colLabel, styles.colW]}>W</Text>
                          <Text style={[styles.colLabel, styles.colL]}>L</Text>
                          <Text style={[styles.colLabel, styles.colPct]}>PCT</Text>
                          <Text style={[styles.colLabel, styles.colGb]}>GB</Text>
                          <Text style={[styles.colLabel, styles.colL10]}>L10</Text>
                          <Text style={[styles.colLabel, styles.colStrk]}>STRK</Text>
                          <Text style={[styles.colLabel, styles.colRs]}>RS</Text>
                        </View>

                        {divisionBlock.rows
                          .slice()
                          .sort((a, b) => a.divisionRank - b.divisionRank)
                          .map((row) => (
                            <View key={row.id} style={styles.standingsTeamRow}>
                              <View style={styles.divTeamCol}>
                                <Image
                                  source={{ uri: `https://midfield.mlbstatic.com/v1/team/${row.teamId}/spots/72` }}
                                  style={styles.teamLogoImg}
                                />
                                <Text style={styles.teamAbbrevLabel}>{row.teamAbbrev}</Text>
                              </View>
                              <Text style={[styles.statCell, styles.colW]}>{row.wins}</Text>
                              <Text style={[styles.statCell, styles.colL]}>{row.losses}</Text>
                              <Text style={[styles.statCellBold, styles.colPct]}>{row.winPct}</Text>
                              <Text style={[styles.statCell, styles.colGb]}>{row.gamesBack}</Text>
                              <Text style={[styles.statCell, styles.colL10]}>{row.lastTenRecord}</Text>
                              <Text style={[styles.statCell, styles.colStrk]}>{row.streak}</Text>
                              <Text style={[styles.statCell, styles.colRs]}>{row.runsScored}</Text>
                            </View>
                          ))}
                      </View>
                    </ScrollView>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {!loadingSections && activeSection === 'rosters' ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.dropdownButton, pressed && styles.buttonPressed]}
              onPress={() => setShowTeamDropdown((current) => !current)}
            >
              <Text style={styles.dropdownText}>{selectedTeamName}</Text>
              <Text style={styles.dropdownChevron}>{showTeamDropdown ? '▲' : '▼'}</Text>
            </Pressable>

            {showTeamDropdown ? (
              <View style={styles.dropdownPanel}>
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {teams.map((item) => (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        item.id === selectedTeamId ? styles.dropdownItemActive : null,
                        pressed ? styles.buttonPressed : null,
                      ]}
                      onPress={() => {
                        void handleSelectTeam(item);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          item.id === selectedTeamId ? styles.dropdownItemTextActive : null,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {rosterLoading ? <ActivityIndicator color={theme.primary} /> : null}
            {!rosterLoading
              ? rosterByGroup.map((group) => (
                  <View key={group.group} style={styles.rosterGroupBlock}>
                    <Text style={styles.rosterGroupTitle}>{group.group}</Text>
                    {group.players.map((player) => (
                      <Pressable
                        key={player.id}
                        style={({ pressed }) => [styles.rowCard, pressed ? styles.buttonPressed : null]}
                        onPress={() => {
                          router.push({
                            pathname: '/player/[playerId]',
                            params: {
                              playerId: String(player.id),
                              name: player.fullName,
                              team: selectedTeamName,
                              position: player.position,
                            },
                          });
                        }}
                      >
                        <Text style={styles.rowPrimary}>{player.fullName}</Text>
                        <Text style={styles.rowSecondary}>
                          {player.position}
                          {player.jerseyNumber ? ` • #${player.jerseyNumber}` : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ))
              : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function NavItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.navItem, active ? styles.navItemActive : null]} onPress={onPress}>
      <Text style={[styles.navItemText, active ? styles.navItemTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.background,
  },
  sidebar: {
    width: 120,
    backgroundColor: '#f3f4f6',
    paddingTop: 48,
    paddingHorizontal: 10,
    gap: 12,
    borderRightWidth: 1,
    borderRightColor: theme.border,
  },
  navItem: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: '#ffffff',
  },
  navItemActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  navItemText: {
    color: theme.primary,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  navItemTextActive: {
    color: '#1e3a8a',
  },
  content: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.primary,
  },
  subheading: {
    fontSize: 14,
    color: theme.mutedText,
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
  },
  searchButton: {
    backgroundColor: theme.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  playerRow: {
    backgroundColor: '#ffffff',
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 15,
  },
  playerMeta: {
    color: theme.mutedText,
    fontSize: 13,
    marginTop: 2,
  },
  openText: {
    color: theme.primary,
    fontWeight: '700',
  },
  sectionHeading: {
    marginTop: 8,
    fontSize: 19,
    fontWeight: '800',
    color: theme.primary,
  },
  scoreboardRow: {
    gap: 10,
    paddingVertical: 2,
    paddingRight: 8,
  },
  scoreCard: {
    width: 170,
    backgroundColor: '#0b1020',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 10,
    gap: 6,
  },
  scoreStatus: {
    color: '#67e8f9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  scoreTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreTeamName: {
    color: '#e5e7eb',
    fontWeight: '700',
    fontSize: 14,
  },
  scoreNumber: {
    color: '#fbbf24',
    fontWeight: '900',
    fontSize: 20,
  },
  scoreMeta: {
    color: '#9ca3af',
    fontWeight: '700',
    fontSize: 12,
  },
  triviaCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 12,
    marginTop: 2,
  },
  triviaTitle: {
    color: '#9a3412',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  triviaText: {
    color: '#7c2d12',
    fontWeight: '600',
    lineHeight: 20,
  },
  dataCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
  },
  cardTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardMeta: {
    color: theme.mutedText,
    fontSize: 12,
  },
  rowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowPrimary: {
    color: theme.text,
    fontWeight: '700',
    flex: 1,
  },
  rowSecondary: {
    color: theme.mutedText,
    fontWeight: '600',
    marginLeft: 8,
  },
  standingsSurface: {
    backgroundColor: '#0c1222',
    borderRadius: 12,
    overflow: 'hidden',
  },
  standingsTopTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e2636',
  },
  standingsTopTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  standingsTopTabActive: {
    borderBottomColor: '#3b82f6',
  },
  standingsTopTabText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  standingsTopTabTextActive: {
    color: '#ffffff',
  },
  leagueHeaderRow: {
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 10,
  },
  leagueHeaderText: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '800',
  },
  standingsTable: {
    minWidth: 400,
  },
  divisionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  divTeamCol: {
    width: 110,
    flexDirection: 'row',
    alignItems: 'center',
  },
  divisionLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  colLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  colW: { width: 36 },
  colL: { width: 36 },
  colPct: { width: 46 },
  colGb: { width: 40 },
  colL10: { width: 38 },
  colStrk: { width: 44 },
  colRs: { width: 46 },
  standingsTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1a2234',
  },
  teamLogoImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#1a2234',
  },
  teamAbbrevLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '700',
  },
  statCell: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  statCellBold: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  dropdownButton: {
    backgroundColor: '#ffffff',
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: theme.text,
    fontWeight: '700',
    flex: 1,
  },
  dropdownChevron: {
    color: theme.primary,
    fontWeight: '700',
    marginLeft: 8,
  },
  dropdownPanel: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    maxHeight: 220,
    overflow: 'hidden',
  },
  dropdownList: {
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    color: theme.text,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: theme.primary,
    fontWeight: '800',
  },
  rosterGroupBlock: {
    gap: 8,
    marginBottom: 8,
  },
  rosterGroupTitle: {
    color: theme.primary,
    fontWeight: '800',
    fontSize: 15,
  },
});