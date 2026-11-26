import { load as get, save as set } from '@/db/kv';
import { type CardInput, createEmptyCard, fsrs, type Grade, Rating, State } from 'ts-fsrs';
import { computed, shallowRef, triggerRef } from 'vue';
import { withUuids } from '@/utils/course-ids';
import { CUSTOM_ID, emptyCustom } from '@/utils/custom';
import { cardsOf, type DeckNode, isEarless } from '@/utils/deck';
import { applyEdits, type Edits, noEdits } from '@/utils/edits';
import { type KindSwitches, shownCards } from '@/utils/kinds';
import { type Confusions, linked, unlinkedWithForms, withBases } from '@/utils/confusions';
import { basesOf, buildIndex, familyOfWord } from '@/utils/links';
import type { LexilizeCard } from '@/utils/lexilize';
import type { GameScores, Score } from '@/utils/score';
import { markReviewed, type ReviewLog } from '@/utils/today';

const DAY = 86_400_000;

import { DEFAULT_GAMES, GAMES, type Game, learnStages, playsIn, REVIEW_GAMES, type ReviewGame, savedGames } from '@/utils/games';


export const LANGUAGES = { en: 'English', es: 'Español', pt: 'Português', tr: 'Türkçe', ro: 'Română', ru: 'Русский' } as const;
export type Language = keyof typeof LANGUAGES;

/** Native side of every card and section name, keyed by id; the Dutch side is shared. */
interface Overlay {
  names: Record<string, string>;
  cards: Record<string, [f: string, xf: string, tr: string, n?: string, nx?: string, xl?: string, xt?: string]>;
}

export interface Settings {
  /** Native language: the side shown and its transcription. */
  language: Language;
  groupSize: number;
  /** Games played, in learning and review; at least one. */
  games: Game[];
  /** A new group opens with pronouncing in place of the intro. */
  pronounceFirst?: boolean;
  /** What tops up a short group: words that gave trouble (unset) or the next group's. */
  topUp?: 'trouble' | 'next';
  /** Recall: seconds to think before the answer shows. */
  recallSeconds: 5 | 10 | 15 | 20 | 30;
  /** Typing: accept any letter case. */
  ignoreCase: boolean;
  /** Typing: accept letters without accents and dots. */
  ignoreMarks: boolean;
  /** Sentences and combinations: off leaves those cards out everywhere, their progress kept. */
  kinds?: KindSwitches;
  /** A group's own switches, by group id, over the global ones. */
  groupKinds?: Record<string, KindSwitches>;
  /** Learning a word again takes the words built on it along: the last choice made. */
  relearnDeep?: boolean;
}

/** FSRS state per card id, as stored (dates as ISO strings). */
export type Progress = Record<string, CardInput>;
/** Each review game keeps its own schedule of the learned cards. */
export type Reviews = Partial<Record<ReviewGame, Progress>>;

const scheduler = fsrs();
const deck = shallowRef<DeckNode>();
/** The course as shipped, before the learner's edits. */
const course = shallowRef<DeckNode>();
/** The course with the learner's edits and every own group, empty ones too. */
const library = shallowRef<DeckNode>();
const edits = shallowRef<Edits>(noEdits());
/** The learner's own sections and words. */
const custom = shallowRef<DeckNode>(emptyCustom());
/** Learning record: a card is learned once it is here. */
const progress = shallowRef<Progress>({});
const reviews = shallowRef<Reviews>({});
/** Recall and typing answers per card id, per game. */
const scores = shallowRef<Record<string, GameScores>>({});
/** Learning games each unlearned card has passed, so another group skips them. */
const passed = shallowRef<Record<string, string[]>>({});
/** Cards the learner mixed up with each other. */
const confusions = shallowRef<Confusions>({});
/** The deck's cards by id and spelling, with what links to each. */
const index = computed(() => buildIndex(deck.value ? cardsOf(deck.value) : []));
const bases = computed(() => basesOf(index.value));
/** The mix-ups, each one of forms carried to their bases. */
const mixedUp = computed(() => withBases(confusions.value, bases.value));
/** Cards reviewed while due today, for the day's progress. */
const reviewLog = shallowRef<ReviewLog>();
const settings = shallowRef<Settings>({ language: 'en', groupSize: 15, games: [...DEFAULT_GAMES], recallSeconds: 10, ignoreCase: true, ignoreMarks: true });
/** False until the learner has saved settings once: the app then opens on them. */
const configured = shallowRef(false);
let loading: Promise<void> | undefined;
/** Prefixes, suffixes and sounds of the deck: they sit out the games played by ear. */
const earless = computed(() => new Set(deck.value ? cardsOf(deck.value).filter(isEarless).map(c => c.id) : []));
/** Course cards whose kind is switched off: learned ones keep their progress but are not reviewed. */
const hidden = computed(() => {
  if (!library.value || !deck.value) return new Set<string>();
  const shown = new Set(cardsOf(deck.value).map(c => c.id));
  return new Set(cardsOf(library.value).filter(c => !shown.has(c.id)).map(c => c.id));
});
/** The card plays the game. */
const playedIn = (id: string, game: string) => playsIn(earless.value.has(id), game);

