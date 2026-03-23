#!/usr/bin/env python3
from PIL import Image
import os

BASE = os.path.dirname(os.path.abspath(__file__))

checks = [
    ("assets/icon.png", (1024, 1024)),
    ("assets/adaptive-icon.png", (1024, 1024)),
    ("assets/splash.png", (1284, 2778)),
    ("assets/logo-home.png", (768, 808)),
    ("ios/DiamondStats/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png", (1024, 1024)),
    ("ios/DiamondStats/Images.xcassets/SplashScreen.imageset/image.png", (1284, 2778)),
]

all_ok = True
for rel, expected in checks:
    path = os.path.join(BASE, rel)
    if not os.path.exists(path):
        print(f"MISSING: {rel}")
        all_ok = False
        continue
    img = Image.open(path)
    ok = img.size == expected
    if not ok:
        all_ok = False
    print(f"{'OK' if ok else 'FAIL'}: {rel} -> {img.size} {img.mode} (expected {expected})")

print()
print("ALL GOOD!" if all_ok else "SOME CHECKS FAILED")
