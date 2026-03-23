#!/usr/bin/env python3
"""Generate app icon and splash screen assets from logo-home.png"""
from PIL import Image

LOGO = "assets/logo-home.png"
NAVY = (10, 42, 102)  # #0A2A66

logo = Image.open(LOGO).convert("RGBA")
lw, lh = logo.size
print(f"Logo: {lw}x{lh}")

# === 1. APP ICON (1024x1024) ===
icon_size = 1024
icon = Image.new("RGBA", (icon_size, icon_size), NAVY + (255,))

padding_pct = 0.12
usable = int(icon_size * (1 - 2 * padding_pct))
scale = min(usable / lw, usable / lh)
new_w = int(lw * scale)
new_h = int(lh * scale)
logo_resized = logo.resize((new_w, new_h), Image.LANCZOS)

x = (icon_size - new_w) // 2
y = (icon_size - new_h) // 2
icon.paste(logo_resized, (x, y), logo_resized)

icon_rgb = icon.convert("RGB")
icon_rgb.save("assets/icon.png", "PNG")
icon_rgb.save("assets/adaptive-icon.png", "PNG")
print(f"  icon.png and adaptive-icon.png: {icon_size}x{icon_size}")

icon_rgb.save(
    "ios/DiamondStats/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png",
    "PNG",
)
print(f"  iOS AppIcon: 1024x1024")

# === 2. SPLASH SCREEN (1284x2778) ===
splash_w = 1284
splash_h = 2778
splash = Image.new("RGBA", (splash_w, splash_h), NAVY + (255,))

target_w = int(splash_w * 0.55)
scale_s = target_w / lw
new_sw = int(lw * scale_s)
new_sh = int(lh * scale_s)
logo_splash = logo.resize((new_sw, new_sh), Image.LANCZOS)

sx = (splash_w - new_sw) // 2
sy = int(splash_h * 0.38) - new_sh // 2
splash.paste(logo_splash, (sx, sy), logo_splash)

splash_rgb = splash.convert("RGB")
splash_rgb.save("assets/splash.png", "PNG")
print(f"  splash.png: {splash_w}x{splash_h}")

splash_rgb.save(
    "ios/DiamondStats/Images.xcassets/SplashScreen.imageset/image.png",
    "PNG",
)
print(f"  iOS SplashScreen: {splash_w}x{splash_h}")

# === 3. Navy background pixel ===
bg = Image.new("RGB", (1, 1), NAVY)
bg.save(
    "ios/DiamondStats/Images.xcassets/SplashScreenBackground.imageset/image.png",
    "PNG",
)
print(f"  iOS SplashScreenBackground: 1x1 navy")

print("\nAll assets generated from logo-home.png!")
