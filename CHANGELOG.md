# Changelog

All notable changes to **DiamondStats** will be documented in this file.

---

## [0.2.0] – 2025-02-14

### Added
- **MLB Stats API layer** – Full integration with `statsapi.mlb.com` for search, standings, rosters, schedule, box scores, and player stats.
- **Home screen** – Sidebar navigation, player search, daily baseball trivia card, and tabbed sections (News, Standings, Rosters).
- **Today's Scoreboard** – Horizontal scrollable strip showing live/final/scheduled games with a digital dark theme.
- **ESPN-style Standings** – Dark navy standings tables grouped by league (AL/NL) and division, with team logos, W/L/PCT/GB/L10/STRK/RS columns, and Divisional/Wild Card tabs.
- **Team Rosters** – Grouped by position (Pitchers, Catchers, Infielders, Outfielders) with tappable rows that navigate to the player card.
- **News Feed** – MLB RSS news with tappable articles that open in the browser via `Linking.openURL`.
- **Baseball Card Player Detail** (`player/[playerId]`) – Card-frame design with player headshot, season stats, career stats, and 10-year career snapshot (year-by-year). Position-aware stat keys for hitters vs. pitchers.
- **Box Score Screen** (`game/[gamePk]`) – Inning-by-inning line score with R/H/E, digital dark theme, and 30-second auto-refresh.
- **AppLogo** – Pitcher silhouette component rendered in a circular badge.
- **PlayerAvatar** – MLB headshot image component using `img.mlbstatic.com`.
- **AsyncStorage persistence** – Remembers last selected roster team across sessions.
- **Stack navigator** – Themed header for index, player, and game routes.

### Changed
- Replaced original `ValueCard` demo screen with full-featured home screen.
- Sidebar redesigned from heavy blue to light gray (`#f3f4f6`).
- Standings upgraded from flat list to ESPN/MLB-app-style dark grouped tables.
- Player card redesigned with card frame, ribbon header, and year-by-year career table.

### Fixed
- `VirtualizedList` nesting warning resolved by replacing `FlatList` in team dropdown with `ScrollView`.
- Asset paths corrected in `app.json`.
- Added `dom` lib to `tsconfig.json` for `fetch` type support.
- Pinned `@react-native-async-storage/async-storage` to `1.23.1` for Expo 51 compatibility.

---

## [0.1.0] – 2025-02-13

### Added
- Initial Expo project setup with expo-router.
- Mets-themed avatar and basic project docs.
- `DIAMOND_STATS_SPEC.md` design specification.
