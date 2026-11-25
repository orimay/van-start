import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { b: string; f: string; n?: string }
interface Node { cards?: Card[]; children?: Node[] }
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const bySide = new Map(cards.map(c => [c.b, c]));
/** Meanings are `; `-separated, past any bracketed aside. */
const meanings = (f: string) => f.replace(/ \(мн\.\)$/, '').replace(/\([^()]*\)/g, '').split('; ').length;
/** Note items past the first (its singular) account for meanings with no plural, or another plural: `кости: de beenderen`. */
const accounted = (note = '') => note.split('; ').slice(1).reduce((sum, item) => {
  const pointer = /^(.+): (?:de|het) \S+$/.exec(item);
  return sum + (pointer ? pointer[1]!.split(', ').length : /без мн\. ч\.|только в ед\. ч\./.test(item) ? 1 : 0);
}, 0);

describe('a plural card', () => {
  it("covers every meaning of its singular, or says where the rest went", () => {
    const short = cards.flatMap(card => {
      const singular = bySide.get(/^мн\. ч\. от: ([^;]+)/.exec(card.n ?? '')?.[1] ?? '');
      return singular && meanings(card.f) + accounted(card.n) < meanings(singular.f) ? [`${card.b}: ${card.f} < ${singular.f}`] : [];
    });
    expect(short).toEqual([]);
  });
});
