#!/usr/bin/env python3
"""Generate PWA icons for the PMP quiz app (run once from pmp-app/ directory)."""

import os
import struct
import zlib

ICON_DIR = os.path.join(os.path.dirname(__file__), 'icons')


def _make_png(size: int, bg_rgb=(67, 56, 202), fg_rgb=(255, 255, 255)) -> bytes:
    """Create a minimal solid-color PNG with a centred 'P' glyph using pure stdlib."""
    w = h = size

    # Tiny 5x7 pixel-art glyphs for P, M, P
    def glyph_P():
        return [
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,1,1,1,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
        ]

    def glyph_M():
        return [
            [1,0,0,0,1],
            [1,1,0,1,1],
            [1,0,1,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
        ]

    scale = max(1, size // 36)
    glyph_w = 5 * scale
    glyph_h = 7 * scale
    gap = scale * 2

    glyphs = [glyph_P(), glyph_M(), glyph_P()]
    total_w = glyph_w * 3 + gap * 2
    total_h = glyph_h
    ox = (w - total_w) // 2
    oy = (h - total_h) // 2

    # Build pixel grid (RGB tuples)
    pixels = [[bg_rgb] * w for _ in range(h)]

    for gi, g in enumerate(glyphs):
        gx_off = ox + gi * (glyph_w + gap)
        for row_idx, row in enumerate(g):
            for col_idx, on in enumerate(row):
                if on:
                    for dr in range(scale):
                        for dc in range(scale):
                            py = oy + row_idx * scale + dr
                            px = gx_off + col_idx * scale + dc
                            if 0 <= py < h and 0 <= px < w:
                                pixels[py][px] = fg_rgb

    # Encode as PNG
    raw_rows = bytearray()
    for row in pixels:
        raw_rows.append(0)  # filter byte (None)
        for r, g_, b in row:
            raw_rows += bytes([r, g_, b])

    def chunk(name: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(name + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', crc)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(bytes(raw_rows), 9))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend


def main():
    os.makedirs(ICON_DIR, exist_ok=True)

    specs = [
        ('icon-192.png', 192),
        ('icon-512.png', 512),
        ('apple-touch-icon.png', 180),
    ]

    for filename, size in specs:
        path = os.path.join(ICON_DIR, filename)
        data = _make_png(size)
        with open(path, 'wb') as f:
            f.write(data)
        print(f'  ✓ {filename} ({size}×{size})')

    print('\nIcons generated in:', ICON_DIR)


if __name__ == '__main__':
    main()
