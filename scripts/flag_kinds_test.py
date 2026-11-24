"""Run: python3 -I scripts/flag_kinds_test.py"""
import importlib.util
import json
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location('flag', Path(__file__).resolve().parent / 'flag-kinds.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

SENTENCE = ['de appel is groot', 'Wat heb je in het weekend gedaan?', 'naar de markt', 'Zij fietst naar haar werk.']
NOT_SENTENCE = ['ik ben', 'hij heeft', 'het huis', 'hoe gaat het', 'tot ziens', 'kan ik u helpen?', 'met de fiets', 'om half acht']
COMBINATION = {'dinsdagochtend': 0, 'de vrijdagavonden': 0, 'vierentwintig': 1, 'zeshonderd': 2, 'om negen uur': 3, 'half vier': 4}

fails = []
fails += [f'not a sentence: {b}' for b in SENTENCE if not m.is_sentence(b)]
fails += [f'a sentence: {b}' for b in NOT_SENTENCE if m.is_sentence(b)]
fails += [f'not in series {i}: {b}' for b, i in COMBINATION.items() if not m.SERIES[i].fullmatch(b)]

# The applied deck: the first of a series stays and carries the rule.
deck = list(m.cards(json.load(open(m.deck_path))))
by_b = {c['b']: c for c in deck}
for first, series in [('de zaterdagmiddag', 0), ('eenentwintig', 1)]:
    card = by_b[first]
    if card.get('k') or not all(item in card.get('n', '') for item in m.RULES[series][0]):
        fails.append(f'first of the series lost its rule: {first}')
if by_b['dinsdagochtend'].get('k') != 'combination':
    fails.append('deck not flagged: run python3 -I scripts/flag-kinds.py')

print('\n'.join(fails) or 'ok')
sys.exit(1 if fails else 0)
