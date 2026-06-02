// Bundled, on-device dataset of notable active pro players for the 2025 season.
// All values are illustrative season snapshots used by the Diamond Stats demo
// experience. No network calls are required to render any screen — this data
// ships inside the binary so the app is fully functional offline.

export type Trend = 'Rising' | 'Stable' | 'Declining';

export interface Player {
  id: string;
  mlbId: number;
  name: string;
  team: string;
  position: string;
  careerWAR: number;
  seasonWAR: number;
  gamesPlayed: number;
  trend: Trend;
}

export const PLAYERS: Player[] = [
  { id: 'soto',     mlbId: 665742, name: 'Juan Soto',           team: 'New York Mets',         position: 'RF', careerWAR: 36.8, seasonWAR: 5.2, gamesPlayed: 110, trend: 'Rising' },
  { id: 'judge',    mlbId: 592450, name: 'Aaron Judge',         team: 'New York Yankees',      position: 'CF', careerWAR: 49.4, seasonWAR: 6.1, gamesPlayed: 112, trend: 'Rising' },
  { id: 'ohtani',   mlbId: 660271, name: 'Shohei Ohtani',       team: 'Los Angeles Dodgers',   position: 'DH', careerWAR: 42.7, seasonWAR: 5.9, gamesPlayed: 115, trend: 'Rising' },
  { id: 'witt',     mlbId: 677951, name: 'Bobby Witt Jr.',      team: 'Kansas City Royals',    position: 'SS', careerWAR: 18.4, seasonWAR: 4.8, gamesPlayed: 113, trend: 'Rising' },
  { id: 'betts',    mlbId: 605141, name: 'Mookie Betts',        team: 'Los Angeles Dodgers',   position: '2B', careerWAR: 65.2, seasonWAR: 3.6, gamesPlayed: 108, trend: 'Stable' },
  { id: 'lindor',   mlbId: 596019, name: 'Francisco Lindor',    team: 'New York Mets',         position: 'SS', careerWAR: 47.1, seasonWAR: 4.2, gamesPlayed: 114, trend: 'Stable' },
  { id: 'henderson',mlbId: 683002, name: 'Gunnar Henderson',    team: 'Baltimore Orioles',     position: 'SS', careerWAR: 14.9, seasonWAR: 4.5, gamesPlayed: 112, trend: 'Rising' },
  { id: 'tucker',   mlbId: 663656, name: 'Kyle Tucker',         team: 'Chicago Cubs',          position: 'RF', careerWAR: 24.6, seasonWAR: 3.9, gamesPlayed: 95,  trend: 'Stable' },
  { id: 'devers',   mlbId: 646240, name: 'Rafael Devers',       team: 'San Francisco Giants',  position: '3B', careerWAR: 26.7, seasonWAR: 3.1, gamesPlayed: 110, trend: 'Stable' },
  { id: 'altuve',   mlbId: 514888, name: 'Jose Altuve',         team: 'Houston Astros',        position: '2B', careerWAR: 53.4, seasonWAR: 2.6, gamesPlayed: 109, trend: 'Stable' },
  { id: 'arenado',  mlbId: 571448, name: 'Nolan Arenado',       team: 'St. Louis Cardinals',   position: '3B', careerWAR: 53.0, seasonWAR: 1.8, gamesPlayed: 107, trend: 'Declining' },
  { id: 'machado',  mlbId: 592518, name: 'Manny Machado',       team: 'San Diego Padres',      position: '3B', careerWAR: 56.8, seasonWAR: 3.4, gamesPlayed: 113, trend: 'Stable' },
  { id: 'freeman',  mlbId: 518692, name: 'Freddie Freeman',     team: 'Los Angeles Dodgers',   position: '1B', careerWAR: 60.3, seasonWAR: 3.0, gamesPlayed: 111, trend: 'Stable' },
  { id: 'goldy',    mlbId: 502671, name: 'Paul Goldschmidt',    team: 'New York Yankees',      position: '1B', careerWAR: 62.5, seasonWAR: 2.1, gamesPlayed: 105, trend: 'Declining' },
  { id: 'acuna',    mlbId: 660670, name: 'Ronald Acuña Jr.',    team: 'Atlanta Braves',        position: 'RF', careerWAR: 30.1, seasonWAR: 2.8, gamesPlayed: 78,  trend: 'Rising' },
  { id: 'turner',   mlbId: 607208, name: 'Trea Turner',         team: 'Philadelphia Phillies', position: 'SS', careerWAR: 38.6, seasonWAR: 3.7, gamesPlayed: 112, trend: 'Stable' },
];

export const findPlayer = (id?: string | string[]): Player | undefined => {
  if (!id) return undefined;
  const key = Array.isArray(id) ? id[0] : id;
  return PLAYERS.find((p) => p.id === key);
};
