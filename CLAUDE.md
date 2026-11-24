# CLAUDE.md

Van Start: a flashcard PWA for Dutch (never "Danish"). Nuxt 4 SPA (`ssr: false`), @vite-pwa/nuxt, Tailwind 4, Vitest.
- Offline: the service worker precaches js/css/html/png; the 21 MB SurrealDB wasm, json, images and mp3 go through runtime caches (`nuxt.config.ts`).
- Startup: `app/spa-loading-template.html` shows until the db plugin has migrated and loaded the deck.
When two rules conflict, the one written further down wins.

## Communication and process

- jj only, never git. Never interactive: `JJ_EDITOR=true`, always `-m`. No AI attribution in commits.
- Run long commands in the background. No subagents.
- Run Python with `-I`.
- Never extract or use the user's credentials from their folders. Push to the orimay repos with `~/.ssh/id_ed25519_github`.
- Sources live in `orimay/van-start` (push with `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_github"`). Commit and push each finished step; `scripts/deploy.sh` also commits and pushes the sources. Commits use `dmitrii.a.baranov@gmail.com`: the shell's `JJ_EMAIL` is the work one, so set `JJ_EMAIL` on every committing jj call.
- While a deploy runs, do not edit files or run tests: the deploy picks up unfinished changes.
- Bugs follow TDD: failing test first, then the fix.
- Tests are black-box only: assert what the user sees (DOM, `data-testid`), never internals.
- Never claim audio sounds right without having heard it.

## Data

- `public/deck.json`: a tree of `{id, name, cards[], children[]}`. Card fields:
  - `f`: Russian translation;
  - `b`: Dutch word;
  - `tr`: transcription;
  - `n`: note;
  - `xf`/`xb`: example translation and the Dutch example;
  - `nb`/`nx`: optional extras.
- `public/lang/{en,es,pt,tr}.json`: `cards[id] = [f, xf, tr, n?, nx?]`.
- Write both compact: `ensure_ascii=False, separators=(',',':')`.
- Deck order is learning order. Groups keep the book's order. Inside a group, where its cards allow: a singular comes before its plural, a diminutive (-je) or an irregular form after its base word, and a word before every card using it, in its phrase or its example. A group's own words come first, then its sections' words in order.
- Both parts of a compound word come before it, moved there from later groups if needed: `python3 -I scripts/order-compounds.py` after any deck change. False splits (`centrum` is not cent+rum) go in its `NOT_SPLITS`.
- A prefixed word comes after its base word (laden before opladen, tekenen before betekenen, bakken before gebakken); the same script does it.
- A derived word comes after its base, and a word made of two words after both: `scripts/order-compounds.py` reads the base from each card's `от:` note.
- A compound whose part has no card gets that part as a card first (gebruiker before gebruikersnaam).

## Card content (every language: ru, en, es, pt, tr, ro)

- **Goal.** A beginner learns every card from the deck alone: base always comes first, and the translation alone points to one Dutch word in one meaning. `.proof/checklist.md` is the per-card checklist; a full pass checks every card against it, then reviews each flagged card against the whole list.

- **Examples.**
  - By default an example (`xb`) uses only words from earlier cards.
  - A regular form of an earlier word counts as known: plural, present tense (droom, valt), imperative (rem!), regular participle (gekraakt, kwijtgeraakt), a split separable verb (staat stil).
  - A form that has its own card (ik was, ik ging, gestorven) counts as known only after that card.
  - Only when that is impossible, use the nearest fitting words from later cards.
  - Every example is translated into all languages.
  - Several examples go on separate lines, and the translation has the same lines, line by line.
  - Examples show on the Dutch side.
- **Notes.**
  - Every listed meaning has an explanation. A missing meaning gets added.
  - Every meaning is in the translation itself (`полицейский; агент`), never only in a note's "также …" item.
  - A short form names its full word as `синоним:` and back (de agent/de politieagent).
  - Close senses are told apart, e.g. eind vs einde. klok means a stationary clock.
