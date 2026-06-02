#!/usr/bin/env python3
"""Generate all app assets from ds2.png"""
from PIL import Image
import shutil, os

SRC = os.path.expanduser('~/Documents/ds2.png')
PROJECT = os.path.dirname(os.path.abspath(__file__))
NAVY = (10, 42, 102)

logo = Image.open(SRC).convert('RGB')
w, h = logo.size
print(f"Source: {w}x{h}")

# 1. App Icon (1024x1024) - logo centered on navy
icon = Image.new('RGB', (1024, 1024), NAVY)
max_dim = int(1024 * 0.85)
scale = min(max_dim / w, max_dim / h)
nw, nh = int(w * scale), int(h * scale)
resized = logo.resize((nw, nh), Image.LANCZOS)
icon.paste(resized, ((1024 - nw) // 2, (1024 - nh) // 2))
icon.save(os.path.join(PROJECT, 'assets', 'icon.png'), 'PNG')
icon.save(os.path.join(PROJECT, 'assets', 'adaptive-icon.png'), 'PNG')
print(f"  icon.png + adaptive-icon.png: 1024x1024 (logo {nw}x{nh})")

# 2. Splash Screen (1284x2778)
splash = Image.new('RGB', (1284, 2778), NAVY)
sw = int(1284 * 0.55)
ss = sw / w
sh = int(h * ss)
logo_s = logo.resize((sw, sh), Image.LANCZOS)
splash.paste(logo_s, ((1284 - sw) // 2, (2778 - sh) // 2))
splash.save(os.path.join(PROJECT, 'assets', 'splash.png'), 'PNG')
print(f"  splash.png: 1284x2778 (logo {sw}x{sh})")

# 3. Home screen logo
shutil.copy2(SRC, os.path.join(PROJECT, 'assets', 'logo-home.png'))
print(f"  logo-home.png: {w}x{h} (original)")

# 4. iOS AppIcon
ios_icon = os.path.join(PROJECT, 'ios', 'DiamondStats', 'Images.xcassets',
                        'AppIcon.appiconset', 'App-Icon-1024x1024@1x.png')
icon.save(ios_icon, 'PNG')
print(f"  iOS AppIcon: 1024x1024")

# 5. iOS SplashScreen
ios_splash = os.path.join(PROJECT, 'ios', 'DiamondStats', 'Images.xcassets',
                          'SplashScreen.imageset', 'image.png')
splash.save(ios_splash, 'PNG')
print(f"  iOS SplashScreen image: 1284x2778")

# 6. iOS SplashScreen Background
ios_bg_dir = os.path.join(PROJECT, 'ios', 'DiamondStats', 'Images.xcassets',
                          'SplashScreenBackground.imageset')
for f in os.listdir(ios_bg_dir):
    if f.endswith('.png'):
        bg = Image.new('RGB', (1, 1), NAVY)
        bg.save(os.path.join(ios_bg_dir, f), 'PNG')
        print(f"  iOS SplashBackground: {f}")

print("\nAll assets generated from ds2.png!")
