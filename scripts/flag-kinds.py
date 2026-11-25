"""Flag the cards a learner can switch off: `k: 'sentence'` and `k: 'combination'` in public/deck.json.

Also tags a noun or a verb with `p: 'noun'` / `p: 'verb'`, so one spelling as a noun, a verb or an affix
looks apart (de boeken, boeken, op-). A noun has its article; a verb is glossed by a Russian infinitive.

Sentence: a phrase or sentence that only shows words in use (`op zaterdagavond`, `de appel is groot`).
Combination: one of a rule-built series (`dinsdagochtend`, `vierentwintig`, `om half tien`); the first
of each series stays, and the first day + part of the day gets a note saying the rule.
Verb forms, fixed expressions, idioms, grammar frames and terms always stay.

Usage: python3 -I scripts/flag-kinds.py  (idempotent: clears every flag, then sets them again)
"""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
deck_path = root / 'public' / 'deck.json'
deck = json.load(open(deck_path))

ART = re.compile(r'^(de|het|een) ')
PRON = {'ik', 'jij', 'je', 'u', 'hij', 'zij', 'ze', 'het', 'wij', 'we', 'jullie', 'men'}
PREP = {'op', 'in', 'met', 'naar', 'van', 'voor', 'bij', 'aan', 'om', 'uit', 'over', 'onder', 'tussen', 'na', 'tot', 'door', 'zonder', 'tegen', 'achter', 'naast', 'boven', 'langs', 'per', 'vanaf', 'sinds'}
QUESTION = {'wat', 'wie', 'waar', 'wanneer', 'hoe', 'waarom', 'welke', 'welk', 'hoeveel', 'waarmee', 'waarover', 'waarvan'}
DAYS = 'maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag'
MONTHS = 'januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december'
UNITS = 'een|twee|drie|vier|vijf|zes|zeven|acht|negen'
HOURS = f'{UNITS}|tien|elf|twaalf'

