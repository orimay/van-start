import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string; n?: string }
interface Node { cards?: Card[]; children?: Node[] }
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const bySide = new Map(cards.map(c => [c.b, c]));
const NO_PLURAL: Record<string, RegExp> = {
  ru: /без мн\. ч\.|только в ед\. ч\./,
  en: /no plural|singular only/,
  es: /sin plural|solo en singular/,
  pt: /sem plural|só no singular/,
  tr: /çoğulu yok|yalnız tekil/,
  ro: /fără plural|doar la singular/,
};
/** A card's front and note in one language: deck fields for ru, overlay rows `[f, xf, tr, n, …]` for the rest. */
const sidesIn = (lang: string): ((card: Card) => [string, string]) => {
  if (lang === 'ru') return card => [card.f, card.n ?? ''];
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => [rows[card.id]![0]!, rows[card.id]![3] ?? ''];
};
/** Meanings are `; `-separated, past any bracketed aside. */
const meanings = (f: string) => f.replace(/ \((?:мн|pl)\.\)$/, '').replace(/\([^()]*\)/g, '').split('; ').length;
/** A don't-confuse pointer to another plural, glossed with the meanings it takes: `не путать с: de bladen (листы, подносы)`. */
const CONFUSED = /^(?:не путать с|don't confuse with|no confundir con|não confundir com|karıştırma|a nu se confunda cu): (?:de|het) \S+ \(([^()]+)\)$/;
/** Note items past the first (its singular) account for meanings with no plural, or another plural: `кости: de beenderen`. */
const accounted = (note: string, lang: string) => note.split('; ').slice(1).reduce((sum, item) => {
  const pointer = /^(.+): (?:de|het) \S+$/.exec(item)?.[1] ?? CONFUSED.exec(item)?.[1];
  return sum + (pointer ? pointer.split(', ').length : NO_PLURAL[lang]!.test(item) ? 1 : 0);
}, 0);

describe('a plural card', () => {
  it.each(Object.keys(NO_PLURAL))("covers every meaning of its singular, or says where the rest went, in %s", (lang) => {
    const sides = sidesIn(lang);
    const short = cards.flatMap(card => {
      const singular = bySide.get(/^мн\. ч\. от: ([^;]+)/.exec(card.n ?? '')?.[1] ?? '');
      if (!singular) return [];
      const [front, note] = sides(card);
      return meanings(front) + accounted(note, lang) < meanings(sides(singular)[0]) ? [`${card.b}: ${front} < ${sides(singular)[0]}`] : [];
    });
    expect(short).toEqual([]);
  });
});
