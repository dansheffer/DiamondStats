#!/usr/bin/env python3
"""Check the current App Store display name and subtitle across all appInfos."""
import jwt
import time
import requests

KEY = open('keys/AuthKey_4DMFU7ZX24.p8').read()
TOK = jwt.encode(
    {'iss': 'deda6503-60f8-4de7-b11e-f5f4e6fdea7a',
     'exp': int(time.time()) + 600,
     'aud': 'appstoreconnect-v1'},
    KEY, algorithm='ES256', headers={'kid': '4DMFU7ZX24', 'typ': 'JWT'})
H = {'Authorization': f'Bearer {TOK}'}

r = requests.get('https://api.appstoreconnect.apple.com/v1/apps/6762099221/appInfos', headers=H).json()
for ai in r['data']:
    state = ai['attributes']['state']
    aid = ai['id']
    loc = requests.get(f'https://api.appstoreconnect.apple.com/v1/appInfos/{aid}/appInfoLocalizations', headers=H).json()
    for l in loc['data']:
        a = l['attributes']
        print(f"state={state}  locale={a['locale']}  name={a.get('name')}  subtitle={a.get('subtitle')}")