# Fixed expressions, idioms, verb constructions, frames: never a sentence.
KEEP = {
    # questions and exclamations
    'wat voor', 'hoe gaat het', 'wat vervelend', 'hoe laat', 'Wat kan ik voor u doen?', 'Hoe oud bent u?', 'Hoe oud ben je?',
    'waar kunnen we', 'wat voor werk', 'hoe laat is het?', 'en met jou?', 'kun jij?', 'wil jij?', 'zul jij?', 'tennis je?',
    'wanneer kan jij?', 'wat een goed idee', 'wie is er aan de beurt?', 'anders nog iets?', 'wie kan ik helpen?',
    'hebt u het niet kleiner?', 'hoe vaak', 'wat is de kleur van?', 'hoe gaat het met jou?', 'zegt u?', 'klopt dat?',
    'kan ik u helpen?', 'wat dacht u van deze?', 'waar of niet waar?', 'van ... tot ...', 'tussen ... en ...',
    'hoe gaat het met je?', 'hoe is het?', 'heb je even tijd?', 'komt het even uit?', 'dit is de voicemail van ...',
    'wat jammer', 'wat fijn', 'heeft het gesmaakt?', 'ik vind dat ...', 'waar naartoe?', 'hoe lang', 'waar gaat het over',
    'wat is er gebeurd?', 'wat is er aan de hand?', 'hoe voel je je?', 'hoe ouder hoe meer', 'hoeveel keer', 'waar dan?',
    # verb constructions and frames
    'hij maakt kennis met', 'ik wil me inschrijven', 'ik schrijf me in', 'hij ligt te slapen', 'zij kleden zich aan',
    'hij zit op voetbal', 'hij houdt niet van', 'hij heeft een hoed op', 'ik voel me goed', 'ik heb het gepast',
    'hij staat u ook goed', 'hij lijkt op mij', 'ik heb zin in', 'ik hoor het wel', 'ik zie je zo', 'ik heb het koud',
    'ik heb in de krant gelezen dat', 'hij heeft geen tijd om', 'we gaan verhuizen omdat', 'ik vind het leuk om',
    'ik heb er zin in', 'ik ga te voet', 'zij heeft zich herinnerd', 'ik weet het niet zeker', 'ik verwijs u door',
    'ik zal me inschrijven', 'ik zal even kijken', 'hij is zijn sleutels kwijt',
    # prepositional idioms and function phrases
    'aan het eind', 'op straat', 'tot zo', 'tot straks', 'tot morgen', 'tot dan', 'aan de telefoon', 'tot gauw', 'in orde',
    'van wie', 'op vakantie', 'met mij', 'met jou', 'met u', 'met hem', 'met haar', 'voor ons', 'voor jullie', 'voor ze',
    'voor hem', 'voor mij', 'met wie', 'aan het einde van', 'aan het eind van', 'tussen haakjes', 'naar huis', 'van huis',
    'door de week', 'op tijd', 'van harte', 'per week', 'per kilo', 'per bos', 'per stuk', 'aan de beurt', 'in de aanbieding',
    'bij elkaar', 'bij aankoop van', 'aan de linkerkant', 'aan de rechterkant', 'in tweetallen', 'op internet', 'aan jezelf',
    'in de buurt', 'tot aan', 'aan uw linkerhand', 'aan uw rechterhand', 'naar boven', 'naar beneden', 'naar links',
    'op voorraad', 'bij me', 'met me', 'met je', 'met ons', 'met jullie', 'met ze', 'op kantoor', 'op school', 'op bezoek',
    'per mail', 'in gedachten', 'op dit moment', 'per dag', 'per uur', 'per jaar', 'per maand', 'van dichtbij', 'op naam',
    'in principe', 'voor het laatst', 'tot uw dienst', 'door elkaar', 'naar buiten', 'naar binnen', 'op loopafstand',
    'tot slot', 'van wie is die', 'per direct', 'bij mij', 'tot snel', 'op een kier', 'op slot', 'met plezier',
    'met veel plezier', 'over zijn', 'aan de hand zijn', 'van elkaar', 'in die tijd', 'op weg', 'op reis', 'tot ziens',
    'bij zich', 'op de begane grond', 'aan boord', 'om ... te', 'in de file staan', 'met pensioen gaan', 'in conditie blijven',
    'in beweging blijven', 'in contact brengen', 'op bezoek gaan', 'uit eten gaan', 'op reis gaan', 'op vakantie gaan',
    'naar bed gaan', 'naar bed brengen', 'aan sport doen', 'tot het over is', 'bij jou thuis', 'bij mij thuis', 'naar jou toe',
    'in de zomer', 'in de winter', 'in de ochtend', 'in de avond', 'Tot de volgende keer', 'over twee weken',
    'tot dan en een fijne dag', 'op welke dag',
    # survival formulas
    'in het weekend', 'in de pauze', 'op het werk', 'op de hoek', 'met de fiets', 'met de auto', 'met de bus', 'met de trein',
    'Hoe spel je dat?', 'kunt u dat herhalen?', 'kunt u mij helpen?', 'mag ik u iets vragen?', 'ik kijk eerst even rond',
    'zoekt u iets speciaals?', 'kan ik pinnen?', 'waar kan ik betalen?', 'mag ik de menukaart?', 'met mij gaat het goed',
    'ik heb geen tijd', 'ik heb geen plannen', 'ik heb al plannen', 'ik ben twaalf jaar', 'ik kom uit Spanje',
    'ik woon in Utrecht', 'wat is je beroep?', 'kan ik deze passen?', 'welke maat hebt u?', 'ik zal even voor u kijken',
    'ik ga even voor je kijken', 'na voorzetsel', 'in of dichtbij', 'naar de film', 'naar de film gaan', 'Is het zo goed?',
    'Wat doe je vanavond?', 'wat denk jij?', 'welke film?', 'vrijdag dan?', 'waarom wel of niet?', 'in welke kleur?',
}

# Times said another way than `om <hour> uur`: each its own pattern, never one of the series.
OWN_PATTERN = {'om 12.30', 'om half acht', 'om kwart over acht'}

