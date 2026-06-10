// Live MLB Stats API wrapper. statsapi.mlb.com is a free, public, no-auth API
// used by MLB.com itself. We add an in-memory TTL cache to keep things snappy
// and avoid hammering the endpoint while a user types.

const BASE = 'https://statsapi.mlb.com/api/v1';
const SEASON = new Date().getFullYear();

type CacheEntry<T> = { value: T; expires: number };
const cache = new Map<string, CacheEntry<unknown>>();

async function getJSON<T>(path: string, ttlMs = 60_000): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const hit = cache.get(url) as CacheEntry<T> | undefined;
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`MLB API ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as T;
  cache.set(url, { value: data, expires: now + ttlMs });
  return data;
}

// ---------------- Player search & lookup ----------------

export interface MlbPersonLite {
  id: number;
  fullName: string;
  nickName?: string;
  primaryNumber?: string;
  currentTeam?: { id: number; name: string };
  primaryPosition?: { abbreviation: string; name: string };
  birthDate?: string;
  birthCity?: string;
  birthStateProvince?: string;
  birthCountry?: string;
  height?: string;
  weight?: number;
  batSide?: { code: string; description: string };
  pitchHand?: { code: string; description: string };
  mlbDebutDate?: string;
  active?: boolean;
}

interface PeopleResponse {
  people?: MlbPersonLite[];
}

function isActivePlayer(person: MlbPersonLite): boolean {
  return person.active !== false;
}

export async function searchPlayers(query: string): Promise<MlbPersonLite[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await getJSON<PeopleResponse>(
    `/people/search?names=${encodeURIComponent(q)}&sportId=1&active=true&hydrate=currentTeam,primaryPosition`,
    5 * 60_000,
  );
  return (data.people ?? []).filter(isActivePlayer).slice(0, 50);
}

export async function getPerson(personId: number): Promise<MlbPersonLite | null> {
  const data = await getJSON<PeopleResponse>(
    `/people/${personId}?hydrate=currentTeam,primaryPosition`,
    5 * 60_000,
  );
  return data.people?.[0] ?? null;
}

// ---------------- Player season stats ----------------

export interface SeasonStatLine {
  season: string;
  group: 'hitting' | 'pitching' | 'fielding';
  team?: string;
  gamesPlayed?: number;
  gamesStarted?: number;
  plateAppearances?: number;
  atBats?: number;
  avg?: string;
  hits?: number;
  doubles?: number;
  triples?: number;
  homeRuns?: number;
  rbi?: number;
  runs?: number;
  baseOnBalls?: number;
  obp?: string;
  slg?: string;
  ops?: string;
  stolenBases?: number;
  caughtStealing?: number;
  era?: string;
  wins?: number;
  losses?: number;
  strikeOuts?: number;
  baseOnBallsPitching?: number;
  inningsPitched?: string;
  whip?: string;
  saves?: number;
  holds?: number;
}

interface StatsResponse {
  stats?: Array<{
    group?: { displayName?: string };
    splits?: Array<{
      season?: string;
      team?: { name?: string };
      stat?: Record<string, unknown>;
    }>;
  }>;
}

export async function getPlayerSeasonStats(
  personId: number,
): Promise<SeasonStatLine[]> {
  return fetchStatLines(
    `/people/${personId}/stats?stats=season&season=${SEASON}&group=hitting,pitching`,
    60_000,
  );
}

export async function getPlayerCareerStats(
  personId: number,
): Promise<SeasonStatLine[]> {
  return fetchStatLines(
    `/people/${personId}/stats?stats=career&group=hitting,pitching`,
    5 * 60_000,
  );
}

export async function getPlayerYearByYearStats(
  personId: number,
): Promise<SeasonStatLine[]> {
  const lines = await fetchStatLines(
    `/people/${personId}/stats?stats=yearByYear&group=hitting,pitching`,
    10 * 60_000,
  );
  // Most recent season first.
  return lines.sort((a, b) => (b.season || '').localeCompare(a.season || ''));
}

async function fetchStatLines(path: string, ttl: number): Promise<SeasonStatLine[]> {
  const data = await getJSON<StatsResponse>(path, ttl);
  const lines: SeasonStatLine[] = [];
  for (const block of data.stats ?? []) {
    const group = (block.group?.displayName ?? '').toLowerCase() as
      | 'hitting'
      | 'pitching'
      | 'fielding';
    for (const split of block.splits ?? []) {
      const s = split.stat ?? {};
      lines.push({
        season: split.season ?? String(SEASON),
        group,
        team: split.team?.name,
        gamesPlayed: s.gamesPlayed as number | undefined,
        gamesStarted: s.gamesStarted as number | undefined,
        plateAppearances: s.plateAppearances as number | undefined,
        atBats: s.atBats as number | undefined,
        avg: s.avg as string | undefined,
        hits: s.hits as number | undefined,
        doubles: s.doubles as number | undefined,
        triples: s.triples as number | undefined,
        homeRuns: s.homeRuns as number | undefined,
        rbi: s.rbi as number | undefined,
        runs: s.runs as number | undefined,
        baseOnBalls: s.baseOnBalls as number | undefined,
        obp: s.obp as string | undefined,
        slg: s.slg as string | undefined,
        ops: s.ops as string | undefined,
        stolenBases: s.stolenBases as number | undefined,
        caughtStealing: s.caughtStealing as number | undefined,
        era: s.era as string | undefined,
        wins: s.wins as number | undefined,
        losses: s.losses as number | undefined,
        strikeOuts: s.strikeOuts as number | undefined,
        baseOnBallsPitching: s.baseOnBalls as number | undefined,
        inningsPitched: s.inningsPitched as string | undefined,
        whip: s.whip as string | undefined,
        saves: s.saves as number | undefined,
        holds: s.holds as number | undefined,
      });
    }
  }
  return lines;
}

// ---------------- Standings ----------------

export interface DivisionStandings {
  divisionName: string;
  leagueName: string;
  teams: Array<{
    teamId: number;
    teamName: string;
    wins: number;
    losses: number;
    pct: string;
    gb: string;
    streak: string;
    divisionRank: string;
  }>;
}

interface StandingsResponse {
  records?: Array<{
    league?: { id: number };
    division?: { id: number; name?: string };
    teamRecords?: Array<{
      team: { id: number; name: string };
      wins: number;
      losses: number;
      winningPercentage: string;
      gamesBack: string;
      streak?: { streakCode: string };
      divisionRank: string;
    }>;
  }>;
}

const DIVISION_NAMES: Record<number, string> = {
  200: 'AL West',
  201: 'AL East',
  202: 'AL Central',
  203: 'NL West',
  204: 'NL East',
  205: 'NL Central',
};

export async function getStandings(): Promise<DivisionStandings[]> {
  const data = await getJSON<StandingsResponse>(
    `/standings?leagueId=103,104&season=${SEASON}&standingsTypes=regularSeason`,
    5 * 60_000,
  );
  return (data.records ?? []).map((rec) => {
    const divId = rec.division?.id ?? 0;
    const divisionName = rec.division?.name ?? DIVISION_NAMES[divId] ?? 'Division';
    const leagueName = rec.league?.id === 103 ? 'American League' : 'National League';
    return {
      divisionName,
      leagueName,
      teams: (rec.teamRecords ?? []).map((t) => ({
        teamId: t.team.id,
        teamName: t.team.name,
        wins: t.wins,
        losses: t.losses,
        pct: t.winningPercentage,
        gb: t.gamesBack,
        streak: t.streak?.streakCode ?? '—',
        divisionRank: t.divisionRank,
      })),
    };
  });
}

// ---------------- Today's schedule ----------------

export interface ScheduleGame {
  gamePk: number;
  status: string;
  detailedStatus: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  startTimeUtc: string;
  inning?: string;
  homeProbablePitcher?: string;
  awayProbablePitcher?: string;
}

interface ScheduleResponse {
  dates?: Array<{
    games?: Array<{
      gamePk: number;
      status: { abstractGameState: string; detailedState: string };
      teams: {
        home: { team: { name: string }; score?: number; probablePitcher?: { fullName?: string } };
        away: { team: { name: string }; score?: number; probablePitcher?: { fullName?: string } };
      };
      gameDate: string;
      linescore?: { currentInningOrdinal?: string; inningState?: string };
    }>;
  }>;
}

// ---------------- News (MLB.com RSS) ----------------

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
}

export async function fetchNews(): Promise<NewsItem[]> {
  const url = 'https://www.mlb.com/feeds/news/rss.xml';
  const cached = cache.get(url) as CacheEntry<NewsItem[]> | undefined;
  const now = Date.now();
  if (cached && cached.expires > now) return cached.value;

  const res = await fetch(url, { headers: { Accept: 'application/rss+xml,text/xml' } });
  if (!res.ok) throw new Error(`MLB News ${res.status}`);
  const xml = await res.text();

  const items: NewsItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]?.trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]?.trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim();
    if (title && link) {
      items.push({ id: link, title, link, pubDate: pubDate ?? '' });
    }
  }
  cache.set(url, { value: items, expires: now + 10 * 60_000 });
  return items;
}

export async function getTodaysGames(): Promise<ScheduleGame[]> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const date = `${yyyy}-${mm}-${dd}`;
  const data = await getJSON<ScheduleResponse>(
    `/schedule?sportId=1&date=${date}&hydrate=linescore,probablePitcher`,
    30_000,
  );
  const games: ScheduleGame[] = [];
  for (const d of data.dates ?? []) {
    for (const g of d.games ?? []) {
      const inningPart = g.linescore?.currentInningOrdinal
        ? `${g.linescore.inningState ?? ''} ${g.linescore.currentInningOrdinal}`.trim()
        : undefined;
      games.push({
        gamePk: g.gamePk,
        status: g.status.abstractGameState,
        detailedStatus: g.status.detailedState,
        homeTeam: g.teams.home.team.name,
        awayTeam: g.teams.away.team.name,
        homeScore: g.teams.home.score,
        awayScore: g.teams.away.score,
        startTimeUtc: g.gameDate,
        inning: inningPart,
        homeProbablePitcher: g.teams.home.probablePitcher?.fullName,
        awayProbablePitcher: g.teams.away.probablePitcher?.fullName,
      });
    }
  }
  return games;
}
