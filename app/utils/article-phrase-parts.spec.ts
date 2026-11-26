import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { b: string; k?: string; p?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cardsOf = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
const deck = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));

/** A finite verb or a trailing preposition makes it a clause: het gaat goed, de brug over. */
const CLAUSE = /\b(is|was|ging|gaat|deed|heeft|heerst|wordt|spijt)\b|\bover$/;

describe('a phrase led by de or het', () => {
  // A sentence card keeps its own tint: het goede woord, de tomaten zijn in de aanbieding.
  it('is tinted as the noun or the phrase it is', () => {
    const untyped = deck.filter(c => /^(de|het) \S+ .+/.test(c.b) && !CLAUSE.test(c.b) && c.k !== 'sentence' && c.p !== 'noun' && c.p !== 'phrase');
    expect(untyped.map(c => `${c.b}: ${c.p}`)).toEqual([]);
  });
});
