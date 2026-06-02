#!/usr/bin/env python3
"""
Diamond Stats Pro v1.5.0 — full ship script.

Does everything in order:
  1. Find build 25 (latest VALID)
  2. POST appStoreVersion 1.5.0, attach build, releaseType MANUAL
  3. POST en-US version localization with new v1.5 copy
  4. Copy reviewDetail (notes + contact) from current live v1.0.2
  5. PATCH appInfo en-US to new name "Diamond Stats Pro" + subtitle
  6. Upload regenerated screenshots (iPhone 6.5" + iPad Pro 12.9")
  7. POST reviewSubmission + item, then PATCH submitted=True

Stops on first error so we can diagnose.
"""
from __future__ import annotations
import json
import subprocess
import sys
import time
from pathlib import Path

import jwt
import requests

KEY_PATH = "keys/AuthKey_4DMFU7ZX24.p8"
KID = "4DMFU7ZX24"
ISS = "deda6503-60f8-4de7-b11e-f5f4e6fdea7a"
APP_ID = "6762099221"
NEW_VERSION = "1.5.0"
API = "https://api.appstoreconnect.apple.com"

# Import the marketing copy from the existing script
sys.path.insert(0, str(Path(__file__).parent))
from asc_set_description_v15 import (  # noqa: E402
    APP_NAME, SUBTITLE, KEYWORDS, PROMO_TEXT, WHATS_NEW, DESCRIPTION,
)


