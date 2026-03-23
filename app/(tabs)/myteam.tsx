import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  fetchMlbTeams,
  fetchStandings,
  fetchTeamRoster,
  fetchTeamSchedule,
  type StandingRow,
  type TeamOption,
  type TeamRosterPlayer,
  type TeamScheduleGame,
} from '../../src/api/mlb';
import { getCached, invalidateCache } from '../../src/utils/cache';
import { theme, shadows, radii } from '../../src/theme/colors';
import { useResponsive } from '../../src/utils/useResponsive';

function espnLogoUrlById(teamId: number, teamName: string): string {
  // Extract abbreviation from common team names as fallback
  const TEAM_ID_TO_ABBREV: Record<number, string> = {
    108: 'laa', 109: 'ari', 110: 'bal', 111: 'bos', 112: 'chc',
    113: 'cin', 114: 'cle', 115: 'col', 116: 'det', 117: 'hou',
    118: 'kc', 119: 'lad', 120: 'wsh', 121: 'nym', 133: 'oak',
    134: 'pit', 135: 'sd', 136: 'sea', 137: 'sf', 138: 'stl',
    139: 'tb', 140: 'tex', 141: 'tor', 142: 'min', 143: 'phi',
    144: 'atl', 145: 'chw', 146: 'mia', 147: 'nyy', 158: 'mil',
  };
  const slug = TEAM_ID_TO_ABBREV[teamId] ?? teamName.split(' ').pop()?.toLowerCase() ?? 'mlb';
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${slug}.png`;
}

const FAV_TEAM_KEY = 'diamondstats:favoriteTeam';
const TTL = {
  teams: 60 * 60 * 1000,
  standings: 15 * 60 * 1000,
  roster: 30 * 60 * 1000,
  schedule: 10 * 60 * 1000,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function mapPositionGroup(position: string): string {
  const pos = position.toUpperCase();
  if (['SP', 'RP', 'CP', 'P'].includes(pos)) return 'Pitchers';
  if (pos === 'C') return 'Catchers';
  if (['1B', '2B', '3B', 'SS', 'IF'].includes(pos)) return 'Infielders';
  if (['LF', 'CF', 'RF', 'OF'].includes(pos)) return 'Outfielders';
  if (pos === 'DH') return 'Designated Hitters';
  return 'Other';
}

function formatGameDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatGameTime(startTime: string): string {
  if (!startTime) return 'TBD';
  const d = new Date(startTime);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface SavedTeam {
  id: number;
  name: string;
}

export default function MyTeamTab() {
  const router = useRouter();

  /* Which view to show */
  const [viewState, setViewState] = useState<'loading' | 'picking' | 'team'>('loading');

  /* Picker data */
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);

  /* Selected team data */
  const [favTeam, setFavTeam] = useState<SavedTeam | null>(null);
  const [teamStanding, setTeamStanding] = useState<StandingRow | null>(null);
  const [roster, setRoster] = useState<TeamRosterPlayer[]>([]);
  const [schedule, setSchedule] = useState<TeamScheduleGame[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ── Initialise ────────────────────────────────────────────────── */

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const raw = await AsyncStorage.getItem(FAV_TEAM_KEY).catch(() => null);
      if (raw) {
        try {
          const saved: SavedTeam = JSON.parse(raw);
          if (saved.id && saved.name && mounted) {
            setFavTeam(saved);
            setViewState('team');
            return;
          }
        } catch {
          /* corrupted – fall through */
        }
      }

      /* No saved team – load teams for picker */
      const teams = await getCached('allTeams', fetchMlbTeams, TTL.teams);
      if (mounted) {
        setAllTeams(teams);
        setViewState('picking');
      }
    };

    void init();
    return () => {
      mounted = false;
    };
  }, []);

  /* ── Load team data whenever favTeam changes ───────────────────── */

  const loadTeamData = useCallback(
    async (skipCache = false) => {
      if (!favTeam) return;
      setTeamLoading(true);
      try {
        if (skipCache) {
          await Promise.all([
            invalidateCache('standings'),
            invalidateCache(`roster_${favTeam.id}`),
            invalidateCache(`schedule_${favTeam.id}`),
          ]);
        }
        const [standingsData, rosterData, scheduleData] = await Promise.all([
          getCached('standings', fetchStandings, TTL.standings),
          getCached(`roster_${favTeam.id}`, () => fetchTeamRoster(favTeam.id), TTL.roster),
          getCached(
            `schedule_${favTeam.id}`,
            () => fetchTeamSchedule(favTeam.id),
            TTL.schedule,
          ),
        ]);
        const myRow = standingsData.find((r) => r.teamId === favTeam.id) ?? null;
        setTeamStanding(myRow);
        setRoster(rosterData);
        setSchedule(scheduleData);
      } catch {
        /* keep what we have */
      } finally {
        setTeamLoading(false);
      }
    },
    [favTeam],
  );

  useEffect(() => {
    if (favTeam) void loadTeamData();
  }, [favTeam, loadTeamData]);

  /* ── Actions ───────────────────────────────────────────────────── */

  const selectTeam = useCallback(async (team: TeamOption) => {
    const saved: SavedTeam = { id: team.id, name: team.name };
    await AsyncStorage.setItem(FAV_TEAM_KEY, JSON.stringify(saved)).catch(() => {});
    setFavTeam(saved);
    setViewState('team');
  }, []);

  const changeTeam = useCallback(async () => {
    const teams =
      allTeams.length > 0
        ? allTeams
        : await getCached('allTeams', fetchMlbTeams, TTL.teams);
    setAllTeams(teams);
    setViewState('picking');
  }, [allTeams]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTeamData(true);
    setRefreshing(false);
  }, [loadTeamData]);

  /* ── Derived ───────────────────────────────────────────────────── */

  const rosterByGroup = useMemo(() => {
    const grouped = roster.reduce<Record<string, TeamRosterPlayer[]>>((acc, p) => {
      const g = mapPositionGroup(p.position);
      if (!acc[g]) acc[g] = [];
      acc[g].push(p);
      return acc;
    }, {});
    const order = ['Pitchers', 'Catchers', 'Infielders', 'Outfielders', 'Designated Hitters', 'Other'];
    return order
      .filter((g) => grouped[g]?.length)
      .map((g) => ({ group: g, players: grouped[g].sort((a, b) => a.fullName.localeCompare(b.fullName)) }));
  }, [roster]);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const pastGames = schedule.filter(
    (g) => g.date < todayStr && g.status === 'Final',
  );
  const futureGames = schedule.filter(
    (g) => g.date >= todayStr && g.status !== 'Final',
  );
  const lastGame = pastGames.length > 0 ? pastGames[pastGames.length - 1] : null;
  const nextGame = futureGames.length > 0 ? futureGames[0] : null;

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  const { isTablet, teamPickerCols, maxContentWidth, outerPadding } = useResponsive();

  /* Loading */
  if (viewState === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  /* Team picker */
  if (viewState === 'picking') {
    const cellWidth = `${Math.floor(100 / teamPickerCols) - 3}%` as unknown as number;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.pickerContent, { padding: outerPadding, alignItems: isTablet ? 'center' : undefined }]}>
        <View style={maxContentWidth ? { width: '100%', maxWidth: maxContentWidth } : undefined}>
        <Text style={[styles.pickerTitle, isTablet && { fontSize: 30 }]}>Choose Your Team</Text>
        <Text style={[styles.pickerSub, isTablet && { fontSize: 16 }]}>Pick your favorite team to personalize your experience.</Text>
        <View style={styles.teamGrid}>
          {allTeams.map((team) => (
            <Pressable
              key={team.id}
              style={({ pressed }) => [styles.teamCell, isTablet && { width: cellWidth, paddingVertical: 18 }, pressed && styles.pressed]}
              onPress={() => void selectTeam(team)}
            >
              <Image
                source={{ uri: espnLogoUrlById(team.id, team.name) }}
                style={[styles.teamCellLogo, isTablet && { width: 64, height: 64, borderRadius: 32 }]}
              />
              <Text style={[styles.teamCellName, isTablet && { fontSize: 14 }]} numberOfLines={1}>
                {team.name.split(' ').pop()}
              </Text>
            </Pressable>
          ))}
        </View>
        </View>
      </ScrollView>
    );
  }

  /* Team view */
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { padding: outerPadding, alignItems: isTablet ? 'center' : undefined }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <View style={maxContentWidth ? { width: '100%', maxWidth: maxContentWidth } : undefined}>
      {/* ── Team header ────────────────────────────────────────── */}
      <View style={styles.teamHeader}>
        <Image
          source={{ uri: espnLogoUrlById(favTeam!.id, favTeam!.name) }}
          style={[styles.teamHeaderLogo, isTablet && { width: 80, height: 80, borderRadius: 40 }]}
        />
        <View style={styles.teamHeaderInfo}>
          <Text style={[styles.teamHeaderName, isTablet && { fontSize: 28 }]}>{favTeam!.name}</Text>
          {teamStanding ? (
            <Text style={[styles.teamHeaderRecord, isTablet && { fontSize: 16 }]}>
              {teamStanding.wins}-{teamStanding.losses} • {teamStanding.divisionName} •{' '}
              {teamStanding.gamesBack === '-' ? '1st' : `${teamStanding.gamesBack} GB`}
            </Text>
          ) : (
            <Text style={styles.teamHeaderRecord}>Season data loading…</Text>
          )}
        </View>
      </View>

      {teamLoading && <ActivityIndicator color={theme.primary} />}

      {/* ── Next Game & Last Result ──────────────────────────────── */}
      <View style={isTablet ? { flexDirection: 'row', gap: 12 } : undefined}>
        <View style={isTablet ? { flex: 1 } : undefined}>
          <Text style={[styles.sectionTitle, isTablet && { fontSize: 20 }]}>Next Game</Text>
      {nextGame ? (
        <Pressable
          style={({ pressed }) => [styles.gameCard, pressed && styles.pressed]}
          onPress={() =>
            router.push({
              pathname: '/game/[gamePk]',
              params: { gamePk: String(nextGame.gamePk) },
            })
          }
        >
          <Text style={styles.gameDate}>{formatGameDate(nextGame.date)}</Text>
          <Text style={styles.gameOpp}>
            {nextGame.isHome ? 'vs' : '@'} {nextGame.opponent}
          </Text>
          <Text style={styles.gameTime}>{formatGameTime(nextGame.startTime)}</Text>
        </Pressable>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No upcoming games scheduled</Text>
        </View>
      )}
        </View>

      {/* ── Last Result ────────────────────────────────────────── */}
        <View style={isTablet ? { flex: 1 } : undefined}>
          <Text style={[styles.sectionTitle, isTablet && { fontSize: 20 }]}>Last Result</Text>
      {lastGame ? (
        <Pressable
          style={({ pressed }) => [styles.gameCard, pressed && styles.pressed]}
          onPress={() =>
            router.push({
              pathname: '/game/[gamePk]',
              params: { gamePk: String(lastGame.gamePk) },
            })
          }
        >
          <Text style={styles.gameDate}>{formatGameDate(lastGame.date)}</Text>
          <Text style={styles.gameOpp}>
            {lastGame.isHome ? 'vs' : '@'} {lastGame.opponent}
          </Text>
          {lastGame.homeScore !== null && lastGame.awayScore !== null ? (
            <Text style={styles.gameScore}>
              {lastGame.isHome
                ? `${lastGame.homeScore} - ${lastGame.awayScore}`
                : `${lastGame.awayScore} - ${lastGame.homeScore}`}
              {'  '}
              {lastGame.isHome
                ? lastGame.homeScore > lastGame.awayScore
                  ? 'W'
                  : lastGame.homeScore < lastGame.awayScore
                    ? 'L'
                    : 'T'
                : lastGame.awayScore > lastGame.homeScore
                  ? 'W'
                  : lastGame.awayScore < lastGame.homeScore
                    ? 'L'
                    : 'T'}
            </Text>
          ) : (
            <Text style={styles.gameTime}>{lastGame.detailedState}</Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recent results</Text>
        </View>
      )}
        </View>{/* end last result column */}
      </View>{/* end side-by-side games row */}

      {/* ── Roster ─────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, isTablet && { fontSize: 20 }]}>Roster</Text>
      {rosterByGroup.map((group) => (
        <View key={group.group} style={styles.rosterGroup}>
          <Text style={styles.rosterGroupTitle}>{group.group}</Text>
          <View style={isTablet ? { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } : undefined}>
            {group.players.map((player) => (
              <Pressable
                key={player.id}
                style={({ pressed }) => [
                  styles.rosterRow,
                  isTablet && { width: '48%' as unknown as number },
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/player/[playerId]',
                    params: {
                      playerId: String(player.id),
                      name: player.fullName,
                      team: favTeam!.name,
                      position: player.position,
                    },
                  })
                }
              >
                <Text style={styles.rosterName}>{player.fullName}</Text>
                <Text style={styles.rosterMeta}>
                  {player.position}
                  {player.jerseyNumber ? ` • #${player.jerseyNumber}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {/* ── Change team ────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [styles.changeBtn, isTablet && { maxWidth: 300, alignSelf: 'center', width: '100%' }, pressed && styles.pressed]}
        onPress={() => void changeTeam()}
      >
        <Text style={styles.changeBtnText}>Change Team</Text>
      </Pressable>
      </View>{/* end maxContentWidth wrapper */}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, paddingBottom: 100, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Picker */
  pickerContent: { padding: 20, paddingBottom: 100 },
  pickerTitle: { fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: 4, letterSpacing: -0.3 },
  pickerSub: { fontSize: 14, color: theme.mutedText, marginBottom: 20 },
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  teamCell: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  teamCellLogo: { width: 52, height: 52, borderRadius: 26, marginBottom: 6, backgroundColor: 'rgba(10, 42, 102, 0.04)' },
  teamCellName: { fontSize: 12, fontWeight: '700', color: theme.text, textAlign: 'center' },

  /* Team header — navy glass */
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.navyGlass,
    borderRadius: radii.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.navyGlassBorder,
    ...shadows.lg,
  },
  teamHeaderLogo: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)' },
  teamHeaderInfo: { flex: 1 },
  teamHeaderName: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  teamHeaderRecord: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginTop: 2 },

  /* Section titles */
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginTop: 4 },

  /* Game cards */
  gameCard: {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  gameDate: { color: theme.mutedText, fontSize: 12, fontWeight: '700' },
  gameOpp: { color: theme.text, fontSize: 17, fontWeight: '800' },
  gameTime: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  gameScore: { color: theme.accent, fontSize: 18, fontWeight: '900' },

  /* Roster */
  rosterGroup: { gap: 6, marginBottom: 4 },
  rosterGroupTitle: { color: theme.primary, fontWeight: '800', fontSize: 15 },
  rosterRow: {
    backgroundColor: theme.surface,
    borderRadius: radii.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  rosterName: { color: theme.text, fontWeight: '700', flex: 1 },
  rosterMeta: { color: theme.mutedText, fontWeight: '600', marginLeft: 8 },

  /* Change team */
  changeBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  changeBtnText: { color: theme.error, fontWeight: '800', fontSize: 14 },

  /* Shared */
  emptyCard: {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  emptyText: { color: theme.mutedText, fontWeight: '600' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
