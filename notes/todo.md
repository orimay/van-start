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
- [x] Deploy, verify live. Card contrast spec covers every card kind, side and outcome in both themes.

## Review round 2026-11-26 (user + Gemini notes)
Each finding that can occur more than once is fixed across the whole deck, in all 6 languages, with a spec or audit that finds every case.
- [x] -baar card. Front reads «можно сделать, -емый; с этим свойством (аффикс)». The examples are betaalbaar «доступный по цене» and dankbaar «благодарный», which end in -ный, not -емый, and «можно сделать» is unclear. Rewrite the front and notes so every listed sense has an example of it: «который можно …» (eetbaar съедобный, drinkbaar питьевой, betaalbaar, verstaanbaar внятный) and «обладающий свойством» (dankbaar, vruchtbaar). Add the spelling rule: before -e the syllable opens and the doubled vowel drops (eetbaar → eetbare, het betaalbare huis). Check every other affix card the same way: each sense on the front has its own example, and the Russian suffixes named on the front match the examples.
- [x] middelbaar is split as het midden + -baar. It is het middel + -baar: middel used to mean «середина» (cf. English middle, German Mittel); today het middel is «средство» and also «талия», and het midden kept «середина». Fix the split, name the old sense in the note, and add «талия» to het middel (missing now). De middelbare school, de middelbare leeftijd as examples.
- [x] het kleed has only «коврик». het kleed is «ковёр; скатерть; покрывало», het kleedje «коврик; скатёрка; плед» (diminutive, link both ways). Plural de kleden is «ковры, скатерти»; de kleren «одежда» is the old plural of kleed and means only clothes now; say so in the notes and check the plural cards. Compounds het vloerkleed (vloer + kleed), het tafelkleed (tafel + kleed) if in the deck. Sweep: every diminutive card vs its base card, the base keeps the full-size sense, the -je card the small one.
- [x] Example «Doe het pak in …» with «пакет» in the translation: unclear which pak. het pak is «костюм; пачка, упаковка (картонная: pak melk)»; a soft bag is de tas / de zak. Rewrite the example and its translation so the sense is unambiguous (Doe het pak in de tas. / Ik koop een pak melk.). Sweep: every example of a polysemous card makes clear which sense it shows.
- [x] het beeld vs de tekening: the cards do not show the difference. het beeld «статуя, скульптура; изображение (на экране); образ, представление (een duidelijk beeld)», het beeldje «статуэтка»; de tekening «рисунок (карандашом), чертёж»; het schilderij «картина (красками)». Fix senses and DON'T CONFUSE notes so each states what tells them apart.
- [x] All DON'T CONFUSE pairs: the difference must be explicit on both cards (one line each, what this one is and when). Examples given: vooraf «заранее, предварительно (до начала, нейтрально)» vs alvast «заранее, пока что, уже сейчас (наперёд, разговорное; alvast bedankt)»; pakken «брать (обычно, нейтрально; de trein pakken)» vs grijpen «хватать (резко, крепко; een kans grijpen)»; aardig(e) «приятный, дружелюбный, любезный; неплохой (о вещах)» vs lief/lieve «добрый, ласковый, милый, дорогой (близким; Lieve Anna)» — aardige and lieve both read «милые» now. Audit every confusables pair and every pair of fronts sharing a sense word; a spec checks each pair carries a distinguishing note.
- [x] Confusables list (the ≈ panel, top left of the answer card) overlaps the answer word: compleet with «definitief / vast / compleet maken» drawn over «полный, законченный». It must never overlap any card text, on any width, and still look good (e.g. the list takes its own row above the answer, or collapses behind the ≈ button). Black-box spec for layout order; check on screen at 360-400px wide, light and dark.
- [x] vast «постоянный; наверняка» vs vaste «постоянный». Verify: vaste is the inflected adjective, so the adverb sense «наверняка» (dat komt vast goed) belongs only to vast. If right, the vaste card says so (note: «наверняка» only as vast), so it does not read as a missing sense. Sweep every base/-e pair: senses equal except adverb-only senses, and each such difference noted on the -e card.
  - Done: every base/-e pair aligned in 6 languages; base-only senses named as `только <base>: …` items on the -e card; spec `adjective-forms.spec.ts`.
