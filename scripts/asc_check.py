#!/usr/bin/env python3
import jwt, time, requests, json
key = open('keys/AuthKey_4DMFU7ZX24.p8').read()
tok = jwt.encode(
    {'iss': 'deda6503-60f8-4de7-b11e-f5f4e6fdea7a', 'exp': int(time.time())+1200, 'aud': 'appstoreconnect-v1'},
    key, algorithm='ES256', headers={'kid': '4DMFU7ZX24', 'typ': 'JWT'})
h = {'Authorization': f'Bearer {tok}'}

v = requests.get('https://api.appstoreconnect.apple.com/v1/appStoreVersions/415f9df6-642d-45ae-a266-7649b8e40dd6', headers=h).json()
a = v['data']['attributes']
print(f"Version 1.0 → state={a.get('appStoreState')}  releaseType={a.get('releaseType')}")

# attached build
b = requests.get('https://api.appstoreconnect.apple.com/v1/appStoreVersions/415f9df6-642d-45ae-a266-7649b8e40dd6/build', headers=h).json()
if b.get('data'):
    bid = b['data']['id']
    bd = requests.get(f'https://api.appstoreconnect.apple.com/v1/builds/{bid}', headers=h).json()
    ba = bd['data']['attributes']
    print(f"Attached build → {ba.get('version')} processing={ba.get('processingState')} expired={ba.get('expired')}")

# review submissions
rs = requests.get('https://api.appstoreconnect.apple.com/v1/reviewSubmissions?filter%5Bapp%5D=6762099221&filter%5Bplatform%5D=IOS', headers=h).json()
print("\nReview Submissions:")
for r in rs.get('data', []):
    ra = r['attributes']
    print(f"  - id={r['id']}  state={ra.get('state')}  submittedDate={ra.get('submittedDate')}")
if not rs.get('data'):
    print("  (none)")
    print(json.dumps(rs.get('errors', {}), indent=2)[:300])
