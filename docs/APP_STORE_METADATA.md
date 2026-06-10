# Diamond Stats — App Store Connect Fields (Copy & Paste)

> **ASC App ID:** 6762099221
> **Bundle ID:** com.dsheffer.diamondstats1
> **SKU:** diamondstats1

---

## App Information Tab

### Name (30 chars max)
Diamond Stats MLB Scores

### Subtitle (30 chars max)
Baseball Stats & Box Scores

### Category
Primary: Sports
Secondary: Reference

### Content Rights
Does not contain, show, or access third-party content

### Age Rating
4+ (no objectionable content)

### Price
Free

---

## Version Information Tab

### Promotional Text (170 chars — can update anytime, no review needed)
Game Day upgrade: restore My Team, tap today's MLB games for box scores, see start times, probable pitchers, and filter Top Players by position.

### Description (4000 chars max — copy everything below this line)

Diamond Stats is the ultimate free baseball companion — live MLB scores, full box scores, deep player stats, and the advanced sabermetrics that front offices actually use. No account required. No paywall. Just baseball.

▸ LIVE SCORES & BOX SCORES
Track every MLB game in real time. See scores, innings, start times, game status, and probable pitchers when available. Tap any game for a complete box score with individual batting and pitching lines, including H, R, RBI, HR, ERA, K, BB, and more. Winning pitcher, losing pitcher, and save decisions are highlighted instantly.

▸ PLAYER CARDS — 10,000+ PLAYERS
Search any active or historical MLB player by name. Each player card includes:
  • Full bio: age, height, weight, bats/throws, debut date, birthplace
  • Season and career batting or pitching stats
  • Year-by-year career breakdowns
  • Two-way player support (hitting + pitching shown side by side)
  • Active/retired badge so you always know who you're looking at

▸ ADVANCED SABERMETRICS
Go beyond batting average. Diamond Stats calculates the metrics that matter:
  • FIP (Fielding Independent Pitching)
  • wOBA (Weighted On-Base Average)
  • BABIP, ISO, K%, BB%, K/9, BB/9, HR/9, WHIP, OPS+, and more
  • Season AND career advanced metrics for every player
These are the same analytics used by MLB front offices to evaluate talent.

▸ STANDINGS & WILD CARD RACE
Full divisional standings with W-L, PCT, Games Back, home/away splits, run differential, last 10 games, and current streak. Switch to the Wild Card tab for a live look at the WC race with clinch scenarios and elimination numbers.

▸ TOP PLAYERS BY POSITION
Browse a curated Top Players board, sort by WAR, follow rising stars, filter your favorites, and narrow the leaderboard by C, 1B, 2B, 3B, SS, OF, or DH.

▸ MY TEAM
Pick your favorite MLB team and get a personalized dashboard with your team's record, roster, schedule, recent results, next game, and quick-tap access to game detail.

▸ LATEST MLB NEWS
Stay current with headlines pulled directly from official MLB sources, complete with images. Tap any story to read the full article.

▸ BASEBALL TRIVIA
55+ curated baseball trivia facts that rotate on the home screen. Learn something new every time you open the app.

▸ BEAUTIFULLY DESIGNED FOR iPHONE & iPAD
Responsive layout that adapts to any screen size. Frosted glass UI with smooth animations. Dark navy and gold color palette inspired by the diamond. Fast, lightweight, and buttery smooth.

Diamond Stats is and always will be free. If you love the app, an optional tip jar is available to support independent development — but it's never required.

Data provided by the MLB Stats API. Diamond Stats is not affiliated with or endorsed by Major League Baseball.

### Keywords (100 chars max — comma-separated, no spaces after commas)
standings,fantasy,players,pitching,batting,war,woba,fip,rosters,teams,sabermetrics,live

### Support URL
https://dansheffer.github.io/DiamondStats/support.html

### Marketing URL (optional)
https://dansheffer.github.io/DiamondStats/

### Privacy Policy URL
https://dansheffer.github.io/DiamondStats/privacy-policy.html

### Copyright
© 2026 Daniel Sheffer