/** Through every learning game on now, `stages` by default; a card learned before games were tracked counts as through. */
function isThrough(id: string, stages: readonly string[] = learnStages(settings.value.games, settings.value.pronounceFirst)) {
  const games = passed.value[id];
  return games ? stages.every(s => games.includes(s) || !playedIn(id, s)) : id in progress.value;
}

/** The cards start their learning games afresh. */
function forgetPassed(ids: string[]) {
  if (!ids.some(id => passed.value[id])) return;
  passed.value = Object.fromEntries(Object.entries(passed.value).filter(([id]) => !ids.includes(id)));
  void set('passed', passed.value);
}

async function load() {
  const [saved, prefs, own, answered, reviewed, scheduled, changed] = await Promise.all([get<Progress>('progress'), get<Settings>('settings'), get<DeckNode>('custom'), get<Record<string, GameScores>>('gameScores'), get<ReviewLog>('reviewed'), get<Reviews>('reviews'), get<Edits>('edits')]);
  passed.value = (await get<Record<string, string[]>>('passed')) ?? {};
  confusions.value = (await get<Confusions>('confusions')) ?? {};
  reviewLog.value = reviewed;
  scores.value = answered ?? {};
  progress.value = saved ?? {};
  // Before games kept their own schedules, every game shared the learning one.
  reviews.value = scheduled ?? Object.fromEntries(REVIEW_GAMES.map(g => [g, { ...progress.value }]));
  if (changed) edits.value = { ...noEdits(), ...changed };
  if (own) custom.value = { ...own, id: CUSTOM_ID, name: own.name === 'My words' ? 'My cards' : own.name };
  if (prefs) settings.value = { ...settings.value, ...prefs };
  settings.value = { ...settings.value, games: savedGames(settings.value.games) };
  configured.value = prefs !== undefined;
  await loadDeck();
  if (navigator.storage?.persist) void navigator.storage.persist();
}

async function loadDeck() {
  const base = useRuntimeConfig().app.baseURL;
  const { language } = settings.value;
  const [tree, overlay] = await Promise.all([
    fetch(`${base}deck.json`).then(r => r.json() as Promise<DeckNode>),
    language === 'ru' ? undefined : fetch(`${base}lang/${language}.json`).then(r => (r.ok ? (r.json() as Promise<Overlay>) : undefined)).catch(() => undefined),
  ]);
  // Without its overlay the deck falls back to the Russian side.
  if (overlay?.names && overlay.cards) localize(tree, overlay);
  course.value = withUuids(tree);
  compose();
}

/** The edited course, then the learner's own groups that hold a card. */
function compose() {
  if (!course.value) return;
  const edited = applyEdits(course.value, edits.value);
  const loose = custom.value.cards?.length ? [{ id: CUSTOM_ID, name: custom.value.name, cards: custom.value.cards }] : [];
  const own = [...loose, ...(custom.value.children ?? [])];
  library.value = { ...edited, children: [...(edited.children ?? []), ...own] };
  const { kinds = {}, groupKinds = {} } = settings.value;
  deck.value = shownCards({ ...edited, children: [...(edited.children ?? []), ...own.filter(n => cardsOf(n).length)] }, kinds, groupKinds);
}

/** Removed cards lose their progress. */
function forget(removed: string[]) {
  if (!removed.some(id => id in progress.value)) return;
  for (const id of removed) delete progress.value[id];
  for (const game of REVIEW_GAMES) for (const id of removed) schedule(game, id, undefined);
  saveProgress();
  saveReviews();
}

function localize(node: DeckNode, overlay: Overlay) {
  node.name = overlay.names[node.id] ?? node.name;
  for (const card of node.cards ?? []) {
    const native = overlay.cards[card.id];
    if (!native) continue;
    card.nr = card.n;
    [card.f, card.xf, card.tr, card.n, card.nx] = native;
    if (native[5]) card.xl = native[5];
    if (native[6]) card.xt = native[6];
  }
  for (const child of node.children ?? []) localize(child, overlay);
}

function saveConfusions(next: Confusions) {
  confusions.value = next;
  void set('confusions', next);
}

function saveProgress() {
  triggerRef(progress);
  void set('progress', progress.value);
}

function saveReviews() {
  reviews.value = { ...reviews.value };
  void set('reviews', JSON.parse(JSON.stringify(reviews.value)));
}

