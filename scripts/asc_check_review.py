import jwt, time, requests
key = open('keys/AuthKey_4DMFU7ZX24.p8').read()
tok = jwt.encode(
    {'iss': 'deda6503-60f8-4de7-b11e-f5f4e6fdea7a', 'exp': int(time.time()) + 1200, 'aud': 'appstoreconnect-v1'},
    key, algorithm='ES256', headers={'kid': '4DMFU7ZX24', 'typ': 'JWT'}
)
h = {'Authorization': f'Bearer {tok}'}
rs = '4da3e3d6-3053-41c1-8940-e211a9d94e82'
vid = '415f9df6-642d-45ae-a266-7649b8e40dd6'

r = requests.get(f'https://api.appstoreconnect.apple.com/v1/reviewSubmissions/{rs}', headers=h).json()
a = r['data']['attributes']
print(f"reviewSubmission state : {a['state']}")
print(f"submittedDate          : {a['submittedDate']}")

v = requests.get(f'https://api.appstoreconnect.apple.com/v1/appStoreVersions/{vid}', headers=h).json()
va = v['data']['attributes']
print(f"appStoreVersion {va['versionString']}    : appStoreState={va['appStoreState']}  appVersionState={va['appVersionState']}")

items = requests.get(f'https://api.appstoreconnect.apple.com/v1/reviewSubmissions/{rs}/items', headers=h).json()
for i in items['data']:
    print(f"  item state           : {i['attributes']['state']}")
