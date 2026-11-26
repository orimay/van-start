import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; f: string };
type Node = { cards?: Card[]; children?: Node[] };
const cardsOf = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
const deck = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordOf = (card: Card) => new RegExp(`(?<![\\p{L}-])${escape(card.b.replace(/^(de|het) /, ''))}(?![\\p{L}-])`, 'iu');
const hintsOf = (front: string) => front.match(/\([^)]*\)/g) ?? [];
/** A place keeps its name in a Latin-script translation: Utrecht (city). */
const isName = (card: Card) => /^\p{Lu}/u.test(card.b);

describe('a front', () => {
  it('never shows the Dutch it asks for in Russian', () => {
    expect(deck.filter(card => wordOf(card).test(card.f)).map(card => `${card.b}: ${card.f}`)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'ro', 'tr']) {
    const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
    // A cognate may translate itself (warm, modern), never in the hint that tells senses apart.
    it(`never shows the Dutch it asks for in a hint in ${lang}`, () => {
      const leaks = deck.filter(card => !isName(card) && hintsOf(rows[card.id]?.[0] ?? '').some(hint => wordOf(card).test(hint)));
      expect(leaks.map(card => `${card.b}: ${rows[card.id]![0]}`)).toEqual([]);
    });
  }
});