### What's New / Release Notes (Version 1.7.0)
Game Day polish for baseball season.

• My Team is back in the tab bar with favorite team, record, roster, next game, and latest result
• Today's Games are now tappable and open full game detail / box scores
• Game cards now show scheduled start time and probable pitchers when available
• Top Players now has position filters for C, 1B, 2B, 3B, SS, OF, and DH
• Game detail headers now show the actual matchup instead of a route variable
• Focused performance and UI polish without adding bloat

---

## App Review Information

### Contact Information
First Name: Daniel
Last Name: Sheffer
Email: dsheffer10@icloud.com
Phone: (your phone number)

### Sign-In Required
No

### Notes for Review
Diamond Stats is a free sports app that displays publicly available MLB statistics and scores from the MLB Stats API (statsapi.mlb.com). No user account or sign-in is required. The app includes optional in-app purchases (tip jar) but all features are fully available without purchasing. The app does not collect any personal data.

---

## App Privacy (Data Collection)

### Data Collection
Select: **Data Not Collected**

Diamond Stats does not collect any user data. All MLB data is fetched from public APIs. No analytics, tracking, or personal information is gathered.

---

## In-App Purchases (Create in App Store Connect → In-App Purchases)

### 1. Single Tip (Consumable)
- Reference Name: Single Tip
- Product ID: com.dsheffer.diamondstats1.tip.small
- Price: $0.99 (Tier 1)
- Display Name: Single ⚾
- Description: A small tip to support Diamond Stats development. Thank you!

### 2. Double Tip (Consumable)
- Reference Name: Double Tip
- Product ID: com.dsheffer.diamondstats1.tip.medium
- Price: $2.99 (Tier 3)
- Display Name: Double 🏟️
- Description: A generous tip to support Diamond Stats development. You're awesome!

### 3. Home Run Tip (Consumable)
- Reference Name: Home Run Tip
- Product ID: com.dsheffer.diamondstats1.tip.large
- Price: $4.99 (Tier 5)
- Display Name: Home Run 🏆
- Description: An amazing tip to support Diamond Stats development. You're a legend!

### 4. Remove Ads (Non-Consumable) — DEFER TO v1.1+
- Reference Name: Remove Ads
- Product ID: com.dsheffer.diamondstats1.removeads
- Price: $1.99 (Tier 2)
- Display Name: Remove Ads 💎
- Description: Remove the small ad banner permanently. Thank you for supporting Diamond Stats!
- NOTE: Defer this IAP until ads are actually implemented (requires Expo SDK 52+ for AdMob). Do NOT create this product for v1.0 — Apple will reject if the IAP doesn't do anything.

---

## Monetization Strategy (v1.0 → v1.x)

### v1.0 (Launch)
- **Tip Jar only** — 3 consumable tiers ($0.99 / $2.99 / $4.99)
- No ads (AdMob incompatible with Expo SDK 51)
- All features free, tips are voluntary
- Review prompt after 5 sessions drives organic ratings

### v1.1+ (After Expo SDK 52 upgrade)
- Add AdMob banner (small, bottom of home screen, non-intrusive)
- Add "Remove Ads" IAP ($1.99 non-consumable)
- Component is already coded (AdBanner.tsx + store.ts)

### Revenue Projections (Conservative)
- Tip conversion: ~1-2% of users
- Average tip: ~$1.50
- At 1,000 MAU → ~$15-30/month from tips
- At 10,000 MAU → $150-300/month from tips
- With ads (v1.1): +$1-3 eCPM → $10-30/month per 10K MAU
- Remove ads conversion: ~3-5% → additional $40-100 per 10K MAU

### Growth Levers
1. **ASO** — Keywords target "mlb stats", "baseball scores", "sabermetrics" (lower competition than "sports scores")
2. **Seasonal spikes** — Update promotional text for Opening Day, All-Star, Playoffs, World Series
3. **Ratings** — Store review prompt drives 4.5+ star rating early
4. **Content marketing** — Share trivia facts on social (built-in viral content)
5. **Feature expansion** — Fantasy baseball integration, push notifications for favorite team
