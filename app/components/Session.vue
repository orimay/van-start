<script setup lang="ts">
import { computed, nextTick, provide, shallowRef, useTemplateRef, watch } from 'vue';
import { flip, type StudyCard } from '@/utils/deck';
import { pickIndex } from '@/utils/pick';
import { ladder, type Answer as Given, type Source } from '@/utils/scheduler';
import { preloadClips } from '@/utils/preload';
import { seeded } from '@/utils/random';
import { showsLeft } from '@/utils/shows-left';
import { diff, patch, type Runs } from '@/utils/runs';
import { GAME_TITLES, GAME_HINTS } from '@/utils/games';
import { knownColour } from '@/utils/known-colour';
import { isMissed, oddsOf, type GameScores, type Score } from '@/utils/score';
import { lookalikes } from '@/utils/similar';
import { chunk, shuffle } from '@/utils/shuffle';

export type Stage = 'intro' | 'match' | 'choice' | 'pronounce' | 'recallNative' | 'listen' | 'recall' | 'type' | 'dictation';

const props = defineProps<{
  cards: StudyCard[];
  stages: Stage[];
  /** Cards to draw wrong options from in the choice game; the ones that look most like the answer win. */
  pool: StudyCard[];
  /** Ids the learner has met; they win among equal lookalikes. All count as known when omitted. */
  known?: string[];
  lang: string;
  /** Stage to start from, for resuming an interrupted session. */
  startAt?: number;
  /** Top of the ladder a missed card climbs: it comes back after 4 others, then further at each right answer. The stage's card count when omitted. */
  retryGap?: number;
  /** Whether an answer took too long to count as known; a slow right answer keeps its card on its rung. */
  isSlow?: (game: string, ms: number) => boolean;
  /** Earlier answers per card id: missed cards go first, and each card's odds follow its balance. */
  scores?: Record<string, Score>;
  /** Stored right/wrong per card and game, read for the game being played. */
  gameScores?: Record<string, GameScores>;
  /** Game to ask a card in instead of the stage's, per card id. */
  games?: Partial<Record<string, Stage>>;
  /** Exact spot to resume at, as last emitted by `position`. */
  resumeAt?: Position;
  /** Games each card already passed: it skips them. */
  passed?: Record<string, string[]>;
  /** The first stage introduces the cards, so it keeps deck order like the intro. */
  introducing?: boolean;
  /** Opens on the page of the current game, a resumed one included. */
  announce?: boolean;
  /** Cards come in the given order; ones with better odds may jump ahead. */
  ordered?: boolean;
  /** Same seed, same session: order, options and layouts repeat. */
  seed?: string;
}>();
const emit = defineEmits<{
  /** First attempt of a card at a stage; a retry after a mistake is not reported. */
  answer: [id: string, stage: Stage, ok: boolean];
  finished: [];
  /** The card is done with this game. */
  passed: [id: string, stage: Stage];
  /** A miss left waiting when the game ran out of cards: it stays unpassed, so the next group starts with it. */
  carried: [id: string, stage: Stage];
  stage: [index: number];
  /** The learner stepped back over this answer: forget it. */
  undo: [id: string, stage: Stage];
  /** Where the session stands now, to resume from later. */
  position: [Position];
  /** Every answer and put-off, for the log. */
  show: [ShowEvent];
  /** The learner stepped back over this show: forget it. */
  unshow: [id: string];
}>();

export interface ShowEvent {
  id: string;
  game: Stage;
  answer: Given;
  ms: number;
  /** Ladder rung the card stood on; -1 while new. */
  rung: number;
  source: Source;
}

export interface Position {
  stage: number;
  /** Queue items as card ids; a match item has several. */
  queue: { match: boolean; ids: string[]; round?: number; missedAt?: number; spacing?: number; rung?: number; matched?: string[]; mistakes?: string[]; state?: CardState; skip?: boolean; filler?: boolean }[];
  size: number;
  reported: string[];
  /** Earlier steps, so Back still works after a reload. */
  history?: SavedStep[];
}

type SavedItem = Position['queue'][number];

/** One earlier step; its queue and reported ids as runs over the step after it, or whole in older saves. */
type SavedStep = { stage: number; size: number; answers: string[] } & ({ queue: SavedItem[]; reported: string[] } | { runs: Runs<SavedItem>; reportedRuns: Runs<string> });