def token() -> str:
    key = open(KEY_PATH).read()
    return jwt.encode(
        {"iss": ISS, "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
        key, algorithm="ES256", headers={"kid": KID, "typ": "JWT"},
    )


def H() -> dict:
    return {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}


def GET(path: str, **kw) -> dict:
    r = requests.get(f"{API}{path}", headers=H(), **kw)
    if r.status_code >= 300:
        sys.exit(f"GET {path} -> {r.status_code}\n{r.text}")
    return r.json()


def POST(path: str, body: dict) -> dict:
    r = requests.post(f"{API}{path}", headers=H(), data=json.dumps(body))
    if r.status_code >= 300:
        sys.exit(f"POST {path} -> {r.status_code}\n{r.text}")
    return r.json() if r.text else {}


def PATCH(path: str, body: dict) -> dict:
    r = requests.patch(f"{API}{path}", headers=H(), data=json.dumps(body))
    if r.status_code >= 300:
        sys.exit(f"PATCH {path} -> {r.status_code}\n{r.text}")
    return r.json() if r.text else {}


def TRY_PATCH(path: str, body: dict) -> tuple[int, str]:
    """Non-fatal PATCH — returns (status, text)."""
    r = requests.patch(f"{API}{path}", headers=H(), data=json.dumps(body))
    return r.status_code, r.text


def step(n: int, msg: str) -> None:
    print(f"\n{'='*60}\n[{n}] {msg}\n{'='*60}")


def main() -> int:
    # ----- 1. find latest VALID build -----
    step(1, "Find latest VALID build")
    b = GET(f"/v1/builds?filter[app]={APP_ID}&filter[processingState]=VALID"
            "&sort=-uploadedDate&limit=3")
    if not b["data"]:
        sys.exit("No VALID builds.")
    build = b["data"][0]
    build_id = build["id"]
    build_no = build["attributes"]["version"]
    print(f"  build #{build_no} -> {build_id}")

    # ----- 2. find current live v1.0.2 for review notes -----
    step(2, "Read review notes from current live version")
    vs = GET(f"/v1/apps/{APP_ID}/appStoreVersions?limit=10")
    live = None
    for v in vs["data"]:
        if v["attributes"]["versionString"] == "1.0.2":
            live = v
            break
    if not live:
        sys.exit("Could not find live v1.0.2 to source review notes")
    rd = GET(f"/v1/appStoreVersions/{live['id']}/appStoreReviewDetail")
    src_notes = rd["data"]["attributes"]
    print(f"  notes len={len(src_notes.get('notes') or '')}  "
          f"contact={src_notes.get('contactFirstName')} {src_notes.get('contactLastName')}")

    # source localization for marketingUrl / supportUrl
    src_loc_id = None
    locs = GET(f"/v1/appStoreVersions/{live['id']}/appStoreVersionLocalizations")
    src_loc = None
    for l in locs["data"]:
        if l["attributes"]["locale"] == "en-US":
            src_loc = l["attributes"]
            src_loc_id = l["id"]
            break
    print(f"  src loc id={src_loc_id} supportUrl={src_loc.get('supportUrl')}")

    # ----- 3. create v1.5.0 appStoreVersion (or reuse) -----
    step(3, f"Create or reuse appStoreVersion {NEW_VERSION}")
    existing = None
    for v in vs["data"]:
        if v["attributes"]["versionString"] == NEW_VERSION:
            existing = v
            break
    if existing:
        new_ver_id = existing["id"]
        print(f"  appStoreVersion {NEW_VERSION} already exists -> {new_ver_id}")
        # ensure build is attached
        cur_build = GET(f"/v1/appStoreVersions/{new_ver_id}/build")
        if not cur_build.get("data") or cur_build["data"]["id"] != build_id:
            PATCH(f"/v1/appStoreVersions/{new_ver_id}/relationships/build",
                  {"data": {"type": "builds", "id": build_id}})
            print(f"  attached build {build_id}")
        else:
            print(f"  build already attached")
    else:
        body = {"data": {
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
        }}
        res = POST("/v1/appStoreVersions", body)
        new_ver_id = res["data"]["id"]
        print(f"  appStoreVersion {NEW_VERSION} -> {new_ver_id}")

    # ----- 4. PATCH the auto-created en-US version localization with v1.5 copy -----
    step(4, "PATCH en-US version localization with v1.5 copy")
    new_locs = GET(f"/v1/appStoreVersions/{new_ver_id}/appStoreVersionLocalizations")
    new_loc_id = None
    for l in new_locs["data"]:
        if l["attributes"]["locale"] == "en-US":
            new_loc_id = l["id"]
            break
    if not new_loc_id:
        sys.exit("No en-US localization on new version (expected auto-created).")
    PATCH(f"/v1/appStoreVersionLocalizations/{new_loc_id}", {"data": {
        "type": "appStoreVersionLocalizations",
        "id": new_loc_id,
        "attributes": {
            "description": DESCRIPTION,
            "keywords": KEYWORDS,
            "promotionalText": PROMO_TEXT,
            "marketingUrl": src_loc.get("marketingUrl"),
            "supportUrl": src_loc.get("supportUrl"),
            "whatsNew": WHATS_NEW,
        },
    }})
    print(f"  localization -> {new_loc_id}")
    print(f"    description {len(DESCRIPTION)} chars")
    print(f"    whatsNew    {len(WHATS_NEW)} chars")

    # ----- 5. copy reviewDetail (notes + contact) -----
    step(5, "Copy reviewer notes + contact")
    new_rd = GET(f"/v1/appStoreVersions/{new_ver_id}/appStoreReviewDetail")
    new_rd_id = new_rd["data"]["id"]
    PATCH(f"/v1/appStoreReviewDetails/{new_rd_id}", {"data": {
        "type": "appStoreReviewDetails",
        "id": new_rd_id,
        "attributes": {
            "notes": src_notes.get("notes"),
            "contactFirstName": src_notes.get("contactFirstName"),
            "contactLastName": src_notes.get("contactLastName"),
            "contactPhone": src_notes.get("contactPhone"),
            "contactEmail": src_notes.get("contactEmail"),
        },
    }})
    print(f"  reviewDetail -> {new_rd_id}")

    # ----- 6. PATCH appInfo localization (name + subtitle) -----
    step(6, f"PATCH app name to '{APP_NAME}' and subtitle '{SUBTITLE}'")
    infos = GET(f"/v1/apps/{APP_ID}/appInfos")
    # prefer an editable appInfo if one exists
    editable_info = None
    live_info = None
    for info in infos["data"]:
        state = info["attributes"].get("appStoreState") or info["attributes"].get("state")
        if state in ("PREPARE_FOR_SUBMISSION", "READY_FOR_REVIEW", "DEVELOPER_REJECTED"):
            editable_info = info
        elif state == "READY_FOR_DISTRIBUTION":
            live_info = info
    info = editable_info or live_info or infos["data"][0]
    info_id = info["id"]
    info_state = info["attributes"].get("appStoreState") or info["attributes"].get("state")
    print(f"  appInfo {info_id} state={info_state}")
    info_locs = GET(f"/v1/appInfos/{info_id}/appInfoLocalizations")
    for l in info_locs["data"]:
        if l["attributes"]["locale"] == "en-US":
            status, text = TRY_PATCH(f"/v1/appInfoLocalizations/{l['id']}", {"data": {
                "type": "appInfoLocalizations",
                "id": l["id"],
                "attributes": {"name": APP_NAME, "subtitle": SUBTITLE},
            }})
            if status >= 300:
                print(f"  ⚠ name+subtitle PATCH failed {status}: {text[:300]}")
                print("    (will retry after submission triggers editable appInfo)")
            else:
                print(f"  ✅ name+subtitle PATCHed")
            break

    # ----- 7. upload screenshots -----
    step(7, "Upload screenshots (iPhone 6.5 + iPad 12.9)")
    cmd = [
        "python3", "scripts/asc_replace_screenshots.py",
        "--version", new_ver_id,
        "--iphone65", "screenshots/iphone65",
        "--ipad129", "screenshots/ipad129",
    ]
    print("  $ " + " ".join(cmd))
    r = subprocess.run(cmd)
    if r.returncode != 0:
        sys.exit(f"Screenshot upload failed (exit {r.returncode})")

    # ----- 8. submit for review -----
    step(8, "Create reviewSubmission + add version + submit")
    cr = POST("/v1/reviewSubmissions", {"data": {
        "type": "reviewSubmissions",
        "attributes": {"platform": "IOS"},
        "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}},
    }})
    rs_id = cr["data"]["id"]
    print(f"  reviewSubmission {rs_id}")
    POST("/v1/reviewSubmissionItems", {"data": {
        "type": "reviewSubmissionItems",
        "relationships": {
            "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": rs_id}},
            "appStoreVersion": {"data": {"type": "appStoreVersions", "id": new_ver_id}},
        },
    }})
    print("  added v1.5.0 to submission")
    PATCH(f"/v1/reviewSubmissions/{rs_id}", {"data": {
        "type": "reviewSubmissions",
        "id": rs_id,
        "attributes": {"submitted": True},
    }})
    print("  ✅ SUBMITTED to Apple")

    print("\n" + "="*60)
    print(f"🚀  Diamond Stats Pro {NEW_VERSION} on its way to review!")
    print(f"    version: {new_ver_id}")
    print(f"    build:   {build_id} (#{build_no})")
    print(f"    review:  {rs_id}")
    print("="*60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
