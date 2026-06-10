# Diamond Stats Release SOP

This is the repeatable checklist for every Diamond Stats update.

## 1. Plan the Release

- Pick the version number in `app.json`, `package.json`, and `package-lock.json`.
- Keep releases focused: one visible theme, a few polished features, no bloat.
- Update `docs/APP_STORE_METADATA.md` before building.
- Update or add an App Store Connect script when metadata changes.

## 2. Local QA

- Run the app in Simulator before every submission.
- If the repo is under iCloud `Mobile Documents`, local Xcode scripts may fail on the space in the path. Build from a no-space temp copy:

```sh
rsync -a --delete --exclude .git --exclude ios/build ./ /private/tmp/DiamondStatsSim/
cd /private/tmp/DiamondStatsSim
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer npx expo run:ios --device <SIMULATOR_UDID> --port 8081
```

- If pods/codegen point to old paths in the temp copy, regenerate:

```sh
cd /private/tmp/DiamondStatsSim/ios
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer pod install
```

- If `pod install` fails on `React-Core-prebuilt` with a missing `source`, set
  `ios.buildReactNativeFromSource` to `true` in
  `/private/tmp/DiamondStatsSim/ios/Podfile.properties.json`, then run `pod install`
  again.

- Smoke test:
  - Top Players loads.
  - Position filters work.
  - Live > Today's Games loads.
  - Tapping a game opens the game detail screen.
  - Game detail header shows the matchup, not `game/[gamePk]`.
  - Team tab opens, allows favorite-team selection, and shows roster/schedule.
  - Search opens a player card.
  - Compare and Calculator still open.

## 3. App Store Metadata / ASO

- Current ASO target:
  - Name: `Diamond Stats MLB Scores`
  - Subtitle: `Baseball Stats & Box Scores`
  - Keywords: `standings,fantasy,players,pitching,batting,war,woba,fip,rosters,teams,sabermetrics,live`
- Do not repeat every word from the name/subtitle in keywords; use the 100-character keyword field for extra coverage.
- Refresh promotional text for seasonal moments: Opening Day, All-Star break, playoffs, World Series, trade deadline.
- Push metadata when the App Store Connect API key exists at `keys/AuthKey_4DMFU7ZX24.p8`:

```sh
python3 scripts/asc_update_aso_17.py
```

## 4. Build

- Production builds use EAS:

```sh
npx eas build --platform ios --profile production
```

- `eas.json` uses remote versioning and auto-increment for production builds.
- Wait for the build to finish and process in App Store Connect.

## 5. Submit

- Submit the latest production build:

```sh
npx eas submit --platform ios --profile production --latest
```

- Confirm App Store Connect shows the correct:
  - Version
  - Build
  - Description
  - Keywords
  - Promotional text
  - What's New
  - Support URL
  - Privacy URL

## 6. Final Gate

- Install via TestFlight when available.
- Complete the smoke test on a real device or TestFlight install.
- Only then submit for App Review.

## 7. GitHub

- Commit after local QA and before production build.
- Use a release-style commit message:

```sh
git add -A
git commit -m "Prepare Diamond Stats 1.7.0 release"
git push origin main
```

## 8. If Search Ranking Is Weak

- Use name/subtitle for high-intent phrases: MLB scores, baseball stats, box scores.
- Use keywords for adjacent searches: standings, fantasy, players, pitching, batting, WAR, wOBA, FIP, rosters, teams, sabermetrics, live.
- Update screenshots so the first three frames clearly show scores, player stats, and team/game detail.
- Run a small Apple Search Ads test before scaling:
  - Exact match: `baseball stats`, `MLB scores`, `box scores`, `baseball standings`, `fantasy baseball stats`.
  - Start with a low daily cap and judge by install cost and retention, not impressions.
