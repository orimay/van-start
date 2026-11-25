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
- [x] TDD black-box specs, CLAUDE.md + review checklist, check visually (phone, light/dark), deploy, verify live.

## Contrast, back on home, group settings return (2026-11-25)
- [x] Primary buttons fail AA contrast (white on orange-600 is 3.6:1). White text on orange-700 (5.2:1), on every white-on-orange spot.
- [x] Back on the home page jumps through history: the pages' "‹" and "To sections" add a new home entry every time. Back on home must offer to leave instead.
- [x] Done with a group's settings (opened from the gear in its start menu): back to that start menu, not everything closed.
- [x] Updates come late: a new version on the site shows only after several reloads of the home page. Wanted:
  - the first reload gets the update;
  - the first navigation (a step) in a game picks it up, as soon as it is on the site;
  - caching is the likely culprit; check for the update with an uncached request, ASAP.
- [x] Typing a wrong answer that is another existing word marks it as mixed up with that word. The match must count symbols: `terug` and `terug-` are different words, so are `een (a)` and `een (one)`. When it is ambiguous (ignore symbols or ignore accents is on and more than one word matches), a popup asks which word it was mixed up with. Closed without a pick, it can be opened again.
  - A marked form typed (`terug-`, `één`) is a deliberate pick: only that word. A plain one (`terug`, `een`) may also mean the marked one when ignore accents is on: the popup offers both.
  - The hint says "both" for one word, "all" for several.
- [x] Mix-up search orders results by closeness to what was typed: `terug` lists `terug`, `terug-` first, then the rest by growing distance: words starting with it, then ones holding it further in, and so on.
- [x] TDD black-box specs, CLAUDE.md + review checklist, check visually (phone, light/dark), deploy, verify live.

## Safe area everywhere, known mix-ups on reveal (2026-11-25)
- [x] The whole interface keeps clear of the safe area, not only sheets: the lesson's continue button is clipped by the screen's rounded corners. Every element at a screen edge (button rows, continue/next, toasts, headers) keeps its inset.
- [x] After a card is revealed, show the words it is already mixed up with (e.g. under the `≈` icon), so the user does not mark them again.
  - Open question from the user: should marking an already-linked word again be allowed, giving that card one more miss? Find the best UX.
  - Default: the linked words show by `≈` after reveal; the picker lists them first ("Mixed up before"), one tap counts this step as mixed up again (both missed again, link unchanged).
  - The user's alternative, unsure if right: on a miss, mark every linked card wrong automatically. Weigh it.
- [x] TDD black-box specs, CLAUDE.md + review checklist, check visually (phone, light/dark), deploy, verify live.

## A miss counts directly linked mix-ups as missed (2026-11-25)
- [x] A miss on a card also counts every card directly linked to it as mixed up as missed, so the pair is reinforced; links of links are not followed. The linked ones come back like a picked mix-up.
- [x] TDD black-box specs, CLAUDE.md + review checklist, check visually (phone, light/dark), deploy, verify live.

## Mix-up detection, affix look, context layout, derivation links (2026-11-25)
- [x] Typed `-ste` was auto-detected as a mix-up with `de`: unacceptable. Auto-detect only on an exact match, or an obvious other form of the same (`terug` for the affix `terug-` means `terug-` or `-terug`). Not reproducible: auto-detect links only a card whose answer the leniency accepts or that lacks only marks or an affix hyphen; `-ste` links nothing in any of the 6 languages. Regression spec added.
- [x] An auto-detected mix-up, then Back, then Later instead of Forgot cancels the mix-up. Later now keeps the words it was taken for missed (and brings them back sooner); only the card's own answer is taken back.
- [x] Affix cards suggest other affixes as look-alikes (affix mixed up with affix, non-affix with non-affix); weigh the same heuristic for `tegen-` vs `tegen`.
- [x] Everything in the explanation under the divider leaves the layout while hidden.
- [x] Affix cards are not distinct enough: tint them (violet-ish background or text shade). Look at where the same word appears as different cards (parts of speech) and tint those apart too.
- [x] Hidden context still takes space: when open, show the context icon before it; when hidden, the same icon in the top-left corner.
- [x] Derivation links are uneven (a word without -e linked, its -e pair only pointing to it; `volgend` and `volgende` both linked to `volgen`). Pick one logical rule across all cards, apply it, record it. Rule: `от:` on the base alone, its -e card names only `форма от:` the base (volgen → volgend → volgende); `form-notes.spec.ts`.
- [x] Before reveal the mix-up picker spoils the word being guessed. Decide: drop manual mix-up before reveal (once detection is exact), or keep it while hiding what the card is mixed up with and leaving it out of the matches (the card itself is always left out). Kept: before the answer the picker lists only what the typed answer is, never the linked or look-alike cards.
- [x] Back on home still goes to the previous page. Home is the last stop: there the history holds only home, and Back offers to leave.
- [x] The affix card meaning `-ция` (ru) gives `поздравление` as its example, not one word in `-ция`; `-ение` is missing, or sits on another affix card, which would explain the mix-ups. Describe it better in all 6 languages; check the other affix cards for the same.

