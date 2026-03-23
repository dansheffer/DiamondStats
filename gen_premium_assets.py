#!/usr/bin/env python3
"""Generate premium Diamond Stats app icon + splash screen.

Brand direction:
  - Primary: Deep navy #0A2A66
  - Accent: Orange #FF6A13
  - Style: clean, confident, premium, Apple-quality

Icon: "Diamond Stats" lettering over subtle baseball, rounded composition
Splash: Full branding with tagline "FOR & BY THE FANS"
"""

from PIL import Image, ImageDraw, ImageFont
import math, os

NAVY = (10, 42, 102)
ORANGE = (255, 106, 19)
WHITE = (255, 255, 255)
LIGHT_NAVY = (20, 60, 140)

ASSETS_DIR = os.path.join(os.path.dirname(__file__), 'assets')


def draw_diamond(draw, cx, cy, size, fill, outline=None, width=0):
    """Draw a diamond (rotated square) shape."""
    half = size // 2
    points = [(cx, cy - half), (cx + half, cy), (cx, cy + half), (cx - half, cy)]
    draw.polygon(points, fill=fill, outline=outline, width=width)


def draw_baseball_stitches(draw, cx, cy, radius, color, width=2):
    """Draw simplified baseball stitch arcs."""
    # Left arc stitches
    for i in range(-3, 4):
        angle = math.radians(i * 18)
        x1 = cx - radius * 0.35 + math.cos(angle + 0.3) * radius * 0.25
        y1 = cy + math.sin(angle) * radius * 0.55
        x2 = x1 - 8
        y2 = y1
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)

    # Right arc stitches
    for i in range(-3, 4):
        angle = math.radians(i * 18)
        x1 = cx + radius * 0.35 + math.cos(angle - 0.3) * radius * 0.25
        y1 = cy + math.sin(angle) * radius * 0.55
        x2 = x1 + 8
        y2 = y1
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)


def try_font(names, size):
    """Try loading a font from a list of names/paths."""
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


# ─── APP ICON (1024×1024) ────────────────────────────────────────────

