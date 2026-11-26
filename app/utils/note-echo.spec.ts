import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { b: string; f: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const deck = cards(JSON.parse(readFileSync('public/deck.json', 'utf8')));
// `кушать (есть)`: each bracket, and each comma piece inside it.
const hintsOf = (front: string) => [...front.matchAll(/\(([^()]*)\)/g)].flatMap(([, hint]) => [hint, ...hint.split(', ')]);

describe('a note item', () => {
  it('never only repeats a hint its front already gives', () => {
    const echoes = deck.flatMap((card) => {
      const hints = hintsOf(card.f);
      return (card.n ?? '').split(/; |\n/).filter(item => hints.includes(item)).map(item => `${card.b}: ${item}`);
    });
    expect(echoes).toEqual([]);
  });
});