- [x] vroeg has a card, vroege does not. Find the rule the deck uses for -e cards and every adjective it misses (an -e form that occurs in a deck example or phrase, or a frequent adjective whose -e form changes spelling); add them, linked from:/forms both ways, all 6 languages.
  - Done: rule = an adjective whose translation gives an adjective sense has its -e card (`form-notes.spec.ts`, exemptions in `NO_E_FORM`). Added vroege, echte, ronde, nette, erge, enige, natuurlijke, automatische, behoorlijke, ontzettende, tussenschoolse after their bases, 6 languages, base notes carry the -e rule. Linker: `de X` / `het X` never falls back to an articleless card (rondje's `de ronde` had linked the adjective; speelgoed's `het goed`, elfje's `de elf` too); audit mirrors it, `het elfje: elf` reviewed as a false split. New noun card `het goed` (добро, вещи; 6 languages, audio) before `het speelgoed`, its note telling it from the adjective goed; front avoids имущество so it does not pair with het bezit (`confusable-pairs.spec.ts`).
- [x] Front «лишь, только; недавно (hij is pas verhuisd)» gives the Dutch answer away. No front may contain the Dutch word it asks for, in any language: the disambiguating hint goes in the native language («недавно (он недавно переехал)») or as a hidden example. Spec over the whole deck: a front never contains the card's Dutch (word-boundary, case-insensitive), all 6 languages.
  - Done: `front-hints.spec.ts` (ru: whole front; en/es/pt/ro/tr: bracketed hints, capitalised names exempt). Hints rewritten natively in 6 languages: te, om, al, maar, pas, eens, laten, de gang, ruim (+ ruime's `только ruim` item), het slot; en apart, het gas; ro loanwords flashcard, oliebol(len), barbecue, lunchroom, steak, crème fraîche, pump(s); tr balans. Rule in CLAUDE.md.
- [x] het dagelijkse leven: a phrase card with an article but no hint which article. Every card whose Dutch has de/het/een anywhere except as the article of a single-word noun (het huis) must show the article on the prompt the same way noun cards do. Find all such cards, add the hint, spec over the deck.
  - Done: `flag-kinds.py` `part_of` tags a de/het-led phrase `noun` (103 cards, het dagelijkse leven, de soep van de dag) unless a finite verb or trailing `over` makes it a clause (`CLAUSE`: het gaat goed, het spijt me, de brug over); `het` before a noun/adjective no longer counts as a subject, so het licht uitdoen, het saldo opladen, het koud hebben (11 cards) are verbs like their de twins. Sentence cards (`k: sentence`, e.g. het goede woord) keep the sentence tint; inner articles stay covered by the article note items (`articlesOf`). Specs: `scripts/flag_kinds_test.py` PARTS, `app/utils/article-phrase-parts.spec.ts`. Rule in CLAUDE.md (`p`).
- [x] Dictation accepted «allebij» for allebei. ei and ij sound the same, so dictation must count it a miss. Find which normalisation lets it through (ei/ij, y, diacritics?), keep only what is truly not spelling (case, trailing punctuation, spaces), TDD.
  - Done: a same-sounding spelling counts only when its words are words of learned cards; otherwise a miss (or a mix-up with the deck word).
- [x] allebei comes from beide (alle + bei(de)), and the deck has no beide card. Add beide «оба; обе» before allebei, allebei names it in from:, 6 languages. Sweep: words named in a note or origin that the deck lacks, where a learner needs them.
  - Done: beide moved before allebei; allebei's note ends `от: alle (все) + beide (оба)` (6 languages, `root-links.spec.ts` DERIVED). `part-links.spec.ts` now checks the first part of an origin too (it merged into the label's text run and was never checked); that exposed 35 unlinked parts. New cards (6 languages, audio), each before the first card naming it: de buur, het spel, de grap, de koek, de plaat, de hap, de bol, de noot, de zegel, de ronde, het blik, de elf, de schotel, het beest, de haven, het kanaal, de beek, de koekoek, Pasen, lijden, huwen (note: official, everyday trouwen), bereiken, afwisselen. Notes relinked: de buurman (de buur), het 06-nummer (nul + zes), het ziekenhuis (ziek + het huis, букв. «дом больных»), het consultatiebureau (het consult), het lijdend voorwerp (lijden + -end), kletsnat (от: nat; klets — «шлёп», усиливает). Parts a learner does not need stay unlinked under a non-origin label: de gemeente, nauwelijks (букв. … от gemeen / nauw: adjective cards would need -e pairs), de verpleegkundige, de ICT-specialist, de kringloopwinkel (`части:` / parts: / partes: / părți: / parçaları:). bereiken and afwisselen get their be- / af- split in C17. Follow-up: compound notes now split into linked parts: de pepernoot (de peper + de noot), de luchthaven (de lucht + de haven), de pannenkoek (de pannen + de koek), de dagschotel (de dag + de schotel), afwisselen (af- + wisselen; af- glossed with its own sense, ru `с, от, отделение`), bereiken (be- + reiken; new card reiken «тянуться, протягивать» before bereiken, 6 languages, audio), de ronde (от: rond). het rondje es/pt fronts `vueltecita; ronda (de bebidas)` / `voltinha; rodada (de bebidas)`. de gemeente and nauwelijks keep their non-origin `букв. …, от …` note and sit in `affix-split.spec.ts` NOT_SPLIT. `scripts/audit-links-reviewed.json`: reviewed hits added for de spelling, de genoot, (de) beterschap, grappen, het buurthuis, de buurtbewoner, waarschuwen, het ogenblik; stale ones dropped. `note-dutch.spec.ts` LABEL accepts `в речи`, `в обычной речи`, `части`.
- [x] Clicking «to sections» at the end of a group leaves the site (history back past the app). It must go to the app's sections page whatever the history holds; TDD, check on the live site from a fresh tab opened straight on learn?.
  - Done: root cause: vue-router's createWebHistory numbers a fresh tab's first app entry `history.length - 1`, so in a tab that showed another page first, arriving on home went `router.go(-position)` past the app. `app/utils/home-first.ts` now remembers the app's first entry (the one whose `history.state.back` is null; kept in sessionStorage `home-first` for reloads and returns from another site) and steps back only to it; with no known first entry it stays put. Spec `app/utils/home-first.spec.ts` (happy-dom, a `/elsewhere` entry before the app, asserts popstate never reaches it).
  - Done (follow-up, live trace): opened on /learn, LeaveSheet's leave guard (`app/utils/back.ts`) pushes an entry over the first one with the same `position`, and «to sections» (`UpLink`) replaces that guard entry with home: position equals the first, so nothing rooted and back from home showed /learn. Now `keepHomeFirst` treats an entry with `leaveGuard`/`backLayer` at the first position as above it and steps back one entry at a time past such copies (`max(1, position - first)` per step) until it stands on the real first entry, then `router.replace('/')`. While stepping it holds back.ts (`holdBack()` -> release): popstates then close no layer, ask nothing and push no guard (without the hold the guard re-pushed over /learn and the replace hit it; mutation-tested: the spec loops). Release re-pushes the layer entry if needed and the guard over home. Specs: `app/utils/home-first.spec.ts` (back from home after the guard does not show /learn; asks nothing on the way; back from home then asks).
- [x] opruimen vs schoonmaken: both read «убирать» now and the difference is not explicit. opruimen «убирать, наводить порядок (раскладывать по местам, без воды и тряпки); расчищать (de sneeuw opruimen)», schoonmaken «чистить, мыть, делать уборку (вода, тряпка, пылесос)»; first opruimen, then schoonmaken. Each card's note says what it is and that the other is the other stage (DON'T CONFUSE, both ways). opruimen has no split: it is op- (вверх, до конца) + ruimen (освобождать место, from ruim / de ruimte). Add a ruimen card if missing («освобождать, расчищать (место)»: de weg ruimen) before opruimen, link op- + ruimen in from:, ruimen from ruim (просторный). Related cards if in deck or worth adding: de opruiming (уборка; распродажа: both senses), opgeruimd (прибранный; жизнерадостный), inruimen / uitruimen (загружать / разгружать посудомойку). Opgeruimd staat netjes as a phrase card or note example. 6 languages.
  - Done: fronts and notes in 6 languages. opruimen «убирать, наводить порядок (по местам); расчищать», note: по местам, без воды и тряпки, первый шаг; от: op- + ruimen; не путать с: schoonmaken; nb `Opgeruimd staat netjes.` with nx (proverb, no separate opgeruimd card: an adjective would need its -e pair). schoonmaken «чистить, мыть (делать уборку)», note: вода, тряпка, пылесос, второй шаг; не путать с: opruimen, poetsen. de opruiming «распродажа (сезонная); уборка (наведение порядка)». New cards: ruimen (before opruimen; от: ruim; родственное: de ruimte, and de ruimte names ruimen back), inruimen / uitruimen (after opruimen; посудомойка, шкаф). poetsen got a note (щёткой или до блеска: зубы, обувь, окна; не путать с: schoonmaken) since the two share «чистить». en notes avoid the word `water` (links-data would link het water). `ruim` added to NOT_A_FORM in `app/utils/verb-form-links.spec.ts` (the adjective, not `ik ruim`). Transcriptions via mark-optional-n, audio built; deckcheck 594/594.