# Sentences the categories below do not reach: plain adjective + noun, and examples outside a question or a preposition.
SENTENCES = {
    'het goede woord', 'het goede antwoord', 'het nieuwe paspoort', 'de grote appel', 'een grote appel', 'het grote huis',
    'een groot huis', 'de lekkere pizza', 'de zure citroen', 'de gezonde sinaasappel', 'de moeilijke oefening',
    'het jonge meisje', 'de zware tas', 'de verse tomaten', 'de dunne vrouw', 'de lekkere mango', 'het goedkope boek',
    'een klein kind', 'een kleine auto', 'een groene paprika', 'een dik boek', 'een vol glas', 'een brede straat',
    'een gele citroen', 'een dure laptop', 'een blauwe auto', 'een lekkere taart', 'een positief antwoord', 'een blauwe muur',
    'een gouden ring', 'een mooi model', 'leuke kleding', 'een nieuwe wasmachine', 'een gratis glas', 'een koud biertje',
    'een negatief antwoord', 'het juiste woord', 'de juiste vorm', 'een nieuwe baan', 'een rode wijn', 'de ontbrekende woorden',
    'de rode trui', 'een korte tekst', 'makkelijke kinderboeken', 'biologisch vlees', 'een goed eetcafé', 'een nieuwe afspraak',
    'de gegeven informatie', 'de onderstaande informatie', 'het volgende vertrek', 'het nieuwe huis', 'een eigen huis',
    'een duurzaam huis', 'een sterk accent', 'een vaste baan', 'de hele stad', 'de drukste winkelstraat', 'het tweede gangpad',
    'nieuwe woorden', 'oude mensen', 'Belgisch bier', 'goede buren', 'de eigen buren', 'de laatste dag',
    'activiteiten in de winter', 'activiteiten in de lente', 'activiteiten in de zomer', 'activiteiten in de herfst',
    'volleyballen op het strand', 'picknicken in het park', 'een strandwandeling maken in de storm',
    'paddenstoelen en mooie bladeren bekijken', 'telefoneren met een vriend', 'koffie drinken met een vriend',
    'het vervoer naar werk', 'dat is een tijdje geleden', 'even in mijn agenda kijken', 'eten bij ouders',
    'die vind ik ook lekker', 'die ananassen zien er lekker uit', 'twee rode paprika\'s', 'de tomaten zijn in de aanbieding',
    'de koekjes liggen naast de chocola', 'het brood ligt naast de vleeswaren', 'het bier staat tegenover de chips',
    'de cola staat in het derde pad bij de frisdranken', 'melk is wit', 'noem drie dingen met de kleur rood',
    'de appel is groot', 'het huis is groot', 'ja, het is een lekkere mango', 'ja, het is een lekker broodje',
    '80 cent per stuk', 'mijn auto is oud', 'onze oude bank', 'de docent van mijn kind', 'de verkopers in de winkel',
    'daar rijdt u rechtdoor', 'de derde straat rechtsaf', 'het winkelcentrum is na 100 meter aan de rechterkant',
    'dat gaat een beetje te snel', 'volg de weg tot het einde', 'daarna bij de rotonde rechtdoor',
    'volg de weg tot aan de stoplichten', 'kijk, daar zijn de roltrappen', 'de kaart van het centrum',
    'schoenen met hoge hakken', 'schoenen met lage hakken', 'daar achter in de winkel', 'deze is te klein',
    'even in het magazijn kijken', 'die heb ik niet op voorraad', 'probeert u deze eens', 'dit is de goede maat',
    '30 procent korting', 'drie briefjes van 50 euro', 'maar ik vind zwart niet zo mooi', 'dit is Utrecht', 'hier woon ik',
    'dit is uw kantoor', 'hier werkt u', 'dat is ons huis', 'daar wonen wij', 'dat is mijn bedrijf', 'daar werk ik',
    'daar doe ik mijn boodschappen', 'de informatie uit de tabel', 'zijn vrouw is Engelse', 'haar moeder is Duits',
    'hun kinderen spelen vaak met onze kinderen', 'mijn ouders wonen in Maastricht', 'mijn kinderen zijn nog klein',
    'de prijs van mandarijnen is hoog', 'morgen ga ik naar de markt', 'uw rijbewijs ophalen', 'een glas rode wijn graag',
    'de kledingzaak gaat sluiten', 'het stoplicht staat op rood', 'maandag begint de uitverkoop', 'daar is de bakker',
    'de jurk staat je goed', 'mijn kamer is heel donker', 'sinaasappels zijn heel gezond', 'de temperatuur is vandaag hoog',
    'de film duurt heel lang', 'er is veel zon', 'elke dag patat eten is ongezond', 'mijn oma is al heel oud',
    'deze peren zijn heel sappig', 'deze computer werkt heel snel', 'de bakker is niet ver van ons huis',
    'lekkere verse tomaten te koop', 'deze koffie is echt vies', 'de fles is vol', 'de trui is heel zacht',
    'de kinderen spelen vandaag binnen', 'de kinderen spelen buiten voetbal', 'daar hebben ze lekkere, verse vis',
    'dat is dan twaalf euro bij elkaar', 'de aardbeien zijn helaas uitverkocht', 'de bananen zijn helemaal rot',
    'een afspraak bij de tandarts', 'eten en naar de film gaan', 'het lunchcafé op de hoek', 'twee weken vakantie',
    'als jij dan ook kan', 'bedankt voor je mail', 'dat is inderdaad lang geleden', 'de verjaardag van een collega',
    'de soep smaakt heerlijk', 'de soep is niet zo lekker', 'een droge witte wijn', 'het fruit met vanille ijs',
    'doe maar 30 euro', 'het toetje is heerlijk', 'twee blikjes cola', 'hier is het pinapparaat', 'de mosselen met friet',
    'het ijs met bosvruchten', 'en voor mij een Spa rood', 'die soep vind ik echt lekker', 'de garnalencocktail smaakt ook goed',
    'dit is echt heerlijk', 'het is 87 euro', 'doet u maar 90 euro', 'het heeft goede recensies', 'ja, hij is groot',
    'een cadeau voor hem kopen', 'warm voor de winter', 'kleding kopen en verkopen', 'de trui is rood', 'vijf jaar oud',
    'de reclame van winkels', 'berichten op mijn telefoon', 'informatie over uitgaan', 'raad eens waar ik nu ben',
    'het bier staat koud', 'net vlakbij het station', 'het oudste café van Utrecht', 'de huiskamer van de stad',
    'een lekkere maaltijd bestellen', 'het eten is duur', 'alleen vegetarisch eten', 'een afspraak bij de dokter',
    'daarna ga ik naar mijn werk', 'het concert duurt van 20.00 uur tot 22.15 uur', 'een afspraak bij de kapper',
    'veel vrienden bezoeken', 'de werkdag begint om 9.00 uur', 'de Nederlandse les begint om 9 uur en duurt tot 11 uur',
    'de kledingzaak is op de eerste etage', 'de broodafdeling is in het tweede pad aan de rechterkant',
    'volgende week ga ik op vakantie naar Spanje', 'praten met vrienden en familie',
    'het liefst volgende week dinsdag in de ochtend', 'dan hebt u een afspraak op dinsdag om 10:00 uur',
    'bedankt en tot dinsdag', 'vandaag ben ik lekker vrij', 'maar ik kan helaas niet', 'vrienden maken afspraken',
    'A belt B', 'vraag eerst aan elkaar hoe het gaat', 'maak dan een lunchafspraak voor komend weekend', 'B belt A terug',
    'de lunchafspraak kan niet doorgaan', 'dit aan A vertellen', 'A reageert enthousiast', 'en zal A terugbellen', 'A was ziek',
    'omdat ik ziek ben', 'als ik moe ben', 'morgen gaat de les niet door', 'online winkelen is makkelijk',
    'omdat je thuis kan blijven', 'cursist A vraagt', 'bijna alle kinderen hebben er al een',
    "'s ochtends moeten ze hem bij de juf inleveren", 'als de school uit is', 'krijgen ze hem weer terug',
    'er zijn twee groepsapps voor de klas', "sturen veel foto's en berichten naar deze app",
    'maar de meeste kinderen gebruiken hem niet zo vaak',
    'de meeste kinderen mogen anderhalf uur per dag hun telefoon of een computer gebruiken',
    'onze dochter gaat een jaar naar het buitenland als', 'mijn zoon wil graag een hond, maar ik denk dat',
    'als het werk klaar is', 'de intercity richting Rotterdam nemen', 'plaatsen in de trein reserveren',
    'de benzine is bijna op', 'een elektrische auto opladen', 'de auto moet naar de garage',
    'als je pech hebt, kun je de ANWB bellen', 'de indeling van huizen', 'het huis staat te koop', 'het huis is te huur',
    'er loopt een hond op straat', 'altijd de gordijnen dicht', 'de prijzen zijn gestegen', 'er rijden geen treinen',
    'mijn rug doet pijn', 'mijn gezicht is verbrand', 'mijn keel doet zeer', 'mijn keel doet pijn',
    'het doet pijn bij het slikken', 'neem contact op met uw huisarts', 'bedankt voor uw advies',
}

