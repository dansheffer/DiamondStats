# Changelog

All notable changes to **DiamondStats** will be documented in this file.

---

## [1.1.0] – 2026-03-19

### Bug Fixes
- **Box Score: team names now show correctly** — Switched from `/game/{id}/linescore` (which doesn't return team names) to the live game feed endpoint. Box score now properly displays real team names instead of "Away" / "Home".
- **Box Score: game status now displays** — The old linescore endpoint lacked a `status` field, so the detailed state (e.g. "In Progress", "Final") was always falling back to "Scheduled". Fixed.
- **Fragile stat picking** — Career/season hitting stats now explicitly filter by the `hitting` group instead of grabbing the first available stat entry (which could be pitching stats for TWP or pitchers).
- **Tie game handling** — My Team "Last Result" now correctly shows "T" for tied games (common in Spring Training) instead of incorrectly labeling a tie as "L".

### Added
- **Spring Training badge** — Home screen scoreboard shows a 🌴 Spring Training pill when today's games are ST type.
- **Standings pre-season banner** — When all teams show 0-0, a green banner explains that regular season standings will update once the season begins.
- `gameType` field on `TodayGame` interface to distinguish Spring Training, Regular Season, and Postseason.

---

## [1.0.0] – 2026-03-01

### Added
- **Advanced Sabermetrics section** on player cards – BABIP, ISO, K%, BB%, BB/K, HR/PA for hitters; K/9, BB/9, HR/9, H/9, Whiff%, Strike%, QS for pitchers. Data sourced from MLB Stats API `careerAdvanced` endpoint.
- **Two-way player support** – Players like Shohei Ohtani (position: TWP) now show separate hitting AND pitching career stats, season stats, year-by-year snapshots, and advanced sabermetrics for both sides.
- **Pre-season indicator** – When the regular season hasn't started, the Season Stats section now shows a clear "Season Has Not Started" message with Spring Training context instead of a blank "Season has not started yet" line.
- **Leader season labeling** – "Who's Hot" section now displays which season the leaders are from. When falling back to the previous season (pre-season), it shows a note explaining that the current season hasn't started.
- **Additional stat columns** – Added OBP, SLG, SB to hitting stat keys; added GS, IP to pitching stat keys for more complete player cards.

### Fixed
- **BUG: WAR always showed "N/A"** – The MLB Stats API does not include a `war` field in `seasonAdvanced` or `careerAdvanced` responses. The `extractWar()` function was looking for non-existent keys. WAR section now displays "Pre-Season" or "Pending" as appropriate, with an honest note about API limitations.
- **BUG: Ohtani treated as pitcher-only** – `TWP` (Two-Way Player) was in the pitcher position check, causing only pitching stats to display. Two-way players now get dedicated dual-stat display.
- **BUG: "Who's Hot" showed previous year stats without labeling** – `fetchStatLeaders()` fell back to the prior season when the current season had no data, but never told the user. Now returns `season` and `isFallback` metadata.
- **BUG: Advanced stats fetched but never displayed** – `seasonAdvanced` and `careerAdvanced` data was requested from the API but the rich sabermetric data (BABIP, ISO, K rates, etc.) was discarded. Now fully surfaced in the player card.

### Changed
- `fetchStatLeaders()` now returns a `StatLeadersResult` wrapper object with `{ season, isFallback, categories }` instead of a bare `LeaderCategory[]`.
- `PlayerCardData` interface expanded with `isTwoWay`, separate hitting/pitching stats, and `AdvancedSabermetrics` for both hitting and pitching.
- Added `pickStatsByTypeAndGroup()` helper for filtering stats by both type and group name.

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