/** A card game's state mid-answer, so a reload shows it as it was. */
export type CardState = { revealed?: 'self' | 'timeout'; picked?: string; options?: string[]; input?: string; verdict?: boolean; phase?: 'typing' | 'missed' | 'shown' | 'done' | 'fixing'; retried?: boolean; again?: boolean };

/** `round`: how many times the item was missed before; a later round waits for the earlier one to finish. */
/** `skip`: passed before, so it goes by unasked yet keeps its place for Back. */
type Item = ({ kind: 'card'; card: StudyCard; state?: CardState; skip?: boolean } | { kind: 'match'; cards: StudyCard[]; matched?: string[]; mistakes?: string[] }) & { round?: number; missedAt?: number; spacing?: number; rung?: number };

const seed = props.seed ?? String(Math.random());
/** A random source fixed per decision, so resume and back replay it identically. */
const randomFor = (...parts: Array<string | number>) => seeded([seed, ...parts].join(':'));

const idsOf = (item: Item) => (item.kind === 'card' ? [item.card.id] : item.cards.map(c => c.id));
const keyOf = (item: Item) => idsOf(item).join();
const inGroupIds = new Set(props.cards.map(c => c.id));
/** Step at which each card was last on screen. */
const shown = new Map<string, number>();
/** Mistakes per card id this session: each one makes the card come up more often. */
const mistakes = new Map<string, number>();
const odds = new Map(Object.entries(props.scores ?? {}).map(([id, s]) => [id, oddsOf(s)]));
/** Games passed when the session began, so a stage's ladder keeps its length while its cards pass. */
const passedAtStart: Record<string, string[]> = JSON.parse(JSON.stringify(props.passed ?? {}));
/** A stage's ladder is as long as the words it asks, not the whole group. */
const steps = computed(() => ladder(props.retryGap ?? Math.max(1, props.cards.filter(c => !passedAtStart[c.id]?.includes(props.stages[stageIndex.value]!)).length)));
const JITTER_FROM = 8;
/** Comeback gap of a rung, a long one jittered by up to a quarter. */
const gapOf = (rung: number, at = step.value) => {
  const gap = steps.value[rung]!;
  return gap + (gap >= JITTER_FROM ? Math.floor(randomFor('gap', at)() * (Math.floor(gap / 4) + 1)) : 0);
};

/** Moves the next item to the front; the first look at new cards follows the deck. */
function pickFront(items: Item[]): Item[] {
  if (stage.value === 'intro' || (props.introducing && stageIndex.value === 0) || items.length < 2) return items;
  const pickables = items.map(i => ({ key: keyOf(i), ids: idsOf(i), round: i.round, missedAt: i.missedAt, spacing: i.spacing }));
  const at = pickIndex(pickables, { step: step.value, shown, mistakes, odds, gap: steps.value[0], ordered: props.ordered, random: randomFor('pick', step.value) });
  return [items[at]!, ...items.slice(0, at), ...items.slice(at + 1)];
}

const STAGE_TITLES = GAME_TITLES;

/** What the learner does in each game, shown as the game begins. */
const STAGE_HINTS = GAME_HINTS;
// Only where the service worker can keep them; elsewhere the fetches would be wasted.
if (typeof window !== 'undefined' && 'caches' in window) void preloadClips(props.cards, useRuntimeConfig().public.audioBase);
const NO_LATER: Stage[] = ['intro', 'match'];
/** The later button is first offered in this game, so its tip goes on that announcement. */
const firstLaterStage = computed(() => props.stages.findIndex(s => !NO_LATER.includes(s)));

const stageIndex = shallowRef(0);
/** A new game has begun and waits for Start. */
const announcing = shallowRef(false);
const queue = shallowRef<Item[]>([]);
const step = shallowRef(0);
/** Remounts the game on every move, back included. */
const view = shallowRef(0);
const stageSize = shallowRef(1);
let reported = new Set<string>();
/** `stage:id` of guesses this session: answers that sent no grade, so stepping back has none to take back. */
const ungraded = new Set<string>();

/** State before each finished item, so the learner can step back to it. */
interface Snapshot {
  stageIndex: number;
  queue: Item[];
  stageSize: number;
  reported: Set<string>;
  /** Answers reported by the item, undone when stepping back over it; a match round's mistake stays. */
  answers: string[];
  /** Cards logged as shown by the item, taken out of the log when stepping back over it. */
  shows?: string[];
  /** Pick state, so going forward again picks the same next item; missing after a reload. */
  pick?: { step: number; shown: Map<string, number>; mistakes: Map<string, number>; cleared?: Set<string> };
}
const history = shallowRef<Snapshot[]>([]);
let answers: string[] = [];
let shows: string[] = [];
/** When the card on screen came up, to time the answer. */
let shownAt = Date.now();
/** An answer is timed to its reveal, pick or check: reading the result after it is no thinking. */
let answeredAt: number | undefined;