- [ ] Every single word that contains an affix (prefix: be-, ge-, ver-, ont-, her-, op-, af-, aan-, uit-, in-, mee-, door-, over-, onder-, om-, toe-, weg-, terug-, …; suffix: -ing, -heid, -te, -baar, -lijk, -ig, -er, -je, -schap, -isch, -tje, …) is split in its note as from: <base> (<gloss>) + <affix> (<gloss>), the base and affix each a deck card (add the base card before the word when missing, e.g. ruimen), and the split links both ways (parts link to the word). Audit: for every deck affix card, list every single-word card that starts/ends with it whose note lacks that split; review false hits (e.g. opa is not op- + a) into a reviewed list; spec fails on any unreviewed hit. All 6 languages.
- [x] de training vs de oefening (user, 2026-11-26): training «тренировка; тренинг, курс обучения», trainingen same plural, trainen «тренироваться; тренировать, обучать»; notes: training hebben (спорт), een training volgen (курс); training = регулярная тренировка или курс целиком, oefening = одно конкретное упражнение, не путать both ways, 6 languages.
- [x] Mark a card hard / not learned (user, 2026-11-26: «забыл wel — и всё»). From the card itself (CardSheet, and a «?» control on the answer side in games) the learner sends a learned card back to learning: `forgetLearning`-style for that id (progress, passed games, review schedules reset), so it comes back in Learn tomorrow-style. Scope picked on the spot: «only this word» or «with everything derived from it» (all depths: cards whose notes name it under от:/форма от:/мн. ч. от:/уменьш. от:, then theirs, recursively, via the deck's link index; forms -e/plurals follow their base). Remember the last scope choice as a setting default. TDD: store spec for the derived-ids walk (cycle-safe), component spec for the control and the scope choice, a11y labels; check on screen 360–400px light/dark.
- [ ] Affix examples from the whole deck (user, 2026-11-26: «для каждого аффикса хорошо бы иметь несколько разных примеров, а не один-два. желательно - из всей колоды обучения»). Today an affix card has one example (`xb`/`xf`/`xl`) plus one or two in its note; CardSheet already lists `index.derived` under «Words built on it», but most affixed words lack an `от: <affix> + <base>` link, so the list is short. Do after the affix split audit (C17): (1) spec in `app/utils/affix-examples.spec.ts`: every affix card has at least 4 distinct deck cards whose origin note names it (`buildIndex(...).derived`), in all 6 languages' notes; (2) link missing ones, add cards where the deck has fewer than 4 words for an affix; (3) show up to 4 of those words, learned first, on the affix card's answer side (word + gloss, affix highlighted with `AffixWord`), component spec, check on screen light/dark at 360px, a11y.
- [x] Resume progress shows which words each game still lacks (user, 2026-11-26: «на деле это суммарный прогресс… надо корректно отображать»). Today «Continue where you left off?» (`app/pages/learn.vue`, `resume-progress`) draws each game as one solid fill `passed/of`, which hides that game 1 may miss three words game 2 passed. Draw each game row as one cell per word of the group, filled when that game passed the word; the columns are the same words in the same order in every row, so a word missed in several games is a gap in the same place. Column order: lexicographic over the per-game passed flags, game 1 first, a gap before a fill, so gaps sit as far left as they can; words no game has passed yet go last. User's sketch: `game1 ___##########____` / `game2 __#__########____` / `game3 __#_#__######____` / `game4 #######___###____` / `game5 #######_##_##____` / `game6 ###########______`. Render by share, not per word (user, 2026-11-26: «вместо того чтобы давать один блок одному уроку, лучше считать какая доля игры пройдена тут, но не там… соседние вообще склеивать можно»): group the words by their pass pattern across the 6 games (at most 2^6 = 64 patterns), sort the patterns in the column order above, and give each pattern a column span whose width is its share of the words (percent). Then per game row merge adjacent spans with the same state (passed / not) into one run, so a row draws a few absolutely positioned runs (left%/width%), never one element per word: 1000+ words render as fast as 10. Pure helper returns, per game, the runs `{ from, to, passed }` in fractions; spec it on a tiny deck. Keep the row `progressbar` (aria-valuenow = passed), runs aria-hidden. TDD: unit spec for the column order (pure helper), page spec reading the rows back as `#`/`_` strings; check on screen 360px light/dark with a group of 10 and of the largest group size.
  - Done: `app/utils/pass-runs.ts` `passRuns(words: boolean[][], games)` groups words by pass pattern, orders patterns lexicographically (game 1 first, gap before pass, all-unpassed last), gives each pattern a share of the bar and merges adjacent passed spans per game into `{ from, to }` runs (fractions). `app/pages/learn.vue` `groupProgress` feeds it; each bar is `relative` with absolutely positioned `rounded-full` runs (`data-testid="resume-run"`, left/width %), progressbar aria kept. Specs: `app/utils/pass-runs.spec.ts` (column order, unpassed last, one run per stretch, 1000 words -> 1/2 runs, empty group) and `app/pages/learn.spec.ts` «lines up the words each game passed…» reading runs back as `#`/`_`. Checked at 360px light/dark (9 games, 15 words).
- [x] het spel vs de game (user, 2026-11-26: «есть het spelletje, но нет het spel. для него надо будет указать не путать с de game»). het spel already sat before het spelletje (C13); both notes now tell them apart, 6 languages.
  - Done: `confusable-pairs.spec.ts` MIXED lists pairs whose fronts differ but one Russian word covers both (`[['het spel', 'de game']]`); test «are told apart, like pairs one Russian word covers» needs each card's `не путать с:` to name the other. Notes: het spel ru `настольная, карточная, спортивная, детская; игра актёра, музыканта; не путать с: de game (компьютерная игра)`; de game ru `только видео- и компьютерные игры, гейм в теннисе; не путать с: het spel (игра)`; en/es/pt/ro/tr the same (es/pt/ro keep their gender mark first). Script `/private/tmp/claude-501/c9/c21.py`.

- [x] Clip names without digits (user, 2026-11-26: «ripple при каждом деплое жалуется на отправку номеров кредиток... Может, HEX пойдёт?»). Names were already hex: 16 hex chars of sha1(voice|text); 11 came out all digits (e.g. `4724920568639435`) and 75 held 13+ digits in a row, which the leak scanner reads as card numbers in deck.json. Same 64 bits now spelled with letters a-p (0->a ... f->p), so no name holds a digit.
  - Done: `scripts/build-audio.py` `key_of` translates the hex through `LETTERS`; `clips.spec.ts` «names its clips with no digits» (every `au`/`axb` matches `^[a-p]{16}$`), `clipOf` in `clips.spec.ts` and `respell.spec.ts` spell the same way. Files in `public/audio` renamed and `au`/`axb` in `public/deck.json` rewritten in place, no clip regenerated (script `/private/tmp/claude-501/c9/c22rename.py <app dir>`: regex on `"au":"<hex16>"`, rename every stem that is hex with a digit). Learner edits keep a copy of the card with the old hex clip: `applyEdits` (`app/utils/edits.ts` `renamed`) reads a 16-char hex name holding a digit as its letter name; spec `app/utils/edits.spec.ts`. The deploy's `sync-audio.py` copies the new names into the audio repo and drops the old ones, so a page still on the previous build loses sound until it reloads.


- [x] Card ids and picture names without digit runs (user, 2026-11-26, ripple screenshot: `'XXXXXXXX-7968'` matched in `.output/public/lang/tr.json` as `credit-card/maestro`, Application: rsync). Card and section ids are UUIDs; their digit groups joined by dashes (`2-9601-4482187`, `05188-4650-480`) read as card numbers, ~420 hits per served file. One picture name was all digits (`989197070454.jpg`). Served files now spell every UUID and every picture name with the letters a-p for the hex digits (as the clips in C22); the app turns ids back into UUIDs on load, so progress, reviews, edits and shares keyed by UUID carry on with no migration.
  - Done: `app/utils/card-numbers.spec.ts` (deck.json and every `public/lang/*.json` hold no `\d(?:[ -]?\d){11,}`); `app/utils/course-ids.ts` `withUuids(node)` maps every `^[a-p]{8}-[a-p]{4}-[a-p]{4}-[a-p]{4}-[a-p]{12}$` node and card id back to its UUID, other ids untouched (spec `course-ids.spec.ts`); `useStore.loadDeck` sets `course.value = withUuids(tree)` after `localize` (overlay keys are letters too, so they still match); spec `useStore.spec.ts` «the course keys its cards by the UUIDs saved progress was kept under» (stubbed fetch). Files rewritten in place by `/private/tmp/claude-501/c9/c23ids.py <app dir>` (regex on UUIDs in deck.json `"id"` and lang `cards`/`names` keys); `public/img/*` renamed (288) and `"img"` in deck.json rewritten (572); learner edits that kept an old hex `img` are read by `renamed` in `app/utils/edits.ts` (spec in `edits.spec.ts`). Generators spell new ids the same way: `scripts/build-deck.py` (ids, picture names), `scripts/build-langs.py` (overlay keys), `scripts/proof.py` (`_new` cards), template `/private/tmp/claude-501/c9/c16.py`; `.proof/done.txt` recoded. `CUSTOM_ID` in `app/utils/custom.ts` lives only in the learner's storage, not in served files; left as is. Id prefixes for `show.py`/`proof.py` fix files are now letter prefixes.

- [x] lang vs hoog: both read «высокий», but lang is a person's height (always), length and time; hoog is the height of things and places (buildings, trees, mountains) and levels and numbers (prices, temperature). «een hoge man» is wrong. hoge has one o because the syllable is open (hoog -> hoge).
  - Done: `app/utils/confusable-pairs.spec.ts` `MIXED` gains `['hoog', 'lang']` and `['hoge', 'lange']`, so each card names its twin under «не путать с:». Data applied by `/private/tmp/claude-501/c9/c24.py` (backup `/private/tmp/claude-501/c9/deck.pre24.json`): hoog/hoge fronts say «of things, prices» in ru/en/es/pt/ro (tr `yüksek` already narrow); lang/lange fronts in ru add «высокий (о человеке)»; notes on 6 languages: hoog lists buildings, mountains, trees, prices, temperature, not a person's height; hoge adds «одна o в открытом слоге (hoog -> hoge)»; lang lists a person's height, length, time; each ends with the confusable label + twin + short gloss. Every overlay note keeps as many `;` items as the Russian one (tr hoog had one extra; merged, `ateş` -> `sıcaklık`). Checked at 360px, light and dark (hoog, lang sheets).

- [x] Build output without 12-digit runs: Nuxt writes `prerenderedAt: Date.now()` (ms, 13 digits) into `__NUXT_DATA__` of every prerendered HTML page, and workbox precache revisions in `sw.js` are hex md5s that can hold a run of 12+ digits (`de0bed626e6caf60b032545090856f34`); a leak scanner reads both as card numbers (found by scanning `van-start-build/.output/public` after C23).
  - Done: `app/utils/build-digits.ts` `stampInSeconds(html)` (stamp to seconds, 10 digits; the client only checks it is truthy: `nuxt/dist/app/composables/payload.js`, `pages/runtime/plugins/router.js`) and `revisionInLetters(rev)` (digits 0-9 -> g-p, still one revision per content); spec `app/utils/build-digits.spec.ts`. Wired in `nuxt.config.ts`: `nitro.hooks['prerender:generate']` rewrites each `.html` route, `pwa.workbox.manifestTransforms` rewrites revisions. A Nuxt server plugin does not work here: `ssr: false`, so server plugins never run during prerender. Verify after deploy: `grep -rEo '[0-9]([ -]?[0-9]){11,}' van-start-build/.output/public` finds nothing.

- [x] de/het verb phrases keep their noun specific (user, 2026-11-26: «de tafel opruimen - из-за уточнения "обычного" создаётся впечатление, что не конкретно своего. нужно указание артикля, раз de»). The deck marks the de/het noun of a verb phrase as one's own: «(свою)», «(свой)».
  - Done: spec `app/utils/phrase-hints.spec.ts`: a `^(de|het) <noun> ... <verb>en$` card's front hint never says ordinary (ru `обычн`, en `usual|ordinary|regular`, es/pt `habitual|normal`, ro `obișnuit`, tr `her zamanki|sıradan`). ru: de tafel opruimen `убирать со стола (своего)`, de krant lezen `читать газету (свою)`, de bus nemen `ехать на автобусе (рейсовом)`. tr: de bus nemen `otobüse binmek (hat otobüsü)`, de krant lezen `gazeteyi okumak (kendi)`. en/es/pt/ro carry the article in the translation already (the table, la mesa, a mesa, masa). Checked in the Russian UI at 360px. `sheet.cjs` takes `UI_LANG=ru` to switch the app language first.
- [x] Build manifests without 13-digit stamps (follow-up to the build-output item above). Nuxt writes `_nuxt/builds/latest.json` and `_nuxt/builds/meta/<id>.json` with `timestamp: Date.now()` (ms); the client reads only `id` (`check-outdated-build.client.js`). User narrowed the scope (2026-11-26: «ripple больше не жалуется… только на статичные файлы типа json»): only served JSON is rewritten; library constants in JS bundles stay.
  - Done: `app/utils/build-digits.ts` `manifestInSeconds(json)` (spec in `build-digits.spec.ts`, «a build manifest»). `nuxt.config.ts` hook `nitro:build:public-assets` rewrites every `.json` under `<publicDir>/_nuxt/builds` (the manifest is written at nitro `rollup:before`, copied by `copyPublicAssets`, so this hook sees the final file). `scripts/deploy.sh` syncs `_nuxt/builds/` with `rsync -a --delete`, so the live site keeps only the current build's manifests (an old page tolerates its own meta going missing). Verify after deploy: `grep -rEo '[0-9]([ -]?[0-9]){11,}' ../van-start-build/.output/public/_nuxt/builds` finds nothing.
- [x] gauw / gauwe pair with rules (user, 2026-11-26, pasted explanation: gauw is the frequent adverb «скоро, быстро», gauwe the rare adjective «быстрый, проворный», speech prefers snelle/vlugge; een gauw herstel, een gauwe dief; «не вижу пары и правил»).
  - Done: gauw ru `скоро, быстро; скорый`, note opens with the base rules `1) за ним нет сущ.; 2) een/geen + het-слово;`, nb `Hij was gauw klaar.\neen gauw herstel`. New card gauwe right after gauw (ru `скорый, проворный`, note `сразу за ним сущ.; кроме een/geen + het-слово; форма от: gauw (скорый); редкое: в речи чаще snelle; только gauw: скоро, быстро`, xb `Hij is een gauwe dief.`, nb `de gauwe dief / het gauwe herstel / !een gauw herstel`), 6 languages, audio (`.venv/bin/python -I scripts/build-audio.py`). es/pt/tr fronts of gauw keep two senses (rápido / çabuk cover both). pt gauw front `em breve, rápido` and gauwe's `só gauw: em breve, rápido`: `logo` linked het logo (`links-data.spec.ts`). Specs green: form-notes, adjective-forms, confusable-pairs, links-data. Checked on screen light/dark.
- [x] Resume bars: passes lean left, only the track is round (user, 2026-11-26, screenshot: «скругление нужно только трекам… оверфлоу должен его резать», «отсутствие прогресса должно стремиться правее»).
  - Done: `app/utils/pass-runs.ts` orders patterns descending (pass before gap, game 1 first; all-unpassed last): `Number(a === none) - Number(b === none) || b.localeCompare(a)`. `app/pages/learn.vue` runs (`resume-run`) lost `rounded-full`; the track keeps `overflow-hidden rounded-full`, so a run reaching an end is clipped by the track's curve. Specs: `pass-runs.spec.ts` (`['######__','####__##']`, unpassed last `['#___','_#__']`), `learn.spec.ts` «lines up the words…» now `['##___', '#____', '_____', '#____']`. Checked at 360px light/dark with mixed passes (`$S/c29.cjs`, store.passed seeded).
- [x] de buurman reads as de buur (user, 2026-11-26: «должно быть очевидно, что мужчина, а то юзер переведёт de buur»). de buur is «сосед (м. или ж.)»; buurman's front was a bare «сосед».
  - Done: fronts ru `сосед (мужчина)`, en `neighbor (man)`, es `vecino (hombre)`, pt `vizinho (homem)`, ro `vecin (bărbat)`, tr `komşu (erkek)`; the note's leading «мужчина» item dropped in 6 languages (front says it). Spec `front-hints.spec.ts` «a -man noun built on a word for either sex names the man in its <lang> front»: cards ending -man(nen) whose note names a base whose ru front holds `м. или ж.`. Deck scan of -man/-vrouw nouns: only buurman lacked it (buurvrouw «соседка», tuinman, timmerman have no either-sex base).
- [x] Back in a lesson leaves the app (user, 2026-11-26: «свайпаю назад на уроке - предлагает выйти из приложения… при свайпе в уроке оно должно возвращать на главную (или прошлый диалог, если открыт не первый, или закрывать диалог, если открыт только один)»). Cause: SectionTree opens learn/review with `replace`, so the lesson stands on the app's first history entry and back there counts as leaving.
  - Done in code: `app/utils/back.ts` `guardLeaving(ask, goHome?)`; the back that would leave calls `leaveOrGoHome()`: `goHome()` returns a navigation promise off home (LeaveSheet: `route.path !== '/'` and the store is configured -> `router.replace('/')`), held via `holdBack()` so no guard is pushed mid-navigation (`restore()` is a no-op while held), and the guard goes back over home when it settles; on home it asks as before. Phone (CloseWatcher) path goes through the same function. Layers (sheets, dialogs) still close one per back through the `onBack` stack. Specs `app/components/LeaveSheet.spec.ts` «back on a lesson opened in place of the first page» (goes home asking nothing; asks on the next back from home; phone too). Spec gotcha: `mountSuspended` replaces the route itself (default `/`), and router navigation under fake timers needs `vi.runOnlyPendingTimersAsync()`.
  - [x] Checked in the browser at 360px: `$S/c31.cjs` (home -> section -> learn -> back -> home -> back -> leave sheet) and `$S/c31b.cjs` (lesson as the first entry, `history.state.back` null: open the card sheet with `card-details` -> back closes it, lesson stays -> back -> `/` -> back -> leave sheet).
- [ ] Every multi-word card with an article gives the noun's definiteness (user, 2026-11-26: «все случаи, где не одно слово с артиклем (de, het, een)… надо либо убирать артикль, либо давать конкретику, как мы уже где-то делаем», regex `(?:(?:de|het|een) \w+ \w+|\w+ (?:de|het|een) \w+)`). Nouns alone show de/het by default; in a phrase the article carries meaning.
  - Plan: list in `$S/artphr.txt` (610 phrase cards, `b\tf`) plus 79 sentence cards. een phrases already say «(какой-нибудь)»/«(какой-то)». For each de/het phrase without a marker: verb phrase -> «(свой/свою)» or the concrete one; adjective/noun phrase -> «(конкретный)»/«(тот самый)»; set phrases where the article is fixed (in de buurt, in de zomer) -> note `<X>: устойчивый оборот, артикль в нём всегда` (already used) or drop the article when the Dutch allows. 6 languages: en/es/pt/ro carry the article in the translation; tr needs a hint. Spec: generalise `phrase-hints.spec.ts` so every such card has a marker or the fixed-phrase note.
- [ ] Card colour by group (user, 2026-11-26: «разные части речи, устойчивые выражения, аффиксы и предложения все отличались цветом… все эти группы»; and «если что-то имеет два значения… vroeg — и наречие рано, и прилагательное ранний… рано можно написать цветом (или оттенком) наречия, но чтоб a11y проходило»). Today tints exist for noun, verb, affix, letter, sentence (C-item «Letters and sentences are tinted»). Add one hue per part of speech (`p`: adjective, adverb, pronoun, preposition, conjunction, numeral, …) and phrases (`k`), hues apart, quiet text 4.5:1 on every tint (`surface.spec.ts`, `contrast.spec.ts`). Front senses of a card with senses of several parts (vroeg «рано; ранний») colour each sense in its part's text colour, 4.5:1 on the card in both themes; needs per-sense part data (deck field or derived), spec on the rendered spans. Check on screen light/dark 360px.
- [x] ruim: «с лишним (больше часа)» reads unclear, no example of that sense (user, 2026-11-26: «больше часа - непонятное пояснение в ruim, и даже примера нет», pasted explanation: 1) просторный, широкий, свободный (о месте, одежде): een ruime woonkamer, deze jas zit lekker ruim; 2) с лишним, более чем (время, числа, деньги): ik wacht al ruim een uur, het kost ruim vijftig euro, ze is ruim dertig; 3) широкий, щедрый (кругозор); ruim op tijd, ruim voldoende; mnemonic de ruimte).
  - Done: ru front `просторный; с лишним (час с лишним)`; note `1) за ним нет сущ.; 2) een/geen + het-слово; о месте и одежде: просторный, свободный; перед числом: с лишним, больше чем`; nb `De kamer is ruim.` / `een ruim huis` / `Ik wacht al ruim een uur.` / `Deze jas zit lekker ruim.` with nx. ruime's item reads `только ruim: с лишним (час с лишним)`. en/es/pt/ro/tr fronts: `spacious, roomy; over, a good (a good hour)`, `espacioso, amplio; más de (una hora larga)`, `espaçoso; mais de (uma hora e pouco)`, `spațios; peste (o oră și ceva)`, `geniş, ferah; -den fazla (bir saati aşkın)`. No `родственное: de ruimte` item: `root-links.spec.ts` needs related links both ways and de ruimte names ruim as `от:`. Audio rebuilt. Checked on screen at 360px, light and dark, ru and en (`$S/ruim`).
