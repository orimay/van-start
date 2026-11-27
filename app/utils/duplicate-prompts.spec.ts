import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string; n?: string; nx?: string }
interface Node { cards?: Card[]; children?: Node[] }
type Row = [string, string?, string?, string?, string?];
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const dutchOf = new Map(cardsOf(deck).map(c => [c.id, c.b]));
/** An overlay's course cards: its old roots are never asked. */
const courseRows = (rows: Record<string, Row>) => Object.entries(rows).filter(([id]) => dutchOf.has(id));

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
      const cards = courseRows(rows).map(([id, [f, , , n, nx]]) => ({ dutch: dutchOf.get(id)!, asked: asked(f, [n, nx]) }));
      expect(clashes(cards)).toEqual([]);
    });
  }
});

/** A front's senses, order aside: «снова, опять» and «опять, снова» ask for the same thing. */
const sensesOf = (front: string) => front.split(/[;,] /).map(sense => sense.trim().toLowerCase()).sort().join(' | ');
const isAffix = (dutch: string) => /^-|-$/.test(dutch);
const byDutch = new Map(cardsOf(deck).map(c => [c.b, c]));
/** An -e form, a plural or a superlative carries its base's front; its note says when it is used. */
const isFormOf = (dutch: string, base: string) =>
  dutch === `${base}e` || new RegExp(`(?:^|; )(?:форма от|мн\\. ч\\. от|превосходная степень от): ${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(`).test(byDutch.get(dutch)?.n ?? '');

function sameSenses(fronts: { dutch: string; front: string }[]): string[] {
  const bySenses = Map.groupBy(fronts.filter(c => !isAffix(c.dutch)), c => sensesOf(c.front));
  return [...bySenses.values()].flatMap(group => group.flatMap((a, i) => group.slice(i + 1)
    .filter(b => !isFormOf(a.dutch, b.dutch) && !isFormOf(b.dutch, a.dutch))
    .map(b => `${a.dutch} / ${b.dutch}: ${a.front}`)));
}

describe('a front', () => {
  it('tells its card from every other in Russian, without the context', () => {
    expect(sameSenses(cardsOf(deck).map(c => ({ dutch: c.b, front: c.f })))).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`tells its card from every other in ${lang}, without the context`, () => {
      const rows: Record<string, Row> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      expect(sameSenses(courseRows(rows).map(([id, [front]]) => ({ dutch: dutchOf.get(id)!, front })))).toEqual([]);
    });
  }
});
