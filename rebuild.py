#!/usr/bin/env python3
"""
rebuild.py — reads source files from src/ and rebuilds demo.html.

Usage:
  python3 rebuild.py

How it works:
  - src/levels/*.js   are concatenated (sorted by filename) and prepended
                      to src/game.js, then bundled as the game entry
  - src/app.js        replaces the app-shell entry
  - src/characters/fox.js  replaces the fox entry
  - All other bundle entries (React, Babel, fonts, etc.) are untouched.
"""

import json, base64, gzip, re, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

def gz_encode(text):
    return base64.b64encode(gzip.compress(text.encode('utf-8'), compresslevel=9)).decode()

def read(path):
    with open(os.path.join(ROOT, path), 'r', encoding='utf-8') as f:
        return f.read()

# UUID → source file mapping for single-file entries
SIMPLE_MAP = {
    'afcd167f-8138-4304-a135-3fbcecb4fd8a': 'src/app.js',
    '43149a3b-75d0-4ea0-801e-816a01469f65': 'src/characters/fox.js',
}

# The game bundle UUID — levels/*.js are prepended to game.js
GAME_UUID = '61428d28-9be3-4c65-9db2-8134be2835a3'

def main():
    html_path = os.path.join(ROOT, 'demo.html')
    html = open(html_path, 'r', encoding='utf-8').read()

    # Extract the manifest block
    m = re.search(r'(<script type="__bundler/manifest">)([\s\S]*?)(</script>)', html)
    if not m:
        print('ERROR: __bundler/manifest script tag not found in demo.html')
        sys.exit(1)

    manifest = json.loads(m.group(2))

    # Update simple 1-to-1 source files
    for uuid, src_path in SIMPLE_MAP.items():
        content = read(src_path)
        manifest[uuid]['data'] = gz_encode(content)
        print(f'  updated  {src_path}')

    # Build game bundle: levels (sorted) + game.js
    levels_dir = os.path.join(ROOT, 'src', 'levels')
    level_files = sorted(f for f in os.listdir(levels_dir) if f.endswith('.js'))
    level_code = ''
    for lf in level_files:
        level_code += read(os.path.join('src', 'levels', lf)) + '\n'
        print(f'  included src/levels/{lf}')
    game_code = read('src/game.js')
    combined = level_code + game_code
    manifest[GAME_UUID]['data'] = gz_encode(combined)
    print(f'  updated  src/game.js  (+ {len(level_files)} level file(s))')

    # Write updated manifest back into demo.html
    new_manifest_json = json.dumps(manifest, separators=(',', ':'))
    new_html = html[:m.start()] + m.group(1) + new_manifest_json + m.group(3) + html[m.end():]

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_html)

    print(f'\n✓  demo.html rebuilt  ({len(new_html):,} bytes)')

if __name__ == '__main__':
    main()