const stage = computed(() => props.stages[stageIndex.value]!);
/** Pronouncing in the intro's place meets the cards: the meaning on top, the Dutch to say under it. */
const meeting = computed(() => props.introducing && stageIndex.value === 0 && stage.value === 'pronounce');
const hint = computed(() => (meeting.value ? 'Remember the new cards: read the meaning, say the Dutch aloud, record yourself if you like, then listen and compare.' : STAGE_HINTS[stage.value]));
const gameOf = (id: string, at = stage.value) => props.games?.[id] ?? at;
/** The game on screen: the current card's own, else the stage's. */
const game = computed(() => (current.value?.kind === 'card' ? gameOf(current.value.card.id) : stage.value));
/** Share of the session done: whole stages plus the part of this one, retries not counted. */
/** Cards of the game not passed yet, a retried one once. */
const idsLeft = (items: Item[]) => new Set(items.filter(i => i.kind !== 'card' || !i.skip).flatMap(idsOf));
/** Shows to the end of the game if every answer from now on is right. */
const cardsLeft = computed(() => {
  const pending = queue.value.filter(i => i.kind === 'match' || !i.skip);
  const items = pending.map(i => ({ size: i.kind === 'match' ? i.cards.length : 1, rung: i.rung, missedAt: i.missedAt, spacing: i.spacing }));
  return showsLeft(items, { step: step.value, ladder: steps.value, gapAt: (at, rung) => gapOf(rung, at) });
});
/** Cards with nothing left in the queue, out of the stage's cards: a miss holds it still, never pulls it back. */
const progress = computed(() => {
  const left = idsLeft(queue.value).size;
  const cardsInStage = props.cards.length || 1;
  return (stageIndex.value + Math.max(0, 1 - left / cardsInStage)) / props.stages.length;
});
const current = computed(() => queue.value[0]);
const knownIds = props.known && new Set(props.known);
const isKnown = (id: string) => knownIds?.has(id) ?? true;
const byId = new Map(props.cards.concat(props.pool).map(c => [c.id, c]));
// Recomputes only when the card changes, not when its state is saved.
/** The ladder rung to draw: a miss whose right answer is out starts over at the bottom, a right one climbs. */
const rungShown = computed(() => {
  const item = current.value;
  if (item?.kind !== 'card') return undefined;
  const { verdict, picked, phase } = item.state ?? {};
  if (verdict === false || (picked !== undefined && picked !== item.card.id)) return 0;
  if (item.rung === undefined) return undefined;
  const rightNow = picked === item.card.id || (verdict === true && phase === 'done');
  return rightNow ? Math.min(item.rung + 1, steps.value.length) : item.rung;
});
const cardColour = computed(() => {
  const item = current.value;
  if (item?.kind !== 'card') return undefined;
  const stored = props.gameScores?.[item.card.id]?.[gameOf(item.card.id)] ?? props.scores?.[item.card.id];
  // A card new to the game has nothing to show yet.
  if (!stored && !mistakes.has(item.card.id)) return undefined;
  return knownColour(stored?.right ?? 0, (stored?.wrong ?? 0) + (mistakes.get(item.card.id) ?? 0));
});
const currentCard = computed(() => (current.value?.kind === 'card' ? current.value.card : undefined));
const options = computed(() => {
  const card = currentCard.value;
  if (!card) return [];
  const kept = current.value?.kind === 'card' ? current.value.state?.options : undefined;
  return kept?.every(id => byId.has(id)) ? kept.map(id => byId.get(id)!) : optionsFor(card);
});

if (!props.resumeAt || !resumeFrom(props.resumeAt)) {
  startStage(props.startAt ?? 0);
  // Every card passed the first game, so the next one is announced as usual.
  announcing.value = stageIndex.value > (props.startAt ?? 0);
}
if (props.announce) announcing.value = true;
/** History length when the game page was last shown: back from the card right after it shows the page again. */
/** Where this game's steps begin: its passed cards that went by come after its page. */
const gameStart = () => history.value.findLastIndex(h => h.stageIndex !== stageIndex.value) + 1;
const announcedAt = shallowRef(announcing.value ? (props.resumeAt ? history.value.length : gameStart()) : -1);
watch(announcing, on => on && (announcedAt.value = gameStart()));
const backToPage = () => !announcing.value && announcedAt.value === history.value.length && !answers.length;
const isSkipped = (h: Snapshot) => h.queue[0]?.kind === 'card' && !!h.queue[0].skip;
/** Set by Back, cleared by an answer: the first step back passes over the passed cards to the card really answered last. */
let steppingBack = false;

