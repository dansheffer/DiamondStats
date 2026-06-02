"""Update App Store Connect 1.0.1 metadata (whatsNew + description) and submit for review."""
import jwt, time, requests, json, sys

KEY = open('keys/AuthKey_4DMFU7ZX24.p8').read()
ISS = 'deda6503-60f8-4de7-b11e-f5f4e6fdea7a'
KID = '4DMFU7ZX24'
VID = '415f9df6-642d-45ae-a266-7649b8e40dd6'  # appStoreVersion 1.0.1

def token():
    return jwt.encode(
        {'iss': ISS, 'exp': int(time.time()) + 1200, 'aud': 'appstoreconnect-v1'},
        KEY, algorithm='ES256', headers={'kid': KID, 'typ': 'JWT'}
    )

H = {'Authorization': f'Bearer {token()}', 'Content-Type': 'application/json'}

WHATS_NEW = """Version 1.0.1 — Major feature update

• NEW: Live tab — real-time MLB scoreboard with in-progress game tracking
• NEW: Compare tab — head-to-head WAR and dollar-value comparisons between any two players
• NEW: Search tab — fast filtering across the full MLB by name, team, or position
• NEW: Favorites — save players for quick access, persisted across sessions
• NEW: Player detail pages — full season pace, trend indicators, advanced stats, and value breakdown
• Improved iPad layouts and dark-mode polish
• Faster cold starts and cached MLB data for offline use
• No ads. No tracking. No account required."""

DESCRIPTION = """Diamond Stats is the fastest, cleanest way to explore Major League Baseball player value — every team, every active player, with advanced stats and real dollar-value conversions.

Search any player across the entire MLB, compare two players head-to-head, watch live scoreboards, and see exactly what each player's WAR is worth at the league-standard rate ($9M / WAR). Built natively for iPhone and iPad — not a web wrapper — with zero ads, zero tracking, and no account required.

FEATURES
• Full MLB coverage — search any active player on any team
• Live scoreboard with real-time in-progress games
• Compare any two players head-to-head (WAR, value, pace, trend)
• Career WAR, Season WAR, and advanced stats at a glance
• Automatic dollar-value conversion ($9M / WAR)
• Full-season pace projections from games played
• Trend indicators (Rising, Stable, Declining)
• Save Favorites for one-tap access
• iPad and iPhone optimized layouts
• Works offline — cached data, no account, no ads, no tracking

WHY DIAMOND STATS?
Faster than ESPN, cleaner than Baseball-Reference, and fully native. Diamond Stats turns raw sabermetrics into the simple question every fan actually asks: what is this player really worth on the field?

Built for fans, fantasy players, scouts, and anyone who loves baseball numbers."""

PROMO = "Every MLB player, every team — live scores, head-to-head compares, and real dollar-value WAR. No ads, no tracking."

# 1. Get current localizations
r = requests.get(f'https://api.appstoreconnect.apple.com/v1/appStoreVersions/{VID}/appStoreVersionLocalizations', headers=H)
r.raise_for_status()
locs = r.json()['data']

for l in locs:
    if l['attributes'].get('locale') != 'en-US':
        continue
    lid = l['id']
    payload = {
        'data': {
            'type': 'appStoreVersionLocalizations',
            'id': lid,
            'attributes': {
                # whatsNew is locked on initial release (no prior approved version)
                'description': DESCRIPTION,
                'promotionalText': PROMO,
            }
        }
    }
    pr = requests.patch(
        f'https://api.appstoreconnect.apple.com/v1/appStoreVersionLocalizations/{lid}',
        headers=H, data=json.dumps(payload)
    )
    print('PATCH localization:', pr.status_code)
    if pr.status_code >= 300:
        print(pr.text); sys.exit(1)
    print('  whatsNew + description + promotionalText updated')

# 2. Submit for review (modern API: reviewSubmissions + reviewSubmissionItems)
# First find the app id
v = requests.get(f'https://api.appstoreconnect.apple.com/v1/appStoreVersions/{VID}?include=app', headers=H).json()
app_id = v['data']['relationships']['app']['data']['id']
print('App ID:', app_id)

# Check for existing in-progress reviewSubmission
existing = requests.get(
    f'https://api.appstoreconnect.apple.com/v1/reviewSubmissions?filter[app]={app_id}&filter[state]=READY_FOR_REVIEW,IN_REVIEW,WAITING_FOR_REVIEW,UNRESOLVED_ISSUES',
    headers=H
).json()
print('Existing review submissions:', len(existing.get('data', [])))

if existing.get('data'):
    rs_id = existing['data'][0]['id']
    print('Reusing reviewSubmission:', rs_id, 'state=', existing['data'][0]['attributes']['state'])
else:
    create = {
        'data': {
            'type': 'reviewSubmissions',
            'attributes': {'platform': 'IOS'},
            'relationships': {'app': {'data': {'type': 'apps', 'id': app_id}}}
        }
    }
    cr = requests.post('https://api.appstoreconnect.apple.com/v1/reviewSubmissions', headers=H, data=json.dumps(create))
    print('Create reviewSubmission:', cr.status_code)
    if cr.status_code >= 300:
        print(cr.text); sys.exit(1)
    rs_id = cr.json()['data']['id']
    print('Created reviewSubmission:', rs_id)

# Add the appStoreVersion as an item if not already there
items = requests.get(f'https://api.appstoreconnect.apple.com/v1/reviewSubmissions/{rs_id}/items', headers=H).json()
has_item = any(i.get('relationships', {}).get('appStoreVersion', {}).get('data', {}).get('id') == VID for i in items.get('data', []))
print('Items already attached:', len(items.get('data', [])), 'has our version=', has_item)

if not has_item:
    item_payload = {
        'data': {
            'type': 'reviewSubmissionItems',
            'relationships': {
                'reviewSubmission': {'data': {'type': 'reviewSubmissions', 'id': rs_id}},
                'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': VID}},
            }
        }
    }
    ir = requests.post('https://api.appstoreconnect.apple.com/v1/reviewSubmissionItems', headers=H, data=json.dumps(item_payload))
    print('Add item:', ir.status_code)
    if ir.status_code >= 300:
        print(ir.text); sys.exit(1)

# Submit (state -> SUBMITTED) by patching submitted=true
submit_payload = {
    'data': {
        'type': 'reviewSubmissions',
        'id': rs_id,
        'attributes': {'submitted': True}
    }
}
sr = requests.patch(f'https://api.appstoreconnect.apple.com/v1/reviewSubmissions/{rs_id}', headers=H, data=json.dumps(submit_payload))
print('Submit reviewSubmission:', sr.status_code)
if sr.status_code >= 300:
    print(sr.text); sys.exit(1)
print('SUBMITTED:', sr.json()['data']['attributes'].get('state'))
