"""
Make the black background outside the circular HD logo transparent.
Keep the blue circle intact. Resize for web use.
"""
from PIL import Image
import os

SOURCE = r"C:\Users\Edgar Lovera\OneDrive\Desktop\Sin título (2000 x 2000 px).png"
OUT_PUBLIC = r"C:\Users\Edgar Lovera\OneDrive\Desktop\rhdreams\public\logo.png"
OUT_ASSETS = r"C:\Users\Edgar Lovera\OneDrive\Desktop\rhdreams\src\assets\logo.png"

# Final web-friendly size for the logo
TARGET_SIZE = 512

# Any pixel darker than this is treated as background black.
# The blue circle has no near-black pixels, so we can be aggressive.
DARK_THRESHOLD = 30


def is_background_black(r, g, b):
    """Pure black or very dark pixel = background."""
    return r < DARK_THRESHOLD and g < DARK_THRESHOLD and b < DARK_THRESHOLD


def process_logo():
    img = Image.open(SOURCE).convert("RGBA")
    width, height = img.size
    print(f"Source size: {width}x{height}")

    pixels = img.load()
    transparent_count = 0
    total = width * height

    for y in range(height):
        for x in range(width):
            r, g, b, _ = pixels[x, y]
            if is_background_black(r, g, b):
                pixels[x, y] = (0, 0, 0, 0)
                transparent_count += 1

    print(
        f"Made {transparent_count}/{total} pixels transparent "
        f"({100*transparent_count/total:.1f}%)"
    )

    # Trim transparent border
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        print(f"Cropped to: {img.size}")

    # Resize for web (preserve aspect ratio, fit in TARGET_SIZE x TARGET_SIZE)
    img.thumbnail((TARGET_SIZE, TARGET_SIZE), Image.LANCZOS)
    print(f"Resized to: {img.size}")

    os.makedirs(os.path.dirname(OUT_PUBLIC), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_ASSETS), exist_ok=True)

    img.save(OUT_PUBLIC, "PNG", optimize=True)
    img.save(OUT_ASSETS, "PNG", optimize=True)
    print(f"Saved: {OUT_PUBLIC}")
    print(f"Saved: {OUT_ASSETS}")


if __name__ == "__main__":
    process_logo()
