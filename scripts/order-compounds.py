"""Moves each part of a compound word, and the base of a prefixed word, in front of the compound's first card, so the learner
knows the parts by the time the compound comes up. Rewrites public/deck.json in place.

Run after build-deck.py:  python3 -I scripts/order-compounds.py
"""
import json
import re
from pathlib import Path

DECK = Path(__file__).resolve().parent.parent / 'public' / 'deck.json'
ARTICLE = re.compile(r'^(de|het|een) ')
GLUES = ('', 's', 'e', 'en')
# Too short or a prefix, so they make false splits.
NOT_PARTS = {'ver', 'her', 'ont', 'be', 'ge', 'er', 'te', 'een', 'den', 'der', 'ten', 'lijk'}
# Splits that look like compounds but are not.
NOT_SPLITS = {
    'centrum': None, 'slapen': None, 'kantoor': None, 'kantoren': None, 'engeland': None,
    'welkom': None, 'drogisterij': None, 'stappen': None, 'goedkoper': None,
    'overstappen': ('overstap', 'pen'), 'oversteken': ('over', 'teken'),
    'vierentwintig': ('vieren', 'twintig'),
    'ontmoeten': None, 'ontbijten': None, 'inversie': None, 'veranderen': None, 'navel': None,
    'vervolgens': None, 'beroepen': None, 'hamburger': None,
    'gezinnen': None, 'gerecht': None, 'gesloten': None, 'geniet': None, 'gevaar': None, 'gedicht': None,
    'gezonder': None, 'gehoor': None, 'geheel': None, 'natuur': None,
}


def bare(back):
    return ARTICLE.sub('', re.sub(r'\(.*?\)', '', back).split(',')[0].strip().lower())


def slots(node, out):
    for card in node.get('cards', []):
        out.append((node, card))
    for child in node.get('children', []):
        slots(child, out)
    return out


# A prefixed word comes after its base word: laden before opladen, kennen before herkennen.
PREFIXES = ('aan', 'af', 'bij', 'door', 'in', 'mee', 'na', 'om', 'onder', 'op', 'over', 'terug', 'toe',
            'uit', 'voor', 'weg', 'be', 'ver', 'her', 'ont', 'er', 'ge')


def splits(word, words, origins):
    if origins.get(word) in words:
        yield (origins[word],)
    for prefix in PREFIXES:
        base = word[len(prefix):]
        if word.startswith(prefix) and base in words and NOT_SPLITS.get(word, ()) != (prefix, base):
            yield (base,)
    for k in range(3, len(word) - 2):
        head = word[:k]
        if head not in words:
            continue
        for glue in GLUES:
            tail = word[k + len(glue):]
            if word[k:].startswith(glue) and tail in words and NOT_SPLITS.get(word, ()) != (head, tail):
                yield head, tail

# A derived word comes after the word its note names as its origin: `от: sluiten (...)` puts sluiten before de sleutel.
ORIGIN = re.compile(r'(?:^|; )от: ([^(;]+?) \(')


def roots(order):
    return {bare(card['b']): bare(m.group(1)) for _, card in order if (m := ORIGIN.search(card.get('n', '')))}


def move_once(deck):
    order = slots(deck, [])
    first = {}
    for i, (_, card) in enumerate(order):
        first.setdefault(bare(card['b']), i)
    origins = roots(order)
    words = {w for w in first if ' ' not in w and len(w) >= 3 and w not in NOT_PARTS}
    for i, (node, card) in enumerate(order):
        word = bare(card['b'])
        if ' ' in word or first[word] != i or (word in NOT_SPLITS and NOT_SPLITS[word] is None):
            continue
        for parts in splits(word, words, origins):
            for part in parts:
                if first[part] > i:
                    home, moved = order[first[part]]
                    home['cards'].remove(moved)
                    node['cards'].insert(node['cards'].index(card), moved)
                    return f'{part} before {word}'
    return None


def main():
    deck = json.loads(DECK.read_text())
    moves = list(iter(lambda: move_once(deck), None))
    DECK.write_text(json.dumps(deck, ensure_ascii=False, separators=(',', ':')))
    print('\n'.join(moves))
    print(len(moves), 'moved')


if __name__ == '__main__':
    main()
