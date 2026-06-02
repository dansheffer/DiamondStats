"""Create a NEW review submission for v1.0.1 with build 21 (the rejected one is closed)."""
import jwt, time, requests, json, sys

KEY = open('keys/AuthKey_4DMFU7ZX24.p8').read()
ISS = 'deda6503-60f8-4de7-b11e-f5f4e6fdea7a'
KID = '4DMFU7ZX24'
APP_ID = '6762099221'
VID = '415f9df6-642d-45ae-a266-7649b8e40dd6'

tok = jwt.encode(
    {'iss': ISS, 'exp': int(time.time()) + 1200, 'aud': 'appstoreconnect-v1'},
    KEY, algorithm='ES256', headers={'kid': KID, 'typ': 'JWT'}
)
H = {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}

# 1. Confirm build 21 is attached to the version
b = requests.get(f'https://api.appstoreconnect.apple.com/v1/appStoreVersions/{VID}/build', headers=H).json()
print('Attached build:', b.get('data', {}).get('id'), b.get('data', {}).get('attributes', {}).get('version'))

# 2. Try creating a NEW reviewSubmission (the rejected one is in UNRESOLVED_ISSUES — typically allowed)
create = {
    'data': {
        'type': 'reviewSubmissions',
        'attributes': {'platform': 'IOS'},
        'relationships': {'app': {'data': {'type': 'apps', 'id': APP_ID}}}
    }
}
cr = requests.post('https://api.appstoreconnect.apple.com/v1/reviewSubmissions', headers=H, data=json.dumps(create))
print('Create reviewSubmission:', cr.status_code, cr.text[:600])
if cr.status_code >= 300:
    sys.exit(1)
rs_id = cr.json()['data']['id']
print('New rs:', rs_id)

# 3. Add version
item = {
    'data': {
        'type': 'reviewSubmissionItems',
        'relationships': {
            'reviewSubmission': {'data': {'type': 'reviewSubmissions', 'id': rs_id}},
            'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': VID}},
        }
    }
}
ir = requests.post('https://api.appstoreconnect.apple.com/v1/reviewSubmissionItems', headers=H, data=json.dumps(item))
print('Add item:', ir.status_code, ir.text[:400])
if ir.status_code >= 300:
    sys.exit(1)

# 4. Submit
sp = {'data': {'type': 'reviewSubmissions', 'id': rs_id, 'attributes': {'submitted': True}}}
sr = requests.patch(f'https://api.appstoreconnect.apple.com/v1/reviewSubmissions/{rs_id}', headers=H, data=json.dumps(sp))
print('Submit:', sr.status_code, sr.text[:400])
