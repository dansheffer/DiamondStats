# Diamond Stats — Session Context (April 19, 2026)

> **Tell the next Copilot agent:** "Read SESSION_CONTEXT.md in the DiamondStats project root for where we left off."

---

## Current Status: EAS Production Build Blocked

### What's Done ✅
- All app code is complete and working (Expo SDK 51 + React Native 0.74.5)
- App runs fine locally via `npx expo start --dev-client`
- App Store metadata fully written in `docs/APP_STORE_METADATA.md`
- Privacy policy & support pages live on GitHub Pages
- Screenshots captured for iPhone (6) and iPad (6) in `screenshots/`
- App icon (1024x1024) and splash screen assets ready
- `eas.json` configured with submit credentials (ascAppId: 6762099221, appleTeamId: Z3LQY2KV6L)
- `react-native-iap` downgraded to v12.15.7 for Expo SDK 51 compatibility
- `react-native-google-mobile-ads` removed (incompatible with SDK 51)
- `ITSAppUsesNonExemptEncryption: false` set in app.json

### What's Blocking ❌
1. **EAS production build fails** — last attempt:
   ```
   npx eas-cli build --platform ios --profile production --non-interactive
   ```
   Error: "Distribution certificate is not validated for non-interactive builds"
   
   **Root cause:** The Apple Distribution Certificate either:
   - Doesn't exist yet in Apple Developer portal
   - Exists but isn't registered/synced with EAS credentials
   - Needs to be created interactively (first time)

2. **Fix:** Run the build **interactively** (without `--non-interactive`):
   ```
   cd "/Users/danielsheffer/Library/Mobile Documents/com~apple~CloudDocs/diamondstats/DiamondStats"
   npx eas-cli build --platform ios --profile production
   ```
   This will prompt you to:
   - Log in to Apple Developer account
   - Create or select a Distribution Certificate
   - Create or select a Provisioning Profile
   - After first successful interactive setup, future builds can use `--non-interactive`

3. **After build succeeds**, submit to App Store Connect:
   ```
   npx eas-cli submit --platform ios --latest
   ```

### Remaining Steps for App Store Submission
1. ✅ Fix build (distribution cert issue — run interactive build)
2. ⬜ Submit .ipa to App Store Connect via `eas submit`
3. ⬜ Create 3 In-App Purchase products in App Store Connect:
   - `com.dsheffer.diamondstats1.tip.small` ($0.99)
   - `com.dsheffer.diamondstats1.tip.medium` ($2.99)
   - `com.dsheffer.diamondstats1.tip.large` ($4.99)
4. ⬜ Add phone number to App Review contact info in ASC
5. ⬜ Fill out Age Rating questionnaire (all "None" → 4+)
6. ⬜ Upload screenshots to ASC (6.7" iPhone, 12.9" iPad)
7. ⬜ Paste metadata (description, keywords, release notes) into ASC
8. ⬜ Click "Submit for Review"

### Key Project Details
- **Bundle ID:** com.dsheffer.diamondstats1
- **Apple ID:** dsheffer10@icloud.com
- **Team ID:** Z3LQY2KV6L
- **ASC App ID:** 6762099221
- **EAS Project ID:** 9ea8a430-5263-4917-ab7e-cf88992e2b2f
- **Expo SDK:** 51 | **React Native:** 0.74.5
- **Git repo:** Push to `origin main`

### Key Files
- `app.json` — Expo config
- `eas.json` — EAS Build + Submit config
- `docs/APP_STORE_METADATA.md` — All ASC copy-paste text
- `src/utils/store.ts` — IAP logic (tip jar)
- `src/components/PremiumCard.tsx` — Tip jar UI
