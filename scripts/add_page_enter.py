"""
Add the `page-enter` class to the root <div> of each page so all pages
inherit the fade-in / slide-up mount animation defined in index.css.

Idempotent: skips files that already have the class.
"""
import os
import re

PAGES_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'src', 'pages'))

# Pages whose root div should receive `page-enter`. Login already has its own
# centered layout, so we don't touch it here (but we still tag its inner card).
TARGETS = {
    'Agents.tsx':           ('flex flex-col gap-6 h-full pb-8',         'page-enter flex flex-col gap-6 h-full pb-8'),
    'Candidates.tsx':       ('flex flex-col gap-6 h-full pb-8',         'page-enter flex flex-col gap-6 h-full pb-8'),
    'Dashboard.tsx':        ('flex flex-col gap-6 w-full min-h-full pb-8', 'page-enter flex flex-col gap-6 w-full min-h-full pb-8'),
    'Jobs.tsx':             ('flex flex-col gap-6',                     'page-enter flex flex-col gap-6'),
    'Messages.tsx':         ('flex h-[calc(100vh-6rem)] gap-4 overflow-hidden', 'page-enter flex h-[calc(100vh-6rem)] gap-4 overflow-hidden'),
    'Reports.tsx':          ('flex flex-col gap-6',                     'page-enter flex flex-col gap-6'),
    'Settings.tsx':         ('flex flex-col gap-6 max-w-5xl',           'page-enter flex flex-col gap-6 max-w-5xl'),
    'WhatsAppAccounts.tsx': ('flex flex-col gap-6 h-full pb-8',         'page-enter flex flex-col gap-6 h-full pb-8'),
}


def main():
    for fname, (old, new) in TARGETS.items():
        path = os.path.join(PAGES_DIR, fname)
        if not os.path.exists(path):
            print(f'  SKIP (missing): {fname}')
            continue
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()
        if 'page-enter' in text and new in text:
            print(f'  already done: {fname}')
            continue
        target = f'<div className="{old}">'
        replacement = f'<div className="{new}">'
        if target not in text:
            print(f'  PATTERN NOT FOUND in {fname} (looked for: {target!r})')
            continue
        # Replace only the FIRST occurrence (the page root) — pages may reuse
        # the same className lower down for nested containers.
        new_text = text.replace(target, replacement, 1)
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(new_text)
        print(f'  patched: {fname}')


if __name__ == '__main__':
    main()
