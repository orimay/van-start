import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { b: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const deck = cards(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const byWord = new Map(deck.map(c => [c.b, c]));

describe('a variant or synonym', () => {
  it('names the card that names it', () => {
    const oneWay = deck.flatMap(card =>
      [...(card.n ?? '').matchAll(/(вариант|синоним): ([^;]+)/g)]
        .flatMap(m => m[2]!.split(', ').map(other => [m[1]!, other] as const))
        .filter(([kind, other]) => byWord.has(other) && !byWord.get(other)!.n?.includes(`${kind}: ${card.b}`))
        .map(([, other]) => `${card.b} -> ${other}`),
    );
    expect(oneWay).toEqual([]);
  });
});
