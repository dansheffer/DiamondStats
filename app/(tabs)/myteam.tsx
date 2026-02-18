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
} from '../src/api/mlb';
import { getCached, invalidateCache } from '../src/utils/cache';
import { theme } from '../src/theme/colors';

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
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.pickerContent}>
        <Text style={styles.pickerTitle}>Choose Your Team</Text>
        <Text style={styles.pickerSub}>Pick your favorite team to personalize your experience.</Text>
        <View style={styles.teamGrid}>
          {allTeams.map((team) => (
            <Pressable
              key={team.id}
              style={({ pressed }) => [styles.teamCell, pressed && styles.pressed]}
              onPress={() => void selectTeam(team)}
            >
              <Image
                source={{ uri: `https://midfield.mlbstatic.com/v1/team/${team.id}/spots/72` }}
                style={styles.teamCellLogo}
              />
              <Text style={styles.teamCellName} numberOfLines={1}>
                {team.name.split(' ').pop()}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  /* Team view */
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      {/* ── Team header ────────────────────────────────────────── */}
      <View style={styles.teamHeader}>
        <Image
          source={{ uri: `https://midfield.mlbstatic.com/v1/team/${favTeam!.id}/spots/72` }}
          style={styles.teamHeaderLogo}
        />
        <View style={styles.teamHeaderInfo}>
          <Text style={styles.teamHeaderName}>{favTeam!.name}</Text>
          {teamStanding ? (
            <Text style={styles.teamHeaderRecord}>
              {teamStanding.wins}-{teamStanding.losses} • {teamStanding.divisionName} •{' '}
              {teamStanding.gamesBack === '-' ? '1st' : `${teamStanding.gamesBack} GB`}
            </Text>
          ) : (
            <Text style={styles.teamHeaderRecord}>Season data loading…</Text>
          )}
        </View>
      </View>

      {teamLoading && <ActivityIndicator color={theme.primary} />}

      {/* ── Next Game ──────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Next Game</Text>
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

      {/* ── Last Result ────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Last Result</Text>
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
                  : 'L'
                : lastGame.awayScore > lastGame.homeScore
                  ? 'W'
                  : 'L'}
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

      {/* ── Roster ─────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Roster</Text>
      {rosterByGroup.map((group) => (
        <View key={group.group} style={styles.rosterGroup}>
          <Text style={styles.rosterGroupTitle}>{group.group}</Text>
          {group.players.map((player) => (
            <Pressable
              key={player.id}
              style={({ pressed }) => [styles.rosterRow, pressed && styles.pressed]}
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
      ))}

      {/* ── Change team ────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [styles.changeBtn, pressed && styles.pressed]}
        onPress={() => void changeTeam()}
      >
        <Text style={styles.changeBtnText}>Change Team</Text>
      </Pressable>
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

  /* Picker */
  pickerContent: { padding: 20, paddingBottom: 40 },
  pickerTitle: { fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: 4 },
  pickerSub: { fontSize: 14, color: theme.mutedText, marginBottom: 20 },
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  teamCell: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  teamCellLogo: { width: 52, height: 52, borderRadius: 26, marginBottom: 6, backgroundColor: '#f3f4f6' },
  teamCellName: { fontSize: 12, fontWeight: '700', color: theme.text, textAlign: 'center' },

  /* Team header */
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1222',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  teamHeaderLogo: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1a2234' },
  teamHeaderInfo: { flex: 1 },
  teamHeaderName: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  teamHeaderRecord: { color: '#9ca3af', fontSize: 14, fontWeight: '600', marginTop: 2 },

  /* Section titles */
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginTop: 4 },

  /* Game cards */
  gameCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    gap: 4,
  },
  gameDate: { color: theme.mutedText, fontSize: 12, fontWeight: '700' },
  gameOpp: { color: theme.text, fontSize: 17, fontWeight: '800' },
  gameTime: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  gameScore: { color: theme.accent, fontSize: 18, fontWeight: '900' },

  /* Roster */
  rosterGroup: { gap: 6, marginBottom: 4 },
  rosterGroupTitle: { color: theme.primary, fontWeight: '800', fontSize: 15 },
  rosterRow: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rosterName: { color: theme.text, fontWeight: '700', flex: 1 },
  rosterMeta: { color: theme.mutedText, fontWeight: '600', marginLeft: 8 },

  /* Change team */
  changeBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  changeBtnText: { color: '#b91c1c', fontWeight: '800', fontSize: 14 },

  /* Shared */
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { color: theme.mutedText, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
