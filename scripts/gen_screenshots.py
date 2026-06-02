#!/usr/bin/env python3
"""Generate clean App Store marketing screenshots from scratch using PIL.

No simulator captures, no team logos, no Expo Go artifacts.
Renders 6 designed screens at the two required Apple sizes:
  - APP_IPHONE_65         1242 x 2688
  - APP_IPAD_PRO_3GEN_129 2048 x 2732

Output goes to ./screenshots/iphone65/ and ./screenshots/ipad129/.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path("screenshots")
IPHONE = (1242, 2688)
IPAD = (2048, 2732)

NAVY = (0, 45, 114)         # #002D72 Mets royal blue
NAVY_DARK = (0, 31, 82)     # #001F52
AMBER = (255, 89, 16)       # #FF5910 Mets orange
GREEN = (34, 197, 94)
RED = (239, 68, 68)
GRAY = (107, 114, 128)
GRAY_LIGHT = (229, 231, 235)
GRAY_BG = (243, 244, 246)
WHITE = (255, 255, 255)
INK = (17, 24, 39)

# Font discovery (macOS)
FONT_PATHS = [
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial.ttf",
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for p in candidates:
        try:
            f = ImageFont.truetype(p, size)
            if bold:
                # Try a heavier variant
                try:
                    return ImageFont.truetype("/System/Library/Fonts/SFNSRounded.ttf", size)
                except Exception:
                    pass
            return f
        except Exception:
            continue
    return ImageFont.load_default()


# ---------------------------------------------------------------------------
# Drawing primitives
# ---------------------------------------------------------------------------

def rounded_rect(d, xy, radius, fill=None, outline=None, width=1):
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_status_bar(d, w: int, scale: float):
    """Faux iOS status bar (time + battery glyphs as text)."""
    h = int(60 * scale)
    fnt = font(int(36 * scale), bold=True)
    d.text((int(60 * scale), int(20 * scale)), "9:41", font=fnt, fill=INK)
    # right side: cellular / wifi / battery as text
    fnt2 = font(int(30 * scale))
    d.text((w - int(180 * scale), int(24 * scale)), "•••  ◊  ▮▮▮", font=fnt2, fill=INK)


def text_centered(d, text, y, w, fnt, fill=INK):
    bbox = d.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    d.text(((w - tw) // 2, y), text, font=fnt, fill=fill)


def gradient_header(img: Image.Image, height: int, top=NAVY, bottom=NAVY_DARK):
    w, _ = img.size
    base = Image.new("RGB", (1, height), top)
    for y in range(height):
        t = y / max(1, height - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        base.putpixel((0, y), (r, g, b))
    img.paste(base.resize((w, height)), (0, 0))


# ---------------------------------------------------------------------------
# Screen layouts — each function takes the canvas size and returns Image
# ---------------------------------------------------------------------------

def base_canvas(size, tagline: str, subtag: str = "", scale: float = 1.0) -> tuple[Image.Image, ImageDraw.ImageDraw, int]:
    """Returns (img, draw, content_top_y)."""
    w, h = size
    img = Image.new("RGB", size, GRAY_BG)
    header_h = int(560 * scale)
    gradient_header(img, header_h)
    d = ImageDraw.Draw(img)

    draw_status_bar(d, w, scale)

    # Tagline
    fnt = font(int(96 * scale), bold=True)
    text_centered(d, tagline, int(160 * scale), w, fnt, fill=WHITE)
    if subtag:
        fnt2 = font(int(46 * scale))
        text_centered(d, subtag, int(290 * scale), w, fnt2, fill=(200, 215, 245))

    # Brand pill: "Diamond Stats"
    pill_w, pill_h = int(420 * scale), int(80 * scale)
    px = (w - pill_w) // 2
    py = int(400 * scale)
    rounded_rect(d, (px, py, px + pill_w, py + pill_h), int(40 * scale), fill=AMBER)
    fnt3 = font(int(40 * scale), bold=True)
    text_centered(d, "DIAMOND STATS", int(py + 18 * scale), w, fnt3, fill=NAVY)

    return img, d, header_h


def screen_calculator(size, scale, verdict="bargain"):
    img, d, top = base_canvas(size, "Is he worth it?", "Convert WAR into dollars in seconds", scale)
    w, h = size
    margin = int(80 * scale)
    card_x = margin
    card_y = top + int(100 * scale)
    card_w = w - 2 * margin
    card_h = int(1700 * scale)
    rounded_rect(d, (card_x, card_y, card_x + card_w, card_y + card_h), int(48 * scale), fill=WHITE)

    y = card_y + int(60 * scale)
    label = font(int(40 * scale))
    val = font(int(72 * scale), bold=True)

    # WAR row
    d.text((card_x + int(60 * scale), y), "Projected WAR", font=label, fill=GRAY)
    d.text((card_x + int(60 * scale), y + int(50 * scale)), "5.4", font=val, fill=INK)
    # Salary row
    d.text((card_x + int(560 * scale), y), "Annual Salary", font=label, fill=GRAY)
    d.text((card_x + int(560 * scale), y + int(50 * scale)), "$22.0M", font=val, fill=INK)
    y += int(200 * scale)

    # Rate selector pills
    d.text((card_x + int(60 * scale), y), "$/WAR Rate", font=label, fill=GRAY)
    y += int(70 * scale)
    rates = [("Conservative", "$7M", False), ("Standard", "$9M", True), ("Premium", "$11M", False)]
    pill_w = (card_w - 2 * int(60 * scale) - 2 * int(20 * scale)) // 3
    pill_h = int(150 * scale)
    px = card_x + int(60 * scale)
    pfont_t = font(int(32 * scale))
    pfont_v = font(int(56 * scale), bold=True)
    for name, vstr, sel in rates:
        bg = NAVY if sel else GRAY_LIGHT
        fg = WHITE if sel else INK
        rounded_rect(d, (px, y, px + pill_w, y + pill_h), int(28 * scale), fill=bg)
        text_centered_in = font(int(32 * scale))
        bbox = d.textbbox((0, 0), name, font=pfont_t)
        d.text((px + (pill_w - (bbox[2] - bbox[0])) // 2, y + int(22 * scale)), name, font=pfont_t, fill=fg)
        bbox2 = d.textbbox((0, 0), vstr, font=pfont_v)
        d.text((px + (pill_w - (bbox2[2] - bbox2[0])) // 2, y + int(70 * scale)), vstr, font=pfont_v, fill=fg)
        px += pill_w + int(20 * scale)
    y += pill_h + int(80 * scale)

    # Result block
    if verdict == "bargain":
        market, surplus, pct, vlabel, vcolor = "$48.6M", "+$26.6M", "+121%", "BARGAIN", GREEN
    elif verdict == "overpay":
        market, surplus, pct, vlabel, vcolor = "$13.5M", "−$8.5M", "−39%", "OVERPAY", RED
    else:
        market, surplus, pct, vlabel, vcolor = "$24.3M", "+$2.3M", "+10%", "FAIR VALUE", AMBER

    d.text((card_x + int(60 * scale), y), "Market Value", font=label, fill=GRAY)
    d.text((card_x + int(60 * scale), y + int(50 * scale)), market, font=val, fill=INK)
    d.text((card_x + int(560 * scale), y), "Surplus", font=label, fill=GRAY)
    d.text((card_x + int(560 * scale), y + int(50 * scale)), surplus, font=val, fill=vcolor)
    y += int(200 * scale)

    # Verdict bar
    bar_h = int(220 * scale)
    rounded_rect(d, (card_x + int(40 * scale), y, card_x + card_w - int(40 * scale), y + bar_h), int(36 * scale), fill=vcolor)
    vfnt = font(int(96 * scale), bold=True)
    text_centered(d, vlabel, y + int(40 * scale), w, vfnt, fill=WHITE)
    pfnt = font(int(54 * scale), bold=True)
    text_centered(d, pct, y + int(140 * scale), w, pfnt, fill=WHITE)
    draw_footer(d, w, h, scale, "No ads  \u2022  No login  \u2022  No tracking")
    return img


def screen_search(size, scale):
    img, d, top = base_canvas(size, "Search active pros", "Live results, zero ads", scale)
    w, h = size
    margin = int(80 * scale)
    card_x = margin
    card_y = top + int(100 * scale)
    card_w = w - 2 * margin

    # Search bar
    sb_h = int(130 * scale)
    rounded_rect(d, (card_x, card_y, card_x + card_w, card_y + sb_h), int(30 * scale), fill=WHITE)
    sfnt = font(int(48 * scale))
    d.text((card_x + int(50 * scale), card_y + int(38 * scale)), "🔍  skenes", font=sfnt, fill=INK)

    # Result rows
    rows = [
        ("Paul Skenes", "RHP  ·  Age 24"),
        ("Jared Jones", "RHP  ·  Age 24"),
        ("Mitch Keller", "RHP  ·  Age 30"),
        ("Bailey Falter", "LHP  ·  Age 29"),
        ("Quinn Priester", "RHP  ·  Age 25"),
    ]
    y = card_y + sb_h + int(40 * scale)
    rh = int(180 * scale)
    name_f = font(int(60 * scale), bold=True)
    sub_f = font(int(38 * scale))
    for name, sub in rows:
        rounded_rect(d, (card_x, y, card_x + card_w, y + rh - int(20 * scale)), int(30 * scale), fill=WHITE)
        # avatar circle
        ax = card_x + int(50 * scale)
        ay = y + int(30 * scale)
        ar = int(100 * scale)
        d.ellipse((ax, ay, ax + ar, ay + ar), fill=NAVY)
        initials = "".join([p[0] for p in name.split()[:2]])
        ifnt = font(int(48 * scale), bold=True)
        ibox = d.textbbox((0, 0), initials, font=ifnt)
        d.text((ax + (ar - (ibox[2] - ibox[0])) // 2, ay + int(20 * scale)), initials, font=ifnt, fill=WHITE)
        d.text((ax + ar + int(40 * scale), y + int(40 * scale)), name, font=name_f, fill=INK)
        d.text((ax + ar + int(40 * scale), y + int(110 * scale)), sub, font=sub_f, fill=GRAY)
        y += rh
    draw_footer(d, w, size[1], scale, "Search any active pro player")
    return img


def screen_player_detail(size, scale):
    img, d, top = base_canvas(size, "WAR in dollars", "Per-player surplus, instantly", scale)
    w, h = size
    margin = int(80 * scale)
    card_x = margin
    card_y = top + int(100 * scale)
    card_w = w - 2 * margin

    # Header card
    rounded_rect(d, (card_x, card_y, card_x + card_w, card_y + int(380 * scale)), int(48 * scale), fill=WHITE)
    ax = card_x + int(60 * scale)
    ay = card_y + int(60 * scale)
    ar = int(260 * scale)
    d.ellipse((ax, ay, ax + ar, ay + ar), fill=NAVY)
    ifnt = font(int(120 * scale), bold=True)
    text_centered_local = "PS"
    ibox = d.textbbox((0, 0), text_centered_local, font=ifnt)
    d.text((ax + (ar - (ibox[2] - ibox[0])) // 2, ay + int(50 * scale)), text_centered_local, font=ifnt, fill=WHITE)

    nx = ax + ar + int(50 * scale)
    d.text((nx, ay + int(20 * scale)), "Paul Skenes", font=font(int(78 * scale), bold=True), fill=INK)
    d.text((nx, ay + int(120 * scale)), "RHP  ·  Age 24", font=font(int(46 * scale)), fill=GRAY)
    rounded_rect(d, (nx, ay + int(190 * scale), nx + int(220 * scale), ay + int(260 * scale)), int(20 * scale), fill=AMBER)
    d.text((nx + int(40 * scale), ay + int(200 * scale)), "★  FAVORITE", font=font(int(32 * scale), bold=True), fill=NAVY)

    # Stat grid
    sy = card_y + int(420 * scale)
    grid = [
        ("ERA", "1.94"),
        ("W–L", "12 – 4"),
        ("WHIP", "0.96"),
        ("K", "188"),
        ("IP", "162.0"),
        ("WAR", "5.4"),
    ]
    cols = 3
    cw = card_w // cols
    rh = int(220 * scale)
    for i, (k, v) in enumerate(grid):
        cx = card_x + (i % cols) * cw
        cy = sy + (i // cols) * rh
        rounded_rect(d, (cx + int(15 * scale), cy + int(15 * scale), cx + cw - int(15 * scale), cy + rh - int(15 * scale)), int(28 * scale), fill=WHITE)
        d.text((cx + int(50 * scale), cy + int(40 * scale)), k, font=font(int(40 * scale)), fill=GRAY)
        d.text((cx + int(50 * scale), cy + int(95 * scale)), v, font=font(int(80 * scale), bold=True), fill=INK)

    # Value bar
    vy = sy + 2 * rh + int(40 * scale)
    rounded_rect(d, (card_x, vy, card_x + card_w, vy + int(280 * scale)), int(36 * scale), fill=NAVY)
    text_centered(d, "Open-Market Value @ $9M/WAR", vy + int(40 * scale), w, font(int(40 * scale)), fill=(200, 215, 245))
    text_centered(d, "$48.6M", vy + int(110 * scale), w, font(int(140 * scale), bold=True), fill=AMBER)
    draw_footer(d, w, h, scale, "Tap any player to see their dollar value")
    return img


def screen_compare(size, scale):
    img, d, top = base_canvas(size, "Head to head", "Side-by-side, winner highlighted", scale)
    w, h = size
    margin = int(80 * scale)
    card_x = margin
    card_y = top + int(100 * scale)
    card_w = w - 2 * margin

    # Two player headers
    half = (card_w - int(40 * scale)) // 2
    for i, (name, sub, accent) in enumerate([
        ("J. Soto", "OF  ·  Age 27", NAVY),
        ("A. Judge", "OF  ·  Age 33", AMBER),
    ]):
        x = card_x + i * (half + int(40 * scale))
        rounded_rect(d, (x, card_y, x + half, card_y + int(300 * scale)), int(40 * scale), fill=WHITE)
        ax = x + (half - int(180 * scale)) // 2
        d.ellipse((ax, card_y + int(40 * scale), ax + int(180 * scale), card_y + int(220 * scale)), fill=accent)
        initials = "".join([p[0] for p in name.replace(".", "").split()[:2]])
        ifnt = font(int(72 * scale), bold=True)
        ibox = d.textbbox((0, 0), initials, font=ifnt)
        d.text((ax + (int(180 * scale) - (ibox[2] - ibox[0])) // 2, card_y + int(80 * scale)), initials, font=ifnt, fill=WHITE)
        nfnt = font(int(56 * scale), bold=True)
        nbox = d.textbbox((0, 0), name, font=nfnt)
        d.text((x + (half - (nbox[2] - nbox[0])) // 2, card_y + int(240 * scale)), name, font=nfnt, fill=INK)

    # Stat rows
    sy = card_y + int(360 * scale)
    rows = [
        ("AVG", "0.288", "0.265", 0),
        ("HR",  "31",    "37",    1),
        ("RBI", "92",    "104",   1),
        ("OPS", "0.945", "0.972", 1),
        ("WAR", "5.1",   "6.4",   1),
        ("$M",  "$45.9", "$57.6", 1),
    ]
    rh = int(170 * scale)
    for k, vL, vR, winner in rows:
        rounded_rect(d, (card_x, sy, card_x + card_w, sy + rh - int(15 * scale)), int(26 * scale), fill=WHITE)
        d.text((card_x + (card_w - int(80 * scale)) // 2 - int(40 * scale), sy + int(50 * scale)),
               k, font=font(int(46 * scale), bold=True), fill=GRAY)
        # left value
        lf = font(int(64 * scale), bold=True)
        lcolor = GREEN if winner == 0 else INK
        d.text((card_x + int(80 * scale), sy + int(40 * scale)), vL, font=lf, fill=lcolor)
        rcolor = GREEN if winner == 1 else INK
        rbox = d.textbbox((0, 0), vR, font=lf)
        d.text((card_x + card_w - int(80 * scale) - (rbox[2] - rbox[0]), sy + int(40 * scale)), vR, font=lf, fill=rcolor)
        sy += rh
    draw_footer(d, w, h, scale, "Compare any two players, head to head")
    return img


def screen_live(size, scale):
    img, d, top = base_canvas(size, "Today's matchups", "Live score, no clutter", scale)
    w, h = size
    margin = int(80 * scale)
    card_x = margin
    card_y = top + int(100 * scale)
    card_w = w - 2 * margin

    games = [
        ("New York", "Boston", "5", "3", "FINAL"),
        ("Los Angeles", "San Francisco", "2", "2", "7th"),
        ("Atlanta", "Philadelphia", "0", "1", "3rd"),
        ("Houston", "Seattle", "—", "—", "7:10 PM"),
    ]
    rh = int(360 * scale)
    y = card_y
    for away, home, sa, sh, status in games:
        rounded_rect(d, (card_x, y, card_x + card_w, y + rh - int(30 * scale)), int(36 * scale), fill=WHITE)
        # status pill
        rounded_rect(d, (card_x + int(40 * scale), y + int(40 * scale), card_x + int(280 * scale), y + int(110 * scale)), int(20 * scale), fill=GRAY_LIGHT)
        sfnt = font(int(36 * scale), bold=True)
        sbox = d.textbbox((0, 0), status, font=sfnt)
        d.text((card_x + int(40 * scale) + (240 * scale - (sbox[2] - sbox[0])) // 2, y + int(50 * scale)), status, font=sfnt, fill=INK)
        # rows
        team_f = font(int(64 * scale), bold=True)
        score_f = font(int(96 * scale), bold=True)
        d.text((card_x + int(60 * scale), y + int(150 * scale)), away, font=team_f, fill=INK)
        sb1 = d.textbbox((0, 0), sa, font=score_f)
        d.text((card_x + card_w - int(80 * scale) - (sb1[2] - sb1[0]), y + int(135 * scale)), sa, font=score_f, fill=NAVY if sa == sh else (NAVY if sa > sh else GRAY))
        d.text((card_x + int(60 * scale), y + int(240 * scale)), home, font=team_f, fill=INK)
        sb2 = d.textbbox((0, 0), sh, font=score_f)
        d.text((card_x + card_w - int(80 * scale) - (sb2[2] - sb2[0]), y + int(225 * scale)), sh, font=score_f, fill=NAVY if sa == sh else (NAVY if sh > sa else GRAY))
        y += rh
    draw_footer(d, w, h, scale, "Refreshes on demand. No background tracking.")
    return img


def screen_features(size, scale):
    img, d, top = base_canvas(size, "Built for fans", "No ads. No login. No tracking.", scale)
    w, h = size
    margin = int(80 * scale)
    card_x = margin
    card_y = top + int(100 * scale)
    card_w = w - 2 * margin

    items = [
        ("$",  "WAR-to-Dollars Calculator",  "Custom $/WAR rate"),
        ("⚖",  "Head-to-Head Comparator",    "Winner-highlighted stats"),
        ("◎",  "Live Scores & Standings",    "Refresh on demand"),
        ("★",  "Favorites",                   "One-tap watchlist"),
        ("⌬",  "iPhone & iPad",              "Native, optimized UI"),
        ("✓",  "Privacy-First",              "Zero analytics, zero ads"),
    ]
    rh = int(280 * scale)
    y = card_y
    for icon, title, sub in items:
        rounded_rect(d, (card_x, y, card_x + card_w, y + rh - int(30 * scale)), int(36 * scale), fill=WHITE)
        # icon circle
        ix = card_x + int(50 * scale)
        iy = y + int(50 * scale)
        ir = int(150 * scale)
        d.ellipse((ix, iy, ix + ir, iy + ir), fill=NAVY)
        ifnt = font(int(96 * scale), bold=True)
        ibox = d.textbbox((0, 0), icon, font=ifnt)
        d.text((ix + (ir - (ibox[2] - ibox[0])) // 2, iy + int(15 * scale)), icon, font=ifnt, fill=AMBER)
        d.text((ix + ir + int(50 * scale), y + int(70 * scale)), title, font=font(int(64 * scale), bold=True), fill=INK)
        d.text((ix + ir + int(50 * scale), y + int(150 * scale)), sub, font=font(int(42 * scale)), fill=GRAY)
        y += rh
    return img

def draw_footer(d, w: int, h: int, scale: float, text: str):
    fnt = font(int(40 * scale))
    bbox = d.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    d.text(((w - tw) // 2, h - int(110 * scale)), text, font=fnt, fill=GRAY)

# ---------------------------------------------------------------------------
# Render
# ---------------------------------------------------------------------------

SCREENS = [
    ("01_calculator_bargain", lambda s, sc: screen_calculator(s, sc, "bargain")),
    ("02_search",             lambda s, sc: screen_search(s, sc)),
    ("03_player_detail",      lambda s, sc: screen_player_detail(s, sc)),
    ("04_compare",            lambda s, sc: screen_compare(s, sc)),
    ("05_live_games",         lambda s, sc: screen_live(s, sc)),
    ("06_features",           lambda s, sc: screen_features(s, sc)),
]


def render_set(out_dir: Path, size, scale: float):
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, fn in SCREENS:
        img = fn(size, scale)
        path = out_dir / f"{name}.png"
        img.save(path, "PNG", optimize=True)
        print(f"  wrote {path} ({size[0]}x{size[1]})")


def main():
    OUT.mkdir(exist_ok=True)
    print("=== iPhone 6.5\" (1242x2688) ===")
    render_set(OUT / "iphone65", IPHONE, scale=1.0)
    print("\n=== iPad Pro 12.9\" (2048x2732) ===")
    # iPad uses scale 1.5 to fill the wider canvas naturally
    render_set(OUT / "ipad129", IPAD, scale=1.55)
    print(f"\n✅ Done. Open {OUT.resolve()} to preview.")


if __name__ == "__main__":
    main()
