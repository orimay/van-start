# Todo

Decisions agreed with the user and not shipped yet. Tick an item only once it is deployed.

Work through every item before stopping. Never stop on a question: pick the sensible default, write it into the item, keep going.

## In progress

- [x] No «без артикля»/«без de» hint on any card with an article, all 6 languages (`article-notes.spec.ts`).
- [x] het eind / het einde notes: only variant + register, no «eind mei», «een heel … lopen», «aan het …» trivia.
- [x] Sweep all notes (all 6 languages). Decided:
  - [x] Prompt side never hints with Dutch: rewrite such notes in words.
  - [x] Adjective -e notes keep the rules format; exceptions are `!` lines, rendered red.
  - [x] Separable prefixes: the explanation stays; the Dutch example shows only after reveal.
  - [x] Register notes use words only (официальное, разговорное, короткое, книжное), never a named Dutch word.
  - [x] Other mentions and examples show only after reveal; mentioned words are links to the word sheet.
  - [x] Mechanism: a note line can be marked "after reveal" and stays invisible until the answer opens. Spec: no visible prompt-side line carries Dutch.

## Affix cards in pronounce

- [x] New field `xl`: breakdown of the example word in all 6 languages, e.g. `voor- (перед) + naam (имя): букв. «переднее имя»`.
  - Taken from the example word's `от:` where it exists; «букв. …» where it helps.
  - Written by hand where missing: be-, na-, uit-, mede-, onder-, -tie, -lijk, -ig, on-, -schap, -baar, -aar, -je, -nis, bij-, vast-.
- [x] Replace examples that do not show the affix's meaning: `onder-` onderweg → de onderbroek, `na-` nadenken → nazeggen. Review all 48 for the same. `xf` must equal the word card's `f`; rebuild audio.
- [x] Own rendering in pronounce and the pronounce intro:
  - affix + meaning, small, on top;
  - the word: affix bright, rest grey, no caps;
  - the word's gloss;
  - the breakdown, shown at once.
- [x] Specs: every affix `xb` starts/ends with its affix; every affix has `xl` in every language.
- [x] Check the affix examples that have no word card of their own for ambiguous glosses (e.g. leraar «учитель»).

## Settings: sentences and combinations

- [x] Two settings, both on by default: «Предложения» and «Комбинации».
  - Off: the cards vanish everywhere (learn, review, counts, progress bars). Learned progress is kept and comes back when switched on.
  - Switched on later: passed sections offer «Learn» again for just those cards.
  - Verb forms (`jij hebt gezien`) always stay. Fixed expressions (`het spijt me`) and compounds with an opaque meaning always stay.
- [x] Per-group override in the section menu, next to Learn/Review: a sheet with both toggles, three states each (as in settings / on / off).
  - The effective value is the nearest own setting up the tree, else the global one.
  - A badge marks a group with its own setting.
  - A parent with mixed subgroups shows «смешано». Changing it lists what each subgroup gets and asks to confirm, then clears the subgroups' own settings.
  - Changing the global setting while groups have their own: say so and offer to reset them.
  - Learn and review check each card against its own group's setting.
- [x] Deck flags, by a candidate script plus manual review:
  - sentence: example sentences that only illustrate a word; `op zaterdagavond` counts as one;
  - combination: rule-built series. Day + day part: the first card stays and gets the note «так же с любым днём и частью дня: …», the rest are flagged. Check numerals (`zesentwintig`) and other series.
  - Decided: survival formulas (`kan ik pinnen?`, `met de fiets`, `in het weekend`) stay unflagged; `om half acht`, `om kwart over acht`, `om 12.30` are each their own pattern, not a series card. Result: 706 sentences, 70 combinations (`scripts/flag-kinds.py`).
- [x] TDD black-box specs, CLAUDE.md, deploy.

## Deck

- [ ] Nouns carry their article wherever they can. Days are fixed; scan the rest of the deck for bare nouns (e.g. mazelen, rode hond: Dutch says de mazelen, de rode hond).
- [ ] Where it is not obvious the article is needed (phrases, sentences), the prompt says specific or general in words: «(конкретный)» for de/het, «(какой-нибудь)» for een. Never by naming de/het. Sweep all 6 languages.
