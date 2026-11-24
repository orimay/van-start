"""Card proofreading pass: dumps unreviewed cards in deck order and applies a batch of fixes.

  python3 -I scripts/proof.py dump [count]      next unreviewed cards, all languages
  python3 -I scripts/proof.py apply <file.json> apply fixes, mark the dumped cards reviewed

Fix file: {"<id prefix>": {"ru": {field: value}, "en": {...}, ..., "ro": {"f", "xf", "n"?, "nx"?}},
           "_new": [{"before": "<id prefix>", "ru": {b, tr, f, xf, xb, n?}, "en": {...}, ...}],
           "_move": [["<id prefix>", "<before id prefix>"]],
           "_reviewed": ["<id prefix>", ...]}
Russian fields live in deck.json; the others in public/lang/<lang>.json as [f, xf, tr, n?, nx?].
"""
import json
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DECK = ROOT / 'public' / 'deck.json'
LANG = ROOT / 'public' / 'lang'
DONE = ROOT / '.proof' / 'done.txt'
LANGS = ('en', 'es', 'pt', 'tr', 'ro')
sys.path.insert(0, str(ROOT / 'scripts'))
import translit  # noqa: E402


def walk(node, path=()):
    yield node, path
    for c in node.get('children', []):
        yield from walk(c, path + (c['name'],))


def load():
    deck = json.load(open(DECK))
    langs = {}
    for l in LANGS:
        f = LANG / f'{l}.json'
        langs[l] = json.load(open(f)) if f.exists() else {'names': {}, 'cards': {}}
    return deck, langs


def save(deck, langs):
    DECK.write_text(json.dumps(deck, ensure_ascii=False, separators=(',', ':')))
    for l, o in langs.items():
        (LANG / f'{l}.json').write_text(json.dumps(o, ensure_ascii=False, separators=(',', ':')))


def done():
    return set(DONE.read_text().split()) if DONE.exists() else set()


def get(o, cid):
    v = o['cards'].get(cid)
    if not v:
        return {}
    return {k: x for k, x in zip(('f', 'xf', 'tr', 'n', 'nx'), v) if x}


def put(o, cid, fields):
    cur = get(o, cid)
    cur.update({k: v for k, v in fields.items()})
    # Indexes 5 and 6 (an affix's breakdown and example transcription) are kept as they are.
    arr = [cur.get('f', ''), cur.get('xf', ''), cur.get('tr', ''), cur.get('n', ''), cur.get('nx', ''), *o['cards'].get(cid, [])[5:]]
    while len(arr) > 3 and not arr[-1]:
        arr.pop()
    o['cards'][cid] = arr


def find(deck, prefix):
    hits = [(c, n) for n, _ in walk(deck) for c in n.get('cards', []) if c['id'].startswith(prefix)]
    hits = hits or [(c, n) for n, _ in walk(deck) for c in n.get('cards', []) if c['b'] == prefix]
    assert len(hits) == 1, (prefix, len(hits))
    return hits[0]


def dump(count):
    deck, langs = load()
    seen, shown, section = done(), 0, None
    for node, path in walk(deck):
        for c in node.get('cards', []):
            if c['id'] in seen:
                continue
            if path != section:
                print('##', ' > '.join(path))
                section = path
            print(f"[{c['id'][:8]}] {c['b']} /{c['tr']}/")
            print('  ru:', c['f'], '|n:', c.get('n', ''), '|x:', c['xb'].replace('\n', ' / '), '=>', c['xf'].replace('\n', ' / '),
                  ('|nb: ' + c['nb'].replace('\n', ' / ') + ' => ' + c.get('nx', '').replace('\n', ' / ')) if c.get('nb') else '')
            for l in LANGS[:4]:
                g = get(langs[l], c['id'])
                print(f'  {l}:', g.get('f'), '|n:', g.get('n', ''), '|x:', g.get('xf', '').replace('\n', ' / '),
                      ('|nx: ' + g['nx'].replace('\n', ' / ')) if g.get('nx') else '')
            shown += 1
            if shown >= count:
                return


def apply(path):
    fx = json.load(open(path))
    deck, langs = load()
    reviewed = set()
    for prefix, by_lang in fx.items():
        if prefix.startswith('_'):
            continue
        card, _ = find(deck, prefix)
        retr = 'tr' in by_lang.get('ru', {})
        card.update(by_lang.get('ru', {}))
        for k in [k for k, v in by_lang.get('ru', {}).items() if v == '']:
            del card[k]
        for l in LANGS:
            if l in by_lang:
                put(langs[l], card['id'], by_lang[l])
        if retr:
            for l in LANGS:
                if card['id'] in langs[l]['cards']:
                    put(langs[l], card['id'], {'tr': translit.convert(card['tr'], l, card['b'])})
    for new in fx.get('_new', []):
        before, node = find(deck, new['before'])
        cid = str(uuid.uuid4())
        card = {'id': cid, **new['ru']}
        node['cards'].insert(node['cards'].index(before), card)
        for l in LANGS:
            put(langs[l], cid, {**new.get(l, {}), 'tr': translit.convert(card['tr'], l, card['b'])})
        reviewed.add(cid)
        print('new', cid[:8], card['b'])
    for prefix, before_prefix in fx.get('_move', []):
        card, node = find(deck, prefix)
        before, bnode = find(deck, before_prefix)
        node['cards'].remove(card)
        bnode['cards'].insert(bnode['cards'].index(before), card)
    reviewed |= {find(deck, p)[0]['id'] for p in fx.get('_reviewed', [])}
    reviewed |= {find(deck, p)[0]['id'] for p in fx if not p.startswith('_')}
    save(deck, langs)
    DONE.parent.mkdir(exist_ok=True)
    with open(DONE, 'a') as f:
        f.writelines(i + '\n' for i in sorted(reviewed - done()))
    print('reviewed', len(done()))


if __name__ == '__main__':
    {'dump': lambda: dump(int(sys.argv[2]) if len(sys.argv) > 2 else 40), 'apply': lambda: apply(sys.argv[2])}[sys.argv[1]]()