function itemsFrom(saved: Position['queue']): Item[] {
  return saved.map(({ match, ids, round, missedAt, spacing, rung, matched, mistakes, state, skip }): Item => {
    const cards = ids.map(id => byId.get(id)!);
    const spacedAt = { ...(missedAt !== undefined && { missedAt }), ...(spacing && { spacing }), ...(rung !== undefined && { rung }) };
    return match ? { kind: 'match', cards, round, matched, mistakes, ...spacedAt } : { kind: 'card', card: cards[0]!, round, state, ...spacedAt, ...(skip && { skip }) };
  });
}

function savedFrom(items: Item[]): Position['queue'] {
  return items.map(i => ({ match: i.kind === 'match', ids: i.kind === 'match' ? i.cards.map(c => c.id) : [i.card.id], round: i.round, ...(i.missedAt !== undefined && { missedAt: i.missedAt }), ...(i.spacing && { spacing: i.spacing }), ...(i.rung !== undefined && { rung: i.rung }), ...(i.kind === 'match' && { matched: i.matched, mistakes: i.mistakes }), ...(i.kind === 'card' && i.state && { state: i.state }), ...(i.kind === 'card' && i.skip && { skip: true }) }));
}

/** False, leaving the session untouched, when the spot names a card neither the group nor the deck holds. */
function resumeFrom(at: Position) {
  const holds = (queue: SavedItem[]) => queue.every(i => i.ids.every(id => byId.has(id)));
  let later = at.queue;
  const fits = holds(at.queue) && [...(at.history ?? [])].reverse().every(h => holds((later = 'runs' in h ? patch(h.runs, later) : h.queue)));
  if (!fits) return false;
  stageIndex.value = at.stage;
  queue.value = itemsFrom(at.queue);
  stageSize.value = at.size;
  reported = new Set(at.reported);
  // Each step is told against the one after it, so it is rebuilt from the newest back.
  let next = { queue: at.queue, reported: at.reported };
  const steps = [...(at.history ?? [])].reverse().map(h => {
    next = 'runs' in h ? { queue: patch(h.runs, next.queue), reported: patch(h.reportedRuns, next.reported) } : { queue: h.queue, reported: h.reported };
    return { stageIndex: h.stage, queue: itemsFrom(next.queue), stageSize: h.size, reported: new Set(next.reported), answers: h.answers };
  });
  history.value = steps.reverse();
  // Misses wait by steps, so the count goes on where it stopped.
  step.value = steps.length;
  // Each step began on the card it showed, so the shown cards that fill a miss's wait come back too.
  history.value.forEach((h, at) => h.queue[0] && idsOf(h.queue[0]).forEach(id => shown.set(id, at)));
  return true;
}

const keyOfSaved = (item: SavedItem) => JSON.stringify(item);

/** Earlier steps as runs over the step after each, so the save grows with the steps, not with the deck. */
function savedHistory(queue: SavedItem[], reported: string[]): SavedStep[] {
  let next = { queue, reported };
  return [...history.value]
    .reverse()
    .map(h => {
      const step = { queue: savedFrom(h.queue), reported: [...h.reported] };
      const saved: SavedStep = { stage: h.stageIndex, size: h.stageSize, answers: h.answers, runs: diff(step.queue, next.queue, keyOfSaved), reportedRuns: diff(step.reported, next.reported, String) };
      next = step;
      return saved;
    })
    .reverse();
}

function emitPosition(items = queue.value) {
  const queue = savedFrom(items);
  const ids = [...reported];
  emit('position', { stage: stageIndex.value, queue, size: stageSize.value, reported: ids, history: savedHistory(queue, ids) });
}

watch(queue, items => emitPosition(items), { immediate: true });
watch(view, () => {
  shownAt = Date.now();
  answeredAt = undefined;
});

// Reading a linked word's sheet is no thinking on the answer: the clock stops while one is open.
let sheetOpenedAt: number | undefined;
watch(
  () => useCardSheet().layers.value.length > 0,
  open => {
    if (open) sheetOpenedAt = Date.now();
    else if (sheetOpenedAt !== undefined && answeredAt === undefined) shownAt += Date.now() - sheetOpenedAt;
    if (!open) sheetOpenedAt = undefined;
  },
);

