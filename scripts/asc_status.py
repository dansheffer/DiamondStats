import jwt, time, requests, json
key = open('keys/AuthKey_4DMFU7ZX24.p8').read()
tok = jwt.encode(
    {'iss': 'deda6503-60f8-4de7-b11e-f5f4e6fdea7a', 'exp': int(time.time()) + 1200, 'aud': 'appstoreconnect-v1'},
    key, algorithm='ES256', headers={'kid': '4DMFU7ZX24', 'typ': 'JWT'}
)
h = {'Authorization': f'Bearer {tok}'}
vid = '415f9df6-642d-45ae-a266-7649b8e40dd6'

loc = requests.get(f'https://api.appstoreconnect.apple.com/v1/appStoreVersions/{vid}/appStoreVersionLocalizations', headers=h).json()
for l in loc['data']:
    a = l['attributes']
    print('=== Locale:', a.get('locale'), '===')
    print('whatsNew:', a.get('whatsNew'))
    print('promotionalText:', a.get('promotionalText'))
    print('description:', a.get('description'))
    print('keywords:', a.get('keywords'))
    print()

sub = requests.get(f'https://api.appstoreconnect.apple.com/v1/appStoreVersions/{vid}/appStoreVersionSubmission', headers=h).json()
print('Submission:', json.dumps(sub, indent=2)[:600])
