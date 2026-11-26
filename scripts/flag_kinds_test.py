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
# A sound names a word it is heard in; a letter is named.
fails += [f'{b}: sound is {m.is_sound({"b": b, "f": f})}' for b, f, sound in [('ij', 'эй (как в «hij»)', True), ('n', 'эн (буква)', False)] if m.is_sound({'b': b, 'f': f}) != sound]

# A part of speech: a noun by its article, a verb by its Russian infinitive, the rest by its word or its gloss.
PARTS = [('de boeken', 'книги (мн.)', 'noun'), ('boeken', 'бронировать (поездку)', 'verb'), ('pijn doen', 'болеть', 'verb'),
         ('het kan', 'это возможно, можно', 'verb'), ('kwart over negen', 'четверть десятого', 'phrase'), ('zesentwintig', 'двадцать шесть', 'numeral'),
         ('vraag', 'спроси!; попроси!', 'verb'), ('op-', 'вверх', None), ('weg', 'прочь', 'adverb'),
         # A phrase led by its article is typed with it, like a noun card: het dagelijkse leven.
         ('het dagelijkse leven', 'повседневная жизнь', 'noun'), ('de soep van de dag', 'суп дня', 'noun'),
         # A longer clause is a set phrase; a pronoun and its verb are a verb form, with its participle or its particle too.
         ('het spijt me', 'мне жаль', 'phrase'), ('de trein ging', 'поезд поехал', 'phrase'), ('de brug over', 'через мост', 'phrase'), ('het gaat goed', 'всё хорошо', 'phrase'), ('het heeft gesmaakt', 'было вкусно', 'phrase'), ('het heerst nu', 'это сейчас ходит', 'phrase'),
         ('het licht uitdoen', 'выключать свет (в комнате)', 'verb'), ('het saldo opladen', 'пополнить баланс (свой)', 'verb'), ('het koud hebben', 'мёрзнуть', 'verb'), ('het is begonnen', 'оно началось', 'verb'), ('een kopje koffie', 'чашечка кофе', 'phrase'), ('ik ben', 'я есть', 'verb'),
         ('ik heb gefietst', 'я катался на велосипеде', 'verb'), ('zij halen op', 'они забирают', 'verb'), ('het is groot', 'оно большое', 'phrase'), ('ik heb gebracht', 'я отвёз', 'verb'), ('het wordt bezorgd', 'это доставляют', 'verb'), ('ik heb geen plannen', 'у меня нет планов', 'phrase'),
         ('mooi', 'красивый', 'adjective'), ('gisteren', 'вчера', 'adverb'), ('hij', 'он', 'pronoun'), ('omdat', 'потому что', 'conjunction'), ('naast', 'рядом с', 'preposition'),
         ('hallo', 'привет', 'interjection'), ('twintigste', 'двадцатый', 'numeral'), ('januari', 'январь', 'noun'), ('ij', 'эй (как в «hij»)', 'letter'), ('n', 'эн (буква)', 'letter')]
# A card whose senses are different parts of speech names each, in the order of its front.
SENSES = [('goed', 'хороший, правильный; хорошо', ['adjective', 'adverb']), ('mooi', 'красивый', None), ('weg', 'прочь; нет на месте (пропал, ушёл)', None),
          ('plastic', 'пластиковый; пластик', ['adjective', 'noun']), ('smakelijk', 'вкусный; приятного!', ['adjective', 'interjection']), ('verdwenen', 'исчезнувший; исчез', ['adjective', 'verb']),
          ('er', 'там; есть, имеется', None), ('lichter', 'светлее; легче (по весу)', None), ('enkele', 'одиночный; несколько', ['adjective', 'pronoun'])]
fails += [f'{b}: {m.senses_of({"b": b, "f": f})} not {ps}' for b, f, ps in SENSES if m.senses_of({'b': b, 'f': f}) != ps]
fails += [f'{b}: {m.part_of({"b": b, "f": f})} not {part}' for b, f, part in PARTS if m.part_of({'b': b, 'f': f}) != part]

# The applied deck: the first of a series stays and carries the rule.
deck = list(m.cards(json.load(open(m.deck_path))))
by_b = {c['b']: c for c in deck}
for first, series in [('de zaterdagmiddag', 0), ('eenentwintig', 1)]:
    card = by_b[first]
    if card.get('k') or not all(item in card.get('n', '') for item in m.RULES[series][0]):
        fails.append(f'first of the series lost its rule: {first}')
if by_b['dinsdagochtend'].get('k') != 'combination' or by_b['ui'].get('k') != 'sound' or by_b['de boeken'].get('p') != 'noun' or by_b['goed'].get('ps') != ['adjective', 'adverb']:
    fails.append('deck not flagged: run python3 -I scripts/flag-kinds.py')

print('\n'.join(fails) or 'ok')
sys.exit(1 if fails else 0)
