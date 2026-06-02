#!/usr/bin/env python3
"""
Create App Store version 1.0.1, attach build 21, copy localized metadata
forward from 1.0, set 'What's New', and update the review notes to reference
the new live MLB functionality so reviewers know exactly why this update
addresses the previous Guideline 4.2 rejection.
"""

from __future__ import annotations
import json, os, sys, time
from pathlib import Path
import jwt, requests

ROOT = Path(__file__).resolve().parent.parent
KEY_PATH = ROOT / "keys" / "AuthKey_4DMFU7ZX24.p8"
KEY_ID = "4DMFU7ZX24"
ISSUER_ID = "deda6503-60f8-4de7-b11e-f5f4e6fdea7a"
APP_ID = "6762099221"
NEW_VERSION = "1.0.1"
TARGET_BUILD_NUMBER = "21"
PLATFORM = "IOS"
BASE = "https://api.appstoreconnect.apple.com"

WHATS_NEW = (
    "Major update — Diamond Stats is now a live MLB companion.\n\n"
    "\u2022 Search any active MLB player (live, real-time)\n"
    "\u2022 New Live tab with AL/NL standings and today's game scores\n"
    "\u2022 Live current-season stats: AVG, HR, RBI, OPS for hitters; "
    "ERA, W-L, WHIP, K, IP for pitchers\n"
    "\u2022 Star players to build your personal favorites watchlist\n"
    "\u2022 Pull-to-refresh on every live screen"
)

REVIEW_NOTES = (
    "Update addressing previous review feedback (Guideline 4.2 \u2014 Minimum "
    "Functionality):\n\n"
    "This version adds substantial interactive functionality. The app now "
    "performs live network requests to the public MLB Stats API "
    "(statsapi.mlb.com) for:\n"
    "  - Player search across every active MLB player\n"
    "  - Real-time AL and NL standings (all 6 divisions)\n"
    "  - Today's game scores and inning state\n"
    "  - Current-season hitting and pitching statistics for any selected player\n\n"
    "Users can also star players to build a personal favorites watchlist "
    "persisted on-device with AsyncStorage, and filter the Players tab to "
    "favorites only.\n\n"
    "No login or account is required. The app ships with a built-in roster "
    "that works offline; the Search and Live tabs require a network "
    "connection to fetch real-time data from MLB.\n\n"
    "Test path:\n"
    "  1. Open the Search tab and type 'Skenes' or 'Yamamoto' \u2014 results "
    "appear from the live MLB API.\n"
    "  2. Tap any result to view real current-season stats.\n"
    "  3. Open the Live tab to view today's MLB standings and games.\n"
    "  4. Tap the star icon on any player detail page to add them to "
    "favorites; tap the star in the Players tab header to filter to "
    "favorites only."
)


