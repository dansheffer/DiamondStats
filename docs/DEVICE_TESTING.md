# Diamond Stats — Real-Device Testing Playbook

**Problem:** Apple keeps rejecting on iPad Air 11" M3 / iPadOS 26.x. We only have one iPad and no realistic way to test against the same path Apple takes (signed Release build, App Store install).

**Solution:** Three layers — fast (simulator), real (TestFlight on your own iPad), and broad (cloud farm).

---

## Layer 1 — iPad Simulator Matrix (every commit)

We boot all three iPad classes Apple commonly reviews on, install the bundled
JS over the Debug `.app`, and verify launch + force-quit + relaunch.

```bash
# One-time: boot the three sizes Apple uses
xcrun simctl boot "DD3F5707-07E5-440A-B2F1-0E3FB2DCEAD3"  # iPad Air 11" M3
xcrun simctl boot "B9C16C51-F7F6-4F47-877A-31D2B36E89FE"  # iPad Pro 13" M5
xcrun simctl boot "CF066AED-99C9-4341-A5DF-060DBA28E472"  # iPad mini A17 Pro

# Per-change: rebundle JS into the existing .app
APP=/Users/dsheffer/Library/Developer/Xcode/DerivedData/DiamondStats-dyjbpkiizqlburackycinzyvsjbj/Build/Products/Debug-iphonesimulator/DiamondStats.app
rm -rf "$APP/main.jsbundle" "$APP/assets"
npx expo export:embed --platform ios --dev false \
  --bundle-output "$APP/main.jsbundle" \
  --assets-dest "$APP" \
  --entry-file node_modules/expo-router/entry.js

# Install + launch on each
for SIM in DD3F5707-07E5-440A-B2F1-0E3FB2DCEAD3 \
           B9C16C51-F7F6-4F47-877A-31D2B36E89FE \
           CF066AED-99C9-4341-A5DF-060DBA28E472; do
  xcrun simctl uninstall  $SIM com.dsheffer.diamondstats1 2>/dev/null
  xcrun simctl install    $SIM "$APP"
  xcrun simctl launch     $SIM com.dsheffer.diamondstats1
done
```

**Limitation:** The simulator runs a Debug-style JS bundle. Splash, sign-in
keychain, and StoreKit behavior can differ. Use Layer 2 for anything user-facing.

---

## Layer 2 — TestFlight Internal on YOUR iPad (highest fidelity)

This is the **most important** layer. TestFlight installs the **exact same
binary Apple is reviewing**, with **production code signing**, on **your own
iPad**, in **under 10 minutes**, **with no Apple review queue**.

### One-time setup (you, ~5 min)

1. Make sure you're an internal tester:
   <https://appstoreconnect.apple.com/teams/Z3LQY2KV6L/users>
   You should see yourself with the **Admin** role and **Access to TestFlight**.

2. Create the internal tester group (already done if missing):
   <https://appstoreconnect.apple.com/apps/6762099221/testflight>
   → Internal Testing → **+** → name it "Daniel" → add yourself.

3. On your iPad, install the **TestFlight** app from the App Store, then sign
   in with the same Apple ID `dsheffer10@icloud.com`.

### Per-build (every time we ship a new build)

After EAS finishes a production build and we run `eas submit`, the IPA goes to
ASC and processes in 5–15 min. Once `processingState=VALID` (we already poll
for this), the build is **automatically available to your internal group** —
**no Apple review needed**.

On your iPad, open TestFlight → "Diamond Stats" → tap **Install** (or **Update**).

You now have the **exact build Apple will see**, on the **exact iPad model**
they review on. Test the failure scenarios from the rejection letter:

- ✅ Launch from cold
- ✅ Scroll the main list (not just one card)
- ✅ Search "Judge", clear, search "Mets"
- ✅ Tap a row → detail screen → back
- ✅ Force-quit (swipe up app switcher), relaunch
- ✅ Airplane mode toggle, relaunch (avatar fallback path)
- ✅ Rotate landscape ↔ portrait

If **any** of those fails, we don't submit. Period.

---

## Layer 3 — Maestro Smoke Test (catches regressions)

`.maestro/smoke.yaml` automates the user journey across every build. Run on
the iPad simulator after each rebuild:

```bash
brew install maestro    # one-time
maestro test .maestro/smoke.yaml
```

It will:
1. Launch the app fresh
2. Verify list loads with all 16 players
3. Search "judge" → verify Aaron Judge visible, Soto hidden
4. Tap Aaron Judge → verify detail screen shows Career WAR / Season WAR / Career Value
5. Back → verify list returns
6. Search "Mets" → verify Soto + Lindor visible

If any assertion fails, **do not submit**.

---

## Layer 4 — Cloud Device Farm (optional, for paid expansion)

Free options for ad-hoc cross-device testing:
- **Apple Feedback Assistant** + TestFlight external (24h review)
- **AWS Device Farm** (~$0.17/min, real iPads)
- **BrowserStack App Live** ($29/mo, instant real iPad sessions in browser)

We don't need this for v1.0 if Layer 2 works — but it's the right answer once
we have multiple SKUs / OS versions to support.

---

## Pre-Submission Checklist (gate every `eas submit`)

- [ ] `npx tsc --noEmit` clean
- [ ] All three iPad simulators launch + render list
- [ ] `maestro test .maestro/smoke.yaml` green
- [ ] **TestFlight install on real iPad — completed full smoke flow, no hang**
- [ ] ASC metadata reviewed: no IAP language, no parental-control claims
- [ ] Age Rating: ageAssurance=False, parentalControls=False (`python3 scripts/asc_age_rating.py`)
- [ ] Review Notes match what app actually does

Only then run `eas submit`.
