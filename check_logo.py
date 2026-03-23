#!/usr/bin/env python3
from PIL import Image
from urllib.request import urlopen
from io import BytesIO

resp = urlopen('https://midfield.mlbstatic.com/v1/team/121/spots/72')
img = Image.open(BytesIO(resp.read()))
print(f'Size: {img.size}, Mode: {img.mode}')

rgba = img.convert('RGBA')
alpha = rgba.getchannel('A')
pixels = list(alpha.getdata())
non_transparent = sum(1 for p in pixels if p > 0)
total = len(pixels)
print(f'Non-transparent pixels: {non_transparent}/{total} ({100*non_transparent/total:.1f}%)')

colors = rgba.getcolors(maxcolors=256)
print(f'Unique colors: {len(colors) if colors else "too many"}')
if colors:
    for count, color in sorted(colors, reverse=True)[:5]:
        print(f'  {count} pixels: RGBA{color}')
