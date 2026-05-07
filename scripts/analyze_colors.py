"""Analyze colors in the source LOGO.jpg to understand the checker pattern."""
from PIL import Image
from collections import Counter

SOURCE = r"C:\Users\Edgar Lovera\OneDrive\Desktop\LOGO.jpg"

img = Image.open(SOURCE).convert("RGB")
w, h = img.size
print(f"Size: {w}x{h}")

# Sample pixels from various locations
samples = {
    "top-left corner (checker)": (50, 50),
    "top-right corner (checker)": (w - 50, 50),
    "bottom-left (checker)": (50, h - 50),
    "near top edge - checker": (200, 100),
    "near top edge 2 - checker": (250, 100),
    "near bottom edge - checker": (200, h - 100),
    "center (logo area)": (w // 2, h // 2),
    "robot face area": (w // 2, h // 4),
}

for label, (x, y) in samples.items():
    px = img.getpixel((x, y))
    print(f"{label} ({x},{y}): RGB={px}")

# Count most common colors
print("\nMost common colors:")
pixels = list(img.getdata())
counter = Counter(pixels)
for color, count in counter.most_common(15):
    pct = 100 * count / len(pixels)
    print(f"  RGB{color}: {count} pixels ({pct:.1f}%)")
