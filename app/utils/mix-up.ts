import { lookalikes } from '@/utils/similar';

const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const ARTICLE = /^(de|het|een)\s+/;
const wordOf = (card: { b: string }) => plain(card.b).replace(ARTICLE, '');

/** How well a card answers the query: a Dutch start, a meaning's start, inside the Dutch (compounds), a word of a meaning; none otherwise. */
function rankOf(card: { b: string; f: string }, query: string): number | undefined {
  const dutch = wordOf(card);
  const meanings = plain(card.f).split(/[;,] /);
  if (dutch.startsWith(query)) return 0;
  if (meanings.some(m => m.startsWith(query))) return 1;
  if (dutch.includes(query)) return 2;
  if (meanings.some(m => m.split(/[^\p{L}]+/u).some(w => w.startsWith(query)))) return 3;
}

/** Cards whose Dutch word or native meaning holds the query, best first, deck order among equals. */
export function matching<T extends { b: string; f: string }>(cards: readonly T[], query: string, limit = 30): T[] {
  const q = plain(query);
  if (!q) return [];
  return cards
    .flatMap(card => {
      const rank = rankOf(card, q);
      return rank === undefined ? [] : [{ card, rank }];
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ card }) => card);
}

/** Cards `card` may have been taken for: single words built on its word or it on theirs, then the ones looking most like it. */
export function suspects<T extends { id: string; b: string }>(card: { b: string }, cards: readonly T[], isKnown: (id: string) => boolean, limit = 8): T[] {
  const word = wordOf(card);
  const MIN_PART = 3;
  const sharing = (other: T) => {
    const its = wordOf(other);
    return !/\s/.test(word + its) && Math.min(word.length, its.length) >= MIN_PART && (its.includes(word) || word.includes(its));
  };
  const alike = lookalikes(card.b, cards.map(c => ({ ...c, answer: c.b })), { count: limit, isKnown, random: () => 0 });
  const byId = new Map(cards.map(c => [c.id, c]));
  return [...new Set([...cards.filter(sharing).map(c => c.id), ...alike.map(c => c.id)])].slice(0, limit).map(id => byId.get(id)!);
}
