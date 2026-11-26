import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const deck = cards(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const LANGS = ['ru', 'en', 'es', 'pt', 'tr', 'ro'];
const noteIn = (lang: string): ((card: Card) => string) => {
  if (lang === 'ru') return card => card.n ?? '';
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => rows[card.id]?.[3] ?? '';
};
const count = (text: string, mark: string) => text.split(mark).length - 1;
// `1) за ним нет сущ.` numbers a rule; its bracket opens nothing.
const isBalanced = (item: string) => {
  const text = item.replace(/(^|\s)\d\) /g, '$1');
  return count(text, '(') === count(text, ')') && count(text, '«') === count(text, '»');
};

describe('a note item', () => {
  it.each(LANGS)('closes every bracket it opens in %s', (lang) => {
    const note = noteIn(lang);
    const torn = deck.flatMap(card => note(card).split('\n').flatMap(line => line.split('; ')).filter(item => !isBalanced(item)).map(item => `${card.b}: ${item}`));
    expect(torn).toEqual([]);
  });
});
