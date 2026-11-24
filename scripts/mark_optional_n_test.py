"""Run: python3 -I scripts/mark_optional_n_test.py"""
import importlib.util
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location('mark', Path(__file__).resolve().parent / 'mark-optional-n.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

CASES = [
    ('lopen', 'лоо́пэн', 'лоо́пэ(н)'),
    # A linking -en before k is said ң; the droppable n is still written as one: бу́рэ(н)каас.
    ('de boerenkaas', 'дэ бу́рэңкаас', 'дэ бу́рэ(н)каас'),
    ('de studentenkamer', 'дэ стүдэ́нтэңкаамэр', 'дэ стүдэ́нтэ(н)каамэр'),
    # The ng and nk of a root are not an -en: brengen, denken.
    ('terugbrengen', 'тэрү́хбрэңэн', 'тэрү́хбрэңэ(н)'),
    ('nadenken', 'наа́дэңкэн', 'наа́дэңкэ(н)'),
    ('opengaan', 'оо́пэнхаан', 'оо́пэ(н)хаан'),
    ('de pannenkoek', 'дэ па́нэнкук', 'дэ па́нэ(н)кук'),
    ('binnenkort', 'бинэнко́рт', 'бинэ(н)ко́рт'),
    # A mark left on a root ng earlier is taken back.
    ('terugbrengen', 'тэрү́хбрэ(н)ңэ(н)', 'тэрү́хбрэңэ(н)'),
    ('de boerenkaas', 'дэ бу́рэ(н)ңкаас', 'дэ бу́рэ(н)каас'),
    # A diphthong ending in i glides into the -en: aai-en, aardbei-en, groei-en.
    ('aaien', 'аа́йэн', 'аа́йэ(н)'),
    ('de aardbeien', 'дэ аа́рдбәйэн', 'дэ аа́рдбәйэ(н)'),
    ('groeien', 'хру́йэн', 'хру́йэ(н)'),
    ('dienen', 'дии́нэн', 'дии́нэ(н)'),
    # A -ten- links on when a deck word follows (tomaten-soep); in a root it stays (intensief).
    ('de erwtensoep', 'дэ э́ртэнсуп', 'дэ э́ртэ(н)суп'),
    ('de tomatensoep', 'дэ тоомаа́тэнсуп', 'дэ тоомаа́тэ(н)суп'),
    ('intensief', 'интэнсии́ф', 'интэнсии́ф'),
]
fails = 0
for dutch, tr, want in CASES:
    got = m.mark(dutch, tr, 'ru')
    if got != want:
        fails += 1
        print(f'FAIL {dutch}: {got!r} != {want!r}')
# An affix's transcription is its sound in its example word, the other languages split on the stem's side.
AFFIX_CASES = [
    ('samen-', 'samenwerken', 'саа́мэ(н)', 'саа́мэ(н)вэркэ(н)', {'ru': 'саа́мэ(н)', 'en': 'sáamu(n)', 'es': 'sáame(n)'}),
    ('-te', 'de warmte', 'тэ', 'дэ ва́рмтэ', {'ru': 'тэ', 'en': 'tuh', 'pt': 'tê'}),
    ('aan-', 'aankomen', 'аан', 'аа́ңкоомэ(н)', {'ru': 'аа́ң', 'en': 'áan', 'ro': 'áan'}),
    ('-je', 'het katje', 'ьэ', 'эт ка́тьэ', {'ru': 'ьэ', 'en': 'yuh', 'es': 'ye'}),
    ('voor-', 'de voornaam', 'фоор', 'дэ фоо́рнаам', {'ru': 'фоо́р', 'en': 'fóhr'}),
]
for affix, dutch, tr, xt, want in AFFIX_CASES:
    for lang, sound in want.items():
        got = m.affix_sound(affix, tr, xt, dutch, lang)
        if got != sound:
            fails += 1
            print(f'FAIL {affix} {lang}: {got!r} != {sound!r}')
print('ok' if not fails else f'{fails} failed')
sys.exit(1 if fails else 0)
