#!/usr/bin/env python3
"""Quick final status check after ship."""
import jwt, time, requests
KEY = open('keys/AuthKey_4DMFU7ZX24.p8').read()
TOK = jwt.encode({'iss':'deda6503-60f8-4de7-b11e-f5f4e6fdea7a','exp':int(time.time())+600,'aud':'appstoreconnect-v1'}, KEY, algorithm='ES256', headers={'kid':'4DMFU7ZX24','typ':'JWT'})
H = {'Authorization': f'Bearer {TOK}'}

print('=== Review submissions ===')
r = requests.get('https://api.appstoreconnect.apple.com/v1/reviewSubmissions?filter[app]=6762099221&limit=3&sort=-createdDate', headers=H).json()
for x in r.get('data', []):
    a = x['attributes']
    print(f"  state={a.get('state')}  submitted={a.get('submittedDate')}  id={x['id']}")

print('\n=== App store versions ===')
v = requests.get('https://api.appstoreconnect.apple.com/v1/apps/6762099221/appStoreVersions?limit=5', headers=H).json()
for x in v.get('data', []):
    a = x['attributes']
    print(f"  v{a.get('versionString')}  state={a.get('appStoreState')}")

print('\n=== App name ===')
infos = requests.get('https://api.appstoreconnect.apple.com/v1/apps/6762099221/appInfos', headers=H).json()
for ai in infos['data']:
    s = ai['attributes']['state']
    loc = requests.get(f"https://api.appstoreconnect.apple.com/v1/appInfos/{ai['id']}/appInfoLocalizations", headers=H).json()
    for l in loc['data']:
        a = l['attributes']
        if a['locale'] == 'en-US':
            print(f"  state={s}  name={a.get('name')!r}  subtitle={a.get('subtitle')!r}")