## Earlier mix-ups: never before the answer, listed under ≈ (2026-11-25)
- [x] No "mixed up before" hint before the answer shows (a typing retry included): seeing it, the user steers clear of the known-wrong word and the other card never gets its new miss.
- [x] Once the card is open, list the earlier mix-ups under the `≈` button on the card itself, one per line, the freshest on top.
- [x] TDD black-box specs, CLAUDE.md + review checklist, check visually (phone, light/dark), deploy, verify live.

## be- and etymology notes (2026-11-25)
- [x] be- says it changes the verb's meaning: is that so? betekening: is it be- + tekenen (to mark, to signify)? Research the etymology, explain it well on the linked words, and fix be-'s native description in all 6 languages so it is right.
- [x] Then go over every linked word: the etymology notes are right and the examples fit (not an affix about `-ость` giving `-ние` words as examples). be- is now `действие на кого-то или что-то; снабдить чем-то, сделать каким-то; исходно: вокруг, при` (Proto-Germanic *bi), every linked word glossed with its sense, bestaan/besluiten with `букв.`; ver- got `до конца, полностью` for the same empty gloss; ont- `навстречу` (ontmoeten, ontvangen, from *and-); -voud `грамматическое число` (enkelvoud, meervoud); -baar and ont- breakdowns split their own example. Specs: no `меняет смысл`, a breakdown splits its own example.
- [x] -end says `-ющий: делающий что-то`: it reads like an example, or like a verb, and confuses. `соответствующий` is not "doing something". Describe `-end` right in all 6 languages; check its examples and linked words. Now `-ющий, -ящий: который что-то делает` (en `-ing: that does something`), example `volgend (следующий: который следует)`, glosses updated, passend's note reads `который подходит`.

## Typed-letter diff: an extra space reads as a hyphen (2026-11-25)
- [x] A struck-through extra space looks like a wrongly typed hyphen. An extra or wrong space is drawn as `␣`, so its strike reads as a space; the rest stays (extra: red box + strike, wrong: red box, missing: `_`).
- [x] TDD black-box spec, CLAUDE.md + review checklist, check visually (phone, light/dark).
- [x] Deploy, verify live.

## samen- vs mee- (2026-11-25)
- [x] Both said `вместе`. Now mee- = `заодно с кем-то, с собой` (join what another does, or take along: meegaan, meenemen), samen- = `друг с другом, сообща` (two or more on equal terms: samenwerken); each note ends with `не путать с:` the other. All 6 languages, glosses on every linked word.
- [x] Deploy, verify live.

## Words linked by hand as mixed up (2026-11-25)
- [x] Typed `fietwandeling` for `fietstochten`, linked de tocht and de wandeling: both must count as missed in the current game. Session already did; regression specs added. The real gap: the mix-up search found nothing for a query with its article (`de tocht`); fixed.
- [x] Deploy, verify live.

## Affix look-alikes (2026-11-25)
- [x] An affix card suggests affixes under "Looks alike", a word suggests words; tegen- and tegen still find each other through the shared stem.

## Update only at a move (2026-11-25)
- [x] An update never reloads mid-card (a cursor may be in a field). It installs only within 2 s of a move: card to card in a game, or page to page. Holds still apply; one released between moves waits for the next.
- [x] Deploy, verify live.

## Article hints in every phrase (2026-11-25)
- [x] `совершить велопрогулку` did not say een. Every phrase whose article Russian does not show now says it: `(какой-нибудь)` / `(какой-то)` / `один` for een, `(конкретный)` / `(свой)` for de/het; tr `bir` / `(belirli)`; en/es/pt/ro articles fixed. Terms, quantities, set prepositional phrases and definite sentence topics exempt. Data spec on every `een … <verb>` phrase.
- [x] Deploy, verify live.

## Affix examples show the named suffix (2026-11-25)
- [x] -tie: `-ция: действие или его результат`, example informatie, note adds reactie and felicitatie (`-ение`); -ing: `-ение: …`, example oefening; each under the other's `не путать с:`. -schap example lidmaatschap, mede- medewerker, ont- adds `от-`.
- [x] Deploy, verify live.

## Dictation replay (2026-11-25)
- [x] Replaying the word or phrase resets the countdown: a replay means the learner did not catch it.
- [x] Deploy, verify live.

