#!/usr/bin/env python3
"""
Diamond Stats — fix Age Rating declaration via the App Store Connect API.

Apple flagged 2.3.6 because the Age Rating questionnaire claimed Age Assurance
/ Parental Controls. This patches both to False on the editable appInfo's
ageRatingDeclaration relationship.
"""
from __future__ import annotations
import json, sys, time
from pathlib import Path
import jwt, requests

ROOT = Path(__file__).resolve().parent.parent
KEY_PATH = ROOT / "keys" / "AuthKey_4DMFU7ZX24.p8"
KEY_ID = "4DMFU7ZX24"
ISSUER_ID = "deda6503-60f8-4de7-b11e-f5f4e6fdea7a"
APP_ID = "6762099221"
API = "https://api.appstoreconnect.apple.com/v1"


def main() -> int:
    now = int(time.time())
    tok = jwt.encode(
        {"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"},
        KEY_PATH.read_text(), algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )
    h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    print("🔑 Token minted.")

    r = requests.get(f"{API}/apps/{APP_ID}/appInfos", headers=h, timeout=30)
    r.raise_for_status()
    infos = r.json()["data"]
    editable = next(
        (i for i in infos if i["attributes"].get("state") in {
            "PREPARE_FOR_SUBMISSION", "REJECTED", "DEVELOPER_REJECTED",
            "METADATA_REJECTED", "WAITING_FOR_REVIEW",
        }),
        infos[0],
    )
    info_id = editable["id"]
    print(f"📦 appInfo {info_id} state={editable['attributes'].get('state')}")

    r = requests.get(f"{API}/appInfos/{info_id}/ageRatingDeclaration", headers=h, timeout=30)
    r.raise_for_status()
    decl = r.json()["data"]
    before = decl["attributes"]
    print(f"   Before: ageAssurance={before.get('ageAssurance')} parentalControls={before.get('parentalControls')}")

    r = requests.patch(
        f"{API}/ageRatingDeclarations/{decl['id']}",
        headers=h,
        json={"data": {"type": "ageRatingDeclarations", "id": decl["id"],
                       "attributes": {"ageAssurance": False, "parentalControls": False}}},
        timeout=30,
    )
    if r.status_code >= 400:
        print(f"❌ HTTP {r.status_code}")
        print(json.dumps(r.json(), indent=2))
        return 1
    after = r.json()["data"]["attributes"]
    print(f"✅ After:  ageAssurance={after.get('ageAssurance')} parentalControls={after.get('parentalControls')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
