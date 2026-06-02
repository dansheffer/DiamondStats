#!/usr/bin/env python3
"""Push the v1.5 marketing copy (description / subtitle / keywords / promo text)
to App Store Connect.

This script will:
  1. Find the current EDITABLE app store version (i.e. one in PREPARE_FOR_SUBMISSION,
     DEVELOPER_REJECTED, etc.). If none exists, it falls back to updating just the
     app-level subtitle/privacy URL via appInfoLocalizations.
  2. For the editable version, PATCH appStoreVersionLocalizations for en-US with:
       - description
       - keywords
       - promotionalText
       - whatsNew
  3. For the app-level subtitle, PATCH appInfoLocalizations for en-US.

Run AFTER the v1.5 build has been uploaded and a v1.5 appStoreVersion exists,
or run anytime to refresh the subtitle on the live App Information.
"""
import jwt
import time
import sys
import requests

APP_ID = '6762099221'
ISS = 'deda6503-60f8-4de7-b11e-f5f4e6fdea7a'
KID = '4DMFU7ZX24'
KEY_PATH = 'keys/AuthKey_4DMFU7ZX24.p8'

APP_NAME = 'Diamond Stats Pro'  # 30 char cap

SUBTITLE = 'Every player. Every stat.'  # 30 char cap

KEYWORDS = 'baseball,mlb,stats,scores,standings,players,fantasy,batting,pitching,war'  # 100 char cap

PROMO_TEXT = (
    'Now with live MLB news, full player bios, and career stats for every active player. '
    'The fastest way to follow baseball on iPhone and iPad.'
)  # 170 char cap

WHATS_NEW = (
    'Version 1.5 \u2014 a big upgrade.\n\n'
    '\u2022 NEW: News tab with the latest MLB.com headlines\n'
    '\u2022 NEW: Real player bios \u2014 age, birthplace, height, weight, debut\n'
    '\u2022 NEW: Full career stats next to current season stats\n'
    '\u2022 NEW: Year-by-year stats \u2014 the back of the baseball card\n'
    '\u2022 NEW: Filter chips on Top Players (All, Rising, Favorites)\n'
    '\u2022 Player search is now instant and works for every active MLB player\n'
    '\u2022 Compare highlights the winner on each stat\n'
    '\u2022 Fresh new look\n'
    '\u2022 Faster everywhere, plus the usual fixes and polish'
)  # 4000 char cap

DESCRIPTION = (
    'The fastest, cleanest way to follow Major League Baseball on iPhone and iPad.\n\n'
    'No ads. No accounts. No tracking. Just the players, the stats, the scores, and the '
    'news \u2014 the moment you open the app.\n\n'
    'FOR EVERY KIND OF FAN\n'
    'Whether you live and die with your team, run a fantasy league, or just want to know '
    'how the rookie your club just called up is doing \u2014 Diamond Stats Pro puts the '
    'numbers in your hand instantly.\n\n'
    'WHAT\u2019S INSIDE\n\n'
    '\u2022 PLAYER SEARCH \u2014 Look up any active MLB player. Type two letters and they appear.\n\n'
    '\u2022 FULL PLAYER PROFILES \u2014 Jersey number, age, birthplace, height, weight, '
    'bats/throws, and the day they made their MLB debut. Everything you\u2019d see on the '
    'back of a baseball card, right on your phone.\n\n'
    '\u2022 SEASON, CAREER, AND YEAR-BY-YEAR STATS \u2014 Batting average, home runs, RBI, '
    'on-base, slugging, OPS for hitters. ERA, wins, strikeouts, WHIP for pitchers. See '
    'the current season, the player\u2019s entire career totals, and every year of their '
    'career broken out one by one.\n\n'
    '\u2022 LIVE NEWS \u2014 The latest headlines from MLB.com, refreshed on tap. Tap any story '
    'to read the full piece.\n\n'
    '\u2022 LIVE SCORES & STANDINGS \u2014 Today\u2019s games with inning-by-inning updates, plus '
    'the full standings for every division in both leagues.\n\n'
    '\u2022 TOP PLAYERS \u2014 A curated list of the league\u2019s elite. Sort by who\u2019s hot, who\u2019s '
    'rising, or just your own favorites.\n\n'
    '\u2022 PLAYER COMPARE \u2014 Pick two players and put their numbers side by side. A check '
    'mark shows who wins each stat. Settle the bar argument before the inning is over.\n\n'
    '\u2022 PLAYER VALUE CALCULATOR \u2014 Enter a player\u2019s projected production and salary, '
    'and find out whether they\u2019re a bargain, fair value, or an overpay. Built for fans '
    'who think like a front office.\n\n'
    '\u2022 FAVORITES \u2014 Tap a star to follow any player. Your list stays with you across '
    'every launch.\n\n'
    '\u2022 BUILT FOR iPhone AND iPad \u2014 Native iOS 26 design. Beautiful on every screen. '
    'No ads, no in-app purchases, no nonsense.\n\n'
    'WORKS OFFLINE\n'
    'Top Players, Compare, and the Value Calculator work without a connection. Search, '
    'Live, and News need Wi-Fi or cellular.\n\n'
    'YOUR DATA IS YOUR DATA\n'
    'No login. No analytics. No ad tracking. Your favorites are saved on your device and '
    'nowhere else.\n\n'
    'BUILT BY BACKSTREETS TECHNOLOGY\n'
    'Made by a fan, for fans. Questions or feedback? support@backstreetstechnology.com\n\n'
    'Diamond Stats Pro is not affiliated with, endorsed by, or sponsored by Major League '
    'Baseball or any of its clubs.'
)