/** Keeps a match round's state on its item, so a reload comes back to the same pairs. */
function onMatchProgress(matched: string[], mistakes: string[]) {
  const [first, ...rest] = queue.value;
  if (first?.kind === 'match') queue.value = [{ ...first, matched, mistakes }, ...rest];
}

/** Keeps a card's answer on its item; a retry later starts clean. */
function onCardProgress(state: CardState) {
  const [first, ...rest] = queue.value;
  if ((state.revealed || state.picked !== undefined || state.phase === 'done') && answeredAt === undefined) answeredAt = Date.now();
  if (first?.kind === 'card') queue.value = [{ ...first, state: { ...first.state, ...state, options: options.value.map(o => o.id) } }, ...rest];
}

provide('session', {
  canBack: computed(() => (announcing.value ? history.value.slice(0, announcedAt.value).some(h => !isSkipped(h)) : history.value.length > 0 || backToPage())),
  back,
  canPutOff: computed(() => !announcing.value && current.value?.kind === 'card' && queue.value.length > 1),
  putOff,
});

function startStage(index: number): void {
  stageIndex.value = index;
  emit('stage', index);
  reported = new Set();
  const due = props.cards.filter(c => !props.passed?.[c.id]?.includes(props.stages[index]!));
  if (!due.length) return void (index + 1 < props.stages.length ? startStage(index + 1) : emit('finished'));
  // One card cannot be matched, so the passed ones keep it company.
  const own = props.stages[index] === 'match' && due.length < 2 ? props.cards : due;
  const cards = props.stages[index] !== 'match' ? props.cards : shuffle(own, randomFor('stage', index));
  const isPassed = (card: StudyCard) => !due.includes(card);
  const items: Item[] = props.stages[index] === 'match' ? matchChunks(cards).map(c => ({ kind: 'match', cards: c })) : cards.map((card): Item => ({ kind: 'card', card, ...(!props.ordered && isMissed(props.scores?.[card.id]) && { round: -1 }), ...(isPassed(card) && { skip: true }) }));
  queue.value = pickFront(items);
  stageSize.value = items.length;
  skipPassed();
}

/** Passed cards go by on their own, each a step Back can return to. */
function skipPassed() {
  if (current.value?.kind === 'card' && current.value.skip) advance([]);
}

/** Groups of five; a lone leftover card joins the previous group, since one card cannot be matched. */
function matchChunks(cards: StudyCard[]): StudyCard[][] {
  const groups = chunk(cards, 5);
  const last = groups.at(-1);
  if (groups.length > 1 && last?.length === 1) groups[groups.length - 2]!.push(...groups.pop()!);
  return groups;
}

/** `regradable`: the card comes back as it was left, so stepping back takes any answer back to be given again. */
function report(id: string, ok: boolean, regradable = false) {
  if (reported.has(id)) return;
  reported.add(id);
  if (ok || regradable) answers.push(id);
  emit('answer', id, gameOf(id), ok);
}

/** Takes the card out of this session's grading; stepping back gives it back. */
function skipGrade(id: string) {
  if (reported.has(id)) return;
  reported.add(id);
  answers.push(id);
  ungraded.add(`${stageIndex.value}:${id}`);
}

/** The step being left, so Back can return to it. */
function snapshot(): Snapshot {
  return { stageIndex: stageIndex.value, queue: queue.value, stageSize: stageSize.value, reported: new Set(reported), answers, shows, pick: { step: step.value, shown: new Map(shown), mistakes: new Map(mistakes) } };
}

/** Misses still waiting their gap when nothing else is left: the game lets them go unpassed rather than stall. */
function stranded(rest: Item[]): Item[] {
  return rest.length && rest.every(i => i.kind === 'card' && i.rung !== undefined && i.missedAt !== undefined && step.value - i.missedAt < (i.spacing ?? steps.value[0]!)) ? rest : [];
}

