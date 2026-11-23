"""Marks the n of an unstressed -en, which speakers mostly drop, as optional in every transcription:
лоо́пэ(н), доосэ́нтэ(н)каамэр. Recomputes every mark from scratch in the Russian transcription, then spells every
other language's from it (scripts/translit.py), rewriting public/deck.json and public/lang/*.json in place; reruns change nothing.

Run after any transcription change:  python3 -I scripts/mark-optional-n.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import translit  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DECK = ROOT / 'public' / 'deck.json'
LANGS = ('en', 'es', 'pt', 'tr', 'ro')
# Per transcription language: its schwa, its n, and its vowels.
SCRIPT = {
    'ru': ('э', 'н', 'аэиоуыәөүяеёю'),
    'en': ('u', 'n', 'aeiouyö'),
    'es': ('e', 'n', 'aeiouyö'),
    'pt': ('ê', 'n', 'aeiouyöêô'),
    'tr': ('ı', 'n', 'aeiouyöüıê'),
    'ro': ('ă', 'n', 'aeiouyöüăâî'),
}
STRESS = '́áéíóú'
DUTCH_VOWELS = 'aeiouy'
# Dutch vowel runs; ouw/eeuw/ieuw count as one sound.
DUTCH_RUN = r'[aeiouyëï]+w?(?![aeiouy])|[aeiouyëï]+'
# Tens after a linking en (zesentwintig); any other -en- before d/t is a root or a participle (centrum, zoekende).
TENS = r'(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)'


def groups(token, vowels):
    """Vowel runs as (start, end), stress marks counting as part of their vowel."""
    out, start = [], None
    for i, ch in enumerate(token.lower() + ' '):
        if ch in STRESS and start is None:
            continue
        is_vowel = ch in vowels or ch in STRESS or (ch.isalpha() and ch not in 'abcdefghijklmnopqrstuvwxyzабвгдеёжзийклмнопрстуфхцчшщъыьэюяһңәөүçğşı' and ch != ' ')
        if is_vowel and start is None:
            start = i
        elif not is_vowel and start is not None:
            out.append((start, i))
            start = None
    return out


def deck_words():
    """Bare lowercase Dutch words of the deck: a stem before a linking -en- must be one of them."""
    global VOCAB
    if VOCAB is None:
        VOCAB = {re.sub(r'^(de|het) ', '', c['b'].lower()) for c in cards(json.loads(DECK.read_text()))}
    return VOCAB


VOCAB = None


def dutch_schwa_n(word):
    """Indexes of the vowel runs of `word` that are an -en whose n may drop: the ending, or -en- before a consonant."""
    runs = [(m.start(), m.end()) for m in re.finditer(DUTCH_RUN, word)]
    found = []
    for n, (s, e) in enumerate(runs):
        if n == 0 or word[s:e] != 'e' or word[e:e + 1] != 'n' or word[s - 1] in DUTCH_VOWELS:
            continue
        after = word[e + 1:e + 2]
        if after and (after in 'dt' and not re.match(TENS, word[e + 1:]) or word[s - 1:e + 2] == 'tens'):
            continue
        if after == '' or (after not in DUTCH_VOWELS and after != 'n' and n + 1 < len(runs) and word[e + 1:e + 2].isalpha()):
            found.append((n, after == ''))
    return found


def mark(dutch, tr, lang):
    if not tr:
        return tr
    schwa, n_letter, vowels = SCRIPT[lang]
    tr = tr.replace(f'({n_letter})ң', 'ң').replace(f'({n_letter})', n_letter)
    words = re.sub(r'\(.*?\)', '', dutch).split(',')[0].split()
    tokens = tr.split(' ')
    tail = (schwa + ('h' if lang == 'en' else '') + n_letter)
    if len(words) != len(tokens):
        return ' '.join(t[:-1] + f'({n_letter})' if t.endswith(tail) and len(t) > len(tail) + 1 else t for t in tokens) if re.search(r'[^aeiouy\s]en\b', dutch) else tr
    for i, (word, token) in enumerate(zip(words, tokens)):
        word = re.sub(r'[^a-zà-ÿ]', '', word.lower())
        spots = dutch_schwa_n(word)
        if not spots or '(' in token:
            continue
        runs = groups(token, vowels)
        tail = (schwa + ('h' if lang == 'en' else '') + n_letter)
        if len(runs) != len(re.findall(DUTCH_RUN, word)):
            if spots[-1][1] and token.endswith(tail):
                tokens[i] = token[:-1] + f'({n_letter})'
            continue
        starts = [m.start() for m in re.finditer(DUTCH_RUN, word)]
        for n, final in reversed(spots):
            s, e = runs[n]
            if not token[s:e].lower().endswith(schwa):
                continue
            if lang == 'en' and token[e:e + 2] == 'hn':
                e += 1
            if token[e:e + 1].lower() == n_letter:
                token = token[:e] + '(' + token[e] + ')' + token[e + 1:]
            elif token[e:e + 1] == 'ң':
                # ng and nk of a root stay (brengen, denken); a deck word linking on through -en- drops (boerenkaas).
                if word[:starts[n]] not in deck_words():
                    continue
                token = token[:e] + f'({n_letter})' + token[e + 1:]
            elif not final:
                token = token[:e] + f'({n_letter})' + token[e:]
        tokens[i] = token
    return ' '.join(tokens)


def cards(node):
    yield from node.get('cards', [])
    for child in node.get('children', []):
        yield from cards(child)


def main():
    deck = json.loads(DECK.read_text())
    langs = {l: json.loads((ROOT / 'public' / 'lang' / f'{l}.json').read_text()) for l in LANGS if (ROOT / 'public' / 'lang' / f'{l}.json').exists()}
    changed = 0
    for card in cards(deck):
        new = mark(card['b'], card.get('tr'), 'ru')
        changed += new != card.get('tr')
        if card.get('tr'):
            card['tr'] = new
        for l, data in langs.items():
            row = data['cards'].get(card['id'])
            if row and len(row) > 2 and row[2]:
                new = translit.convert(card['tr'], l, card['b'])
                changed += new != row[2]
                row[2] = new
    if '--dry' not in sys.argv:
        DECK.write_text(json.dumps(deck, ensure_ascii=False, separators=(',', ':')))
        for l, data in langs.items():
            (ROOT / 'public' / 'lang' / f'{l}.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    print(changed, 'transcriptions marked')


if __name__ == '__main__':
    main()