/** Sets one game's schedule of a card; `undefined` drops it. */
function schedule(game: ReviewGame, id: string, card: CardInput | undefined) {
  const { [id]: _, ...others } = reviews.value[game] ?? {};
  reviews.value[game] = card ? { ...others, [id]: card } : others;
}

/** Due in a game: learned, played by the card, and either never asked in it or its time has come. */
function isDueIn(id: string, game: ReviewGame, now: Date) {
  if (!(id in progress.value) || !playedIn(id, game) || hidden.value.has(id)) return false;
  const card = reviews.value[game]?.[id];
  return card === undefined || new Date(card.due) <= now;
}

const next = (card: CardInput, now: Date, rating: Grade) => JSON.parse(JSON.stringify(scheduler.next(card, now, rating).card)) as CardInput;

/** Review gaps in days: 2, 7, 30, then doubling; a miss starts over, and putting it right keeps day 2. */
const LADDER = [2, 7, 30];
const DAY_MS = 86_400_000;
const gapAfter = (gap: number) => LADDER.find(d => d > gap) ?? gap * 2;
/** The longest gap, at most the scheduled one, that the days since the last review cover; none when under day 2. */
function coveredGap(card: CardInput, now: Date) {
  const days = Math.round((now.getTime() - new Date(card.last_review!).getTime()) / DAY_MS);
  let covered: number | undefined;
  for (let gap = LADDER[0]!; gap <= Math.min(days, card.scheduled_days); gap = gapAfter(gap)) covered = gap;
  return covered;
}
/** A game's schedule after an answer, counted from now. An early right answer counts for the gap its days cover, and before day 2 for none. */
function review(card: CardInput | undefined, now: Date, rating: Grade): CardInput {
  const missed = rating === Rating.Again || !card?.scheduled_days || card.state === State.Relearning;
  const covered = missed ? undefined : card.last_review && now < new Date(card.due) ? coveredGap(card, now) : card.scheduled_days;
  if (!missed && covered === undefined) return card!;
  const gap = missed ? LADDER[0]! : gapAfter(covered!);
  const base = next(card ?? createEmptyCard(now), now, rating);
  const state = rating === Rating.Again ? State.Relearning : State.Review;
  return { ...base, state, scheduled_days: gap, due: new Date(now.getTime() + gap * DAY_MS).toISOString(), last_review: now.toISOString() };
}

/** Learns the words, each with its rating, and every review game starts its schedule; one save for them all, since each save writes the whole store. */
function learn(ratings: Record<string, Grade>) {
  const now = new Date();
  for (const [id, rating] of Object.entries(ratings)) {
    progress.value[id] = next(progress.value[id] ?? createEmptyCard(now), now, rating);
    for (const g of REVIEW_GAMES) schedule(g, id, review(undefined, now, rating));
  }
  saveProgress();
  saveReviews();
}

