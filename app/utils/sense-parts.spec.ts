import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; f: string; ps?: string[] };
type Node = { cards?: Card[]; children?: Node[] };
const cardsOf = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
const deck = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const overlays = Object.fromEntries(['en', 'es', 'pt', 'ro', 'tr'].map(lang => [lang,
  (JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')) as { cards: Record<string, string[]> }).cards]));

const groupsOf = (front: string) => front.split('; ').length;
const withSenseParts = deck.filter(card => card.ps);

describe('a card with a part per sense', () => {
  it('is found for the known words', () => {
    expect(withSenseParts.map(card => card.b)).toEqual(expect.arrayContaining(['goed', 'vroeg', 'prima']));
  });

  it('names a part for each of its sense groups', () => {
    const offending = withSenseParts.filter(card => card.ps!.length !== groupsOf(card.f)).map(card => `${card.b}: ${card.f}`);
    expect(offending).toEqual([]);
  });

  // The part colours each group, so every language splits the front the same way.
  it('has as many sense groups in every language', () => {
    const offending = withSenseParts.flatMap(card => Object.entries(overlays)
      .filter(([, cards]) => groupsOf(cards[card.id]![0]!) !== card.ps!.length)
      .map(([lang, cards]) => `${card.b} ${lang}: ${cards[card.id]![0]}`));
    expect(offending).toEqual([]);
  });
});
