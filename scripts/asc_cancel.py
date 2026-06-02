import jwt, time, requests, json
key = open('keys/AuthKey_4DMFU7ZX24.p8').read()
tok = jwt.encode(
    {'iss': 'deda6503-60f8-4de7-b11e-f5f4e6fdea7a', 'exp': int(time.time()) + 1200, 'aud': 'appstoreconnect-v1'},
    key, algorithm='ES256', headers={'kid': '4DMFU7ZX24', 'typ': 'JWT'}
)
h = {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}
old_rs = 'ccf432d3-dec5-4e2d-a0c4-00d2a31b8cdf'
new_rs = 'a94ff719-40b7-4ed5-99e5-7bcff8d88c61'

for attr in [{'canceled': True}, {'submitted': False}]:
    p = {'data': {'type': 'reviewSubmissions', 'id': old_rs, 'attributes': attr}}
    r = requests.patch(f'https://api.appstoreconnect.apple.com/v1/reviewSubmissions/{old_rs}', headers=h, data=json.dumps(p))
    print(attr, '=>', r.status_code, r.text[:400])

r = requests.patch(
    f'https://api.appstoreconnect.apple.com/v1/reviewSubmissions/{new_rs}',
    headers=h,
    data=json.dumps({'data': {'type': 'reviewSubmissions', 'id': new_rs, 'attributes': {'canceled': True}}})
)
print('cancel new empty rs:', r.status_code, r.text[:200])
