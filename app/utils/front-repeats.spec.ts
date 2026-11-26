import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string }
interface Node { cards?: Card[]; children?: Node[] }
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const LANGS = ['ru', 'en', 'es', 'pt', 'tr', 'ro'];
const frontsIn = (lang: string): ((card: Card) => string) => {
  if (lang === 'ru') return card => card.f;
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => rows[card.id]?.[0] ?? '';
};
/** A front's pieces, split on `; ` and `, ` outside brackets, with a trailing plural mark dropped. */
const piecesOf = (front: string): string[] =>
  front.split(/[;,] (?![^()]*\))/).map(p => p.replace(/ \((?:pl\.|мн\.)\)$/, '').trim().toLowerCase());

describe('a front', () => {
  it.each(LANGS)('never says the same piece twice in %s', (lang) => {
    const front = frontsIn(lang);
    const repeats = cards
      // An affix lists each sense as `preposition, gloss`, so its prepositions repeat by design.
      .filter(c => !c.b.endsWith('-'))
      .map(c => [c.b, piecesOf(front(c))] as const)
      .filter(([, ps]) => new Set(ps).size < ps.length)
      .map(([b, ps]) => `${b}: ${ps.filter((p, i) => ps.indexOf(p) !== i).join(', ')}`);
    expect(repeats).toEqual([]);
  });
});