def token() -> str:
    key = open(KEY_PATH).read()
    return jwt.encode(
        {'iss': ISS, 'exp': int(time.time()) + 1200, 'aud': 'appstoreconnect-v1'},
        key, algorithm='ES256', headers={'kid': KID, 'typ': 'JWT'}
    )


def main() -> int:
    tok = token()
    h = {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}
    base = 'https://api.appstoreconnect.apple.com/v1'

    print(f'Description: {len(DESCRIPTION)}/4000 chars')
    print(f'Whats New:   {len(WHATS_NEW)}/4000 chars')
    print(f'Promo:       {len(PROMO_TEXT)}/170 chars')
    print(f'Subtitle:    {len(SUBTITLE)}/30 chars')
    print(f'Keywords:    {len(KEYWORDS)}/100 chars')
    print(f'App Name:    {len(APP_NAME)}/30 chars')
    assert len(DESCRIPTION) <= 4000
    assert len(WHATS_NEW) <= 4000
    assert len(PROMO_TEXT) <= 170
    assert len(SUBTITLE) <= 30
    assert len(KEYWORDS) <= 100
    assert len(APP_NAME) <= 30

    versions = requests.get(f'{base}/apps/{APP_ID}/appStoreVersions', headers=h).json()
    editable = None
    for v in versions.get('data', []):
        state = v['attributes'].get('appStoreState', '')
        if state in (
            'PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'METADATA_REJECTED',
            'REJECTED', 'WAITING_FOR_REVIEW', 'INVALID_BINARY',
        ):
            editable = v
            break
    if editable:
        vid = editable['id']
        ver = editable['attributes'].get('versionString')
        print(f'\nEditable version found: {ver} (state {editable["attributes"]["appStoreState"]})')
        locs = requests.get(
            f'{base}/appStoreVersions/{vid}/appStoreVersionLocalizations', headers=h).json()
        loc_id = None
        for loc in locs.get('data', []):
            if loc['attributes'].get('locale') == 'en-US':
                loc_id = loc['id']
                break
        if loc_id:
            body = {'data': {
                'type': 'appStoreVersionLocalizations',
                'id': loc_id,
                'attributes': {
                    'description': DESCRIPTION,
                    'keywords': KEYWORDS,
                    'promotionalText': PROMO_TEXT,
                    'whatsNew': WHATS_NEW,
                },
            }}
            r = requests.patch(
                f'{base}/appStoreVersionLocalizations/{loc_id}', headers=h, json=body)
            print('PATCH version localization:', r.status_code, 'OK' if r.ok else r.text[:400])
        else:
            print('No en-US version localization found.')
    else:
        print('\nNo editable App Store version. Description / whats-new / promo can only '
              'be set on an editable version. Subtitle update below will still apply to '
              'live App Information.')

    infos = requests.get(f'{base}/apps/{APP_ID}/appInfos', headers=h).json()
    info_id = None
    for info in infos.get('data', []):
        state = info['attributes'].get('appStoreState') or info['attributes'].get('state')
        if state in ('PREPARE_FOR_SUBMISSION', 'READY_FOR_DISTRIBUTION', 'READY_FOR_REVIEW'):
            info_id = info['id']
            break
    if not info_id and infos.get('data'):
        info_id = infos['data'][0]['id']
    if info_id:
        info_locs = requests.get(
            f'{base}/appInfos/{info_id}/appInfoLocalizations', headers=h).json()
        for loc in info_locs.get('data', []):
            if loc['attributes'].get('locale') == 'en-US':
                body = {'data': {
                    'type': 'appInfoLocalizations',
                    'id': loc['id'],
                    'attributes': {'name': APP_NAME, 'subtitle': SUBTITLE},
                }}
                r = requests.patch(
                    f'{base}/appInfoLocalizations/{loc["id"]}', headers=h, json=body)
                print('PATCH info localization (name + subtitle):',
                      r.status_code, 'OK' if r.ok else r.text[:400])
                break
    return 0


if __name__ == '__main__':
    sys.exit(main())
