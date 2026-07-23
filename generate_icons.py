#!/usr/bin/env python3
"""Generate modern PWA icons for the PMP quiz app (requires Pillow)."""

import os
import math
from PIL import Image, ImageDraw, ImageFont

ICON_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')

# Colour palette
C_TOP    = (49,  46, 129)   # #312e81 deep indigo
C_MID    = (79,  70, 229)   # #4f46e5 indigo
C_BOT    = (124, 58, 237)   # #7c3aed violet
C_WHITE  = (255, 255, 255)
C_GLOW   = (255, 255, 255)  # inner glow colour


def _lerp_color(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _make_icon(size: int) -> Image.Image:
    img = Image.new('RGB', (size, size))
    px  = img.load()

    # ── Diagonal gradient background ────────────────────────────────────────
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size - 2)           # 0 (top-left) → 1 (bottom-right)
            if t < 0.5:
                c = _lerp_color(C_TOP, C_MID, t * 2)
            else:
                c = _lerp_color(C_MID, C_BOT, (t - 0.5) * 2)
            px[x, y] = c

    draw = ImageDraw.Draw(img, 'RGBA')
    cx, cy = size // 2, size // 2

    # ── Subtle radial glow in centre ────────────────────────────────────────
    glow_r = int(size * 0.45)
    for step in range(glow_r, 0, -1):
        alpha = int(18 * (1 - step / glow_r) ** 2)
        draw.ellipse(
            [cx - step, cy - step, cx + step, cy + step],
            fill=(*C_GLOW, alpha),
        )

    # ── Concentric ring accent ───────────────────────────────────────────────
    ring_r  = int(size * 0.40)
    ring_lw = max(1, size // 60)
    draw.ellipse(
        [cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
        outline=(*C_WHITE, 50),
        width=ring_lw,
    )
    ring_r2 = int(size * 0.46)
    draw.ellipse(
        [cx - ring_r2, cy - ring_r2, cx + ring_r2, cy + ring_r2],
        outline=(*C_WHITE, 20),
        width=ring_lw,
    )

    # ── "PMP" text ──────────────────────────────────────────────────────────
    font_size = max(8, int(size * 0.30))
    font = None
    for path in [
        r'C:\Windows\Fonts\arialbd.ttf',
        r'C:\Windows\Fonts\calibrib.ttf',
        r'C:\Windows\Fonts\verdanab.ttf',
        r'C:\Windows\Fonts\trebucbd.ttf',
    ]:
        try:
            font = ImageFont.truetype(path, font_size)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    text = 'PMP'
    bb   = draw.textbbox((0, 0), text, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    tx = cx - tw // 2 - bb[0]
    ty = cy - th // 2 - bb[1] - int(size * 0.02)   # slight upward nudge

    # Drop shadow
    sd = max(1, size // 80)
    draw.text((tx + sd, ty + sd), text, font=font, fill=(0, 0, 0, 80))
    # Main white text
    draw.text((tx, ty), text, font=font, fill=(*C_WHITE, 255))

    return img


def main():
    os.makedirs(ICON_DIR, exist_ok=True)

    specs = [
        ('icon-192.png',        192),
        ('icon-512.png',        512),
        ('apple-touch-icon.png', 180),
    ]

    for filename, size in specs:
        path = os.path.join(ICON_DIR, filename)
        img  = _make_icon(size)
        img.save(path, 'PNG', optimize=True)
        print(f'  ✓ {filename} ({size}×{size})')

    print('\nIcons generated in:', ICON_DIR)


if __name__ == '__main__':
    main()
