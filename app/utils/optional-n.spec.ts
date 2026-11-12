import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Node = { cards?: { b: string; tr?: string }[]; children?: Node[] };
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cards = (node: Node): { b: string; tr?: string }[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];

describe('the n of an unstressed -en', () => {
  it('is marked optional in transcriptions', () => {
    const tr = Object.fromEntries(cards(deck).map((c) => [c.b, c.tr]));
    expect([tr['lopen'], tr['de docentenkamer']]).toEqual(['лоо́пэ(н)', 'дэ доосэ́нтэ(н)каамэр']);
  });

  it('is left unmarked by no word ending in -en', () => {
    const unmarked = cards(deck).flatMap((c) =>
      c.b.split(' ').flatMap((word, i) => {
        const token = c.tr?.split(' ')[i] ?? '';
        return /[aeiouy][^aeiouy]*[^aeiouy]en$/i.test(word) && /эн$/.test(token) ? [`${word} ${token}`] : [];
      }),
    );
    expect(unmarked).toEqual([]);
  });
});