def auth_headers() -> dict:
    key = KEY_PATH.read_text()
    token = jwt.encode(
        {"iss": ISSUER_ID, "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
        key,
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def main() -> int:
    h = auth_headers()
    print("\U0001f511 Auth token minted.")

    # 1. Find or create the 1.0.1 version
    r = requests.get(f"{BASE}/v1/apps/{APP_ID}/appStoreVersions", headers=h).json()
    existing = next(
        (v for v in r.get("data", []) if v["attributes"]["versionString"] == NEW_VERSION),
        None,
    )
    if existing:
        version_id = existing["id"]
        print(
            f"\U0001f4e6 Version {NEW_VERSION} already exists \u2192 id={version_id} "
            f"state={existing['attributes']['appStoreState']}"
        )
    else:
        body = {
            "data": {
                "type": "appStoreVersions",
                "attributes": {
                    "platform": PLATFORM,
                    "versionString": NEW_VERSION,
                    "releaseType": "AFTER_APPROVAL",
                },
                "relationships": {
                    "app": {"data": {"type": "apps", "id": APP_ID}},
                },
            }
        }
        r = requests.post(f"{BASE}/v1/appStoreVersions", headers=h, json=body)
        if not r.ok:
            print("\u274c create version failed", r.status_code, r.text[:500])
            return 1
        version_id = r.json()["data"]["id"]
        print(f"\u2728 Created version {NEW_VERSION} \u2192 id={version_id}")

    # 2. Find build 21 id
    r = requests.get(
        f"{BASE}/v1/builds?filter%5Bapp%5D={APP_ID}&filter%5Bversion%5D={TARGET_BUILD_NUMBER}",
        headers=h,
    ).json()
    builds = r.get("data", [])
    if not builds:
        print(f"\u274c Build {TARGET_BUILD_NUMBER} not found")
        return 1
    build = builds[0]
    build_id = build["id"]
    proc = build["attributes"]["processingState"]
    print(f"\U0001f6e0  Build {TARGET_BUILD_NUMBER} \u2192 id={build_id} processing={proc}")
    if proc != "VALID":
        print("\u26a0\ufe0f  Build is not VALID yet \u2014 wait a few minutes and re-run.")
        return 1

    # 3. Attach build to version
    body = {"data": {"type": "builds", "id": build_id}}
    r = requests.patch(
        f"{BASE}/v1/appStoreVersions/{version_id}/relationships/build", headers=h, json=body
    )
    if not r.ok and r.status_code not in (200, 204):
        print("\u274c attach build failed", r.status_code, r.text[:500])
        return 1
    print(f"\u2705 Attached build {build_id} to version {version_id}")

    # 4. Get the en-US localization for the new version (created by default)
    r = requests.get(
        f"{BASE}/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations",
        headers=h,
    ).json()
    en = next(
        (l for l in r.get("data", []) if l["attributes"]["locale"].startswith("en")),
        None,
    )
    if not en:
        print("\u274c en-US localization not found")
        return 1
    loc_id = en["id"]
    body = {
        "data": {
            "type": "appStoreVersionLocalizations",
            "id": loc_id,
            "attributes": {"whatsNew": WHATS_NEW},
        }
    }
    r = requests.patch(
        f"{BASE}/v1/appStoreVersionLocalizations/{loc_id}", headers=h, json=body
    )
    if not r.ok:
        print("\u274c update localization failed", r.status_code, r.text[:500])
        return 1
    print("\u2705 Set 'What's New in This Version'")

    # 5. Set / update App Review details (notes) for this version
    r = requests.get(
        f"{BASE}/v1/appStoreVersions/{version_id}/appStoreReviewDetail", headers=h
    ).json()
    detail = r.get("data")
    if detail:
        rid = detail["id"]
        body = {
            "data": {
                "type": "appStoreReviewDetails",
                "id": rid,
                "attributes": {"notes": REVIEW_NOTES},
            }
        }
        r = requests.patch(
            f"{BASE}/v1/appStoreReviewDetails/{rid}", headers=h, json=body
        )
        if not r.ok:
            print("\u274c update review detail failed", r.status_code, r.text[:500])
            return 1
        print(f"\u2705 Updated App Review notes ({rid})")
    else:
        body = {
            "data": {
                "type": "appStoreReviewDetails",
                "attributes": {"notes": REVIEW_NOTES},
                "relationships": {
                    "appStoreVersion": {
                        "data": {"type": "appStoreVersions", "id": version_id}
                    }
                },
            }
        }
        r = requests.post(
            f"{BASE}/v1/appStoreReviewDetails", headers=h, json=body
        )
        if not r.ok:
            print("\u274c create review detail failed", r.status_code, r.text[:500])
            return 1
        print("\u2705 Created App Review notes")

    print(
        "\n\U0001f389 Version 1.0.1 wired up with build 21, What's New, and review notes.\n"
        "Next: open App Store Connect and click 'Add for Review' \u2192 'Submit to App Review'.\n"
        f"  https://appstoreconnect.apple.com/apps/{APP_ID}/distribution"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
