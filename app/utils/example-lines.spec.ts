import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; nx?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const deck = cards(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const LANGS = ['en', 'es', 'pt', 'tr', 'ro'];
const examplesIn = (lang: string): ((card: Card) => string) => {
  if (lang === 'ru') return card => card.nx ?? '';
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => rows[card.id]?.[4] ?? '';
};

// A language without articles tells `het boek` from `een boek` by a hint: книга (конкретная) / книга (абстрактная).
describe('an example translation', () => {
  it.each(['ru', ...LANGS])('differs from its siblings in %s', (lang) => {
    const examples = examplesIn(lang);
    const alike = deck.filter((card) => {
      const lines = examples(card).split('\n').filter(Boolean).map(line => line.replace(/^!/, ''));
      return new Set(lines).size < lines.length;
    }).map(card => card.b);
    expect(alike).toEqual([]);
  });
});
