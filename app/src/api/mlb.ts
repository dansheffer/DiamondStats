const MLB_STATS_API_BASE = 'https://statsapi.mlb.com/api/v1';

export interface PlayerSearchResult {
  id: number;
  fullName: string;
  position: string;
  teamName: string;
}

export interface MlbNewsItem {
  id: string;
  title: string;
  publishedAt: string;
  linkUrl: string;
}

export interface StandingRow {
  id: string;
  teamId: number;
  leagueName: string;
  divisionName: string;
  teamName: string;
  teamAbbrev: string;
  wins: number;
  losses: number;
  winPct: string;
  gamesBack: string;
  homeRecord: string;
  awayRecord: string;
  lastTenRecord: string;
  streak: string;
  runsScored: number;
  runsAllowed: number;
  runDiff: number;
  divisionRank: number;
}

export interface TodayGame {
  gamePk: number;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  status: string;
  detailedState: string;
  inning: number | null;
  inningState: string;
  startTime: string;
}

export interface InningLine {
  inning: number;
  awayRuns: number | null;
  homeRuns: number | null;
}

export interface BoxScoreSummary {
  gamePk: number;
  awayTeam: string;
  homeTeam: string;
  awayRuns: number;
  homeRuns: number;
  awayHits: number;
  homeHits: number;
  awayErrors: number;
  homeErrors: number;
  detailedState: string;
  inning: number | null;
  inningState: string;
  inningLines: InningLine[];
}

export interface TeamOption {
  id: number;
  name: string;
}

export interface TeamRosterPlayer {
  id: number;
  fullName: string;
  jerseyNumber?: string;
  position: string;
}

export interface PlayerCardData {
  id: number;
  fullName: string;
  teamName: string;
  position: string;
  seasonStats: Record<string, string | number>;
  careerStats: Record<string, string | number>;
  yearByYearHitting: YearlyStatLine[];
  yearByYearPitching: YearlyStatLine[];
  seasonWar: number | null;
  careerWar: number | null;
}

export interface YearlyStatLine {
  season: string;
  teamName: string;
  stats: Record<string, string | number>;
}

interface MlbApiResponse {
  [key: string]: unknown;
}

const CURRENT_SEASON = String(new Date().getFullYear());

