import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; nb?: string; nx?: string }
interface Node { cards?: Card[]; children?: Node[] }
type Row = [string, string?, string?, string?, string?];
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const examples = cardsOf(deck).filter(c => c.nb);

/** Each Dutch example line, `!` included, is matched by its own translated line, never by the Dutch itself. */
function untranslated(nx: (c: Card) => string | undefined): string[] {
  return examples.flatMap(c => {
    const dutch = c.nb!.split('\n');
    const lines = nx(c)?.split('\n') ?? [];
    const same = lines.length === dutch.length && lines.every((line, i) => line.startsWith('!') === dutch[i]!.startsWith('!') && line !== dutch[i]);
    return same ? [] : [c.b];
  });
}

describe("a card's Dutch examples", () => {
  it('are translated line by line in Russian', () => {
    expect(untranslated(c => c.nx)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`are translated line by line in ${lang}`, () => {
      const rows: Record<string, Row> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      expect(untranslated(c => rows[c.id]?.[4])).toEqual([]);
    });
  }
});
