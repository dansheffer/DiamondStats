#!/usr/bin/env python3
"""Create App Store version 1.0.2, copy localized metadata, attach latest build, set release type.

Usage: python3 scripts/asc_create_v1_0_2.py [--build BUILD_ID]

If --build is omitted, picks the most recent processed build for the app.
"""
import argparse
import json
import os
import sys
import time

import jwt
import requests

KEY_PATH = "keys/AuthKey_4DMFU7ZX24.p8"
KEY_ID = "4DMFU7ZX24"
ISSUER_ID = "deda6503-60f8-4de7-b11e-f5f4e6fdea7a"
APP_ID = "6762099221"
NEW_VERSION = "1.0.2"

# Source localization (copy from current 1.0.1)
SRC_LOC_ID = "06467b88-947a-44b5-9b7b-d469386420ce"
SRC_REVIEW_DETAIL_ID = "33cc397d-d328-4c81-99cb-f9f6fd07914f"

API = "https://api.appstoreconnect.apple.com"


def token() -> str:
    key = open(KEY_PATH).read()
    return jwt.encode(
        {"iss": ISSUER_ID, "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
        key,
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )


def headers() -> dict:
    return {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}


def get(path: str, params: dict | None = None) -> dict:
    r = requests.get(f"{API}{path}", headers=headers(), params=params)
    r.raise_for_status()
    return r.json()


def post(path: str, body: dict) -> dict:
    r = requests.post(f"{API}{path}", headers=headers(), data=json.dumps(body))
    if r.status_code >= 300:
        print(f"POST {path} -> {r.status_code}\n{r.text}", file=sys.stderr)
        r.raise_for_status()
    return r.json() if r.text else {}


def patch(path: str, body: dict) -> dict:
    r = requests.patch(f"{API}{path}", headers=headers(), data=json.dumps(body))
    if r.status_code >= 300:
        print(f"PATCH {path} -> {r.status_code}\n{r.text}", file=sys.stderr)
        r.raise_for_status()
    return r.json() if r.text else {}


def find_latest_processed_build() -> str:
    res = get(
        f"/v1/builds",
        params={
            "filter[app]": APP_ID,
            "filter[processingState]": "VALID",
            "sort": "-uploadedDate",
            "limit": 5,
        },
    )
    if not res["data"]:
        sys.exit("No VALID builds found. Wait for processing to finish.")
    for b in res["data"]:
        v = b["attributes"].get("version")
        ver = b["attributes"].get("preReleaseVersion") or {}
        print(
            f"  build {b['id']}  buildNumber={b['attributes'].get('version')}  uploaded={b['attributes'].get('uploadedDate')}"
        )
    chosen = res["data"][0]
    print(f"\nUsing latest VALID build: {chosen['id']} (buildNumber {chosen['attributes'].get('version')})")
    return chosen["id"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", help="Build ID to attach. Default: latest VALID.")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    build_id = args.build or find_latest_processed_build()

    # 1) Read source localization to copy
    src_loc = get(f"/v1/appStoreVersionLocalizations/{SRC_LOC_ID}")["data"]["attributes"]
    src_notes = get(f"/v1/appStoreReviewDetails/{SRC_REVIEW_DETAIL_ID}")["data"]["attributes"]
    print(f"\nSource subtitle/keywords pulled. desc={len(src_loc['description'])} chars  keywords={len(src_loc['keywords'])} chars")

    if args.dry_run:
        print("Dry run - stopping before any writes.")
        return

    # 2) Create new appStoreVersion
    body = {
        "data": {
            "type": "appStoreVersions",
            "attributes": {
                "platform": "IOS",
                "versionString": NEW_VERSION,
                "releaseType": "MANUAL",
            },
            "relationships": {
                "app": {"data": {"type": "apps", "id": APP_ID}},
                "build": {"data": {"type": "builds", "id": build_id}},
            },
        }
    }
    res = post("/v1/appStoreVersions", body)
    new_ver_id = res["data"]["id"]
    print(f"Created appStoreVersion {NEW_VERSION} -> {new_ver_id}")

    # 3) Create en-US version localization with copied text
    loc_body = {
        "data": {
            "type": "appStoreVersionLocalizations",
            "attributes": {
                "locale": "en-US",
                "description": src_loc["description"],
                "keywords": src_loc["keywords"],
                "promotionalText": src_loc["promotionalText"],
                "marketingUrl": src_loc.get("marketingUrl"),
                "supportUrl": src_loc.get("supportUrl"),
                "whatsNew": "Introducing the Player Value Calculator: convert WAR into open-market dollars at a custom $/WAR rate and get a Bargain / Fair Value / Overpay verdict. Refreshed UI and metadata.",
            },
            "relationships": {
                "appStoreVersion": {"data": {"type": "appStoreVersions", "id": new_ver_id}}
            },
        }
    }
    res = post("/v1/appStoreVersionLocalizations", loc_body)
    new_loc_id = res["data"]["id"]
    print(f"Created en-US localization {new_loc_id}")

    # 4) Look up the auto-created appStoreReviewDetail and PATCH it
    rd = get(f"/v1/appStoreVersions/{new_ver_id}/appStoreReviewDetail")["data"]
    new_rd_id = rd["id"]
    patch(
        f"/v1/appStoreReviewDetails/{new_rd_id}",
        {
            "data": {
                "type": "appStoreReviewDetails",
                "id": new_rd_id,
                "attributes": {
                    "notes": src_notes["notes"],
                    "contactFirstName": src_notes.get("contactFirstName"),
                    "contactLastName": src_notes.get("contactLastName"),
                    "contactPhone": src_notes.get("contactPhone"),
                    "contactEmail": src_notes.get("contactEmail"),
                },
            }
        },
    )
    print(f"Reviewer notes copied to {new_rd_id}")

    print(f"\n✅ Version {NEW_VERSION} created.")
    print(f"   appStoreVersion: {new_ver_id}")
    print(f"   localization:    {new_loc_id}")
    print(f"   reviewDetail:    {new_rd_id}")
    print(f"   build attached:  {build_id}")
    print("\nNEXT: replace screenshots, then run scripts/asc_submit_fix.py against the new version.")


if __name__ == "__main__":
    main()
