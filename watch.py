#!/usr/bin/env python3
"""
watch.py — auto-rebuilds demo.html whenever any file in src/ changes.

Usage:
  python3 watch.py
"""

import sys, subprocess, time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

ROOT = __import__('os').path.dirname(__import__('os').path.abspath(__file__))

class RebuildHandler(FileSystemEventHandler):
    def __init__(self):
        self._last = 0

    def on_modified(self, event):
        if event.is_directory: return
        if not event.src_path.endswith('.js'): return
        # debounce — ignore rapid duplicate events
        now = time.time()
        if now - self._last < 0.4: return
        self._last = now
        print(f'\n↺  {event.src_path.split("/src/")[-1]} changed — rebuilding...')
        result = subprocess.run([sys.executable, 'rebuild.py'], cwd=ROOT, capture_output=True, text=True)
        if result.returncode == 0:
            print(result.stdout.strip())
        else:
            print('ERROR:', result.stderr.strip())

if __name__ == '__main__':
    handler = RebuildHandler()
    observer = Observer()
    observer.schedule(handler, path=ROOT + '/src', recursive=True)
    observer.start()
    print('Watching src/ for changes — press Ctrl+C to stop.\n')
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
