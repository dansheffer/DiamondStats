# Diamond Stats

**A modern mobile app for MLB player analytics and value projections**

---

## Overview

Diamond Stats is an Expo React Native app (TypeScript) that helps baseball fans and analysts quickly visualize player value through WAR (Wins Above Replacement) statistics and projected season performance.

**MVP Goal**: Build a clean, Mets-themed POC demonstrating player value cards with live headshots, season projections, and a foundation for future MLB data integration.

---

## Current Features (POC)

### ValueCard Component
- Displays career and season WAR stats
- Converts WAR to dollar value ($9M per WAR)
- Shows "If this pace continues…" projection section (linear extrapolation to 162 games)
- Color-coded performance trend badge (Rising/Stable/Declining)

### PlayerAvatar Component
- Fetches live MLB headshots via `mlbId`
- Falls back to placeholder on error or missing ID
- Circular avatar with subtle border

### Mets Theme
- Primary: Mets Blue `#002D72`
- Accent: Mets Orange `#FF5910`
- Clean, minimalist design system in `src/theme/colors.ts`

### Projection Section
- Linear pace assumption: `(seasonWAR / gamesPlayed) * 162`
- Only appears when `gamesPlayed > 0`
- Shows projected full-season WAR and dollar value

---

## How to Run Locally

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Xcode) or Android Emulator

### Install
```bash
git clone <repo-url>
cd DiamondStats
npm install
```

### Start Development Server
```bash
expo start
```

### Run on iOS Simulator
1. Press `i` in the terminal after `expo start`
2. Or open the Expo app and scan the QR code

### Notes
- Add a placeholder image at `assets/player-placeholder.png` before running (see `assets/README.md`)
- To test with real MLB headshots, pass a valid `mlbId` prop (e.g., Pete Alonso: `624413`)

---

## Architecture / Folder Structure

```
DiamondStats/
├── app/
│   ├── index.tsx                  # Main entry point / root route
│   ├── EXAMPLE_USAGE.tsx         # Demo examples
│   └── src/
│       ├── components/           # Reusable UI components
│       │   ├── valuecard.tsx     # Player stats card
│       │   └── PlayerAvatar.tsx  # Circular headshot
│       ├── api/                  # (Future) API client logic
│       └── theme/                # Design system
│           └── colors.ts         # Mets brand colors + theme object
├── assets/                       # Images, fonts, etc.
└── docs/                         # Documentation
```

### Explanation
- **`app/`**: Expo Router-based navigation (file-based routing). `index.tsx` is the home screen.
- **`src/components/`**: Shared components like `ValueCard` and `PlayerAvatar`.
- **`src/api/`**: Planned API layer for MLB Stats API integration.
- **`src/theme/`**: Centralized design tokens (colors, typography).

---

## Key Components

### ValueCard

**Props**:
```typescript
interface ValueCardProps {
  playerName: string;
  position?: string;
  team?: string;
  careerWAR?: number;
  seasonWAR?: number;
  gamesPlayed?: number;
  trend?: 'Rising' | 'Stable' | 'Declining';
  mlbId?: number;
  headshotUrl?: string | null;
}
```

**Example**:
```tsx
<ValueCard
  playerName="Pete Alonso"
  position="1B"
  team="New York Mets"
  careerWAR={18.5}
  seasonWAR={4.2}
  gamesPlayed={85}
  trend="Rising"
  mlbId={624413}
/>
```

### Projection Formula & Assumptions

**Formula**:
```typescript
projectedSeasonWAR = (seasonWAR / gamesPlayed) * 162
projectedSeasonValue = projectedSeasonWAR * 9_000_000
```

**Assumptions**:
- **$9M per WAR**: Industry-standard player value conversion
- **162-game season**: Full MLB regular season
- **Linear pace**: No adjustments for injury, fatigue, or performance trends
- **Current snapshot**: Based on stats at the moment data is passed

**Example**:
- 4.2 WAR in 85 games → 8.0 projected WAR → $72.0M projected value

---

## Data Sources Plan

### MLB Stats API
- **Player Search**: Use MLB's Stats API to search by name or ID
- **Roster Data**: Fetch team rosters and player metadata
- **Stats**: Pull current season stats (WAR typically from Baseball-Reference or FanGraphs)

### Headshot URL Pattern (POC)
```
https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_auto:best,f_auto/v1/people/{mlbId}/headshot/67/current
```
- `{mlbId}`: Unique MLB player identifier (e.g., `624413` for Pete Alonso)
- Auto-optimized quality and format

### Licensing Note
- **Player Photos**: MLB headshots are subject to MLB's terms of use. This POC uses publicly available URLs for demonstration purposes only.
- **Team Logos**: Mets branding (colors) used for design consistency. Any commercial use would require proper licensing.
- **Stats Data**: WAR and other advanced metrics are proprietary to Baseball-Reference, FanGraphs, or similar providers. Always cite sources and review API terms.

---

## Roadmap

### Milestone 1: Player Search Screen
- Search bar with autocomplete
- Display player results in a list
- Tap to view player's ValueCard
- Integrate MLB Stats API for live player lookup

### Milestone 2: Roster Screen
- Display full team rosters (e.g., Mets 40-man)
- Filter by position
- Sort by WAR or other stats
- Navigate to individual player detail

### Milestone 3: Player Detail with Stats Sections
- Expand ValueCard into a full player profile screen
- Add tabs/sections: Batting, Pitching, Fielding, Splits
- Historical WAR trends (line chart)
- Season-by-season breakdown

---

## Changelog

### [Unreleased] - 2026-02-01

#### Added
- Mets-themed design system with `METS_BLUE` and `METS_ORANGE` colors
- `PlayerAvatar` component with MLB headshot integration and fallback placeholder
- "If this pace continues…" projection section in `ValueCard`
- Linear projection formula: `(seasonWAR / gamesPlayed) * 162`
- `gamesPlayed` prop to `ValueCard` for projection calculations
- Documentation: `DIAMOND_STATS_SPEC.md` and `EXAMPLE_USAGE.tsx`

#### Changed
- Updated `ValueCard` to accept `playerName`, `mlbId`, and `headshotUrl` props
- Player name now displays in Mets blue with avatar
- Stat labels now use Mets blue for brand consistency
- "Rising" trend badge now uses Mets orange as accent highlight

---

**Last Updated**: February 1, 2026
