import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string; xb?: string; xf?: string }
interface Node { cards?: Card[]; children?: Node[] }
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const LANGS = ['en', 'es', 'pt', 'tr', 'ro'];

/** Word stems of 4+ letters, past any bracketed aside. */
const stemsOf = (text: string) => new Set(text.replace(/\([^()]*\)/g, '').toLowerCase().match(/\p{L}{4,}/gu)?.map(w => w.slice(0, 5)) ?? []);
/** Each sense keeps only the stems no other sense shares. */
const ownStems = (f: string) => {
  const senses = f.split('; ').map(stemsOf);
  return senses.map((stems, i) => [...stems].filter(s => senses.every((other, j) => j === i || !other.has(s))));
};
const headCount = (card: Card) => (card.xb ?? '').toLowerCase().split(/[^\p{L}]+/u).filter(w => w === card.b.split(' ').at(-1)!.toLowerCase()).length;

/** Het pak in Положи костюм в пакет reads as both senses, though пакет is the tasje. */
const mixed = (front: (c: Card) => string, example: (c: Card) => string) => cards.flatMap((card) => {
  const f = front(card);
  const xf = example(card);
  if (!f.includes('; ') || !xf || xf.includes(' / ') || headCount(card) > 1) return [];
  const words = stemsOf(xf);
  const shown = ownStems(f).filter(stems => stems.some(s => words.has(s))).length;
  return shown > 1 ? [`${card.b}: ${f} | ${xf}`] : [];
});

describe("a polysemous card's example", () => {
  it('shows one of its senses in Russian', () => {
    expect(mixed(c => c.f, c => c.xf ?? '')).toEqual([]);
  });

  for (const lang of LANGS) {
    it(`shows one of its senses in ${lang}`, () => {
      const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      expect(mixed(c => rows[c.id]![0]!, c => rows[c.id]![1] ?? '')).toEqual([]);
    });
  }
});