# Series built by one rule: the first card of each stays.
SERIES = [
    re.compile(rf'(de )?({DAYS})(ochtend|morgen|middag|avond|nacht)(en)?'),
    re.compile(rf'({UNITS})(en|ën)(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)'),
    re.compile(rf'({UNITS})honderd'),
    re.compile(r'om (?!\.\.\.).+'),
    re.compile(rf'half ({HOURS})'),
    re.compile(rf'op ({DAYS})( en ({DAYS}))?'),
    re.compile(rf'tot ({DAYS})'),
    re.compile(rf'in ({MONTHS})'),
    re.compile(rf'afgelopen ({DAYS})'),
    re.compile(r'(een paar dagen|twee weken|drie maanden|vijf jaar|twee uur|ruim een week) geleden'),
]

# The rule, said on the first card of a series, in every language: [ru, en, es, pt, tr, ro], an item each;
# Dutch examples go in an item of their own, so the rule stays readable before the answer.
DAYPARTS = 'maandagochtend, dinsdagavond …'
RULES = {
    0: [['так же с любым днём и частью дня', DAYPARTS], ['the same with any day and part of the day', DAYPARTS], ['igual con cualquier día y parte del día', DAYPARTS], ['o mesmo com qualquer dia e parte do dia', DAYPARTS], ['her gün ve günün her bölümüyle aynı', DAYPARTS], ['la fel cu orice zi și parte a zilei', DAYPARTS]],
    1: [['так же любое число от 21 до 99: единицы + en + десятки'], ['the same for any number from 21 to 99: units + en + tens'], ['igual con cualquier número del 21 al 99: unidades + en + decenas'], ['o mesmo com qualquer número de 21 a 99: unidades + en + dezenas'], ["21'den 99'a her sayı aynı: birler + en + onlar"], ['la fel orice număr de la 21 la 99: unități + en + zeci']],
}


