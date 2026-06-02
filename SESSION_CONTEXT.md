# Diamond Stats — Session Context (Updated April 19, 2026 — 2nd pass)

> **Tell the next Copilot agent:** "Read `SESSION_CONTEXT.md` in the DiamondStats project root for where we left off."

---

## Current Status: Apple Credential Auth Blocking EAS Build

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
- Logged into EAS as `dansheffer` (verified via `eas whoami`)
- buildNumber has been auto-incremented to 4 across attempts

### What's Blocking ❌

**Apple ID authentication fails during EAS build.**

We tried:
1. `--non-interactive` → fails because no Distribution Certificate exists yet
2. Interactive build → EAS prompts to log in to Apple, but the **Keychain password for `dsheffer10@icloud.com` is stale/wrong**
3. Error: `"Invalid username and password combination. Used 'dsheffer10@icloud.com'"`
4. EAS removed the bad password from Keychain automatically

### EXACT Fix (Do This on Laptop)

**Step 1:** Open a terminal in the DiamondStats project directory and run:
```bash
npx eas-cli build --platform ios --profile production
```

**Step 2:** When prompted "Do you want to log in to your Apple account?" → **Yes**

**Step 3:** Enter your **current** Apple ID password for `dsheffer10@icloud.com`
- If the password was recently changed, use the new one
- You WILL get a 2FA code on your phone/other device — enter it when prompted

**Step 4:** When prompted about Distribution Certificate → choose **"Generate a new Apple Distribution Certificate"**

**Step 5:** When prompted about Provisioning Profile → choose **"Generate a new Provisioning Profile"**

**Step 6:** The build will upload to EAS cloud and compile. Wait for it to finish (~10-15 min).

**Step 7:** After build succeeds, submit to App Store Connect:
```bash
npx eas-cli submit --platform ios --latest
```

### Alternative: Use App Store Connect API Key (Skip Password)

If Apple ID login keeps failing, create an ASC API Key:
1. Go to https://appstoreconnect.apple.com/access/integrations/api
2. Generate key → Name: "EAS Build" → Access: Admin
3. Download the `.p8` file, note Key ID and Issuer ID
4. Update `eas.json` under `submit.production.ios`:
   ```json
   "ascApiKeyPath": "./keys/AuthKey_XXXXX.p8",
   "ascApiKeyIssuerId": "your-issuer-id",
   "ascApiKeyId": "your-key-id"
   ```
5. Run: `npx eas-cli build --platform ios --profile production`

### After Build Succeeds — Remaining Steps
1. ⬜ Submit .ipa → `npx eas-cli submit --platform ios --latest`
2. ⬜ Create 3 In-App Purchase products in App Store Connect:
   - `com.dsheffer.diamondstats1.tip.small` ($0.99) — "Single ⚾"
   - `com.dsheffer.diamondstats1.tip.medium` ($2.99) — "Double 🏟️"
   - `com.dsheffer.diamondstats1.tip.large` ($4.99) — "Home Run 🏆"
3. ⬜ Add phone number to App Review contact info in ASC
4. ⬜ Fill out Age Rating questionnaire (all "None" → 4+)
5. ⬜ Upload screenshots to ASC (6.7" iPhone, 12.9" iPad) — files are in `screenshots/`
6. ⬜ Paste metadata from `docs/APP_STORE_METADATA.md` into ASC fields
7. ⬜ Click "Submit for Review"

### Key Project Details
- **Bundle ID:** com.dsheffer.diamondstats1
- **Apple ID:** dsheffer10@icloud.com
- **Team ID:** Z3LQY2KV6L
- **ASC App ID:** 6762099221
- **EAS Project ID:** 9ea8a430-5263-4917-ab7e-cf88992e2b2f
- **Expo SDK:** 51 | **React Native:** 0.74.5
- **Git repo:** Push to `origin main`
- **Current buildNumber:** 4

### Key Files
- `app.json` — Expo config
- `eas.json` — EAS Build + Submit config  
- `docs/APP_STORE_METADATA.md` — All ASC copy-paste text (description, keywords, release notes, IAP details, review notes)
- `src/utils/store.ts` — IAP logic (tip jar)
- `src/components/PremiumCard.tsx` — Tip jar UI
- `docs/privacy-policy.html` — Privacy policy (also live on GitHub Pages)
- `docs/support.html` — Support page (also live on GitHub Pages)
