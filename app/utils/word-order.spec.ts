import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { b: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const order = cards(JSON.parse(readFileSync('public/deck.json', 'utf8'))).map(c => c.b);
const firstOf = (word: string) => order.indexOf(word);

describe('a base word', () => {
  it.each([
    ['laden', 'opladen'],
    ['halen', 'afhalen'],
    ['tekenen', 'betekenen'],
    ['trekken', 'vertrekken'],
    ['bakken', 'gebakken'],
    ['scheiden', 'gescheiden'],
    ['de gebruiker', 'de gebruikersnaam'],
    ['de burger', 'burgerzaken'],
    ['sluiten', 'de sleutel'],
    ['koken', 'de kok'],
    ['helpen', 'de hulp'],
  ])('%s comes before %s', (base, derived) => {
    expect(firstOf(base)).toBeGreaterThanOrEqual(0);
    expect(firstOf(base)).toBeLessThan(firstOf(derived));
  });
});