def cards(node):
    yield from node.get('cards', [])
    for child in node.get('children', []):
        yield from cards(child)


def is_sentence(b):
    if b in KEEP or b in OWN_PATTERN:
        return False
    if b in SENTENCES:
        return True
    words = ART.sub('', b).lower().strip('?.!').split()
    if len(words) < 2:
        return False
    if words[0] in PRON:
        # Short pronoun + verb cards are verb forms.
        return len(words) > 3 or b.endswith('.')
    if re.search(r'[.?!]$', b) or words[0] in QUESTION:
        return True
    return words[0] in PREP


INFINITIVE = re.compile(r'^(не )?[а-яё-]+(ть|ться|ти|тись|чь|чься)$')
NUMERAL = re.compile(r'(пять|шесть|девять|десять|дцать)$')
# Glossed like an infinitive, but not a verb.
NOT_VERB = {'четверть', 'пусть', 'вплоть', 'поблизости', 'эти', 'ответь', 'кровать', 'память', 'часть', 'мать'}
SUBJECT = re.compile(r'^(een|ik|je|jij|u|hij|zij|ze|we|wij|jullie|het|dat|er|daar|hier|wat|hoe)\b', re.I)


def part_of(c):
    """A noun or a verb, by its article or its Russian infinitive; anything else stays untagged."""
    b, f = c['b'], c['f']
    if c.get('k') == 'sentence' or b.startswith('-') or b.endswith('-'):
        return None
    head = re.sub(r'\([^)]*\)', '', re.split(r'[;,:]', f)[0]).split()
    if re.fullmatch(r'(de|het) \S+', b) and not re.match(r'(оно|это|он|она)\b', f):
        return 'noun'
    if head and INFINITIVE.match(head[0]) and not NUMERAL.search(head[0]) and head[0] not in NOT_VERB and not SUBJECT.match(b) and '!' not in f and any(w.endswith('n') for w in b.split()):
        return 'verb'
    return None


def main():
    all_cards = list(cards(deck))
    for c in all_cards:
        c.pop('k', None)
        c.pop('p', None)
    firsts = {}
    for c in all_cards:
        series = None if c['b'] in OWN_PATTERN else next((i for i, rule in enumerate(SERIES) if rule.fullmatch(c['b'])), None)
        if series is not None:
            if series in firsts:
                c['k'] = 'combination'
            else:
                firsts[series] = c
        elif is_sentence(c['b']):
            c['k'] = 'sentence'
    add_rules(firsts)
    for c in all_cards:
        if part := part_of(c):
            c['p'] = part
    json.dump(deck, open(deck_path, 'w'), ensure_ascii=False, separators=(',', ':'))
    counts = {k: sum(c.get('k') == k for c in all_cards) for k in ('sentence', 'combination')}
    counts |= {p: sum(c.get('p') == p for c in all_cards) for p in ('noun', 'verb')}
    print(counts, {i: c['b'] for i, c in firsts.items()})


def add_rules(firsts):
    """The rule goes on as the note's last items, once."""
    langs = ['en', 'es', 'pt', 'tr', 'ro']
    packs = {lang: json.load(open(root / 'public' / 'lang' / f'{lang}.json')) for lang in langs}
    for series, texts in RULES.items():
        card = firsts[series]
        card['n'] = with_item(card.get('n'), texts[0])
        for lang, text in zip(langs, texts[1:]):
            row = packs[lang]['cards'][card['id']]
            row.extend([''] * (4 - len(row)))
            row[3] = with_item(row[3], text)
    for lang, pack in packs.items():
        json.dump(pack, open(root / 'public' / 'lang' / f'{lang}.json', 'w'), ensure_ascii=False, separators=(',', ':'))


def with_item(note, new):
    items = [i for i in (note or '').split('; ') if i]
    return '; '.join([*items, *(i for i in new if i not in items)])


if __name__ == "__main__":
    main()
