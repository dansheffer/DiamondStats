#!/usr/bin/env python3
"""
Diamond Stats — App Store Connect submission fixer.

Uses the ASC API to populate everything Apple is complaining about so that
"Add for Review" becomes available on the inflight 1.0.0 version:

  1. Attach build 1.0.0 (14) to the inflight App Store version
  2. Set content rights declaration on the App ("does not use 3rd-party content")
  3. Set description / keywords / support URL on the en-US localization
  4. Set App Review contact info (first/last name, phone, email)

Auth: ES256 JWT signed with the .p8 key already wired into eas.json.
Docs: https://developer.apple.com/documentation/appstoreconnectapi
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import jwt  # PyJWT
import requests

ROOT = Path(__file__).resolve().parent.parent
KEY_PATH = ROOT / "keys" / "AuthKey_4DMFU7ZX24.p8"
KEY_ID = "4DMFU7ZX24"
ISSUER_ID = "deda6503-60f8-4de7-b11e-f5f4e6fdea7a"

APP_ID = "6762099221"
TARGET_VERSION = "1.0"
TARGET_BUILD_NUMBER = "20"
PLATFORM = "IOS"

# ---- Editable content -------------------------------------------------------
SUPPORT_URL = os.environ.get(
    "DS_SUPPORT_URL",
    "https://dansheffer.github.io/DiamondStats/support.html",
)
MARKETING_URL = os.environ.get("DS_MARKETING_URL", "")  # optional

DESCRIPTION = (
    "Diamond Stats is the simplest way to explore baseball player value. "
    "Browse a curated roster of notable Major League players, search by name, "
    "team, or position, and tap any card to see how that player's WAR "
    "translates into real dollar value at the league-standard rate.\n\n"
    "FEATURES\n"
    "\u2022 Browse 16 notable active MLB players\n"
    "\u2022 Search by player, team, or position\n"
    "\u2022 Career WAR and Season WAR at a glance\n"
    "\u2022 Automatic dollar-value conversion ($9M / WAR)\n"
    "\u2022 Full-season pace projections from games played\n"
    "\u2022 Trend indicators (Rising, Stable, Declining)\n"
    "\u2022 iPad and iPhone optimized layouts\n"
    "\u2022 Works fully offline \u2014 no account, no ads, no tracking\n\n"
    "Diamond Stats is built for fans, fantasy players, and anyone who has "
    "ever wondered what a player is really worth on the field."
)

# Apple max 100 chars, comma-separated, no spaces after commas recommended
KEYWORDS = "baseball,mlb,stats,war,player value,fantasy baseball,sabermetrics,roster,team,scout"
assert len(KEYWORDS) <= 100, f"keywords too long: {len(KEYWORDS)}"

PROMOTIONAL_TEXT = (
    "Browse top MLB players and see what they're worth on the field."
)

CONTACT_FIRST_NAME = os.environ.get("DS_CONTACT_FIRST", "Daniel")
CONTACT_LAST_NAME = os.environ.get("DS_CONTACT_LAST", "Sheffer")
CONTACT_EMAIL = os.environ.get("DS_CONTACT_EMAIL", "dsheffer10@icloud.com")
CONTACT_PHONE = os.environ.get("DS_CONTACT_PHONE", "")  # MUST be set, e.g. "+15551234567"
DEMO_USER = os.environ.get("DS_DEMO_USER", "")
DEMO_PASS = os.environ.get("DS_DEMO_PASS", "")
REVIEW_NOTES = os.environ.get(
    "DS_REVIEW_NOTES",
    "No login or account is required. The app ships with a built-in roster of "
    "16 MLB players that loads instantly from the bundle. Tap any player to "
    "see Career/Season WAR, dollar value, and full-season projections. The "
    "app contains no in-app purchases, no advertising, no analytics, and no "
    "parental controls. Player headshot images load from img.mlbstatic.com "
    "with a 4-second timeout that falls back to a bundled placeholder, so "
    "the UI never blocks on network. The 'Tip Jar' language from the "
    "previous submission has been fully removed.",
)

CONTENT_RIGHTS = "DOES_NOT_USE_THIRD_PARTY_CONTENT"
# -----------------------------------------------------------------------------

API = "https://api.appstoreconnect.apple.com/v1"


def make_token() -> str:
    private_key = KEY_PATH.read_text()
    now = int(time.time())
    payload = {
        "iss": ISSUER_ID,
        "iat": now,
        "exp": now + 20 * 60,
        "aud": "appstoreconnect-v1",
    }
    return jwt.encode(
        payload,
        private_key,
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )


def headers(token: str, content_type: str = "application/json") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "Content-Type": content_type}


def die(msg: str, resp: requests.Response | None = None) -> None:
    print(f"\n❌ {msg}", file=sys.stderr)
    if resp is not None:
        print(f"   HTTP {resp.status_code}", file=sys.stderr)
        try:
            print(json.dumps(resp.json(), indent=2), file=sys.stderr)
        except Exception:
            print(resp.text, file=sys.stderr)
    sys.exit(1)


def get(token: str, path: str, params: dict[str, Any] | None = None) -> dict:
    url = path if path.startswith("http") else f"{API}{path}"
    r = requests.get(url, headers=headers(token), params=params, timeout=30)
    if r.status_code >= 400:
        die(f"GET {path} failed", r)
    return r.json()


def patch(token: str, path: str, body: dict) -> dict | None:
    r = requests.patch(f"{API}{path}", headers=headers(token), json=body, timeout=30)
    if r.status_code >= 400:
        die(f"PATCH {path} failed", r)
    return r.json() if r.text else None


def post(token: str, path: str, body: dict) -> dict:
    r = requests.post(f"{API}{path}", headers=headers(token), json=body, timeout=30)
    if r.status_code >= 400:
        die(f"POST {path} failed", r)
    return r.json()


# ---- Steps ------------------------------------------------------------------

def find_inflight_version(token: str) -> dict:
    data = get(
        token,
        f"/apps/{APP_ID}/appStoreVersions",
        params={
            "filter[platform]": PLATFORM,
            "filter[versionString]": TARGET_VERSION,
            "limit": 20,
        },
    )["data"]
    if not data:
        die(f"No App Store version {TARGET_VERSION} found for app {APP_ID}.")
    # Prefer an editable one
    editable_states = {
        "PREPARE_FOR_SUBMISSION",
        "DEVELOPER_REJECTED",
        "REJECTED",
        "METADATA_REJECTED",
        "WAITING_FOR_REVIEW",  # still patchable in some cases
        "INVALID_BINARY",
    }
    for v in data:
        if v["attributes"]["appStoreState"] in editable_states:
            return v
    return data[0]


def find_build(token: str) -> dict:
    data = get(
        token,
        "/builds",
        params={
            "filter[app]": APP_ID,
            "filter[version]": TARGET_BUILD_NUMBER,
            "filter[preReleaseVersion.version]": TARGET_VERSION,
            "limit": 5,
        },
    )["data"]
    if not data:
        # fallback: just filter by app+version
        data = get(
            token,
            "/builds",
            params={"filter[app]": APP_ID, "filter[version]": TARGET_BUILD_NUMBER, "limit": 5},
        )["data"]
    if not data:
        die(f"Build {TARGET_VERSION}({TARGET_BUILD_NUMBER}) not found in ASC yet — still processing?")
    # Prefer one whose processingState is VALID
    for b in data:
        if b["attributes"].get("processingState") == "VALID":
            return b
    return data[0]


def attach_build(token: str, version_id: str, build_id: str) -> None:
    patch(
        token,
        f"/appStoreVersions/{version_id}/relationships/build",
        {"data": {"type": "builds", "id": build_id}},
    )
    print(f"✅ Attached build {build_id} to version {version_id}")


def set_content_rights(token: str) -> None:
    patch(
        token,
        f"/apps/{APP_ID}",
        {
            "data": {
                "type": "apps",
                "id": APP_ID,
                "attributes": {"contentRightsDeclaration": CONTENT_RIGHTS},
            }
        },
    )
    print(f"✅ Content rights set: {CONTENT_RIGHTS}")


def update_localization(token: str, version_id: str) -> None:
    locs = get(token, f"/appStoreVersions/{version_id}/appStoreVersionLocalizations")["data"]
    target = next((l for l in locs if l["attributes"]["locale"] == "en-US"), None)
    if not target:
        die("en-US localization not found on this version.")
    loc_id = target["id"]
    attrs: dict[str, Any] = {
        "description": DESCRIPTION,
        "keywords": KEYWORDS,
        "supportUrl": SUPPORT_URL,
        "promotionalText": PROMOTIONAL_TEXT,
    }
    if MARKETING_URL:
        attrs["marketingUrl"] = MARKETING_URL
    patch(
        token,
        f"/appStoreVersionLocalizations/{loc_id}",
        {
            "data": {
                "type": "appStoreVersionLocalizations",
                "id": loc_id,
                "attributes": attrs,
            }
        },
    )
    print(f"✅ Localization en-US updated (description, keywords, supportUrl, promo text)")


def upsert_review_detail(token: str, version_id: str) -> None:
    if not CONTACT_PHONE:
        die("DS_CONTACT_PHONE not set. Re-run with e.g. DS_CONTACT_PHONE='+15551234567'.")
    # Check if appStoreReviewDetail already exists
    existing = get(
        token, f"/appStoreVersions/{version_id}/appStoreReviewDetail"
    ).get("data")
    attrs = {
        "contactFirstName": CONTACT_FIRST_NAME,
        "contactLastName": CONTACT_LAST_NAME,
        "contactPhone": CONTACT_PHONE,
        "contactEmail": CONTACT_EMAIL,
        "demoAccountName": DEMO_USER,
        "demoAccountPassword": DEMO_PASS,
        "demoAccountRequired": bool(DEMO_USER),
        "notes": REVIEW_NOTES,
    }
    if existing:
        rd_id = existing["id"]
        patch(
            token,
            f"/appStoreReviewDetails/{rd_id}",
            {
                "data": {
                    "type": "appStoreReviewDetails",
                    "id": rd_id,
                    "attributes": attrs,
                }
            },
        )
        print(f"✅ App Review contact info updated ({rd_id})")
    else:
        post(
            token,
            "/appStoreReviewDetails",
            {
                "data": {
                    "type": "appStoreReviewDetails",
                    "attributes": attrs,
                    "relationships": {
                        "appStoreVersion": {
                            "data": {"type": "appStoreVersions", "id": version_id}
                        }
                    },
                }
            },
        )
        print("✅ App Review contact info created")


def main() -> None:
    if not KEY_PATH.exists():
        die(f"Missing key file at {KEY_PATH}")
    token = make_token()
    print("🔑 Auth token minted.")

    version = find_inflight_version(token)
    version_id = version["id"]
    state = version["attributes"]["appStoreState"]
    print(f"📦 Inflight version {TARGET_VERSION} → id={version_id} state={state}")

    build = find_build(token)
    build_id = build["id"]
    proc = build["attributes"].get("processingState")
    print(f"🛠  Build {TARGET_VERSION}({TARGET_BUILD_NUMBER}) → id={build_id} processing={proc}")
    if proc != "VALID":
        print(
            "⚠  Build is not yet VALID in ASC. We'll still try to attach, "
            "but Apple may reject the attach until processing completes."
        )

    set_content_rights(token)
    attach_build(token, version_id, build_id)
    update_localization(token, version_id)
    upsert_review_detail(token, version_id)

    print(
        "\n🎉 All required fields populated. "
        "Reload the inflight page in App Store Connect — "
        "'Add for Review' should now be enabled."
    )


if __name__ == "__main__":
    main()
