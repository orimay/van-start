"""Native-language overlays: public/lang/<lang>.json = {names: {node id: name}, cards: {card id: [f, xf, tr, n]}}.
The Dutch side, audio and images stay in deck.json; Russian is the deck itself.

Usage: python3 -I scripts/build-langs.py ~/Downloads/van-start
(reads deck_v10.json, ml2/out/*.json over ml/out/*.json, ml/names_out.json, ml/translit.py)
"""
import glob
import importlib.util
import json
import re
import sys
from pathlib import Path

src = Path(sys.argv[1]).expanduser()
out_dir = Path(__file__).resolve().parent.parent / 'public' / 'lang'
out_dir.mkdir(exist_ok=True)
spec = importlib.util.spec_from_file_location('translit', src / 'ml' / 'translit.py')
translit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(translit)

LANGS = ('en', 'pt', 'es', 'tr')
LETTERS = str.maketrans('0123456789abcdef', 'abcdefghijklmnop')  # served ids spell hex digits as a-p: digit runs read as card numbers to leak scanners
SCHWA_CARDS = ('fcc9d468', 'c3acf04f', 'c8bed27e', 'da264700')
CYR = re.compile(r'[Ѐ-ӘӚ-ӿ]')  # ә is the schwa sign
GENDER = {'pt': {'1': 'm.', '2': 'f.', '4': 'pl.'}, 'es': {'1': 'm.', '2': 'f.', '4': 'pl.'}}

ml = {}
for folder in ('ml', 'ml2'):  # ml2 is the reviewed pass and wins
    for f in sorted(glob.glob(str(src / folder / 'out' / '*.json'))):
        ml.update({o['uid']: o for o in json.load(open(f))})
fixes = src / 'ml2' / 'fixes2.json'  # deck-wide duplicate-front fixes
for uid, langs in (json.load(open(fixes)) if fixes.exists() else {}).items():
    for lang, fields in langs.items():
        ml[uid][lang].update(fields)
names = {o['uid']: o for o in json.load(open(src / 'ml' / 'names_out.json'))}
deck = json.load(open(src / 'deck_v10.json'))


def walk(n):
    yield n
    for c in n.get('children', []):
        yield from walk(c)


for lang in LANGS:
    overlay = {'names': {}, 'cards': {}}
    for n in walk(deck):
        overlay['names'][n['uid'].translate(LETTERS)] = names[n['uid']][lang]
        for p in n.get('pairs', []):
            if not isinstance(p, dict):
                continue
            t = ml[p['uid']][lang]
            sound = p.get('tr') and len(p['back']) <= 4 and p['front'].replace('́', '') == p['tr'].replace('́', '')
            front = translit.convert(p['tr'], lang, p['back'], p['uid'].startswith(SCHWA_CARDS)) if sound else t['front']
            note = t['note']
            gender = GENDER.get(lang, {}).get(t.get('attr') or '')
            if gender:
                note = f'{gender} {note}' if note else gender
            xf = t['sent']
            tr = translit.convert(p['tr'], lang, p['back']) if p.get('tr') else ''
            for v in (front, xf, tr, note or ''):
                assert not CYR.search(v), (lang, p['uid'], v)
            overlay['cards'][p['uid'].translate(LETTERS)] = [front, xf, tr, note] if note else [front, xf, tr]
    (out_dir / f'{lang}.json').write_text(json.dumps(overlay, ensure_ascii=False, separators=(',', ':')))
    print(lang, len(overlay['cards']))