async function fetchJson(url: string): Promise<MlbApiResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MLB API request failed: ${response.status}`);
  }
  return (await response.json()) as MlbApiResponse;
}

export async function searchPlayersByName(name: string): Promise<PlayerSearchResult[]> {
  const url = `${MLB_STATS_API_BASE}/people/search?sportId=1&names=${encodeURIComponent(name)}&hydrate=currentTeam,primaryPosition`;
  const data = await fetchJson(url);
  const people = (data.people as Array<Record<string, unknown>> | undefined) ?? [];

  const baseResults = people.map((person) => {
    const currentTeam = (person.currentTeam as Record<string, unknown> | undefined) ?? {};
    const primaryPosition = (person.primaryPosition as Record<string, unknown> | undefined) ?? {};

    return {
      id: Number(person.id ?? 0),
      fullName: String(person.fullName ?? 'Unknown Player'),
      position: String(primaryPosition.abbreviation ?? 'N/A'),
      teamName: String(currentTeam.name ?? 'Free Agent'),
    };
  });

  const withResolvedTeams = await Promise.all(
    baseResults.map(async (player) => {
      if (player.teamName !== 'Free Agent' || player.id <= 0) {
        return player;
      }

      try {
        const bioData = await fetchJson(
          `${MLB_STATS_API_BASE}/people/${player.id}?hydrate=currentTeam,primaryPosition`,
        );
        const person = ((bioData.people as Array<Record<string, unknown>> | undefined) ?? [])[0] ?? {};
        const currentTeam = (person.currentTeam as Record<string, unknown> | undefined) ?? {};
        const primaryPosition =
          (person.primaryPosition as Record<string, unknown> | undefined) ?? {};

        return {
          ...player,
          position: String(primaryPosition.abbreviation ?? player.position),
          teamName: String(currentTeam.name ?? player.teamName),
        };
      } catch (_error) {
        return player;
      }
    }),
  );

  return withResolvedTeams;
}

export async function fetchMlbNews(): Promise<MlbNewsItem[]> {
  try {
    const rssResponse = await fetch('https://www.mlb.com/feeds/news/rss.xml');
    const rssText = await rssResponse.text();

    const items = rssText.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const parsed = items.slice(0, 8).map((item, index) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? 'MLB Update';
      const pubDateRaw = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '';
      const linkUrl = item.match(/<link>(.*?)<\/link>/)?.[1] ?? 'https://www.mlb.com/news';
      const pubDate = pubDateRaw ? new Date(pubDateRaw).toLocaleDateString() : 'Today';

      return {
        id: `rss-${index}-${title}`,
        title,
        publishedAt: pubDate,
        linkUrl,
      };
    });

    if (parsed.length > 0) {
      return parsed;
    }
  } catch (_error) {
    // Ignore and use fallback feed.
  }

  return [
    {
      id: 'fallback-1',
      title: 'Spring training coverage coming soon from MLB feeds.',
      publishedAt: 'Today',
      linkUrl: 'https://www.mlb.com/news',
    },
    {
      id: 'fallback-2',
      title: 'Use standings and roster sections while waiting for opening day stats.',
      publishedAt: 'Today',
      linkUrl: 'https://www.mlb.com/news',
    },
  ];
}

export async function fetchStandings(): Promise<StandingRow[]> {
  const currentYear = new Date().getFullYear();
  const url = `${MLB_STATS_API_BASE}/standings?leagueId=103,104&season=${currentYear}&hydrate=team`;
  const data = await fetchJson(url);
  const records = (data.records as Array<Record<string, unknown>> | undefined) ?? [];

  const rows: StandingRow[] = [];

  records.forEach((record, divisionIndex) => {
    const teamRecords = (record.teamRecords as Array<Record<string, unknown>> | undefined) ?? [];
    teamRecords.forEach((teamRecord, idx) => {
      const team = (teamRecord.team as Record<string, unknown> | undefined) ?? {};

      // League/division names live on the hydrated team object, not the record
      const teamLeague = (team.league as Record<string, unknown> | undefined) ?? {};
      const teamDivision = (team.division as Record<string, unknown> | undefined) ?? {};
      const leagueName = String(teamLeague.name ?? 'League');
      const rawDivisionName = String(teamDivision.name ?? 'Division');
      const divisionName = rawDivisionName
        .replace('American League ', 'AL ')
        .replace('National League ', 'NL ');
      const splitRecords =
        (teamRecord.records as Record<string, unknown> | undefined)?.splitRecords as
          | Array<Record<string, unknown>>
          | undefined;

      const getSplitRecord = (targetName: string): string => {
        const found = (splitRecords ?? []).find((split) => {
          const type = (split.type as Record<string, unknown> | undefined) ?? {};
          const display = String(type.displayName ?? '').toLowerCase();
          const name = String(type.name ?? '').toLowerCase();
          return display === targetName.toLowerCase() || name === targetName.toLowerCase();
        });

        if (!found) {
          return '0-0';
        }

        return `${String(found.wins ?? 0)}-${String(found.losses ?? 0)}`;
      };

      const streakObj = (teamRecord.streak as Record<string, unknown> | undefined) ?? {};

      rows.push({
        id: `${divisionIndex}-${idx}-${String(team.id ?? '')}`,
        teamId: Number(team.id ?? 0),
        leagueName,
        divisionName,
        teamName: String(team.name ?? 'Unknown Team'),
        teamAbbrev: String(team.abbreviation ?? ''),
        wins: Number(teamRecord.wins ?? 0),
        losses: Number(teamRecord.losses ?? 0),
        winPct: String(teamRecord.winningPercentage ?? '.000'),
        gamesBack: String(teamRecord.gamesBack ?? '-'),
        homeRecord: getSplitRecord('home'),
        awayRecord: getSplitRecord('away'),
        lastTenRecord: getSplitRecord('last ten'),
        streak: String(streakObj.streakCode ?? '-'),
        runsScored: Number(teamRecord.runsScored ?? 0),
        runsAllowed: Number(teamRecord.runsAllowed ?? 0),
        runDiff: Number(teamRecord.runDifferential ?? 0),
        divisionRank: Number(teamRecord.divisionRank ?? 99),
      });
    });
  });

  return rows;
}

export async function fetchTodayGames(): Promise<TodayGame[]> {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;

  const data = await fetchJson(
    `${MLB_STATS_API_BASE}/schedule?sportId=1&date=${date}&hydrate=linescore`,
  );
  const dates = (data.dates as Array<Record<string, unknown>> | undefined) ?? [];
  const games = ((dates[0]?.games as Array<Record<string, unknown>> | undefined) ?? []).map(
    (game) => {
      const teams = (game.teams as Record<string, unknown> | undefined) ?? {};
      const away = (teams.away as Record<string, unknown> | undefined) ?? {};
      const home = (teams.home as Record<string, unknown> | undefined) ?? {};
      const awayTeam = (away.team as Record<string, unknown> | undefined) ?? {};
      const homeTeam = (home.team as Record<string, unknown> | undefined) ?? {};
      const statusObj = (game.status as Record<string, unknown> | undefined) ?? {};
      const linescore = (game.linescore as Record<string, unknown> | undefined) ?? {};

      return {
        gamePk: Number(game.gamePk ?? 0),
        awayTeam: String(awayTeam.name ?? 'Away'),
        homeTeam: String(homeTeam.name ?? 'Home'),
        awayScore: typeof away.score === 'number' ? away.score : null,
        homeScore: typeof home.score === 'number' ? home.score : null,
        status: String(statusObj.abstractGameState ?? 'Scheduled'),
        detailedState: String(statusObj.detailedState ?? 'Scheduled'),
        inning: typeof linescore.currentInning === 'number' ? linescore.currentInning : null,
        inningState: String(linescore.inningState ?? ''),
        startTime: String(game.gameDate ?? ''),
      };
    },
  );

  return games;
}

export async function fetchGameBoxScore(gamePk: number): Promise<BoxScoreSummary> {
  const data = await fetchJson(`${MLB_STATS_API_BASE}/game/${gamePk}/linescore`);

  const teams = (data.teams as Record<string, unknown> | undefined) ?? {};
  const away = (teams.away as Record<string, unknown> | undefined) ?? {};
  const home = (teams.home as Record<string, unknown> | undefined) ?? {};
  const awayTeam = (away.team as Record<string, unknown> | undefined) ?? {};
  const homeTeam = (home.team as Record<string, unknown> | undefined) ?? {};
  const statusObj = (data.status as Record<string, unknown> | undefined) ?? {};

  const innings = (data.innings as Array<Record<string, unknown>> | undefined) ?? [];
  const inningLines: InningLine[] = innings.map((inning, idx) => {
    const inningAway = (inning.away as Record<string, unknown> | undefined) ?? {};
    const inningHome = (inning.home as Record<string, unknown> | undefined) ?? {};
    return {
      inning: idx + 1,
      awayRuns: typeof inningAway.runs === 'number' ? inningAway.runs : null,
      homeRuns: typeof inningHome.runs === 'number' ? inningHome.runs : null,
    };
  });

  return {
    gamePk,
    awayTeam: String(awayTeam.name ?? 'Away'),
    homeTeam: String(homeTeam.name ?? 'Home'),
    awayRuns: Number(away.runs ?? 0),
    homeRuns: Number(home.runs ?? 0),
    awayHits: Number(away.hits ?? 0),
    homeHits: Number(home.hits ?? 0),
    awayErrors: Number(away.errors ?? 0),
    homeErrors: Number(home.errors ?? 0),
    detailedState: String(statusObj.detailedState ?? 'Scheduled'),
    inning: typeof data.currentInning === 'number' ? data.currentInning : null,
    inningState: String(data.inningState ?? ''),
    inningLines,
  };
}

export async function fetchMlbTeams(): Promise<TeamOption[]> {
  const currentYear = new Date().getFullYear();
  const data = await fetchJson(
    `${MLB_STATS_API_BASE}/teams?sportId=1&season=${currentYear}`,
  );
  const teams = (data.teams as Array<Record<string, unknown>> | undefined) ?? [];

  return teams
    .map((team) => ({
      id: Number(team.id ?? 0),
      name: String(team.name ?? 'Unknown Team'),
    }))
    .filter((team) => team.id > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchTeamRoster(teamId: number): Promise<TeamRosterPlayer[]> {
  const url = `${MLB_STATS_API_BASE}/teams/${teamId}/roster?rosterType=active`;
  const data = await fetchJson(url);
  const roster = (data.roster as Array<Record<string, unknown>> | undefined) ?? [];

  return roster.map((entry) => {
    const person = (entry.person as Record<string, unknown> | undefined) ?? {};
    const position = (entry.position as Record<string, unknown> | undefined) ?? {};

    return {
      id: Number(person.id ?? 0),
      fullName: String(person.fullName ?? 'Unknown Player'),
      jerseyNumber: entry.jerseyNumber ? String(entry.jerseyNumber) : undefined,
      position: String(position.abbreviation ?? 'N/A'),
    };
  });
}

function toStatsMap(split: Record<string, unknown> | undefined): Record<string, string | number> {
  if (!split) {
    return {};
  }
  const stat = (split.stat as Record<string, unknown> | undefined) ?? {};
  const result: Record<string, string | number> = {};

  Object.entries(stat).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      result[key] = value;
    }
  });

  return result;
}

function getTypeName(item: Record<string, unknown>): string {
  const type = (item.type as Record<string, unknown> | undefined) ?? {};
  return String(type.displayName ?? '').toLowerCase();
}

function getSplitForSeason(
  splits: Array<Record<string, unknown>>,
  season: string,
): Record<string, unknown> | undefined {
  return (
    splits.find((split) => String(split.season ?? '') === season) ??
    splits.find((split) => split.stat !== undefined) ??
    splits[0]
  );
}

function pickStatsByType(
  stats: Array<Record<string, unknown>>,
  typeName: string,
  season?: string,
): Record<string, string | number> {
  const matches = stats.filter((item) => getTypeName(item) === typeName.toLowerCase());

  for (const entry of matches) {
    const splits = (entry.splits as Array<Record<string, unknown>> | undefined) ?? [];
    const chosenSplit = season ? getSplitForSeason(splits, season) : splits[0];
    const map = toStatsMap(chosenSplit);
    if (Object.keys(map).length > 0) {
      return map;
    }
  }

  return {};
}

function getGroupName(item: Record<string, unknown>): string {
  const group = (item.group as Record<string, unknown> | undefined) ?? {};
  return String(group.displayName ?? '').toLowerCase();
}

function pickYearByYear(
  stats: Array<Record<string, unknown>>,
  groupName: 'hitting' | 'pitching',
): YearlyStatLine[] {
  const yearByYearEntries = stats.filter(
    (item) => getTypeName(item) === 'yearbyyear' && getGroupName(item) === groupName,
  );

  const lines: YearlyStatLine[] = [];

  yearByYearEntries.forEach((entry) => {
    const splits = (entry.splits as Array<Record<string, unknown>> | undefined) ?? [];
    splits.forEach((split) => {
      const team = (split.team as Record<string, unknown> | undefined) ?? {};
      const season = String(split.season ?? '');
      const statMap = toStatsMap(split);

      if (season && Object.keys(statMap).length > 0) {
        lines.push({
          season,
          teamName: String(team.name ?? 'MLB'),
          stats: statMap,
        });
      }
    });
  });

  return lines.sort((a, b) => Number(b.season) - Number(a.season)).slice(0, 10);
}

function extractWar(
  stats: Array<Record<string, unknown>>,
  displayName: string,
  season?: string,
): number | null {
  const matches = stats.filter((item) => getTypeName(item) === displayName.toLowerCase());

  for (const entry of matches) {
    const splits = (entry.splits as Array<Record<string, unknown>> | undefined) ?? [];
    const chosenSplit = season ? getSplitForSeason(splits, season) : splits[0];
    if (!chosenSplit) {
      continue;
    }

    const stat = (chosenSplit.stat as Record<string, unknown> | undefined) ?? {};
    const warValue = stat.war ?? stat.winsAboveReplacement;
    if (typeof warValue === 'string') {
      const parsed = Number(warValue);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    if (typeof warValue === 'number') {
      return warValue;
    }
  }

  return null;
}

export async function fetchPlayerCardData(playerId: number): Promise<PlayerCardData> {
  const season = CURRENT_SEASON;
  const [bioData, statsData] = await Promise.all([
    fetchJson(`${MLB_STATS_API_BASE}/people/${playerId}?hydrate=currentTeam,primaryPosition`),
    fetchJson(
      `${MLB_STATS_API_BASE}/people/${playerId}/stats?stats=season,career,seasonAdvanced,careerAdvanced,yearByYear&group=hitting,pitching&season=${season}`,
    ),
  ]);

  const people = (bioData.people as Array<Record<string, unknown>> | undefined) ?? [];
  const person = people[0] ?? {};
  const currentTeam = (person.currentTeam as Record<string, unknown> | undefined) ?? {};
  const primaryPosition = (person.primaryPosition as Record<string, unknown> | undefined) ?? {};

  const stats = (statsData.stats as Array<Record<string, unknown>> | undefined) ?? [];

  return {
    id: playerId,
    fullName: String(person.fullName ?? 'Unknown Player'),
    teamName: String(currentTeam.name ?? 'N/A'),
    position: String(primaryPosition.abbreviation ?? 'N/A'),
    seasonStats: pickStatsByType(stats, 'season', season),
    careerStats: pickStatsByType(stats, 'career'),
    yearByYearHitting: pickYearByYear(stats, 'hitting'),
    yearByYearPitching: pickYearByYear(stats, 'pitching'),
    seasonWar: extractWar(stats, 'seasonAdvanced', season),
    careerWar: extractWar(stats, 'careerAdvanced'),
  };
}
