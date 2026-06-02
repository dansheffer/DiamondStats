#!/usr/bin/env python3
import jwt, time, requests
key = open('keys/AuthKey_4DMFU7ZX24.p8').read()
tok = jwt.encode({'iss':'deda6503-60f8-4de7-b11e-f5f4e6fdea7a','exp':int(time.time())+1200,'aud':'appstoreconnect-v1'}, key, algorithm='ES256', headers={'kid':'4DMFU7ZX24','typ':'JWT'})
h = {'Authorization': f'Bearer {tok}'}
b = requests.get('https://api.appstoreconnect.apple.com/v1/builds', headers=h, params={'filter[app]':'6762099221','filter[version]':'18','limit':3}).json()
print('Build 18:', [(x['id'][:8], x['attributes'].get('processingState'), x['attributes'].get('expired')) for x in b.get('data',[])])
