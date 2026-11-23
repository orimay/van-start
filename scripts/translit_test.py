"""Run: python3 -I scripts/translit_test.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import translit  # noqa: E402

CASES = [
    # A stress mark inside a diphthong stays on its first letter.
    ('вииба́утстраат', 'Wibautstraat', {'en': 'veebówtstraat', 'tr': 'viibáutstraat', 'ro': 'viibáutstraat'}),
    # ij is the same sound as ei, whichever letter the Russian one spells it with.
    ('лә́йлэк', 'lelijk', {'en': 'léyluk', 'es': 'léilek', 'pt': 'léilêk', 'tr': 'léylık', 'ro': 'léilăc'}),
    ('мәйн', 'mijn', {'en': 'meyn', 'es': 'mein', 'tr': 'meyn', 'ro': 'mein'}),
    # The English schwa before a droppable final n keeps its h: without the n, "u" would read "you".
    ('дэ мэнэ́йрэ(н)', 'de meneren', {'en': 'duh munéyruh(n)'}),
]

fails = 0
for tr, dutch, want in CASES:
    for lang, expected in want.items():
        got = translit.convert(tr, lang, dutch)
        if got != expected:
            fails += 1
            print(f'FAIL {dutch} {lang}: {got!r} != {expected!r}')

# Every language's transcription is the Russian one, spelled for that language.
import json  # noqa: E402
ROOT = Path(__file__).resolve().parent.parent


def walk(node):
    yield from node.get('cards', [])
    for child in node.get('children', []):
        yield from walk(child)


deck = {c['id']: c for c in walk(json.loads((ROOT / 'public' / 'deck.json').read_text()))}
for lang in ('en', 'es', 'pt', 'tr', 'ro'):
    rows = json.loads((ROOT / 'public' / 'lang' / f'{lang}.json').read_text())['cards']
    off = [(cid, row[2]) for cid, row in rows.items()
           if len(row) > 2 and row[2] and row[2] != translit.convert(deck[cid]['tr'], lang, deck[cid]['b'])]
    if off:
        fails += 1
        print(f'FAIL {lang}: {len(off)} transcriptions not derived from the Russian one, e.g. {off[:3]}')
print('ok' if not fails else f'{fails} failed')
sys.exit(1 if fails else 0)
