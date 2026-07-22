#!/usr/bin/env python3
"""Regenerate Android launcher/adaptive icon assets from the production Allio brand mark.

Source of truth: public/allio-icon-mark.jpg (high-res square mark on near-white background).
Run with: /tmp/iconenv/bin/python3 scripts/generate-android-icons.py  (or any Python 3 + Pillow env)
"""
import os
from PIL import Image, ImageDraw

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(REPO_ROOT, "public", "allio-icon-mark.jpg")
RES_DIR = os.path.join(REPO_ROOT, "android", "app", "src", "main", "res")

# density -> legacy launcher icon px size (48dp base)
LEGACY_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# density -> adaptive icon canvas px size (108dp base)
ADAPTIVE_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

# Fraction of the 108dp adaptive canvas the mark should occupy so it survives
# circle/squircle/rounded-square masking on every launcher (Android's safe
# zone is the inner 66dp of the 108dp canvas).
SAFE_ZONE_FRACTION = 66 / 108

BG_DISTANCE_THRESHOLD = 18  # euclidean-ish distance in 0-255 channel space


def load_source():
    im = Image.open(SOURCE).convert("RGBA")
    return im


def sample_background_color(im):
    w, h = im.size
    pts = [
        (2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3),
        (w // 2, 2), (2, h // 2), (w - 3, h // 2), (w // 2, h - 3),
    ]
    r = sum(im.getpixel(p)[0] for p in pts) / len(pts)
    g = sum(im.getpixel(p)[1] for p in pts) / len(pts)
    b = sum(im.getpixel(p)[2] for p in pts) / len(pts)
    return (round(r), round(g), round(b))


def mark_bbox_and_cutout(im, bg):
    """Return (bbox, rgba_cutout) where background pixels are made transparent."""
    w, h = im.size
    px = im.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    outpx = out.load()
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            dist = ((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2) ** 0.5
            if dist > BG_DISTANCE_THRESHOLD:
                outpx[x, y] = (r, g, b, 255)
                if x < minx: minx = x
                if y < miny: miny = y
                if x > maxx: maxx = x
                if y > maxy: maxy = y
            else:
                outpx[x, y] = (0, 0, 0, 0)
    return (minx, miny, maxx + 1, maxy + 1), out


def build_foreground(cutout, bbox, canvas_size):
    mark = cutout.crop(bbox)
    mark_w, mark_h = mark.size
    target = round(canvas_size * SAFE_ZONE_FRACTION)
    scale = target / max(mark_w, mark_h)
    new_w, new_h = max(1, round(mark_w * scale)), max(1, round(mark_h * scale))
    mark_resized = mark.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    ox = (canvas_size - new_w) // 2
    oy = (canvas_size - new_h) // 2
    canvas.paste(mark_resized, (ox, oy), mark_resized)
    return canvas


def build_legacy_square(im, size):
    return im.convert("RGBA").resize((size, size), Image.LANCZOS)


def build_legacy_round(im, size):
    square = im.convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(square, (0, 0), mask)
    return out


def main():
    im = load_source()
    bg = sample_background_color(im)
    print(f"Sampled background color: rgb{bg}")

    bbox, cutout = mark_bbox_and_cutout(im, bg)
    print(f"Mark bounding box: {bbox}")

    for density, size in LEGACY_SIZES.items():
        d = os.path.join(RES_DIR, density)
        build_legacy_square(im, size).save(os.path.join(d, "ic_launcher.png"))
        build_legacy_round(im, size).save(os.path.join(d, "ic_launcher_round.png"))

    for density, size in ADAPTIVE_SIZES.items():
        d = os.path.join(RES_DIR, density)
        fg = build_foreground(cutout, bbox, size)
        fg.save(os.path.join(d, "ic_launcher_foreground.png"))

    print("Done generating Android launcher + adaptive icon assets.")
    print(f"Suggested ic_launcher_background color: #{bg[0]:02X}{bg[1]:02X}{bg[2]:02X}")


if __name__ == "__main__":
    main()