- **Irregular forms.** An irregular form (a participle like gestorven, verdwenen, stukgegaan) gets its own card right after its base word, its meaning and a note naming the base (`причастие от sterven: is gestorven`). The base word's example uses the base form; the form card's example uses the form. Regular forms get no card.
- **Form pairs.** Singular/plural and adjective with/without -e carry identical meanings in every language (lente/lentes and herfst/herfsten once differed). Notes match too, except the usage rule: the form without -e gets the without-e rule, the -e form the -e rule (lief/lieve once shared one). An -e form drops the base's adverb meanings and its `вариант:` link (makkelijke names no gemakkelijk: no gemakkelijke card).
- **Demonstratives.** dit/dat and deze/die each name their use (near or far; het-word in the singular, or de-word and plural) and their pair; dat also its standalone and conjunction uses.
- **Adjective rule.** Every adjective with a with/without -e card pair carries the -e usage rule on both cards, before any meaning note.
- **Variants.** Two cards of one word in different forms (eind/einde, makkelijk/gemakkelijk) name each other in the note, `вариант: …` first (also/también/também/ayrıca/variantă), in every language; a plural card puts its `мн. ч. от:` before it. When their use differs, both notes say when to pick which, without naming the card's own word (`эта форма`, `een heel … lopen`): a note is a hint.
- **One word, one card.** A noun is learned with its article (de maandag, de vrijdagavond), never also as a bare card. Its article-less use as a time adverb goes in the note as `без артикля: в пятницу вечером` (without article/sin artículo/sem artigo/artikelsiz/fără articol), in every language. When two cards merge, the kept one takes the earlier slot.
- **Style pairs.** A colloquial card and its neutral or formal counterpart (check/controleer, de opa/de grootvader, de wc/het toilet) name each other in the note, `синоним: …` (synonym/sinónimo/sinônimo/eş anlamlı) first, in every language. Every card marked colloquial, neutral or formal is checked for a counterpart in the deck.
- **Root families.** A derived word names its base with the base's translation, `от: …` (from/deriva de/deriva de/kökü), after any вариант/синоним or usage-rule item, in every language and every form card (plurals too). The base lists nothing back. Peers of one root, neither derived from the other, name each other both ways with `родственное: …` (related/relacionado/relacionado/akraba kelime/înrudit). Inside a link, meanings join with `, `, never `; `.
- **Verbal nouns.** A het + infinitive card meaning the process (het knutselen, het rekenen, het hoesten, het spreken) is translated as the process and carries `процесс: het + глагол (knutselen — мастерить)` (process: het + verb / proceso: het + verbo / processo: het + verbo / süreç: het + fiil) as the last note item, in every language; its verb has a card before it. The prompt itself carries the label, `рукоделие (процесс)` (`processLabel` in `app/utils/deck.ts`); the note item hides until the answer is out. Lexicalized ones keep their meaning and get no mark: het eten, het drinken, het leven, het kussen.
- **Note items.** Separate a note's items with `; `: each shows on its own line.
- **No hint prefixes.** No "with -e:" / "without -e:" in a rule; the card already shows it.
- **Exceptions** are highlighted in an oklch red of the same perceived lightness as the surrounding text.
- **Gender in es/pt/ro.** The `m.`/`f.`/`n.`/`pl. m.` prefix describes the translation's gender, not the Dutch word's. It is the note's first item; mixed genders join with `/` (`m./f.`). Every es/pt/ro noun card carries it; a plural card writes `pl.` plus the gender (`pl. f.`), never a bare `pl.`. Adjectives, verbs and phrases carry none; ro neuter is `n.`.
- **es is neutral Latin American.** `jullie` is `ustedes`, never vosotros; `auto`, `computadora`, `celular`, `boleto` (ticket; `billete` is a banknote), `papa`, `jugo`, `pastel`, `crema batida`, `refrigerador`, `video`, `tomar`/`agarrar`, `lentes`; `piso` is a floor, never a flat. Strongly local words (`carro`, `chévere`) stay out. Where Spain uses another word, the card's own `f` adds it second (`computadora, ordenador`, gender `f./m.`); examples use the Latin American word only.
- **es tenses mirror the Dutch form.** A perfect card (`ik heb gewerkt`) is haber + participle in `f` (`he trabajado`); `xf` stays natural Spanish. An imperfectum card takes the ru card's aspect: imperfective → imperfecto (`llovía`), perfective → indefinido. Adjectival participles (verkouden, gebroken) are left as adjectives.
- **Examples use known words.** An `nb` line, like `xb`, uses only words that have a card earlier in the deck (`de Indische keuken`, never `rijsttafel` without a card).
- **A diminutive names its base.** A `-je` card's note ends with `уменьш. от: het boek (книга)`; a compound with `от: de kaas (сыр) + het plankje (дощечка)`. Lexicalized ones (`meisje`, `sprookje`, `toetje`, `poortje`) skip it. Same item in every language: en `diminutive of:`, es/pt `diminutivo de:`, tr `küçültme:`, ro `diminutiv de la:`.
- **Sound cards hint by meaning.** A pronunciation card's prompt names the native translation of a Dutch word with that sound, `эй (как в «два»)` for `ee`; never the Dutch word itself (it spells the answer) and never a word from a third language. Same in every language.
- **ro translation is the dictionary form.** No definite article, no `un`/`o`, no gender label in the translation: `câine`, not `câinele` or `un câine (m.)`, matching en/es/pt. Gender goes in the note. A genitive head keeps its article (`numele străzii`, `durata drumului`).
- **Canonical note prefixes.** Each language uses one wording per item kind, e.g. ro `de la:`, `pluralul lui:`, `a nu se confunda cu:`, `variantă:`, `sinonim:`, `diminutiv de la:`.
- **Plural cards.** The translation marks the number: ru ` (мн.)`, en and ro ` (pl.)`; es/pt/ro carry `pl.` in the gender prefix. The note names the singular: `мн. ч. от:` / `plural of:` / `plural de:` / `çoğulu:` / `pluralul lui:`. A plural card comes right after its singular. A singular card naming its plural writes `мн. de leden` / `plural: de leden` / `m. plural: de leden` (es/pt/ro, after the gender) / `çoğul: de leden`; never `pl. m. de leden`, which reads as a plural card. Every note matches the ru note's item count (`; `): the app hides an item by its ru twin, so merge extra items with `, `. Each ru `;` meaning group of a translation appears in every language, split with `;`. Grammar labels have one wording per language: pt `pretérito perfeito composto do holandês`, `passado simples`, `informal`; pt examples use você, never tu.
- **Transcription.**
  - Per language, in that language's script.
  - Consistent across all cards, including -en forms: inside compounds, mid-word, and in comma variants (de zonen, de zoons).
  - Dutch u/uu is ү/үү; ю only in English loans (interview, steward). No ы, ё, ː. `app/composables/transcriptions.spec.ts` checks it.
  - The n of an unstressed -en, usually dropped in speech, is marked optional in every language: `лоо́пэ(н)`, `доосэ́нтэ(н)каамэр`. Never inside a root or before a d/t ending (`ви́ңкэлсэнтрүм`, `о́нбэкэндэ`), except before a tens word (`зэсэ(н)тви́нтэх`). Stress on a diphthong goes on its first letter: `э́й`, `ә́й`, `а́у`. A linking -en- said ң before k is still written `(н)` (`бу́рэ(н)каас`), only when the stem is a deck word; the ng/nk of a root stays (`брэ́ңэ(н)`, `наа́дэңкэ(н)`). Run `python3 -I scripts/mark-optional-n.py` after any transcription change.
  - Russian `tr` is the source: every other language's transcription is derived from it by `scripts/translit.py` (mark-optional-n rewrites them all). Edit ru, never another language's tr by hand. ij is spelled like ei in every language.
  - Tests: `python3 -I scripts/translit_test.py` (also checks the whole deck is derived), `python3 -I scripts/mark_optional_n_test.py`, `python3 -I scripts/sync_audio_test.py`.
