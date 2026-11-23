interface Record {
  lapses: number;
  difficulty: number;
}

type Progress = { [id: string]: Record | undefined };

/** First unlearned cards; a short last group is topped up from `after`, the cards that follow in deck order, or else with the learned cards missed most. */
export function nextGroup<T extends { id: string }>(cards: T[], progress: Progress, size: number, after?: T[]): T[] {
  const fresh = cards.filter(c => !progress[c.id]).slice(0, size);
  const target = topUpTo(fresh.length, size);
  if (!fresh.length || fresh.length === target) return fresh;
  // The last group has no cards after it: the hardest learned ones fill it then.
  const topUp = [...(after?.filter(c => !progress[c.id]) ?? []), ...missedMost(cards, progress)];
  return [...fresh, ...topUp.slice(0, target - fresh.length)];
}

function missedMost<T extends { id: string }>(cards: T[], progress: Progress): T[] {
  return cards
    .filter(c => progress[c.id])
    .sort((a, b) => progress[b.id]!.lapses - progress[a.id]!.lapses || progress[b.id]!.difficulty - progress[a.id]!.difficulty);
}

/** A short group is topped up to the next multiple of five, never past the group size. */
const topUpTo = (left: number, size: number) => Math.min(size, Math.ceil(left / 5) * 5);

/** Some cards are left, fewer than a group and not a multiple of five. */
export function isShort(cards: { id: string }[], progress: Progress, size: number): boolean {
  const left = cards.filter(c => !progress[c.id]).length;
  return left > 0 && left < topUpTo(left, size);
}

/** Deck cards after the section's last one: a.b is followed by b's own cards, then b.a, then b.b. */
export function following<T extends { id: string }>(deck: T[], section: T[]): T[] {
  const last = section.at(-1);
  if (!last) return [];
  return deck.slice(deck.findIndex(c => c.id === last.id) + 1);
}
