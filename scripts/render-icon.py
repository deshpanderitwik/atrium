#!/usr/bin/env python3
"""Render assets/icon.png (1024², opaque, as iOS wants) from the shapes in
assets/icon.svg: a near-black field, the oculus, and its pool of light.
Anti-aliased by 4× supersampling. No dependencies beyond numpy.

    python3 scripts/render-icon.py
"""

import struct
import zlib
from pathlib import Path

import numpy as np

SIZE, SS = 1024, 4
BG = (0x0E, 0x0D, 0x0C)
ORANGE = (0xFF, 0x6A, 0x2B)
# Keep in step with assets/icon.svg.
CIRCLE = (512, 263, 117)  # cx, cy, r
ELLIPSE = (512, 805, 249, 66)  # cx, cy, rx, ry

n = SIZE * SS
y, x = np.mgrid[0:n, 0:n].astype(np.float64)
x = (x + 0.5) / SS
y = (y + 0.5) / SS
cx, cy, r = CIRCLE
ex, ey, rx, ry = ELLIPSE
inside = ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) | (((x - ex) / rx) ** 2 + ((y - ey) / ry) ** 2 <= 1)
cover = inside.reshape(SIZE, SS, SIZE, SS).mean(axis=(1, 3))

img = np.empty((SIZE, SIZE, 3), dtype=np.uint8)
for c in range(3):
    img[..., c] = np.round(BG[c] + (ORANGE[c] - BG[c]) * cover).astype(np.uint8)

raw = b"".join(b"\x00" + img[row].tobytes() for row in range(SIZE))
def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
out = Path(__file__).resolve().parent.parent / "assets" / "icon.png"
out.write_bytes(png)
print(f"wrote {out} ({len(png)} bytes)")