def generate_icon():
    size = 1024
    img = Image.new('RGBA', (size, size), NAVY)
    draw = ImageDraw.Draw(img)

    # Subtle radial gradient effect (concentric rings)
    for r in range(size // 2, 0, -2):
        alpha = int(15 * (r / (size // 2)))
        ring_color = (255, 255, 255, alpha)
        draw.ellipse(
            [size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r],
            outline=ring_color,
        )

    # Diamond shape - large, centered, subtle
    draw_diamond(draw, size // 2, size // 2 - 20, 620, fill=LIGHT_NAVY)
    draw_diamond(draw, size // 2, size // 2 - 20, 600, fill=NAVY, outline=ORANGE, width=6)

    # Baseball circle in center-top area
    ball_cy = size // 2 - 100
    ball_r = 140
    draw.ellipse(
        [size // 2 - ball_r, ball_cy - ball_r, size // 2 + ball_r, ball_cy + ball_r],
        fill=WHITE,
    )
    # Baseball stitches
    draw_baseball_stitches(draw, size // 2, ball_cy, ball_r, ORANGE, width=4)
    # Baseball outline
    draw.ellipse(
        [size // 2 - ball_r, ball_cy - ball_r, size // 2 + ball_r, ball_cy + ball_r],
        outline=(200, 200, 210),
        width=3,
    )

    # "DS" monogram on the baseball
    ds_font = try_font([
        '/System/Library/Fonts/Supplemental/Snell Roundhand.ttc',
        '/System/Library/Fonts/Supplemental/Brush Script.ttf',
        '/System/Library/Fonts/Supplemental/American Typewriter.ttc',
    ], 130)
    ds_bbox = draw.textbbox((0, 0), 'DS', font=ds_font)
    ds_w = ds_bbox[2] - ds_bbox[0]
    ds_h = ds_bbox[3] - ds_bbox[1]
    ds_x = size // 2 - ds_w // 2
    ds_y = ball_cy - ds_h // 2 - 10
    # Shadow
    draw.text((ds_x + 3, ds_y + 3), 'DS', fill=(80, 80, 100), font=ds_font)
    draw.text((ds_x, ds_y), 'DS', fill=NAVY, font=ds_font)

    # "DIAMOND" text - bold block lettering
    title_font = try_font([
        '/System/Library/Fonts/Supplemental/Impact.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/SFCompact.ttf',
    ], 100)
    text = 'DIAMOND'
    tb = draw.textbbox((0, 0), text, font=title_font)
    tw = tb[2] - tb[0]
    tx = size // 2 - tw // 2
    ty = size // 2 + 80
    # Layered stroke: orange outer, white inner, navy fill
    for ox, oy in [(-3, -3), (3, -3), (-3, 3), (3, 3), (0, -3), (0, 3), (-3, 0), (3, 0)]:
        draw.text((tx + ox, ty + oy), text, fill=ORANGE, font=title_font)
    for ox, oy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
        draw.text((tx + ox, ty + oy), text, fill=WHITE, font=title_font)
    draw.text((tx, ty), text, fill=WHITE, font=title_font)

    # "STATS" text
    stats_font = try_font([
        '/System/Library/Fonts/Supplemental/Impact.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ], 80)
    text2 = 'STATS'
    tb2 = draw.textbbox((0, 0), text2, font=stats_font)
    tw2 = tb2[2] - tb2[0]
    tx2 = size // 2 - tw2 // 2
    ty2 = ty + 105
    for ox, oy in [(-3, -3), (3, -3), (-3, 3), (3, 3), (0, -3), (0, 3), (-3, 0), (3, 0)]:
        draw.text((tx2 + ox, ty2 + oy), text2, fill=ORANGE, font=stats_font)
    draw.text((tx2, ty2), text2, fill=ORANGE, font=stats_font)

    # Save
    icon_path = os.path.join(ASSETS_DIR, 'icon.png')
    img_rgb = img.convert('RGB')
    img_rgb.save(icon_path, 'PNG')
    print(f'✓ Icon saved: {icon_path} ({img_rgb.size[0]}×{img_rgb.size[1]})')
    return icon_path


# ─── SPLASH SCREEN (1284×2778) ───────────────────────────────────────

def generate_splash():
    w, h = 1284, 2778
    img = Image.new('RGBA', (w, h), NAVY)
    draw = ImageDraw.Draw(img)

    # Subtle vertical gradient (lighter at center)
    for y in range(h):
        dist = abs(y - h // 2) / (h // 2)
        brightness = int(12 * (1 - dist))
        draw.line([(0, y), (w, y)], fill=(10 + brightness, 42 + brightness, 102 + brightness))

    # Subtle pinstripe lines
    for x in range(0, w, 40):
        draw.line([(x, 0), (x, h)], fill=(15, 50, 115, 40), width=1)

    # Diamond shape behind content
    draw_diamond(draw, w // 2, h // 2 - 200, 700, fill=LIGHT_NAVY)
    draw_diamond(draw, w // 2, h // 2 - 200, 680, fill=NAVY, outline=ORANGE, width=5)

    # Baseball
    ball_cy = h // 2 - 380
    ball_r = 160
    draw.ellipse(
        [w // 2 - ball_r, ball_cy - ball_r, w // 2 + ball_r, ball_cy + ball_r],
        fill=WHITE,
    )
    draw_baseball_stitches(draw, w // 2, ball_cy, ball_r, ORANGE, width=5)
    draw.ellipse(
        [w // 2 - ball_r, ball_cy - ball_r, w // 2 + ball_r, ball_cy + ball_r],
        outline=(200, 200, 210),
        width=3,
    )

    # DS monogram on ball
    ds_font = try_font([
        '/System/Library/Fonts/Supplemental/Snell Roundhand.ttc',
        '/System/Library/Fonts/Supplemental/Brush Script.ttf',
    ], 150)
    ds_bbox = draw.textbbox((0, 0), 'DS', font=ds_font)
    ds_w = ds_bbox[2] - ds_bbox[0]
    ds_h = ds_bbox[3] - ds_bbox[1]
    ds_x = w // 2 - ds_w // 2
    ds_y = ball_cy - ds_h // 2 - 10
    draw.text((ds_x + 3, ds_y + 3), 'DS', fill=(100, 100, 120), font=ds_font)
    draw.text((ds_x, ds_y), 'DS', fill=NAVY, font=ds_font)

    # "DIAMOND" title
    title_font = try_font([
        '/System/Library/Fonts/Supplemental/Impact.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ], 120)
    text = 'DIAMOND'
    tb = draw.textbbox((0, 0), text, font=title_font)
    tw = tb[2] - tb[0]
    tx = w // 2 - tw // 2
    ty = h // 2 - 100
    # Layered stroke
    for ox, oy in [(-4, -4), (4, -4), (-4, 4), (4, 4), (0, -4), (0, 4), (-4, 0), (4, 0)]:
        draw.text((tx + ox, ty + oy), text, fill=ORANGE, font=title_font)
    for ox, oy in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
        draw.text((tx + ox, ty + oy), text, fill=WHITE, font=title_font)
    draw.text((tx, ty), text, fill=WHITE, font=title_font)

    # "STATS" text
    stats_font = try_font([
        '/System/Library/Fonts/Supplemental/Impact.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ], 100)
    text2 = 'STATS'
    tb2 = draw.textbbox((0, 0), text2, font=stats_font)
    tw2 = tb2[2] - tb2[0]
    tx2 = w // 2 - tw2 // 2
    ty2 = ty + 130
    for ox, oy in [(-3, -3), (3, -3), (-3, 3), (3, 3), (0, -3), (0, 3), (-3, 0), (3, 0)]:
        draw.text((tx2 + ox, ty2 + oy), text2, fill=ORANGE, font=stats_font)
    draw.text((tx2, ty2), text2, fill=ORANGE, font=stats_font)

    # Divider line
    div_y = ty2 + 120
    draw.line([(w // 2 - 200, div_y), (w // 2 + 200, div_y)], fill=ORANGE, width=3)

    # Tagline: "FOR & BY THE FANS"
    tag_font = try_font([
        '/System/Library/Fonts/Supplemental/Avenir Next.ttc',
        '/System/Library/Fonts/Helvetica.ttc',
    ], 36)
    tagline = 'FOR & BY THE FANS'
    tag_bbox = draw.textbbox((0, 0), tagline, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_x = w // 2 - tag_w // 2
    tag_y = div_y + 20
    draw.text((tag_x, tag_y), tagline, fill=(200, 210, 230), font=tag_font)

    # Save
    splash_path = os.path.join(ASSETS_DIR, 'splash.png')
    img_rgb = img.convert('RGB')
    img_rgb.save(splash_path, 'PNG')
    print(f'✓ Splash saved: {splash_path} ({img_rgb.size[0]}×{img_rgb.size[1]})')
    return splash_path


if __name__ == '__main__':
    generate_icon()
    generate_splash()
    print('\nDone! Premium assets generated.')