- **Confusable pairs.** Words a learner cannot tell apart from the translation alone (aanmelden/inschrijven) carry the telling context in the translation itself (`регистрироваться (в реестре)`, `заявляться, подавать заявку`), and each note says when to use it with a short `…` example and names the other as `не путать с: …` (don't confuse with / no confundir con / não confundir com / karıştırma), in every language and every card of the word (phrases, nouns too). The hint and the Dutch example are separate note items: an item opening with `…` or `zich …` is a Dutch usage example and stays hidden until the answer is out (`DUTCH_USAGE` in `deck.ts`), as does any item naming a Dutch word; the plain hint stays shown. These labels hide like variants, in every language. Edits go through a data file `{b: {lang: (new f, note items to prepend)}}`; -e adjective forms take the base's hint and pair link.
- **Split cards.** Merge them unless the split is justified, e.g. een paar vs het paar.
- **Realia and loanwords.**
  - A word the target language lacks gets a short explanation or a better translation, in every one of its forms (singular, plural, phrases) and in every language.
  - Format: `пепернотен (пряное печенье)`, with the note in `n`: "lit. 'pepper nuts'; for the Sinterklaas holiday, early December".
  - A short but clear explanation is enough.
  - Sinterklaas is explained too.
- **Place names.**
  - Carry a type label in every language: (город/city/ciudad/cidade/şehir), province, island, airport, museum, etc.
  - Streets get "street"; store names go in quotes.
- **Set phrases.** A phrase whose meaning is not the sum of its words (af en toe) says so as a note item, `устойчивое выражение, букв. «…»` (set phrase, literally / expresión fija, literalmente / expressão fixa, literalmente / kalıp ifade, kelimesi kelimesine), in every language; each of its words still gets its own card before it.
- **Determiners are not adjectives.** welk/welke, elk/elke, ieder take -e by gender and number only (het-word singular: none, even without een/geen); each card says so as a `!` exception item, in every language.
- **Literal first.** Of the natural translations, pick the one closest to the Dutch words and structure: hoe laat is het = `сколько времени`, een strandwandeling maken = `совершать прогулку по пляжу`, telefoneren met = `созваниваться с`. A looser idiomatic one goes in the note, if at all.
- **Plain words.** No grammar jargon a learner without a language degree would trip on. Say what it does, then a couple of examples: `действие на кого-то или что-то (лечить кого-то, готовить что-то)`, not `делает глагол переходным`; `о женщине`, not `женский род`; `маленький: -ик, -ок`, not `уменьшительное`.
- **Tense and aspect.** The translation keeps the Dutch tense: present stays present (kom je = `едешь`, not `приедешь`). A verb whose Russian aspect or voice is ambiguous says which it is, or gives both (`ходить, сходить`; `открывать` vs `открываться`).
- **Part of speech.** A noun translates as a noun (de maandagochtend = `утро понедельника`); an adverbial use goes in the note.
- **Number.** Singular and plural are visible in the translation, also in phrases (`пепернотен (мн.)`, pepernoten eten).
- **Articles.** Where de/het or its absence changes the sense (de krant lezen, in de tuin, een festival bezoeken, kerstmis vieren vs de kerstmis), the translation shows specific vs general, and the note says why the article is there or not.
- **Parts of a word.** A word built from other words names every link of its chain, each link with its meaning, down to the root:
  - Every ancestor comes before the word built from it, each with its own card: lopen, then gelopen, then aflopen, then afgelopen.
  - Each card names its direct parent as `от:` and spells the rest of the chain after it, so the whole build shows on one card. afgelopen: `от: aflopen (заканчиваться) = af (с, от) + lopen (идти)`, `причастие`.
  - Every prefix and suffix has its own card, hyphenated (`aan-`, `be-`, `-er`, `-je`), its meanings as the translation; it comes right before the first word built on it.
    - Its note says in plain words where it goes, then shows it: separable `в предложении отрывается и уходит в конец: ik bel je op (я тебе звоню); ударение на ней`, inseparable `не отрывается от глагола, ударение не на ней: kopen (покупать) → verkopen`, word prefix `ставится перед словом: …`, suffix `ставится в конце слова: bakken (печь) → bakker`.
    - Its example (`xb`) is one short, simple word built on it (bewonen, bakker, katje), so the affix stands out; no long words or hard diphthongs. `xf` glosses that word. A separable prefix that is also a word keeps two cards, `aan` (the word) and `aan-` (the prefix), naming each other with `родственное:`.
  - A derived word's `от:` names the affix card with the one meaning it uses, worded exactly as on that card, in every language: `от: aan- (при-, к, приближение) + komen (приходить)`, `от: ver- (меняет смысл глагола) + kopen (покупать)`, `от: kopen (покупать) + -er (кто делает)`. A prefix comes first, a suffix last; a form card (plural, inflected adjective) names its lemma's affix. A prefix with no meaning of its own says so (`op- (без нового смысла) + bellen`). No nested parentheses in a gloss.
  - Affix specs and the generator live outside the repo; the fix goes in through `scripts/proof.py apply`.
  - Compounds split the same way, every part a card: het liedwoord = lied + woord, de paddenstoel = pad (жаба) + stoel (стул), bepaald = be- + palen (ставить столбы, ограничивать). A part whose meaning is lost says so (`букв. «жабий стул»`), and a truly opaque word says `происхождение неясно`, never silence.
  - A card out of place moves earlier, to just before the first card that cannot come before it; the later card never moves back.
  - Inflected forms join the chain where they are their own card (gelopen); regular ones do not (see Irregular forms).
- **Every meaning.** A card lists every common meaning, the one its examples use first (stranden, bladeren, het lid, boodschappen doen). Check a suggested meaning in a dictionary before adding it.
- **Accuracy.** No narrowing beyond the word: warm = `тёплый`, chocolademelk is not only hot.
- **Close pairs.** Near-synonyms and look-alikes (zaterdagmorgen/zaterdagochtend, mailen/e-mailen, naar huis/thuis) follow the confusable-pairs rule above.
- **Spelling and audio.** Spelling follows the official rules (half één); the audio matches the spelling.
- **Worked cases** (was -> should be), the pattern to copy for any similar card:
  - Kom je met de fiets? `Ты приедешь на велосипеде?` -> `Ты приезжаешь на велосипеде?` (present stays present; kommen = приходить / приезжать, never ехать, which is gaan / rijden). A note may add that Dutch present often means the near future.
  - Hoe laat is het? `Который час?` -> `Сколько времени?` (literal first).
  - een strandwandeling maken in de storm `гулять по пляжу в шторм` -> `совершать прогулку по пляжу в шторм`.
  - de maandagochtend `в понедельник утром` -> `утро понедельника`; note: `op maandagochtend — в понедельник утром`.
  - openen `открывать` -> `открывать (что-то); открываться`, if both uses exist; else name the one.
  - een festival bezoeken `сходить на фестиваль` -> `посещать фестиваль (какой-нибудь)`; de krant lezen -> `читать газету (свою, обычную)`; note says why de / een / none.
  - kerstmis vieren vs de kerstmis: both cards say a holiday name goes without an article in phrases like vieren.
  - de pepernoten `пепернотен` -> `пепернотен (мн.)`; de pepernoot -> `пепернот (одна штука)`.
  - warme chocolademelk `горячий шоколад` -> `тёплое какао с молоком`; de chocolademelk -> `шоколадное молоко` (hot or cold).
  - afgelopen `законченный` -> `прошедший, закончившийся`; note `от: aflopen (заканчиваться) = af + lopen (идти)`, `причастие`; aflopen, lopen and gelopen come before it.
  - om half een -> om half één (spelling and audio).
- Learner complaints are logged in `notes/card-complaints.md`, with the rule each falls under.
- After fixing any card, recheck the whole deck for the same problem, not just the reported card.

## Audio

- Clips are keyed by a hash of their text. Any text change requires a rebuild:
  `.venv/bin/python -I scripts/build-audio.py`, then delete orphan clips in `public/audio`.
  Rebuild after the last `b`/`xb` edit: affix examples rewritten after a build kept their old keys,
  so `be-` played «Kennismaken en begroeten.». `app/utils/clips.spec.ts` fails on any card whose
  `au`/`axb` is not the hash of its own text.
- The audio repo is `~/Projects/private/pages/van-start-audio`. `scripts/deploy.sh` syncs and pushes it before the site: `scripts/sync-audio.py` makes `public/audio` and the repo hold exactly the clips the deck references (refuses when one is missing locally: run build-audio.py), then the repo is committed and pushed. A clip missing there gave a 404 on the deployed site. Test: `python3 -I scripts/sync_audio_test.py`.
- jj refuses to push past an empty undescribed commit; deploy.sh abandons them first.
- Audio no card references is always deleted, locally and in the audio repo.
- Audio loads lazily, in the background.
- A card is spoken after it is picked. In the pronunciation game, the example audio is available once the answer is revealed.
- An affix card has no sound of its own: it is voiced by its example word (`toStudyCard` sets `nl`/`audio` from `xb`/`axb`, `affix: true`), so ▶ and auto-play say the word. Pronouncing, the intro by pronouncing too, shows and compares that word with its gloss. Listening and dictation leave affixes out (`playsIn` in `games.ts`): they count as passed there for learning progress, are never due there in review, and a section's review menu counts and offers those games without them.
- Every play button is `PlayButton`. A second tap stops its own sound. A small button shows ■ while it plays, its meaning changed; the big listening speaker keeps its picture. In the pronunciation game, Card and Example play the right audio; the extra play button exists only for the learner's recording (Mine, then Compare).

## Games and UX

- **Games.** Five games: reading, speaking, writing, listening/dictation, pronunciation. Each can be turned off in settings.
  - All are on by default. At least one always stays on.
  - Recognizing (choice): Next shows and works only after a wrong pick; hidden it is disabled.
  - Review runs in the chosen game; if that game is off, the first enabled one is used.
- **Learning.**
  - New words come in deck order.
  - Optionally a group opens with pronouncing in place of the intro; pronouncing is then not played again later. Whatever introduces the words (intro, or pronouncing in its place) keeps deck order; every other game shuffles.
  - Each section keeps its own spot to continue from; a topped-up group's spot holds its following-section words too.
  - A short last group is topped up only to the next multiple of five, never past the group size; a group already at a multiple of five is not topped up. Top-up takes the following words when set so, and with none left the most missed learned words (most lapses, then hardest).
  - Progress is per card and per game, shared by every group and kept after a card is learned.
  - Status is measured against the games on now, intro or pronouncing-first included: through all of them is learned, through none is new (whatever was passed in games now off), through some is started. A card learned before games were tracked counts as learned.
  - A section with started words offers to continue before anything else, top-up included, listing the passed games with their word counts. Continuing goes through the section in deck order; a card in a group, topped-up ones included, skips the games it passed.
  - Starting over first lists the passed games with their word counts and warns that this progress is dropped; it drops it for the section's started words only.
  - A group goes game by game, from the earliest one any of its cards has not passed; each game takes only those cards, shuffled (the intro keeps deck order).
  - The same card never shows twice in a row.
  - A mistake climbs the ladder while new cards are left to space it; what they cannot space moves to the next group.
  - Shuffling: a card's chance grows with time since it was last shown or touched, counting 5:5 / 1:5 rounds.
- **Cards in games.**
  - In every mode (1:1, 5:5, 1:5, recall, typing) cards have notes and the same size.
  - Dividers do not jump.
  - 1:5 shows only examples from the current set.
- **Navigation.**
  - The user can go back to the previous card. Back restores the card's last state.
  - No swipes: cards move only by buttons, which show what they do.
  - Before the meaning is out, a Dutch-side prompt hides its picture (it would give the meaning away) but keeps its place, so nothing jumps.
  - Before the answer is out, every note item that hints at the Dutch word stays hidden in place: its forms, `вариант:`/`синоним:`/`родственное:`/`от:` items, and any Russian item with Dutch in it except the allowed de, het, een, geen and -e. A translated item hides when its Russian twin does. Usage rules stay shown.
  - Buttons never vanish mid-card: one not usable yet is disabled, so nothing jumps.
  - "left" counts cards of the game not passed yet; a retried card counts once.
  - Review has no limit: it asks every card due now.
  - Review gaps follow 2-7-30: a learned word is due on day 2, each right answer moves it to 7, then 30, then doubles the gap; a miss starts over at 2, and putting it right in the same session keeps 2. Each gap counts from the last answer, per word and per game. A right answer before the word is due credits only the ladder gap its elapsed days cover (day 3 of a 2-7 step counts as the 2, so next is 7 from now); under 2 days changes nothing. Once the due time has come the whole step counts.
  - In a session, learning and review alike, every card game (listening included) follows the ladder below: a miss or a guess comes back after exactly 4 shown cards, each right answer moves it a rung up, past the top it is passed. A right answer with no other card left passes it.
  - A guess comes back like a miss but is graded neither way (no FSRS grade, no score, no error, not toward accuracy; stepping back gives the card a fresh grade): recall shows Guessed beside Example only after Reveal (before it Card and Example take the whole row), Forgot beside Remembered; typing offers Guessed in place of No idea once the answer is right; choice has a Guessing toggle pressed before the pick.
  - Every group, Continue included, is filled with the words not learned in all games on, in deck order, up to the group size; whether a word was seen before never changes its place. Then each game but the intro (or pronouncing in its place) shuffles by the seed and expected frequency (past mistakes), and runs that order skipping the words that passed it. Continue restores the saved spot only when it holds the very group built now (same ids, same order); a stale spot gives way to the fresh group from its first game. Only an update reload restores the exact spot unconditionally.
  - The offer to continue shows a bar per game on: words of the group to continue that passed it, out of the group.
  - A short group is topped up as set in Settings: words that gave trouble (default) or the next group's words. No question.
  - Pronouncing plays with two buttons: Card and Example, or Compare and Example once a recording exists.
  - Back from the card right after a game page shows that page again, before the previous game or leaving.
  - A game orders its cards as if none were passed; passed ones go by unasked but keep their place, so Back walks every card that came before, passed ones included.
  - The first Back after an answer, and Back from a game page, go to the card really answered last; the passed cards in between are skipped by that step.
  - A session opens on the page of its game when the cards are met by pronouncing and on every Continue (not on an update reload).
  - Meeting cards by pronouncing shows the native side on top; its page says to remember, say aloud and compare with the recording.
  - Lesson history persists. Resume continues at the same card in the same state (answer revealed or not).
  - All randomness is deterministic per lesson seed.
- **Postpone a card.** A button sends the card back at the first-rung gap, like any card, unchecked; a missed card keeps its rung, so its next answer climbs from there. Back puts it back in its place and shows it. A hint at game start explains it. In the voice-recording game, the hint says comparing your voice is optional.
- **Interface.**
  - Bottom buttons stick to the bottom of the screen.
  - The keyboard stays open on input screens.
  - Popups block scrolling, and their buttons stay clear of the rounded screen corners.
  - The recall timer runs from the right edge across the full width.
  - App controls select no text, and a long press shows no system link preview.
- **Settings and data.**
  - Settings save automatically.
  - An update installs at the first possible moment on any page, and the app reloads onto the same step without offering to continue. The reload mark (`utils/update-reload.ts`) holds the page it was set on; a lesson goes on silently only when it is that page, so an update reloading home still leaves the offer to continue. It waits only while audio plays, while the user is typing or recording, while a game holds unsaved state (half a 5:5 pair) and while a DB write is pending (`holdUntilDone` in the kv/sessions/shows queues). UX must not suffer. `installWhenIdle` fires once: its own saves hold and release the update again, and re-firing looped forever (a vitest hang).
  - Import: a Lexilize export keeps its progress; a backup restores progress.
  - A backup holds everything stored: learning, every game's review schedule with its due times, games passed, today's review log, answer counts, settings, own cards and course edits.
  - **Reset by long press**, a sheet that asks twice before anything changes. Answer counts always stay.
    - Learn (in a section's menu): the section's words go back to new; learning, games passed and review schedules go.
    - A review game (in a section's menu, or the home review menu): that game's schedule of those words goes, so they are due now and their gaps start over. Learning stays.
    - The home Review button: the same for every review game at once.

- **Linked words.** A note's reference items (`от:`, `уменьш. от:`, `мн. ч. от:`, `вариант:`, `не путать с:`, `синоним:`, `родственное:` and their translations, a gender mark allowed before them) link each named word to its card: dotted sky underline, tappable (`app/utils/links.ts`, `NoteText.vue`). A word no card has stays text; a card never links to itself; among cards of one spelling the gloss picks the one.
  - A tap opens a bottom sheet on that card (`CardSheet.vue`, `useCardSheet`): word with audio, transcription, every meaning (the one the link gave highlighted), note with its own links, example, learned or not, and the words built on it (cards whose `от:`/`уменьш. от:` names it) in deck order, each tagged with the meaning it builds on when the word has several (the link's meaning highlighted). Opened while an answer is secret, the sheet leaves the asked card out of those lists.
  - Sheets stack. The device's back button closes the top one, as in focus-assistant (`app/utils/back.ts`: one history entry for all layers, a handler stack over it); the sheet's ‹ does the same, ✕ and the backdrop close all and remove the entry.
  - While a sheet is open the answer clock stops.
  - The sheet slides up and fades its backdrop in (200 ms), slides out on close (150 ms), as focus-assistant's `Dialog.vue`. A finger drags it down; let go past a quarter of its height it closes, else springs back. The body takes the gesture while scrolled. Header (word, audio, ✕, transcription) stays put; only the body scrolls.

## Verify and ship

1. Tests: `npx vitest run` (~25 s), plus the three Python tests under Transcription.
2. Deploy:
   ```
   rm -rf .output; sleep 1; rm -rf .output; scripts/deploy.sh "msg" > /private/tmp/claude-501/lx/deploy.log 2>&1
   ```

- An unfinished review is kept in the `session` table (`review-left:<path>:<game>`, via `sessions` in `app/db/sessions.ts`) after each answer and picked up on the next visit at the same card; a finished one is dropped.
- Review starts with the hardest words of its game (misses over right answers, most first), then the order they were learned in; a card missed in the review's own game may jump ahead by its odds (`ordered` in `pickIndex`).
- A resumed session goes on counting steps from its history, so a miss keeps its comeback spacing across leaving and returning.
- A resumed session rebuilds from its history which card each step showed, so a miss's wait is still filled from all cards shown before; else it comes back early or one card fills the whole wait.
- A passed card going by does not count toward a miss's gap, nor as a card left to fill it.
- Backup is our own .json (store export plus unfinished sessions under `sessions`: `learn-resume:*`, `review-left:*`), shared via the share sheet where there is one, else downloaded, named `van-start-<UTC date>-<HHMM>-v<build version>.json`. Lexilize is import-only.

## Session scheduler (`app/utils/scheduler.ts` holds the rules; `Session.vue` applies them on its queue)

- Clock is shows, not seconds. Answers: plus, minus, guessed, postpone.
- Guessed: back to the first rung like a miss, but never counted as an error or toward accuracy.
- Ladder of gaps from 4 up to the session size N (group size from settings; review: its card count), x4 per rung, at least 4 rungs where N allows: 20 -> 4,7,12,20; 100 -> 4,12,34,100; 256 -> 4,16,64,256. N < 16 climbs by 4.
- Miss: back to the first rung. Plus: next rung; past the top the card is passed. Slow plus: like Guessed (back to the first rung, ungraded), but logged as a plus so its time stays in the sample. Slow = an outlier among the game's last 200 timed pluses, once there are 10: over `exp(median + 3 x 1.4826 x MAD)` of the log times, and at least 1.5x and 1 s over the median (`slowAfter` in `app/db/shows.ts`). A fixed 2x median ignored the spread: too lax for steady answers, too strict for wide ones. A new card right at once is passed.
- Postpone: back at the first-rung gap, the card's own rung kept, not logged as a show, never counted as an error or toward accuracy.
- Missed-card progress: a card on the ladder shows `ProgressPie` (ring plus sector filled to rung / `steps.length`) in the card's top-right corner, from the moment a miss shows its right answer (`rungShown`: empty ring), one rung up while a right answer is out; it needs `steps.length - rung` more right answers (fewer rungs in small decks: `ladder`, sized per game by the words it asks: those not passed in it when the session began); a slow one or a new miss restarts at rung 0.
- No fillers. When only misses still waiting their gap are left, the game lets them go unpassed (`stranded` in Session.vue) and emits `carried` for each: an unpassed card stays unlearned, so it opens the next group, whose games and the step between groups space it. learn.vue rates a carried card Hard and the done screen says `N hard words move to the next group`. A card put off is no miss (no `rung`) and still comes back. A saved `filler` flag from older sessions is ignored; such a card never emits `passed`.
- Known mark: every card with a stored score in the game or a miss this session carries the `FillerIcon` badge (head with a spark, `data-testid="known"`) in place of the ring, coloured by how well it is known (`utils/known-colour.ts`: oklch hue from red 25 to green 145, lightness and chroma fixed; formula below); a card new to the game has none. Once missed it shows the ring instead. Session reads stored misses per card and game from the `gameScores` prop (learn.vue passes `store.scores`). The ring shows only on a card missed and not yet through its ladder: empty after the miss, filling with each right answer, emptied by a new miss.
- Typing again: wrong tries before the answer is revealed count as the one miss; a wrong try after Reveal answer (or No idea) emits `miss` and counts one more, undone by Back.
- Typo claims: `I was right` shows once the answer is revealed over a typed try, unless that try was typed after the answer had been shown (`retried`). A claim on a later try (`again`) finishes the card but keeps the first try's miss.
- A saved session spot is taken only when every card id in its queue and history is in the group or the pool (`resumeFrom` returns false otherwise, and the game starts afresh): a stale id crashed the lesson to a blank page (`reading 'id'`).
- Deploy keeps old `_nuxt` chunks (`rsync --exclude _nuxt`): a page still on the previous version loads its lazy chunks after the deploy; deleting them gave a black screen (NUXT_E1005) on opening a lesson. No `skipWaiting`/`clientsClaim`: a new worker must not take over an open old page.
- Update on reload: the plugin checks for a new service worker at start; when one takes over (`controllerchange`, `reloadOnNewWorker`) the page reloads the first moment nothing holds the update, so one reload brings the new version. While the app is in view it also checks every minute and on coming back into view (`checkWhileOpen`): GitHub Pages serves `sw.js` with `max-age=600`, so a deploy can take ~10 min to reach a phone, and polling brings it without manual reloads.
- Recall time: table `recall:[word, game]`, median of the card's last five timed pluses, kept by the `recall_ms` event on show create/delete; read into memory by `loadTypical`, served by `recallMs`. Migration 002 fills it from older shows. A show's `ms` ends at the answer: the reveal (recall games), the pick (choice), the check (typing); reading the result before moving on is not timed, else a missed card read at length came back slow every time and circled without climbing. In the typing games a show's `ms` leaves out the typing: the typing is subtracted, so a long word is not timed as a slow recall. `utils/typing-pace.ts` learns the user's typical key gap (median of the last 200, localStorage `typing-gaps`, the answer being typed included from its third gap); a gap up to 4x typical (clamped 0.6-2.5 s: accents, long-press, fixes) is typing, a longer one is thinking of which one typical gap counts as typing. Gaps under 40 ms (paste, autocomplete) are not learned.
- Update toast: `announceUpdate` (pwa-update plugin) compares the build version with `seen-version` in localStorage and shows "Updated to <version> UTC" for 3 s.
- Jitter: gaps >= 8 get 0..floor(gap/4) extra, by the session seed.
- Pick: due ladder card -> new card while the pool is not full -> end when nothing is pending -> filler (a passed card not shown in the last 10 shows, max (errors+0.5)/(shows+1) x age; a miss puts it back on the ladder, no limit) -> earliest ladder card.
- Pool starts at 4, min 2, no max: every 10 answers accuracy > 85% -> +1, < 75% -> -1 (85% rule).
- The ladder applies to every game where an answer can be wrong, listening included.
- Back after an answer (right, wrong, postpone) undoes it fully; the user answers again.
- In `Session.vue`: a queue item carries `rung`, `missedAt` and `spacing`; `pickIndex` brings it back exactly when `spacing` shown cards passed. N is `retryGap` (learn: group size) or the stage's card count (review). Slow comes from the `isSlow` prop (`app/db/shows.ts`). Each answer and put-off is emitted as `show` (id, game, answer, ms, rung, source) and taken back by `unshow` on Back; pages log them with `sessionLog`.
- Not yet in `Session.vue`: the adaptive pool and fillers (cards come in the stage order); ladder state lives in the session's queue, not on a word x game relation.

## Storage (SurrealDB)

- Embedded SurrealDB, latest `surrealdb` / `@surrealdb/wasm` / `@surrealdb/wasm-native`, `surrealkv://` in a dedicated worker; `mem://` in tests.
- `app/db/connect.ts` `useDb()` opens the db and runs the idempotent `SCHEMA` (`app/db/schema.ts`); `resetDb()` gives tests a fresh `mem://` one.
- `app/db/kv.ts` `load`/`save` back `useStore`: progress -> `word`, gameScores -> `score`, passed -> `passed`, reviews -> `review` (id `[game, word]`), anything else -> `doc`. Each save is one transaction writing only changed rows.
- Unfinished sessions (`learn-resume*`, `review-left*`) live in the `session` table through the sync cache `sessions` (`app/db/sessions.ts`), loaded before mount.
- `app/plugins/00.db.client.ts` migrates, then loads sessions and typical times, before the app mounts.
- Show log per answer. The slow limit per game is computed in memory from its last 200 timed pluses (`refreshTypical`, after each logged show); `stats:<game>` (kept by an event on `show` insert) only lists the games for `loadTypical`.
- Migrations are numbered steps; `schema_version` in the DB (none = 0). On start every step above the current version runs in order, each in a transaction, idempotent, version written after each; a failed step stops and retries next start. The app does not start until done, only a progress bar shows. Steps load lazily (`() => import(...)`), so an up-to-date user downloads none.
- Step 1 copies the old IndexedDB store and localStorage sessions into SurrealDB. The old IndexedDB is kept until a later step cleans it, once the user confirms the move.
- Backup carries the show log and `schema_version`; an old backup goes through the same migration chain.

- The `left` counter counts shows still to come if every answer from now on is right, carried misses left out (`utils/shows-left.ts` plays the queue forward the way `pickIndex` and `stranded` take it), so each right answer takes exactly one off and only a miss makes it grow.
- Card colour (`knownColour`): green for a card never missed in the game; otherwise the share `right / (right + 4 x wrong)` moves the hue from red to green, since each miss wants 4 fixes. It colours both the known mark and the ring of a missed card.
- Putting a card off (`putOff`) keeps its rung as is: a card never missed comes back once, with no ring.


- **Deferred work.** Anything postponed during a pass goes into `.proof/todo.md`; a pass is done only when that file is empty.
