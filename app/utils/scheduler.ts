import { seeded } from './random';

export type Answer = 'plus' | 'minus' | 'guessed' | 'postpone';
export type Source = 'ladder' | 'new' | 'filler' | 'early';

export interface CardState {
  /** Index into the ladder; -1 while new. */
  rung: number;
  due: number;
  closed: boolean;
  errors: number;
  shows: number;
  lastShown: number;
}

export interface Session {
  seed: string;
  /** Answers given so far: the session's clock. */
  t: number;
  order: string[];
  cards: Map<string, CardState>;
  steps: number[];
  pool: number;
  window: boolean[];
}

const FIRST_STEP = 4;
const STEP_FACTOR = 4;
const MIN_RUNGS = 4;
const POOL_START = 4;
const POOL_MIN = 2;
const POOL_MAX_STEP = 16;
const WINDOW = 10;
const TARGET_HIGH = 0.85;
const TARGET_LOW = 0.75;
const FILLER_MIN_AGE = 10;
const JITTER_FROM = 8;

/** Gaps of the ladder: from four up to the session size, at least four rungs where the size allows. */
export function ladder(n: number): number[] {
  if (n <= FIRST_STEP) return [FIRST_STEP];
  if (n < FIRST_STEP * MIN_RUNGS) {
    const steps: number[] = [];
    for (let s = FIRST_STEP; s < n; s += FIRST_STEP) steps.push(s);
    return [...steps, n];
  }
  const rungs = Math.max(MIN_RUNGS, Math.round(Math.log(n / FIRST_STEP) / Math.log(STEP_FACTOR)) + 1);
  const factor = (n / FIRST_STEP) ** (1 / (rungs - 1));
  return Array.from({ length: rungs }, (_, i) => Math.round(FIRST_STEP * factor ** i));
}

export function startSession(order: string[], seed: string): Session {
  const cards = new Map(order.map(id => [id, { rung: -1, due: 0, closed: false, errors: 0, shows: 0, lastShown: -Infinity }]));
  return { seed, t: 0, order, cards, steps: ladder(order.length), pool: POOL_START, window: [] };
}

export function poolSize(session: Session): number {
  return session.pool;
}

const onLadder = (c: CardState) => !c.closed && c.rung >= 0;

export function next(session: Session): { id: string; source: Source } | null {
  const { t, cards, steps } = session;
  const entries = [...cards];
  const ladderCards = entries.filter(([, c]) => onLadder(c));
  const due = ladderCards.filter(([, c]) => c.due <= t).sort(([, a], [, b]) => a.due - b.due)[0];
  if (due) return { id: due[0], source: 'ladder' };

  const fresh = session.order.find(id => cards.get(id)!.rung === -1 && !cards.get(id)!.closed);
  const held = ladderCards.filter(([, c]) => steps[c.rung]! <= POOL_MAX_STEP).length;
  if (fresh && held < session.pool) return { id: fresh, source: 'new' };
  if (!ladderCards.length && !fresh) return null;

  const filler = entries
    .filter(([, c]) => c.closed && t - c.lastShown >= FILLER_MIN_AGE)
    .map(([id, c]) => ({ id, score: ((c.errors + 0.5) / (c.shows + 1)) * (t - c.lastShown) }))
    .sort((a, b) => b.score - a.score)[0];
  if (filler && ladderCards.length) return { id: filler.id, source: 'filler' };

  const early = ladderCards.sort(([, a], [, b]) => a.due - b.due)[0];
  if (early) return { id: early[0], source: 'early' };
  return fresh ? { id: fresh, source: 'new' } : null;
}

export function answer(session: Session, id: string, given: Answer, { slow = false }: { slow?: boolean } = {}): Session {
  const card = session.cards.get(id);
  if (!card) return session;
  const t = session.t + 1;
  const random = seeded(`${session.seed}:${t}`);
  const gap = (rung: number) => {
    const step = session.steps[rung]!;
    return step + (step >= JITTER_FROM ? Math.floor(random() * (Math.floor(step / 4) + 1)) : 0);
  };
  const toRung = (rung: number): CardState =>
    rung >= session.steps.length ? { ...card, rung, closed: true } : { ...card, rung, closed: false, due: t + gap(rung) };

  const wrong = given === 'minus' || given === 'guessed';
  let updated: CardState;
  if (wrong) updated = { ...toRung(0), errors: card.errors + 1 };
  else if (given === 'postpone') updated = toRung(onLadder(card) ? card.rung + 1 : 0);
  else if (card.closed || card.rung === -1) updated = { ...card, closed: true };
  else updated = toRung(slow ? card.rung : card.rung + 1);
  updated = { ...updated, shows: card.shows + 1, lastShown: t - 1 };

  const cards = new Map(session.cards).set(id, updated);
  const window = given === 'postpone' ? session.window : [...session.window, !wrong];
  return { ...session, t, cards, ...adjustPool(session.pool, window) };
}

function adjustPool(pool: number, window: boolean[]): { pool: number; window: boolean[] } {
  if (window.length < WINDOW) return { pool, window };
  const accuracy = window.filter(Boolean).length / window.length;
  if (accuracy > TARGET_HIGH) return { pool: pool + 1, window: [] };
  if (accuracy < TARGET_LOW) return { pool: Math.max(POOL_MIN, pool - 1), window: [] };
  return { pool, window: [] };
}