## Every sense, every origin, every -e pair (2026-11-25)
- [x] zitten op lists one sense: every word lists all its common senses, in all 6 languages.
  - Done: zitten op holds учиться в; заниматься; сидеть на. Phrases gained opzoeken/zoek op (навещать), over zijn (остаться), pijn doen (причинять боль), vandaan komen (быть родом), letten op/let op (присматривать), gaan over (отвечать за), langer (длиннее; выше).
- [x] Every word links to its origin (verb, noun, affix, root) down the chain (ontbijt -> ontbijten -> ont- + bijten -> bijten); a missing origin word gets a card right before its first use.
  - Done: ~90 compounds got `от:` down to the root in 6 languages; new part cards de machine, het veld, de drank, het varken, het rund before their first use. Opaque or false splits (weekend, slager, boterham, gewoon) stay unsplit.
- [x] Every adjective has its with/without -e pair card (middelbaar/middelbare).
- [x] van huis: `из дома; от дома`, note shows both uses (ga van huis, ver van huis).
- [x] Deploy, verify live.

## Comparative and superlative affixes (2026-11-25)
- [x] Affix cards for the comparative -er and the superlative -ste; their notes tell -er of degree (ouder) from -er of the doer (bakker), both ways. Every comparative and superlative links to its affix, in all 6 languages.
- [x] Deploy, verify live.

## Why the article, in every phrase (2026-11-25)
- [x] `совершить велопрогулку (какую-нибудь)` still does not say where the article comes from: Russian (and Turkish) has none, and a bike ride can be specific or any. Every phrase card with an article gets a note saying why that article, in all 6 languages. A noun's own card always shows its definite article.
  - Decided: every article in a phrase gets a closing note item in ru and tr (Russian and Turkish have no articles): why this one (any of many / named first vs. known, own, unique, season or time of day...) and the other form, -e included. en, es, pt, ro have a/the of their own, so their translation shows the article; 30 en/es/pt and 3 ro translations that dropped it were fixed (in class -> in the classroom). Idioms where those languages drop it too stay (ce idee buna, acum cateva zile).
- [x] Deploy, verify live.

## boodschap has no links to its parts (2026-11-25)
- [x] boodschap = bode (messenger) + -schap (task): link both, explain how message, groceries and the toilet euphemism all come from "a messenger's errand". All 6 languages.
  - Done: de bode, de pad (toad), de aarde added before their words; paddenstoel, aardappel, sinaasappel and boodschap carry `от:` and a literal-meaning item; -schap gained the sense "task, office".

## Every word links to its parts (2026-11-25)
- [x] boodschap (bode + -schap) and paddenstoel (pad + stoel) had no `от:`; the links audit only finds splits into existing cards. Go over every word and set phrase without `от:`, add the missing part cards before the word, all 6 languages. Phrases too: every non-sentence card and every set expression names its parts (een douche nemen: de douche + nemen) and says why that verb.
  - Done: words as above; phrases held by `phrase-parts.spec.ts`. Left without parts: words whose part has no card or no use alone (frisdrank, moestuin, stokbrood, luchthaven).