function advance(missed: Item[]) {
  history.value = [...history.value, snapshot()];
  answers = [];
  shows = [];
  view.value++;
  for (const id of current.value ? idsOf(current.value) : []) shown.set(id, step.value);
  step.value++;
  const round = Math.max(0, current.value?.round ?? 0) + 1;
  for (const i of missed) for (const c of i.kind === 'card' ? [i.card] : i.cards) mistakes.set(c.id, (mistakes.get(c.id) ?? 0) + 1);
  // A missed card climbs the ladder: back after 4 cards, then further at each right answer, until it passes the top.
  // Rungs climb only between the game's own cards; a miss they cannot space any more is carried to the next group.
  const clean = missed.map((i): Item => (i.kind === 'card' ? { ...i, state: undefined } : i));
  const retry = clean.map((i): Item => (i.kind === 'card' ? { ...i, round: 0, rung: 0, missedAt: step.value, spacing: gapOf(0) } : { ...i, round }));
  const own = new Set(current.value ? idsOf(current.value) : []);
  const othersLeft = queue.value.slice(1).some(i => (i.kind !== 'card' || !i.skip) && idsOf(i).some(id => !own.has(id)));
  const climbed = current.value?.rung === undefined ? undefined : current.value.rung + 1;
  if (!missed.length && current.value?.kind === 'card' && climbed !== undefined && climbed < steps.value.length && othersLeft) retry.push({ ...current.value, state: undefined, rung: climbed, missedAt: step.value, spacing: gapOf(climbed) });
  // A card missed again replaces its earlier retries, so it never piles up copies.
  const missedIds = new Set(clean.flatMap(i => (i.kind === 'card' ? [i.card.id] : [])));
  const skipped = current.value?.kind === 'card' && current.value.skip;
  // A passed card going by is not shown, so it does not count toward a miss's gap.
  const others = queue.value.slice(1).filter(i => i.kind !== 'card' || !missedIds.has(i.card.id)).map(i => (skipped && i.missedAt !== undefined ? { ...i, missedAt: i.missedAt + 1 } : i));
  const pending = [...others, ...retry];
  const carried = stranded(pending);
  const rest = carried.length ? [] : pending;
  for (const id of carried.flatMap(idsOf)) emit('carried', id, gameOf(id));
  const left = new Set(pending.flatMap(idsOf));
  if (!skipped) steppingBack = false;
  for (const id of current.value && !skipped ? idsOf(current.value) : []) if (!left.has(id) && inGroupIds.has(id)) emit('passed', id, stage.value);
  if (idsLeft(rest).size) {
    queue.value = pickFront(rest);
    skipPassed();
  } else if (stageIndex.value + 1 < props.stages.length) {
    startStage(stageIndex.value + 1);
    announcing.value = true;
  } else {
    emit('finished');
  }
}

/** Sends the card back like a fresh one, as if never shown: nothing is logged; a missed card keeps its rung for its next answer. */
function putOff() {
  const [first, ...rest] = queue.value;
  if (first?.kind !== 'card' || !rest.length) return;
  // Back puts the card back where it was.
  history.value = [...history.value, snapshot()];
  answers = [];
  shows = [];
  steppingBack = false;
  shown.set(first.card.id, step.value);
  step.value++;
  view.value++;
  queue.value = [...pickFront(rest), { ...first, state: undefined, missedAt: step.value, spacing: gapOf(0) }];
  skipPassed();
}

const answerMs = (typingMs: number) => (answeredAt ?? Date.now()) - shownAt - typingMs;

/** Reports a card's show to the log; the answer just given is timed from when the card came up. */
function logShow(item: Item & { kind: 'card' }, answer: Given, typingMs = 0): number {
  const ms = answerMs(typingMs);
  const game = gameOf(item.card.id);
  shows.push(item.card.id);
  emit('show', { id: item.card.id, game, answer, ms, rung: item.rung ?? -1, source: item.rung === undefined ? 'new' : 'ladder' });
  return ms;
}

function back() {
  if (game.value === 'type' || game.value === 'dictation') holdKeyboard();
  const first = !steppingBack;
  steppingBack = true;
  // The page steps back to the card before it; the passed cards after it went by unseen.
  let to = (announcing.value ? announcedAt.value : history.value.length) - 1;
  if (first) while (to >= 0 && isSkipped(history.value[to]!)) to--;
  if (announcing.value) return void (to >= 0 && stepBackTo(to));
  if (announcedAt.value >= 0 && to < announcedAt.value && !answers.length) return void (announcing.value = true);
  const last = history.value[to];
  if (!last) return;
  // The first card of a game steps back to its announcement.
  if (last.stageIndex !== stageIndex.value && !answers.length) return void (announcing.value = true);
  stepBackTo(to);
}

function stepBackTo(index: number) {
  while (history.value.length > index + 1) stepBack();
  stepBack();
}

