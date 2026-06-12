#!/usr/bin/env python3
"""
rebuild.py — reads source files from src/ and rebuilds demo.html.

Usage:
  python3 rebuild.py

How it works:
  - src/template.html replaces the __bundler/template tag
  - src/levels/*.js   are concatenated (sorted by filename) and prepended
                      to src/game.js, then bundled as the game entry
  - src/app.js        replaces the app-shell entry
  - src/characters/fox.js  replaces the fox entry
  - src/audio/level_N.mp3  (N = level number) are embedded as raw base64
                      in the manifest; ext_resources maps them so the
                      runtime exposes window.__resources['levelN-music']
  - All other bundle entries (React, Babel, fonts, etc.) are untouched.
"""

import json, base64, gzip, re, os, sys, uuid as uuidlib

ROOT = os.path.dirname(os.path.abspath(__file__))

def gz_encode(text):
    return base64.b64encode(gzip.compress(text.encode('utf-8'), compresslevel=9)).decode()

def raw_b64(path):
    """Base64-encode a binary file without gzip (for already-compressed formats)."""
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode()

def read(path):
    with open(os.path.join(ROOT, path), 'r', encoding='utf-8') as f:
        return f.read()

def audio_uuid(level_n):
    """Deterministic UUID for a level's audio asset (stable across rebuilds)."""
    return str(uuidlib.uuid5(uuidlib.NAMESPACE_DNS, f'linerunner.level{level_n}.music'))

AUDIO_MIME = {
    'mp3': 'audio/mpeg',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
}

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

    # Embed audio files — src/audio/level_N.ext
    audio_dir = os.path.join(ROOT, 'src', 'audio')
    ext_audio = []  # [{id, uuid}] for ext_resources
    if os.path.isdir(audio_dir):
        for fname in sorted(os.listdir(audio_dir)):
            am = re.match(r'^level_(\d+)\.(\w+)$', fname, re.IGNORECASE)
            if not am:
                continue
            level_n = int(am.group(1))
            ext = am.group(2).lower()
            mime = AUDIO_MIME.get(ext)
            if not mime:
                print(f'  skipped  src/audio/{fname}  (unsupported format)')
                continue
            auid = audio_uuid(level_n)
            audio_b64 = raw_b64(os.path.join(audio_dir, fname))
            # Add/overwrite entry in manifest (raw base64, not gzip)
            manifest[auid] = {'data': audio_b64, 'mime': mime, 'compressed': False}
            ext_audio.append({'id': f'level{level_n}-music', 'uuid': auid})
            size_kb = os.path.getsize(os.path.join(audio_dir, fname)) // 1024
            print(f'  bundled  src/audio/{fname}  ({size_kb} KB)  → {auid}')

    # Write updated manifest back into demo.html
    new_manifest_json = json.dumps(manifest, separators=(',', ':'))
    new_html = html[:m.start()] + m.group(1) + new_manifest_json + m.group(3) + html[m.end():]

    # Patch ext_resources tag (for audio blob URL exposure via window.__resources)
    er_pattern = re.compile(r'(<script type="__bundler/ext_resources">)([\s\S]*?)(</script>)')
    er_match = er_pattern.search(new_html)
    if er_audio := ext_audio:  # only touch if we have audio
        if er_match:
            existing = json.loads(er_match.group(2)) if er_match.group(2).strip() else []
            # Replace any previous audio entries, keep non-audio ones
            existing = [e for e in existing if not str(e.get('id', '')).endswith('-music')]
            existing.extend(er_audio)
            new_er = er_match.group(1) + json.dumps(existing, separators=(',', ':')) + er_match.group(3)
            new_html = new_html[:er_match.start()] + new_er + new_html[er_match.end():]
        else:
            # No ext_resources tag yet — insert one just after the manifest </script>
            tag = f'<script type="__bundler/ext_resources">{json.dumps(er_audio, separators=(",", ":"))}</script>'
            mf_end = re.search(r'</script>', new_html[m.start():])
            insert_at = m.start() + mf_end.end()
            new_html = new_html[:insert_at] + '\n' + tag + new_html[insert_at:]

    # Patch the HTML template if src/template.html exists
    tpl_path = os.path.join(ROOT, 'src', 'template.html')
    if os.path.exists(tpl_path):
        tpl_content = open(tpl_path, 'r', encoding='utf-8').read()
        tpl_json = json.dumps(tpl_content, ensure_ascii=False)
        # Escape </ so </script> tags inside the template don't break the outer script tag
        tpl_json = tpl_json.replace('</', '<\\/')
        tm = re.search(r'(<script type="__bundler/template">)([\s\S]*?)(</script>)', new_html)
        if tm:
            new_html = new_html[:tm.start()] + tm.group(1) + tpl_json + tm.group(3) + new_html[tm.end():]
            print(f'  updated  src/template.html')

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_html)

    print(f'\n✓  demo.html rebuilt  ({len(new_html):,} bytes)')

if __name__ == '__main__':
    main()
