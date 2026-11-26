import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string; n?: string }
interface Node { cards?: Card[]; children?: Node[] }
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const bySide = new Map(cards.map(c => [c.b, c]));
const LANGS = ['ru', 'en', 'es', 'pt', 'tr', 'ro'];
/** A card's front and note in one language: deck fields for ru, overlay rows `[f, xf, tr, n, …]` for the rest. */
const sidesIn = (lang: string): ((card: Card) => [string, string]) => {
  if (lang === 'ru') return card => [card.f, card.n ?? ''];
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => [rows[card.id]![0]!, rows[card.id]![3] ?? ''];
};
const PLASTIC = 3;
const MENU = 4;
/** Words built on de kaart, each with the sense of de kaart it builds on: its place among the front's `; `-separated senses. */
const BUILT_ON: Record<string, number> = {
  'de kortingskaart': PLASTIC,
  'de chipkaart': PLASTIC,
  'de kaart voor de lezer houden': PLASTIC,
  'saldo op de kaart zetten': PLASTIC,
  'de kaartlezer': PLASTIC,
  'de menukaart': MENU,
};
const bare = (sense: string) => sense.replace(/ \([^()]*\)$/, '').toLowerCase();

describe('a word built on de kaart', () => {
  it.each(LANGS)('glosses kaart with the sense it builds on in %s', (lang) => {
    const sides = sidesIn(lang);
    const senses = sides(bySide.get('de kaart')!)[0].split('; ');
    const glossed = Object.keys(BUILT_ON).map(b => `${b}: ${/(?<![\w-])kaart \(([^()]*)\)/.exec(sides(bySide.get(b)!)[1])?.[1]}`);
    expect(glossed).toEqual(Object.entries(BUILT_ON).map(([b, i]) => `${b}: ${bare(senses[i] ?? '')}`));
  });
});
