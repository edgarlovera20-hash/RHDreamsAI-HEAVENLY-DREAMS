"""
Bulk swap of the cyan accent palette to blue across all source files.
Only touches src/ — does NOT modify package files, configs, public assets,
or scripts/.
"""
from __future__ import annotations
import os
import re

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'src'))
EXTENSIONS = ('.tsx', '.ts', '.css', '.html')

# Tailwind class swaps (longer-shade variants first so we don't partial-match).
CLASS_SHADES = ['950', '900', '800', '700', '600', '500', '400', '300', '200', '100', '50']

# Raw RGBA replacements for cases where cyan is referenced as a literal value.
RGBA_SWAPS = [
    # cyan-500 -> blue-500
    (re.compile(r'rgba\(\s*6\s*,\s*182\s*,\s*212\s*,'), 'rgba(59,130,246,'),
    # cyan-400 -> blue-400
    (re.compile(r'rgba\(\s*34\s*,\s*211\s*,\s*238\s*,'), 'rgba(96,165,250,'),
    # cyan-600 -> blue-600
    (re.compile(r'rgba\(\s*8\s*,\s*145\s*,\s*178\s*,'), 'rgba(37,99,235,'),
    # cyan-300 -> blue-300
    (re.compile(r'rgba\(\s*103\s*,\s*232\s*,\s*249\s*,'), 'rgba(147,197,253,'),
    # also accept hex variants used directly inline
    (re.compile(r'#06b6d4', re.IGNORECASE), '#3b82f6'),  # cyan-500 -> blue-500
    (re.compile(r'#22d3ee', re.IGNORECASE), '#60a5fa'),  # cyan-400 -> blue-400
    (re.compile(r'#0891b2', re.IGNORECASE), '#2563eb'),  # cyan-600 -> blue-600
    (re.compile(r'#67e8f9', re.IGNORECASE), '#93c5fd'),  # cyan-300 -> blue-300
]


def transform(text: str) -> tuple[str, int]:
    n = 0
    for shade in CLASS_SHADES:
        old = f'cyan-{shade}'
        new = f'blue-{shade}'
        count = text.count(old)
        if count:
            text = text.replace(old, new)
            n += count
    for pattern, replacement in RGBA_SWAPS:
        text, c = pattern.subn(replacement, text)
        n += c
    return text, n


def main():
    total_files = 0
    total_changes = 0
    for dirpath, _, filenames in os.walk(ROOT):
        for fname in filenames:
            if not fname.endswith(EXTENSIONS):
                continue
            path = os.path.join(dirpath, fname)
            with open(path, 'r', encoding='utf-8') as f:
                original = f.read()
            updated, n = transform(original)
            if n > 0 and updated != original:
                with open(path, 'w', encoding='utf-8', newline='') as f:
                    f.write(updated)
                rel = os.path.relpath(path, ROOT)
                print(f'  {rel}: {n} replacements')
                total_files += 1
                total_changes += n

    print(f'\nDone. Edited {total_files} files, {total_changes} total replacements.')


if __name__ == '__main__':
    main()
