"""Makes public/audio and the audio repo hold exactly the clips the deck references.
Refuses when a referenced clip is missing locally: run build-audio.py first.

Run: python3 -I scripts/sync-audio.py [audio repo]
"""

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = Path.home() / 'Projects' / 'private' / 'pages' / 'van-start-audio'


def referenced(node, keys):
    if isinstance(node, dict):
        keys.update(node[k] for k in ('au', 'axb') if isinstance(node.get(k), str))
        for v in node.values():
            referenced(v, keys)
    elif isinstance(node, list):
        for v in node:
            referenced(v, keys)
    return keys


def clips(d):
    return {p.stem: p for p in d.glob('*.mp3')}


def sync(deck, local, repo):
    keys = referenced(json.loads(Path(deck).read_text()), set())
    have = clips(local)
    missing = sorted(keys - have.keys())
    if missing:
        raise SystemExit(f'{len(missing)} clips missing, run build-audio.py: {" ".join(missing[:5])}')
    for k, p in have.items():
        if k not in keys:
            p.unlink()
    pushed = clips(repo)
    for k, p in pushed.items():
        if k not in keys:
            p.unlink()
    for k in keys - pushed.keys():
        shutil.copy2(local / f'{k}.mp3', repo / f'{k}.mp3')


if __name__ == '__main__':
    sync(ROOT / 'public' / 'deck.json', ROOT / 'public' / 'audio', Path(sys.argv[1]) if len(sys.argv) > 1 else REPO)
