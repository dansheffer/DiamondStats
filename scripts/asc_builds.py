#!/usr/bin/env python3
"""List the most recent builds in ASC and their processing state."""
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

r = requests.get(
    'https://api.appstoreconnect.apple.com/v1/builds'
    '?filter[app]=6762099221&limit=6&sort=-uploadedDate'
    '&fields[builds]=version,uploadedDate,processingState,expired,usesNonExemptEncryption,'
    'preReleaseVersion',
    headers=H).json()
for b in r.get('data', []):
    a = b['attributes']
    print(f"build {a.get('version'):>4}  processing={a.get('processingState'):<12} "
          f"uploaded={a.get('uploadedDate')}  expired={a.get('expired')}")

print('\n--- App Store Versions ---')
v = requests.get(
    f'https://api.appstoreconnect.apple.com/v1/apps/6762099221/appStoreVersions'
    '?limit=6&sort=-createdDate',
    headers=H).json()
for x in v.get('data', []):
    a = x['attributes']
    print(f"v{a.get('versionString'):<8} state={a.get('appStoreState'):<28} "
          f"created={a.get('createdDate')}")
