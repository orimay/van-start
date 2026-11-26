import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; f: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const deck = cards(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const frontIn = (lang: string): ((card: Card) => string) => {
  if (lang === 'ru') return card => card.f;
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => rows[card.id]?.[0] ?? '';
};
const ORDINARY: Record<string, RegExp> = {
  ru: /обычн/, en: /usual|ordinary|regular/, es: /habitual|normal/, pt: /habitual|normal/, ro: /obișnuit/, tr: /her zamanki|sıradan/,
};

// de/het makes the noun a particular one (one's own table); «обычный» in the hint reads as any table at all.
describe('a de/het verb phrase', () => {
  it.each(Object.keys(ORDINARY))('never calls its noun ordinary in the %s hint', (lang) => {
    const front = frontIn(lang);
    const vague = deck.filter(c => /^(de|het) \S+ .*\S+en$/.test(c.b) && new RegExp(`\\([^)]*(${ORDINARY[lang]!.source})`).test(front(c))).map(c => c.b);
    expect(vague).toEqual([]);
  });
});
