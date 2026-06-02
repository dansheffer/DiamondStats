#!/usr/bin/env python3
"""Set the App Review notes on App Store version 1.0.1."""
import jwt, time, requests
key = open('keys/AuthKey_4DMFU7ZX24.p8').read()
tok = jwt.encode(
    {'iss': 'deda6503-60f8-4de7-b11e-f5f4e6fdea7a',
     'exp': int(time.time()) + 1200, 'aud': 'appstoreconnect-v1'},
    key, algorithm='ES256', headers={'kid': '4DMFU7ZX24', 'typ': 'JWT'})
h = {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}
vid = '415f9df6-642d-45ae-a266-7649b8e40dd6'

NOTES = (
    "Update addressing previous review feedback (Guideline 4.2 \u2014 Minimum Functionality):\n\n"
    "This version adds substantial interactive functionality. The app now performs live "
    "network requests to the public MLB Stats API (statsapi.mlb.com) for:\n"
    "  - Player search across every active MLB player\n"
    "  - Real-time AL and NL standings (all 6 divisions)\n"
    "  - Today's game scores and inning state\n"
    "  - Current-season hitting and pitching statistics for any selected player\n\n"
    "Users can also star players to build a personal favorites watchlist persisted on-device "
    "with AsyncStorage, and filter the Players tab to favorites only.\n\n"
    "No login or account is required. The app ships with a built-in roster that works offline; "
    "the Search and Live tabs require a network connection to fetch real-time data from MLB.\n\n"
    "Test path:\n"
    "  1. Open the Search tab and type 'Skenes' or 'Yamamoto' \u2014 results appear from the live MLB API.\n"
    "  2. Tap any result to view real current-season stats.\n"
    "  3. Open the Live tab to view today's MLB standings and games.\n"
    "  4. Tap the star icon on any player detail page to add them to favorites; tap the star "
    "in the Players tab header to filter to favorites only."
)

r = requests.get(
    f'https://api.appstoreconnect.apple.com/v1/appStoreVersions/{vid}/appStoreReviewDetail',
    headers=h).json()
detail = r.get('data')
if detail:
    rid = detail['id']
    body = {'data': {'type': 'appStoreReviewDetails', 'id': rid,
                     'attributes': {'notes': NOTES}}}
    r = requests.patch(
        f'https://api.appstoreconnect.apple.com/v1/appStoreReviewDetails/{rid}',
        headers=h, json=body)
    print('PATCH', r.status_code, 'OK' if r.ok else r.text[:300])
else:
    body = {'data': {'type': 'appStoreReviewDetails',
                     'attributes': {'notes': NOTES},
                     'relationships': {'appStoreVersion': {'data': {
                         'type': 'appStoreVersions', 'id': vid}}}}}
    r = requests.post(
        'https://api.appstoreconnect.apple.com/v1/appStoreReviewDetails',
        headers=h, json=body)
    print('POST', r.status_code, 'OK' if r.ok else r.text[:300])
