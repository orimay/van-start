import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string }
interface Node { cards?: Card[]; children?: Node[] }
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const fronts: Record<string, (card: Card) => string> = {
  ru: card => card.f,
  ...Object.fromEntries(['en', 'es', 'pt', 'ro', 'tr'].map(lang => {
    const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
    return [lang, (card: Card) => rows[card.id]![0]!];
  })),
};
const SCHOOL: Record<string, RegExp> = { ru: /школ/, en: /school/, es: /escol/, pt: /escol/, ro: /școal/, tr: /okul/ };

// «Учебный день» fits a university or a training day as well, so the front names the school.
describe.each(['de schooldag', 'de schooldagen'])('%s', (b) => {
  it.each(Object.keys(SCHOOL))('says it is a day at school in %s', (lang) => {
    const card = cards.find(c => c.b === b)!;
    expect(fronts[lang]!(card)).toMatch(SCHOOL[lang]!);
  });
});
