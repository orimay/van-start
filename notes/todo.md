# Todo

Decisions agreed with the user and not shipped yet. Tick an item only once it is deployed.

## In progress

- [x] No «без артикля»/«без de» hint on any card with an article, all 6 languages (`article-notes.spec.ts`).
- [x] het eind / het einde notes: only variant + register, no «eind mei», «een heel … lopen», «aan het …» trivia.
- [ ] Sweep all notes for the same: usage trivia and Dutch examples that do not help tell what to answer. List candidates for the user to confirm before removing.

## Affix cards in pronounce

- [ ] New field `xl`: breakdown of the example word in all 6 languages, e.g. `voor- (перед) + naam (имя): букв. «переднее имя»`.
  - Taken from the example word's `от:` where it exists; «букв. …» where it helps.
  - Written by hand where missing: be-, na-, uit-, mede-, onder-, -tie, -lijk, -ig, on-, -schap, -baar, -aar, -je, -nis, bij-, vast-.
- [ ] (data done, not deployed) Replace examples that do not show the affix's meaning: `onder-` onderweg → de onderbroek, `na-` nadenken → nazeggen. Review all 48 for the same. `xf` must equal the word card's `f`; rebuild audio.
- [ ] Own rendering in pronounce and the pronounce intro:
  - affix + meaning, small, on top;
  - the word: affix bright, rest grey, no caps;
  - the word's gloss;
  - the breakdown, shown at once.
- [ ] Specs: every affix `xb` starts/ends with its affix; every affix has `xl` in every language.
- [ ] Check the affix examples that have no word card of their own for ambiguous glosses (e.g. leraar «учитель»).

## Settings: sentences and combinations

- [ ] Two settings, both on by default: «Предложения» and «Комбинации».
  - Off: the cards vanish everywhere (learn, review, counts, progress bars). Learned progress is kept and comes back when switched on.
  - Switched on later: passed sections offer «Learn» again for just those cards.
  - Verb forms (`jij hebt gezien`) always stay. Fixed expressions (`het spijt me`) and compounds with an opaque meaning always stay.
- [ ] Per-group override in the section menu, next to Learn/Review: a sheet with both toggles, three states each (as in settings / on / off).
  - The effective value is the nearest own setting up the tree, else the global one.
  - A badge marks a group with its own setting.
  - A parent with mixed subgroups shows «смешано». Changing it lists what each subgroup gets and asks to confirm, then clears the subgroups' own settings.
  - Changing the global setting while groups have their own: say so and offer to reset them.
  - Learn and review check each card against its own group's setting.
- [ ] Deck flags, by a candidate script plus manual review:
  - sentence: example sentences that only illustrate a word; `op zaterdagavond` counts as one;
  - combination: rule-built series. Day + day part: the first card stays and gets the note «так же с любым днём и частью дня: …», the rest are flagged. Check numerals (`zesentwintig`) and other series.
- [ ] TDD black-box specs, CLAUDE.md, deploy.

## Deck

- [ ] Nouns carry their article wherever they can. Days are fixed; scan the rest of the deck for bare nouns (e.g. mazelen, rode hond: Dutch says de mazelen, de rode hond).
- [ ] Where it is not obvious the article is needed (phrases, sentences), the prompt says specific or general in words: «(конкретный)» for de/het, «(какой-нибудь)» for een. Never by naming de/het. Sweep all 6 languages.