export function useStore() {
  loading ??= load();

  return {
    ready: loading,
    deck,
    progress,
    reviews,
    scores,
    reviewLog,
    settings,
    configured,
    custom,
    Rating,

    course,
    library,
    edits,

    /** Saves the learner's groups; removed cards lose their progress. */
    saveCustom(next: DeckNode, removed: string[] = []) {
      custom.value = next;
      void set('custom', JSON.parse(JSON.stringify(next)));
      forget(removed);
      compose();
    },

    /** Saves the learner's changes to the course; removed cards lose their progress. */
    saveEdits(next: Edits, removed: string[] = []) {
      edits.value = next;
      void set('edits', JSON.parse(JSON.stringify(next)));
      forget(removed);
      compose();
    },

    isLearned: (id: string) => id in progress.value,
    /** Its kind is switched off where it sits. */
    isHidden: (id: string) => hidden.value.has(id),
    isThrough,
    playedIn,
    /** Due in the game, or without one in any review game. */
    isDue: (id: string, now = new Date(), game?: ReviewGame) => (game ? [game] : REVIEW_GAMES).some(g => isDueIn(id, g, now)),
    /** Learned cards due in the game. */
    dueIn: (game: ReviewGame, now = new Date()) => Object.keys(progress.value).filter(id => isDueIn(id, game, now)),
    scheduleOf: (id: string, game: ReviewGame) => reviews.value[game]?.[id],

    updateSettings(patch: Partial<Settings>) {
      settings.value = { ...settings.value, ...patch };
      void set('settings', settings.value);
      configured.value = true;
      if (patch.language) void loadDeck();
      else if (patch.kinds || patch.groupKinds) compose();
    },

    /** Records one answer. In a game, the card moves along that game's schedule; without, it is learned and every review game starts or moves its schedule. */
    rate(id: string, rating: Grade, game?: ReviewGame) {
      const now = new Date();
      if (game) {
        if (isDueIn(id, game, now)) {
          reviewLog.value = markReviewed(reviewLog.value, `${game}:${id}`, now);
          void set('reviewed', reviewLog.value);
        }
        schedule(game, id, review(reviews.value[game]?.[id], now, rating));
        return saveReviews();
      }
      learn({ [id]: rating });
    },

    learn,

    confusions: mixedUp,
    index,
    /** Links two cards the learner mixed up. */
    confuse: (a: string, b: string) => saveConfusions(linked(confusions.value, a, b)),
    unconfuse: (a: string, b: string) => saveConfusions(unlinkedWithForms(confusions.value, a, b, bases.value)),

    passed,
    forgetPassed,
    /** The card passed this learning game. */
    pass(id: string, game: string) {
      if (passed.value[id]?.includes(game)) return;
      passed.value = { ...passed.value, [id]: [...(passed.value[id] ?? []), game] };
      void set('passed', passed.value);
    },

    saveScore(id: string, game: string, score: Score | undefined) {
      const { [game]: _, ...others } = scores.value[id] ?? {};
      scores.value = { ...scores.value, [id]: score ? { ...others, [game]: score } : others };
      void set('gameScores', scores.value);
    },

    /** The words go back to new: learning, games passed and review schedules go; answer counts stay. */
    forgetLearning(ids: string[]) {
      forget(ids);
      forgetPassed(ids);
    },

    /** Every word built on the card or formed from it, at any depth. */
    familyOf: (id: string) => familyOfWord(index.value, bases.value, id),

    /** The word goes back to new, with every word built on it when `deep`; the choice is remembered. */
    relearn(id: string, deep: boolean) {
      const ids = [id, ...(deep ? familyOfWord(index.value, bases.value, id) : [])];
      forget(ids);
      forgetPassed(ids);
      settings.value = { ...settings.value, relearnDeep: deep };
      void set('settings', settings.value);
    },

    /** The words come due now in these games, their gaps starting over; learning and answer counts stay. */
    forgetReviews(ids: string[], games: readonly ReviewGame[]) {
      for (const game of games) for (const id of ids) schedule(game, id, undefined);
      saveReviews();
    },

    exportProgress(): string {
      return JSON.stringify({ progress: progress.value, reviews: reviews.value, passed: passed.value, reviewed: reviewLog.value, settings: settings.value, gameScores: scores.value, custom: custom.value, edits: edits.value, confusions: confusions.value });
    },

    /** Puts a card's schedule in the game back as it was. */
    restore(id: string, game: ReviewGame, card: CardInput | undefined) {
      schedule(game, id, card);
      saveReviews();
    },

    /** Lexilize progress by card uuid: studied cards enter the schedule due when Lexilize had them due. */
    importLexilize(cards: Map<string, LexilizeCard>): number {
      let count = 0;
      for (const { id } of cardsOf(deck.value!)) {
        const lx = cards.get(id);
        if (!lx || lx.state < 2) continue;
        const local = progress.value[id];
        if (local && new Date(local.due).getTime() >= lx.due) continue;
        const interval = Math.max(1, Math.round((lx.due - lx.since) / DAY));
        // The interval runs from the later of Lexilize's last review and ours.
        const since = Math.max(lx.since, local?.last_review ? new Date(local.last_review).getTime() : 0);
        const card = JSON.parse(JSON.stringify({
          ...createEmptyCard(new Date(since)),
          due: new Date(lx.due + since - lx.since),
          stability: interval,
          difficulty: 5,
          scheduled_days: interval,
          reps: 1,
          state: State.Review,
          last_review: new Date(since),
        })) as CardInput;
        progress.value[id] = card;
        for (const game of REVIEW_GAMES) schedule(game, id, card);
        count++;
      }
      saveProgress();
      saveReviews();
      return count;
    },

    importProgress(json: string) {
      const data = JSON.parse(json) as { progress: Progress; reviews?: Reviews; passed?: Record<string, string[]>; reviewed?: ReviewLog; settings?: Settings; gameScores?: Record<string, GameScores>; custom?: DeckNode; edits?: Edits; confusions?: Confusions };
      progress.value = data.progress;
      saveProgress();
      reviews.value = data.reviews ?? Object.fromEntries(REVIEW_GAMES.map(g => [g, { ...data.progress }]));
      saveReviews();
      if (data.gameScores) {
        scores.value = data.gameScores;
        void set('gameScores', scores.value);
      }
      if (data.passed) {
        passed.value = data.passed;
        void set('passed', passed.value);
      }
      if (data.reviewed) {
        reviewLog.value = data.reviewed;
        void set('reviewed', reviewLog.value);
      }
      if (data.confusions) saveConfusions(data.confusions);
      if (data.custom) this.saveCustom(data.custom);
      if (data.edits) this.saveEdits({ ...noEdits(), ...data.edits });
      if (data.settings) this.updateSettings(data.settings);
    },
  };
}