## Plurals lose meanings of their singular (2026-11-25)
- [x] de bladeren showed only "листья" with no word on blad's other senses (bladen), and het blad lacked "magazine". Every plural of a multi-meaning word covers each meaning or says it has no plural / another plural; a spec holds it. Recheck singular descriptions for missing common senses deck-wide.
  - Done: `plural-meanings.spec.ts` checks all 6 languages (drogisten, agenda's, functies fixed). Singulars gained doel (ворота), voorwerp and persoon (грамматика), lang (высокий), zacht (тихий), bloem (мука), ruim (с лишним), serie (серия), zakken (опускаться), uitslag (матч, выборы; сыпь), meester (мастер), instelling (настройка), werk (произведение); plurals and -e forms follow.

## Wrong answer shows a strike-through diff (2026-11-25)

Wrong parts of the typed answer are struck through, the right ones follow them: ~~naar~~op vakantie gaan, ~~v~~felicit~~i~~eren, de do~~e~~uche, de w~~ink~~age~~l~~n.

## Typecheck is red (2026-11-25)

- [x] `npm run typecheck` reports 15 errors, none from the diff/gloss work: plugins `$router` unknown, `NoteText.vue` segment union, `SectionTree.spec.ts` settings fixtures, `Session.spec.ts` `gameScores`, `useCardSheet.ts` `indexed`. Now 0: plugins take `useRouter()` (Nuxt's vue-router 5, the app's direct dep is 4), fixtures typed.

## Every affixed word is split (2026-11-25)
- [x] A word carrying an affix the deck has a card for names that affix and its base (uitstekend = uitsteken + -end), in all 6 languages. `affix-split.spec.ts` checks the marked affixes (ge-, -ig, ...) by shape and every other deck affix when the rest is a deck word (spannend, de opvang, de afvoer, de bijdrage, onverwacht, de kunstenares, de mixer, 9 comparatives); groter/beter/liever/het liefst(e) now name their degree; look-alikes (de kamer) and bases the deck lacks (slaan in de slager) are grouped exemptions.
- [x] Deploy, verify live.

## Putting a card off takes its mix-up back (2026-11-25)
- [x] Dictation took «en» for the letter n, then Later still counted the miss on en and kept the link. Putting a card off misses nothing and undoes the links its step made.
- [x] Deploy, verify live.

## Letters and sentences are tinted (2026-11-25)
- [x] A letter card (green) and a sentence card (cyan) look apart from nouns, verbs, affixes and plain cards; hues stay at least 40 degrees apart.
- [x] Deploy, verify live.

## Finishing a group lags (2026-11-25)
- [x] Answering the last card of a 100-card group in its last game stalls visibly: 100 × two whole-store saves. `store.learn` saves the group once.
- [x] Deploy, verify live.

## Missed etymological links (2026-11-25)
- [x] tellen does not name het tal. Found by a consonant-skeleton scan of single-word pairs; ~50 cards linked in all 6 languages (verb ← noun, noun ← verb/adjective, -e forms, plurals, superlatives, related peers both ways). `root-links.spec.ts` lists the pairs and checks `родственное` goes both ways.
- [x] Deploy, verify live.
  - [x] pas (only, just) `от: de pas` via op dat pas «at that very step».

## A derived word keeps its base's senses (2026-11-25)
- [x] gelukkig lacked удачный (geluk is счастье and удача). Scan of derived/form cards with fewer senses than their base: de vriendin девушка, schuldig должный (+ `iemand iets schuldig zijn`), mogelijk возможно, harder громче/твёрже, dunne/dunner худой, bekende знакомый, onregelmatige нерегулярный, de voorstelling представление (+ `zich een voorstelling maken van`), all 6 languages. Verb forms and -e forms whose missing sense is an adverb are fine. Rule in CLAUDE.md and the checklist; `senses.spec.ts` lists them.
- [x] Deploy, verify live.

## Missing senses and links (2026-11-25)
- [x] bezittelijk(e) has all its senses (притяжательный (грамм.); собственнический; имущественный), comes from bezitten and names het bezit and de bezitter. Whole deck: 23 families of words made from one base by a suffix now name each other (de sleutel, het slot, de sluiting; de kok, de keuken; de lezer, de lezing ...), `root-links.spec.ts` finds them from the `от:` links. A cross-language scan found senses Russian lacked or ran together: de stem голосование, eerlijk справедливый, het karton пакет, het gaatje дупло, de man мужчина; муж, licht, het bad, de pech, de flat, daarachter; all in `senses.spec.ts`.
- [x] New `от:` links moved ont- and -baar ahead of ontmoeten and middelbaar: those now voice the affix; the plurals de vriendinnen and de voorstellingen got their second sense; kun jij? reads `poți tu?` in Romanian, apart from kun je.
- [x] Deploy, verify live.

## A front tells its card apart (2026-11-25)
- [x] alweer «опять, снова» and weer «снова, опять» were the same card without the hidden example. Whole deck: fronts with the same senses in any order now differ in every language (alweer «опять (с досадой)», de arts «врач (официально)», besluiten / beslissen, de bloes / de blouse, ~35 ru and ~150 translation-only clashes: homonyms like pt segundo, es seguro, tr sıcak, ro mare). `duplicate-prompts.spec.ts` checks all 6 languages; affixes and forms are exempt.
- [x] Deploy, verify live.

## Card fixes from review, and cleaner card colours (2026-11-25)
- [x] aflopen card before afgelopen (`af- + lopen`), afgelopen `прошедший, закончившийся`, het is afgelopen «это закончилось, прошло» as its perfect form; afgelopen maandag/donderdag and het paasei (Pasen + het ei, het ei first) name their parts; telefoneren met een vriend «говорить по телефону с другом»; boodschappen doen also `выполнять поручения`; Kom je met de fiets?, hoe laat is het?, openen, het lid, de Kerstmis, om half één and more; all 6 languages.
- [x] Card tints were muddy and dark cards hardly showed their kind. Light: near-white wash with a clear border; dark: faint wash, the hue in a bright border; the plain dark card a stone-600 border. Quiet text kept at 4.5:1 on every tint (`surface.spec.ts`); grey text across the app fixed to AA in both themes (`contrast.spec.ts`). Checked on screen in light and dark.
- [ ] Deploy, verify live.
