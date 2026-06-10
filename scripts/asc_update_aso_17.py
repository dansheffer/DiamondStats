#!/usr/bin/env python3
"""Push Diamond Stats 1.7 ASO metadata to App Store Connect.

Updates app-level name/subtitle and, when an editable App Store version exists,
updates en-US description, keywords, promotional text, and what's new.
"""
import sys
import time

import jwt
import requests

APP_ID = "6762099221"
ISS = "deda6503-60f8-4de7-b11e-f5f4e6fdea7a"
KID = "4DMFU7ZX24"
KEY_PATH = "keys/AuthKey_4DMFU7ZX24.p8"

APP_NAME = "Diamond Stats MLB Scores"
SUBTITLE = "Baseball Stats & Box Scores"
KEYWORDS = "standings,fantasy,players,pitching,batting,war,woba,fip,rosters,teams,sabermetrics,live"
PROMO_TEXT = (
    "Game Day upgrade: restore My Team, tap today's MLB games for box scores, "
    "see start times, probable pitchers, and filter Top Players by position."
)
WHATS_NEW = (
    "Game Day polish for baseball season.\n\n"
    "- My Team is back in the tab bar: pick your favorite team and see its "
    "record, roster, next game, and latest result.\n"
    "- Today's Games are tappable and open full game detail/box scores.\n"
    "- Game cards now show scheduled start time and probable pitchers when "
    "available.\n"
    "- Top Players now has position filters for C, 1B, 2B, 3B, SS, OF, and DH.\n"
    "- Focused performance and UI polish without adding bloat."
)
DESCRIPTION = (
    "Diamond Stats is a fast, lightweight baseball companion for MLB scores, "
    "box scores, player stats, standings, rosters, and sabermetrics.\n\n"
    "Built for fans who want the numbers quickly, without accounts, tracking, "
    "or clutter.\n\n"
    "LIVE MLB SCORES AND BOX SCORES\n"
    "Follow today's games at a glance. See score, status, inning, start time, "
    "and probable pitchers when available. Tap a game for box score detail "
    "with batting and pitching lines.\n\n"
    "PLAYER SEARCH AND PLAYER CARDS\n"
    "Search MLB players and open clean player cards with bio details, team, "
    "position, season stats, career stats, and year-by-year breakdowns.\n\n"
    "ADVANCED BASEBALL STATS\n"
    "Go beyond the basics with useful analytics and sabermetrics including "
    "WAR, FIP, wOBA, OPS, WHIP, BABIP, ISO, K%, BB%, K/9, BB/9, and more.\n\n"
    "TOP PLAYERS BY POSITION\n"
    "Browse a curated Top Players board, sort by WAR, see rising players, "
    "filter favorites, and narrow the list by position.\n\n"
    "MY TEAM\n"
    "Pick your favorite team for a personalized team view with record, roster, "
    "next game, latest result, and quick access to game detail.\n\n"
    "STANDINGS AND WILD CARD RACE\n"
    "Check division standings and postseason races with wins, losses, PCT, "
    "games back, run differential, streaks, and recent form.\n\n"
    "PLAYER COMPARE AND VALUE CALCULATOR\n"
    "Compare players side by side, review batting and pitching metrics, and "
    "estimate player value using WAR and salary assumptions.\n\n"
    "LATEST BASEBALL NEWS\n"
    "Read MLB headlines from official baseball news feeds and jump into the "
    "full story when something catches your eye.\n\n"
    "MADE FOR iPHONE AND iPAD\n"
    "Diamond Stats is responsive, clean, and designed for quick checking during "
    "a game, fantasy draft, trade debate, or box score deep dive.\n\n"
    "Diamond Stats is not affiliated with, endorsed by, or sponsored by Major "
    "League Baseball or any MLB club. Data is provided by public baseball APIs."
)


def token() -> str:
    with open(KEY_PATH) as key_file:
        key = key_file.read()
    return jwt.encode(
        {"iss": ISS, "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
        key,
        algorithm="ES256",
        headers={"kid": KID, "typ": "JWT"},
    )


def patch(url: str, headers: dict[str, str], body: dict) -> requests.Response:
    response = requests.patch(url, headers=headers, json=body, timeout=30)
    print("PATCH", url.rsplit("/", 1)[-1], response.status_code, "OK" if response.ok else response.text[:500])
    return response


def main() -> int:
    print(f"App Name:    {len(APP_NAME)}/30")
    print(f"Subtitle:    {len(SUBTITLE)}/30")
    print(f"Keywords:    {len(KEYWORDS)}/100")
    print(f"Promo:       {len(PROMO_TEXT)}/170")
    print(f"Whats New:   {len(WHATS_NEW)}/4000")
    print(f"Description: {len(DESCRIPTION)}/4000")
    assert len(APP_NAME) <= 30
    assert len(SUBTITLE) <= 30
    assert len(KEYWORDS) <= 100
    assert len(PROMO_TEXT) <= 170
    assert len(WHATS_NEW) <= 4000
    assert len(DESCRIPTION) <= 4000

    base = "https://api.appstoreconnect.apple.com/v1"
    headers = {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}

    versions = requests.get(f"{base}/apps/{APP_ID}/appStoreVersions", headers=headers, timeout=30).json()
    editable_states = {
        "PREPARE_FOR_SUBMISSION",
        "DEVELOPER_REJECTED",
        "METADATA_REJECTED",
        "REJECTED",
        "WAITING_FOR_REVIEW",
        "INVALID_BINARY",
    }
    editable = next(
        (
            version
            for version in versions.get("data", [])
            if version["attributes"].get("appStoreState") in editable_states
        ),
        None,
    )
    if editable:
        version_id = editable["id"]
        attrs = editable["attributes"]
        print(f"Editable version: {attrs.get('versionString')} ({attrs.get('appStoreState')})")
        locs = requests.get(
            f"{base}/appStoreVersions/{version_id}/appStoreVersionLocalizations",
            headers=headers,
            timeout=30,
        ).json()
        loc = next((item for item in locs.get("data", []) if item["attributes"].get("locale") == "en-US"), None)
        if loc:
            patch(
                f"{base}/appStoreVersionLocalizations/{loc['id']}",
                headers,
                {
                    "data": {
                        "type": "appStoreVersionLocalizations",
                        "id": loc["id"],
                        "attributes": {
                            "description": DESCRIPTION,
                            "keywords": KEYWORDS,
                            "promotionalText": PROMO_TEXT,
                            "whatsNew": WHATS_NEW,
                        },
                    }
                },
            )
        else:
            print("No en-US appStoreVersionLocalization found.")
    else:
        print("No editable App Store version found; version metadata was not changed.")

    infos = requests.get(f"{base}/apps/{APP_ID}/appInfos", headers=headers, timeout=30).json()
    info = next(iter(infos.get("data", [])), None)
    if not info:
        print("No appInfo found.")
        return 1

    info_locs = requests.get(
        f"{base}/appInfos/{info['id']}/appInfoLocalizations",
        headers=headers,
        timeout=30,
    ).json()
    info_loc = next((item for item in info_locs.get("data", []) if item["attributes"].get("locale") == "en-US"), None)
    if not info_loc:
        print("No en-US appInfoLocalization found.")
        return 1

    patch(
        f"{base}/appInfoLocalizations/{info_loc['id']}",
        headers,
        {
            "data": {
                "type": "appInfoLocalizations",
                "id": info_loc["id"],
                "attributes": {"name": APP_NAME, "subtitle": SUBTITLE},
            }
        },
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
