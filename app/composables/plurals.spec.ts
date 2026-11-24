import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { b: string; f: string; n?: string };
type Node = { cards?: Card[]; children?: Node[]; sections?: Node[] };

const deck = JSON.parse(readFileSync('public/deck.json', 'utf8')) as Node | Node[];
const cards: Card[] = [];
const walk = (node: Node) => {
  cards.push(...(node.cards ?? []));
  (node.children ?? node.sections ?? []).forEach(walk);
};
(Array.isArray(deck) ? deck : [deck]).forEach(walk);

const nouns = new Map(cards.flatMap(c => {
  const m = /^(de|het) (\S+)$/.exec(c.b);
  return m ? [[m[2]!, c] as const] : [];
}));

// The plurals a plain "+en / +s" check misses: -heid → -heden, a long vowel written short (aap → apen, oog → ogen).
const irregularPlurals = (singular: string) => [
  singular.replace(/heid$/, 'heden'),
  singular.replace(/(aa|oo|ee|uu)([^aeiou])$/, (_, v: string, c: string) => `${v[0]}${({ f: 'v', s: 'z' } as Record<string, string>)[c] ?? c}en`),
].filter(p => p !== singular);

describe('irregular plurals', () => {
  it('are marked as plurals of their singular', () => {
    const unmarked = [...nouns].flatMap(([singular, card]) => irregularPlurals(singular)
      .map(p => nouns.get(p))
      .filter(plural => plural && plural !== card)
      .filter(plural => !plural!.f.endsWith('(мн.)') || !plural!.n?.includes(`мн. ч. от: ${card.b}`))
      .map(plural => plural!.b));
    expect(unmarked).toEqual([]);
  });
});

describe('plural notes', () => {
  it('name the singular first', () => {
    expect(cards.filter(c => c.n?.includes('; мн. ч. от: ')).map(c => `${c.b}: ${c.n}`)).toEqual([]);
  });
});