- [x] An -e form means exactly what its base means (user, 2026-11-26: «gauw - скорый, но gauwe - скорый, проворный? Они и правда разные? Если нет, то это ошибка, и надо исправить такое по всей колоде»). gauw and gauwe are one adjective; «проворный» came from the example `een gauwe dief`.
  - Done: `app/utils/adjective-forms.spec.ts` «means nothing its base does not, bar the senses it takes before a plural» in 6 languages: every sense on an -e card's front is on its base's front, or the -e card's note names it after `перед мн. ч.:` / `before a plural:` / `ante plural:` / `antes de plural:` / `înainte de plural:` / `çoğuldan önce:`. Fixed: gauwe front `скорый` (en quick, es pronto, pt célere with pt gauw gaining it, ro grabnic with ro gauw gaining it, tr çabuk: es, pt and ro need a word apart from snelle), example `Ik wens je een gauwe genezing.` and nb `de gauwe terugkeer` in place of the thief, audio rebuilt; andere, enkele, vele name their plural sense (другие, несколько, многие); heel `очень; целый, весь` (hele's весь); houdbare loses `долгого хранения`; direct gains `непосредственный`; en overige drops `other`; es/pt/tr vast gain `habitual`/`permanente`/`kalıcı`; ro ons gains `noastră`, onze drops `noștri`; ro vele front `mulți`; tr net gains `derli toplu` and schuldig `kusurlu` so nette and schuldige keep fronts apart from behoorlijke `düzgün` and de misdadiger `suçlu`. Verb forms and comparatives differ from their base by design and stay out of the check. Checked on screen at 360px, light and dark, en and ru (gauw, gauwe, ruim, ruime): the scratchpad helper `sheet.cjs` opens a sheet by Dutch word (the dev index keys cards by other ids). Also en ruim front `spacious, roomy; a good, more than (a good hour)` and tr ruim note `geniş, rahat` (`bol` linked the Dutch card).
- [ ] Deploy, verify live.
