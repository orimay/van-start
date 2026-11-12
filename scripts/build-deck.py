"""Convert the Lexilize deck spec (deck_vN.json) into public/deck.json + public/img/.

Usage: python3 -I scripts/build-deck.py ~/Downloads/van-start/deck_v10.json
"""
import hashlib
import re
import json
import shutil
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = json.load(open(sys.argv[1]))
img_dir = root / 'public' / 'img'
shutil.rmtree(img_dir, ignore_errors=True)
img_dir.mkdir(parents=True)


def image(path):
    data = Path(path).read_bytes()
    name = hashlib.sha1(data).hexdigest()[:12] + Path(path).suffix
    (img_dir / name).write_bytes(data)
    return name


# Russian native examples open with a lowercase note: "с het. Курс приятный." or "мн. ч. Время ...".
NOTE = re.compile(r'^(\w.*?)\. (?=[^\W\d_a-zа-яё]|[«"—0-9])', re.S)


def split_note(text):
    m = NOTE.match(text) if text[:1].islower() else None
    if not m:
        return None, text
    note = m.group(1)
    # The split eats the dot of a closing abbreviation: "мн. ч.", "т. п.", "досл."
    return note + '.' if re.search(r'(^|\W)(ч|п|досл)$', note) else note, text[m.end():]


def card(p):
    c = {'id': p['uid'], 'f': p['front'], 'b': p['back']}
    for key, out in (('tr', 'tr'), ('ex_front', 'xf'), ('ex_back', 'xb')):
        if p.get(key):
            c[out] = p[key]
    if c.get('xf'):
        note, c['xf'] = split_note(c['xf'])
        if note:
            c['n'] = note
    if p.get('img'):
        c['img'] = image(p['img'])
    return c


def node(n):
    out = {'id': n['uid'], 'name': n['name']}
    cards = [card(p) for p in n.get('pairs', []) if isinstance(p, dict)]
    if cards:
        out['cards'] = cards
    children = [node(c) for c in n.get('children', [])]
    children = [c for c in children if c.get('cards') or c.get('children')]
    if children:
        out['children'] = children
    return out


deck = node(src)
(root / 'public' / 'deck.json').write_text(json.dumps(deck, ensure_ascii=False, separators=(',', ':')))
print('images', len(list(img_dir.iterdir())))
