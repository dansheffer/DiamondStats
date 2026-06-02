#!/usr/bin/env python3
"""Replace App Store screenshots for a given appStoreVersion.

Usage:
    python3 scripts/asc_replace_screenshots.py --version VERSION_ID \
        --iphone67 dir/ --ipad129 dir/

Each directory should contain PNG/JPEG files named in upload order
(01_*.png, 02_*.png, ...). Existing screenshots in those display types
are deleted first, then new ones are uploaded.

Display types we target:
  APP_IPHONE_67   -> iPhone 6.7" (1290x2796 portrait, or 2796x1290 landscape)
  APP_IPAD_PRO_129 -> iPad Pro 12.9" (2048x2732 portrait)

Apple requires 1-10 screenshots per display type. We default to portrait.
"""
import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import jwt
import requests

KEY_PATH = "keys/AuthKey_4DMFU7ZX24.p8"
KEY_ID = "4DMFU7ZX24"
ISSUER_ID = "deda6503-60f8-4de7-b11e-f5f4e6fdea7a"
API = "https://api.appstoreconnect.apple.com"


def token() -> str:
    key = open(KEY_PATH).read()
    return jwt.encode(
        {"iss": ISSUER_ID, "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
        key,
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )


def auth_headers() -> dict:
    return {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}


def get(path: str, params: dict | None = None) -> dict:
    r = requests.get(f"{API}{path}", headers=auth_headers(), params=params)
    r.raise_for_status()
    return r.json()


def delete(path: str) -> None:
    r = requests.delete(f"{API}{path}", headers={"Authorization": f"Bearer {token()}"})
    if r.status_code not in (200, 204):
        print(f"DELETE {path} -> {r.status_code} {r.text}", file=sys.stderr)


def post(path: str, body: dict) -> dict:
    r = requests.post(f"{API}{path}", headers=auth_headers(), data=json.dumps(body))
    if r.status_code >= 300:
        print(f"POST {path} -> {r.status_code}\n{r.text}", file=sys.stderr)
        r.raise_for_status()
    return r.json()


def patch(path: str, body: dict) -> dict:
    r = requests.patch(f"{API}{path}", headers=auth_headers(), data=json.dumps(body))
    if r.status_code >= 300:
        print(f"PATCH {path} -> {r.status_code}\n{r.text}", file=sys.stderr)
        r.raise_for_status()
    if not r.text or not r.text.strip():
        return {}
    try:
        return r.json()
    except ValueError:
        return {}


# ---------------------------------------------------------------------------
# Core flow
# ---------------------------------------------------------------------------


def get_localization_id(version_id: str, locale: str = "en-US") -> str:
    res = get(f"/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations")
    for d in res["data"]:
        if d["attributes"]["locale"] == locale:
            return d["id"]
    sys.exit(f"No {locale} localization on version {version_id}")


def list_screenshot_sets(loc_id: str) -> list[dict]:
    res = get(f"/v1/appStoreVersionLocalizations/{loc_id}/appScreenshotSets")
    return res["data"]


def find_or_create_set(loc_id: str, display_type: str) -> str:
    for s in list_screenshot_sets(loc_id):
        if s["attributes"]["screenshotDisplayType"] == display_type:
            return s["id"]
    res = post(
        "/v1/appScreenshotSets",
        {
            "data": {
                "type": "appScreenshotSets",
                "attributes": {"screenshotDisplayType": display_type},
                "relationships": {
                    "appStoreVersionLocalization": {
                        "data": {"type": "appStoreVersionLocalizations", "id": loc_id}
                    }
                },
            }
        },
    )
    return res["data"]["id"]


def delete_existing_screenshots(set_id: str) -> None:
    res = get(f"/v1/appScreenshotSets/{set_id}/appScreenshots")
    for s in res["data"]:
        print(f"  deleting {s['id']}")
        delete(f"/v1/appScreenshots/{s['id']}")


def upload_screenshot(set_id: str, file_path: Path) -> str:
    data = file_path.read_bytes()
    size = len(data)
    fname = file_path.name

    # 1) Reserve
    reserve = post(
        "/v1/appScreenshots",
        {
            "data": {
                "type": "appScreenshots",
                "attributes": {"fileName": fname, "fileSize": size},
                "relationships": {
                    "appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": set_id}}
                },
            }
        },
    )
    shot_id = reserve["data"]["id"]
    ops = reserve["data"]["attributes"]["uploadOperations"]

    # 2) Upload chunks
    for op in ops:
        offset = op["offset"]
        length = op["length"]
        chunk = data[offset : offset + length]
        h = {hh["name"]: hh["value"] for hh in op["requestHeaders"]}
        rr = requests.request(op["method"], op["url"], data=chunk, headers=h)
        if rr.status_code >= 300:
            sys.exit(f"chunk upload failed {rr.status_code} {rr.text}")

    # 3) Commit with checksum
    md5 = hashlib.md5(data).hexdigest()
    patch(
        f"/v1/appScreenshots/{shot_id}",
        {
            "data": {
                "type": "appScreenshots",
                "id": shot_id,
                "attributes": {"uploaded": True, "sourceFileChecksum": md5},
            }
        },
    )
    return shot_id


def replace_set(loc_id: str, display_type: str, src_dir: Path) -> None:
    files = sorted(p for p in src_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"})
    if not files:
        print(f"⚠ {src_dir} is empty, skipping {display_type}")
        return
    if len(files) > 10:
        sys.exit(f"{src_dir} has {len(files)} files; max 10 per set")

    print(f"\n=== {display_type} ===")
    set_id = find_or_create_set(loc_id, display_type)
    print(f"set: {set_id}")
    print("Deleting existing screenshots...")
    delete_existing_screenshots(set_id)

    new_ids = []
    for f in files:
        print(f"Uploading {f.name} ({f.stat().st_size} bytes)...")
        sid = upload_screenshot(set_id, f)
        new_ids.append(sid)
        print(f"  -> {sid}")

    # Reorder
    if len(new_ids) > 1:
        patch(
            f"/v1/appScreenshotSets/{set_id}/relationships/appScreenshots",
            {"data": [{"type": "appScreenshots", "id": i} for i in new_ids]},
        )
        print("Order set.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", required=True, help="appStoreVersion id")
    ap.add_argument("--locale", default="en-US")
    ap.add_argument("--iphone65", type=Path, help="dir of iPhone 6.5\" screenshots (1242x2688)")
    ap.add_argument("--ipad129", type=Path, help="dir of iPad Pro 12.9\" screenshots (2048x2732)")
    args = ap.parse_args()

    if not args.iphone65 and not args.ipad129:
        sys.exit("Pass at least one of --iphone65 or --ipad129")

    loc_id = get_localization_id(args.version, args.locale)
    print(f"localization: {loc_id}")

    if args.iphone65:
        replace_set(loc_id, "APP_IPHONE_65", args.iphone65)
    if args.ipad129:
        replace_set(loc_id, "APP_IPAD_PRO_3GEN_129", args.ipad129)

    print("\n✅ Done. Wait ~30s, then verify in App Store Connect UI.")


if __name__ == "__main__":
    main()