function stepBack() {
  const last = history.value.at(-1);
  if (!last) return;
  announcing.value = false;
  history.value = history.value.slice(0, -1);
  const stageOfLast = props.stages[last.stageIndex]!;
  for (const id of last.answers) if (!ungraded.delete(`${last.stageIndex}:${id}`)) emit('undo', id, gameOf(id, stageOfLast));
  for (const id of answers) if (!ungraded.delete(`${stageIndex.value}:${id}`)) emit('undo', id, gameOf(id));
  for (const id of [...(last.shows ?? []), ...shows]) emit('unshow', id);
  answers = [];
  shows = [];
  if (last.stageIndex !== stageIndex.value) emit('stage', last.stageIndex);
  stageIndex.value = last.stageIndex;
  // Stepping back shows the card as it was left, or plays the match round afresh.
  queue.value = last.queue.map((i, n) => (n > 0 ? i : i.kind === 'card' ? { ...i, skip: undefined } : { ...i, matched: undefined, mistakes: undefined }));
  stageSize.value = last.stageSize;
  reported = new Set([...last.reported].filter(id => !last.answers.includes(id)));
  if (last.pick) {
    step.value = last.pick.step;
    restore(shown, last.pick.shown);
    restore(mistakes, last.pick.mistakes);
  } else step.value++;
  view.value++;
}

function restore<K, V>(map: Map<K, V>, from: Map<K, V>) {
  map.clear();
  for (const [k, v] of from) map.set(k, v);
}

const keeper = useTemplateRef('keeper');

/** A tap anywhere but a text box while typing leaves the focus, and so the phone keyboard, where it is. */
function keepTyping(event: MouseEvent) {
  if ((document.activeElement as HTMLElement | null)?.isContentEditable && !(event.target as HTMLElement).isContentEditable) event.preventDefault();
}

/** Holds focus while one typing card swaps for the next, so the phone keyboard stays up. */
function onTyped(card: StudyCard, ok: boolean, guessed = false, typingMs = 0) {
  holdKeyboard();
  onCard(card, ok, guessed, typingMs);
}

function holdKeyboard() {
  keeper.value?.focus();
  void nextTick(() => document.activeElement === keeper.value?.element && keeper.value?.element?.blur());
}

/** Wrong again after the answer was out: one more miss for the card. */
function onMissAgain(card: StudyCard) {
  mistakes.set(card.id, (mistakes.get(card.id) ?? 0) + 1);
  answers.push(card.id);
  emit('answer', card.id, gameOf(card.id), false);
}

/** `guessed`: right by luck, so it comes back like a miss but is graded neither way. */
/** `typingMs`: time spent typing, left out of the recall time. */
function onCard(card: StudyCard, ok: boolean, guessed = false, typingMs = 0) {
  // A right answer far slower than usual was dug up, not known: it comes back like a guess.
  const slow = ok && (props.isSlow?.(gameOf(card.id), answerMs(typingMs)) ?? false);
  if (guessed || slow) skipGrade(card.id);
  else report(card.id, ok, true);
  const item = current.value?.kind === 'card' && current.value.card.id === card.id ? current.value : { kind: 'card' as const, card };
  logShow(item, guessed ? 'guessed' : ok ? 'plus' : 'minus', typingMs);
  advance(ok && !slow ? [] : [{ kind: 'card', card }]);
}

function onMatch(cards: StudyCard[], mistakes: string[]) {
  for (const c of cards) report(c.id, !mistakes.includes(c.id));
  if (!mistakes.length) return advance([]);
  const missed = cards.filter(c => mistakes.includes(c.id));
  const padding = shuffle(props.cards.filter(c => !mistakes.includes(c.id)), randomFor('pad', step.value)).slice(0, Math.max(0, 3 - missed.length));
  advance([{ kind: 'match', cards: [...missed, ...padding] }]);
}

