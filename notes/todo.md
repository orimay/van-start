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

## Batch 2026-11-25

### Links between words (data, every card, all 6 languages, no agents)

- [x] de genote has no link to its pair de genoot; words built on them aren't linked either (de echtgenoot, de echtgenote). Link every pair (m/f, sg/pl, base/-e…) and every parent-child (`от:`), as some already are.
  - Found: labels the linker does not know, so their words never link: `просьба/приказ, от:` (114 cards), `женский род от:`, `превосходная степень от:`, `о женщине:`, `также сущ.:`, `иначе живёт в составных словах:`, and mid-item `— …, от:` (de jongere, voorstellen). Teach the linker every one of them in all 6 languages, or rewrite the item.
- [x] tegenwoordig: linked to anything? If so, why is no link visible? -ig? tegenwoord? and that in turn? tegen? woord? The origin must be the true one (check the etymology; don't claim woord if it isn't; say so under `не путать с:` if useful).
- [x] Every card built from parts links to those parts: make sure every link is built, nothing missed, including roots where the vowel changes (zingen → gezang, sluiten → sleutel).
- [x] de zelfstandige exists. Is there a wrong `de zelfstandig`? If so fix it and link, and make sure the links work (render, tap opens the sheet). zelfstandig(e): neither the affix (-ig) nor the forming words (zelf, staan/stand) are linked.
- [x] The same for all cards: likely more than half lack links. kletsnat is almost certainly not linked to nat, and klets (or whatever its first part is) isn't singled out.
- [x] Mechanical audit script (parts of a word that are cards vs its `от:` refs; `от:` parts that resolve to no card), every hit reviewed by hand, then a spec that keeps links from being lost.

### Card content

- [x] op- says `смысл не меняется` with opbellen as the example. Not true: bellen is general / the process (`Ik bel je morgen`, `Hij is aan het bellen` = on the phone now; also ringing a doorbell); opbellen is the concrete act of calling someone up, dialling (`Ik bel je morgen op`, `Kun je de dokter even opbellen?`), separable op-, a bit more concrete / insistent; in 90% of everyday speech people just say bellen. Fix op-, opbellen (and bellen if needed) in all 6 languages; re-check every other card claiming `смысл не меняется`.

### UI

- [x] Scroll thumb: a slightly darker track behind it, so it is clearly a scrollbar and shows where it is scrolled to.
- [x] Hyphenated affixes never break across lines: the -in meaning read `О женщине: не после -` / `er, -aar (аффикс)`. Everywhere: prompt, answer, choice options, match tiles, notes. Words may wrap, affix hyphens never.

### Confusion links (feature)

- [x] When I recall the wrong card (mixed up -tie and -ing), I can say I confused it with X, not just that I was wrong. Then X is marked wrong too.
- [x] Picking X: a sheet with search by native AND by Dutch; choose the card to link.
- [x] Links are editable (wrong one linked: remove / change). A card can link to several cards.
- [x] Direction does not matter: A confused with B is B confused with A.
- [x] Links chain: A~B, B~C, D~C make {A, B, C, D} one group.
- [x] Whenever a card of a group lands in a deck, learning AND review, the whole group lands in the same deck.
- [x] Not enough room: a group displaces unpaired cards.
- [x] A group that still does not fit after displacing every single takes an arbitrary subset of itself.
- [x] Several groups in and not all fit: drop the smallest group until all fit; fill the shortfall from singles.
- [x] After building: check it visually (phone viewport, light and dark) and fix the UX until it is the best and most convenient it can be, no glitches. Shoot, fix, shoot again.
- [x] TDD black-box specs, CLAUDE.md + review checklist, deploy, verify live.

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

- [x] Nouns carry their article wherever they can. Days are fixed; scan the rest of the deck for bare nouns (e.g. mazelen, rode hond: Dutch says de mazelen, de rode hond).
  - Decided: de mazelen, de rode hond, het basketbal, het kickboksen, de gymnastiek, de fitness, de wifi, de oudejaarsavond; "no article" notes dropped. Kept bare: department names (personeelszaken, burgerzaken), address forms (meneer, mevrouw), retour, months, days.
- [x] Where it is not obvious the article is needed (phrases, sentences), the prompt says specific or general in words: «(конкретный)» for de/het, «(какой-нибудь)» for een. Never by naming de/het. Sweep all 6 languages.
  - Decided: marked the 39 adjective + noun examples, where the -e ending hangs on it (ru marker agreeing with the noun, tr `(belirli)` / `bir`, en/es/pt/ro their own article, ro articulated form). Fixed phrases and instructions (in de klas, beantwoord de vragen, op het werk) stay unmarked: the article there is idiom, not a choice, and en/es/pt/ro already show it.

## Recall: hint, affix transcription, mixed up (2026-11-25)

- [x] The `?` button shows only once the card is revealed; before that it lets you cheat.
- [x] Affix cards: the affix part of the example's transcription is not highlighted (the Dutch word highlights the affix, its transcription does not). Highlight it the same way.
- [x] Marking a card mixed up (af- picked as mixed up with ver-) jumped to the next card at once. Sudden. Instead:
  - stay on the card; the success button(s) are disabled on this step while a mix-up picked on this step stands;
  - removing that mix-up again on this step (if it was added here) enables them back;
  - a better UX is welcome, propose it.
  - clarified: Remembered is disabled only when the mix-up was set on this very step and not removed again; one linked earlier does not disable it.
- [x] After picking, af- vanished from the list. What if I was wrong, or want to split them again? The picked card stays visible and can be unpicked right there.
- [x] If the mix-up stands, the other card joins the deck ahead, unless it is already there; not right after the current card: mixed-up cards are better kept apart by other cards.
- [x] Dialog interactions are awkward. Look at how focus-assistant (`~/Projects/private/apps/focus-assistant`) uses dialogs and do the same here. Clarified: it is about where buttons and inputs sit in dialogs (actions and the search field in thumb reach at the bottom, as focus-assistant does).
- [x] Respect the screen's safe areas everywhere, so the rounded corners and notch of a phone hide nothing (sheets, fixed bars, page edges, landscape too).
- [x] Group settings (which cards it plays) open not from the "Cards" button but from a gear, e.g. top right of the dialog's title row.
- [x] Red text (the exceptions on cards) fails a11y contrast; make it pass, lighter probably. Check both themes.
- [x] TDD black-box specs, CLAUDE.md + review checklist, check visually (phone, light/dark), deploy, verify live.

## Phone back: confirm leaving the app (2026-11-25)
- [x] Phone back closes every open layer one press at a time, then leaves the app. Instead of leaving, ask to confirm leaving:
  - confirmed: leave (as if the user pressed back, without hiding the sheet first, so the app really leaves);
  - declined, or back pressed again: the sheet closes and the user stays in the app.
- [ ] TDD black-box specs, CLAUDE.md + review checklist, check visually (phone, light/dark), deploy, verify live.
