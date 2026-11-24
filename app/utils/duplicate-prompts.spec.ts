import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string; n?: string; nx?: string }
interface Node { cards?: Card[]; children?: Node[] }
type Row = [string, string?, string?, string?, string?];
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const dutchOf = new Map(cardsOf(deck).map(c => [c.id, c.b]));

/** What a card asks before the answer: its prompt and the note under it. */
const asked = (prompt: string, notes: (string | undefined)[]) => [prompt, ...notes.filter(Boolean)].join('\n');

function clashes(cards: { dutch: string; asked: string }[]): string[][] {
  const byAsked = Map.groupBy(cards, c => c.asked);
  return [...byAsked.values()].filter(group => group.length > 1).map(group => group.map(c => c.dutch));
}

describe('a prompt', () => {
  it('asks for one card only in Russian', () => {
    expect(clashes(cardsOf(deck).map(c => ({ dutch: c.b, asked: asked(c.f, [c.n, c.nx]) })))).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`asks for one card only in ${lang}`, () => {
      const rows: Record<string, Row> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      const cards = Object.entries(rows).map(([id, [f, , , n, nx]]) => ({ dutch: dutchOf.get(id) ?? id, asked: asked(f, [n, nx]) }));
      expect(clashes(cards)).toEqual([]);
    });
  }
});
