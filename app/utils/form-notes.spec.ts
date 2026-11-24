import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; n?: string }
interface Node { cards?: Card[]; children?: Node[] }
type Row = [string, string?, string?, string?, string?];
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const itemsOf = (note: string) => note.split('\n').flatMap(line => line.replace(/^!/, '').split('; '));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `zelfstandige — самозанятый` on zelfstandig read as if the -e changed the meaning; the noun is its own card. */
function glossedForms(note: (c: Card) => string | undefined): string[] {
  return cardsOf(deck).flatMap(c => {
    const form = new RegExp(`^((de|het) )?${escape(c.b)}e [—-] `, 'i');
    return itemsOf(note(c) ?? '').filter(item => form.test(item)).map(item => `${c.b}: ${item}`);
  });
}

describe("a card's -e form", () => {
  it('is never glossed in its note as another word in Russian', () => {
    expect(glossedForms(c => c.n)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`is never glossed in its note as another word in ${lang}`, () => {
      const rows: Record<string, Row> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      expect(glossedForms(c => rows[c.id]?.[3])).toEqual([]);
    });
  }
});