function optionsFor(card: StudyCard): StudyCard[] {
  const random = randomFor('options', card.id, step.value);
  const candidates = [...props.cards, ...props.pool].filter(c => c.answer !== card.answer);
  return shuffle([card, ...lookalikes(card.answer, candidates, { count: 4, isKnown, random })], random);
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-2" @mousedown="keepTyping">
    <ProgressBar :value="progress" data-testid="session-progress" />
    <div class="flex items-center justify-between text-xs text-stone-500">
      <span data-testid="stage">{{ STAGE_TITLES[game] }}<template v-if="stages.length > 1"> · {{ stageIndex + 1 }}/{{ stages.length }}</template></span>
      <span class="flex items-center gap-3">
        <span class="tabular-nums" data-testid="left">left {{ cardsLeft }}</span>
      </span>
    </div>
    <div v-if="announcing" class="flex flex-1 flex-col gap-4" data-testid="next-game">
      <div class="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p class="text-2xl font-bold">{{ STAGE_TITLES[stage] }}</p>
        <p class="text-stone-500">{{ hint }}</p>
      </div>
      <ul v-if="stageIndex === firstLaterStage || stage === 'pronounce'" class="flex flex-col gap-3 border-t border-stone-200 pt-4 text-xs text-stone-400 dark:border-stone-800">
        <li v-if="stageIndex === firstLaterStage" class="flex items-center gap-3" data-testid="tip-back"><span class="w-6 shrink-0 text-center text-lg">‹</span>Picked the wrong one or moved on too soon? Step back.</li>
        <li v-if="stageIndex === firstLaterStage" class="flex items-center gap-3" data-testid="tip-later"><span class="flex w-6 shrink-0 justify-center"><LaterIcon /></span>The last card reminded you of this one? Put it off for later.</li>
        <li v-if="stage === 'pronounce'" class="flex items-center gap-3" data-testid="tip-record"><span class="w-6 shrink-0 text-center text-lg">🎤</span>Record yourself to compare with the right pronunciation, if you like.</li>
      </ul>
      <div class="actions flex gap-2"><BackButton /><button type="button" class="btn-primary flex-1" data-testid="start-game" @click="announcing = false">Start</button></div>
    </div>
    <template v-else-if="current">
      <template v-if="current.kind === 'match'">
        <MatchGame :key="view" :seed="`${seed}:match:${step}`" :cards="current.cards" :matched="current.matched" :mistakes="current.mistakes" @progress="onMatchProgress" @done="m => current?.kind === 'match' && onMatch(current.cards, m)" />
        <div class="actions"><BackButton /></div>
      </template>
      <div v-else class="relative flex flex-1 flex-col">
        <span v-if="cardColour && rungShown === undefined" class="absolute right-2 top-2 z-10 text-(--known)" :style="{ '--known': cardColour }" role="img" data-testid="known" aria-label="How well it is known" title="How well you know it in this game"><FillerIcon /></span>
        <span v-else-if="rungShown !== undefined" class="absolute right-2 top-2 z-10 text-(--known)" :style="{ '--known': cardColour }" role="img" data-testid="shows-left" :aria-label="`${steps.length - rungShown} left`" :title="`${steps.length - rungShown} more right answers to go`"><ProgressPie :done="rungShown" :total="steps.length" /></span>
        <IntroGame v-if="game === 'intro'" :key="view" :card="current.card" @result="ok => current?.kind === 'card' && onCard(current.card, ok)" />
        <ChoiceGame v-else-if="game === 'choice'" :key="view" :card="current.card" :options="options" :state="current.state" @progress="onCardProgress" @result="(ok, guessed) => current?.kind === 'card' && onCard(current.card, ok, guessed)" />
        <RecallGame v-else-if="game === 'listen'" :key="view" :card="flip(current.card)" dutch-shown listening :state="current.state" @progress="onCardProgress" @result="(ok, guessed) => current?.kind === 'card' && onCard(current.card, ok, guessed)" />
        <RecallGame v-else-if="game === 'pronounce'" :key="view" :card="meeting ? current.card : flip(current.card)" dutch-shown quiet pronouncing :state="current.state" @progress="onCardProgress" @result="(ok, guessed) => current?.kind === 'card' && onCard(current.card, ok, guessed)" />
        <RecallGame v-else-if="game === 'recallNative'" :key="view" :card="flip(current.card)" dutch-shown quiet :state="current.state" @progress="onCardProgress" @result="(ok, guessed) => current?.kind === 'card' && onCard(current.card, ok, guessed)" />
        <RecallGame v-else-if="game === 'recall'" :key="view" :card="current.card" :state="current.state" @progress="onCardProgress" @result="(ok, guessed) => current?.kind === 'card' && onCard(current.card, ok, guessed)" />
        <TypeGame v-else :key="view" :card="current.card" :lang="lang" :listening="game === 'dictation'" :state="current.state" @progress="onCardProgress" @miss="current?.kind === 'card' && onMissAgain(current.card)" @result="(ok, guessed, typingMs) => current?.kind === 'card' && onTyped(current.card, ok, guessed, typingMs)" />
      </div>
    </template>
    <TextField ref="keeper" aria-hidden="true" class="pointer-events-none fixed top-0 left-0 h-px w-px opacity-0" />
  </div>
</template>
