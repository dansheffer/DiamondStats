#!/usr/bin/env python3
"""Build icon.png and splash.png from the user-provided ds2.png logo."""

from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOGO = Path("/Users/dsheffer/Downloads/ds2.png")
NAVY = (10, 28, 64)


def fit_logo(canvas_size, pct=0.85):
    cw, ch = canvas_size
    canvas = Image.new("RGB", canvas_size, NAVY)
    logo = Image.open(LOGO).convert("RGB")
    lw, lh = logo.size
    target = int(min(cw, ch) * pct)
    scale = target / max(lw, lh)
    new = (int(lw * scale), int(lh * scale))
    logo = logo.resize(new, Image.LANCZOS)
    x = (cw - new[0]) // 2
    y = (ch - new[1]) // 2
    canvas.paste(logo, (x, y))
    return canvas


def main():
    icon = fit_logo((1024, 1024), pct=0.95)
    icon.save(ROOT / "assets" / "icon.png", "PNG")
    print(f"icon   → assets/icon.png  {icon.size} {icon.mode}")

    splash = fit_logo((1284, 2778), pct=0.80)
    splash.save(ROOT / "assets" / "splash.png", "PNG")
    print(f"splash → assets/splash.png {splash.size} {splash.mode}")
    print("Done.")


if __name__ == "__main__":
    main()
