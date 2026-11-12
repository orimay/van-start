/** What picking needs to know about a queued item. */
export interface Pickable {
  /** Identity for "when was this last shown". */
  key: string;
  /** Card ids it holds; its mistakes are the most any of them has. */
  ids: string[];
  /** Times missed before; a later round waits for the earlier one to finish. */
  round?: number;
  /** Step of the miss, for an item that comes back soon after it. */
  missedAt?: number;
  /** Comeback gap of this item, over the state's. */
  spacing?: number;
}

export interface PickState {
  /** Steps done so far. */
  step: number;
  /** Step at which each card id was last on screen, alone or with others. */
  shown: Map<string, number>;
  /** Mistakes per card id. */
  mistakes: Map<string, number>;
  /** Odds of each card id against an unanswered one, from its earlier answers. */
  odds?: Map<string, number>;
  /** Comeback window of missed items; without it, misses only wait for their round. */
  gap?: number;
  /** Fresh items come in queue order; one with higher odds may jump ahead. */
  ordered?: boolean;
  random?: () => number;
}

/** Odds by time since any of its cards was last shown, times one plus the mistakes and the card's odds: just shown gets none, never shown the most. */
export function freshness(item: Pickable, { step, shown, mistakes, odds }: PickState): number {
  const times = item.ids.flatMap(id => shown.get(id) ?? []);
  const last = times.length ? Math.max(...times) : undefined;
  const misses = Math.max(0, ...item.ids.map(id => mistakes.get(id) ?? 0));
  const scale = Math.max(...item.ids.map(id => odds?.get(id) ?? 1));
  return (last === undefined ? step + 1 : step - 1 - last) * (1 + misses) * scale;
}

/** Whether a missed item is due: from its gap on. */
export function comeback(missedAt: number, step: number, gap: number): number {
  return step - missedAt >= gap ? 1 : 0;
}

/** Index drawn with odds proportional to the weights; -1 when they are all zero. */
export function weightedIndex(weights: number[], random = Math.random): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!total) return -1;
  let roll = random() * total;
  const at = weights.findIndex(w => (roll -= w) < 0);
  return at < 0 ? weights.findLastIndex(w => w > 0) : at;
}

/** Index of the next item: a missed one once due, else one of the earliest round by freshness, else the oldest miss. */
export function pickIndex(items: Pickable[], state: PickState): number {
  const random = state.random ?? Math.random;
  const missed = items.map((item, i) => [item, i] as const).filter(([item]) => item.missedAt !== undefined).sort(([a], [b]) => a.missedAt! - b.missedAt!);
  if (state.gap !== undefined) {
    const due = missed.find(([item]) => random() < comeback(item.missedAt!, state.step, item.spacing ?? state.gap!));
    if (due) return due[1];
  }
  const round = Math.min(...items.map(i => i.round ?? 0));
  const fresh = items.map((item, i) => [item, i] as const).filter(([i]) => (i.round ?? 0) === round && i.missedAt === undefined);
  if (state.ordered && fresh.length) {
    // The next item always has a chance; a later one only by the odds above even, fading with its distance.
    const weights = fresh.map(([item], rank) => (rank === 0 ? 1 : Math.max(0, Math.max(...item.ids.map(id => state.odds?.get(id) ?? 1)) - 1) / 2 ** rank));
    return fresh[weightedIndex(weights, random)]![1];
  }
  const ripe = (i: Pickable) => i.missedAt === undefined || (state.gap !== undefined && state.step - i.missedAt >= (i.spacing ?? state.gap));
  const at = weightedIndex(items.map(i => ((i.round ?? 0) === round && ripe(i) ? freshness(i, state) : 0)), random);
  if (at >= 0) return at;
  if (fresh.length) return fresh[Math.floor(random() * fresh.length)]![1];
  return missed[0]?.[1] ?? 0;
}
