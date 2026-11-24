import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string; xb?: string; xf?: string; xl?: string }
interface Node { cards?: Card[]; children?: Node[] }
type Overlay = Record<string, [string, string?, ...unknown[]]>;
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const overlayOf = (lang: string): Overlay => JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;

const isAffix = (dutch: string) => dutch.startsWith('-') || dutch.endsWith('-');
const bare = (dutch: string) => dutch.replace(/^(de|het) /, '');
const plain = cardsOf(deck).filter(c => !isAffix(c.b));
/** The word itself first: overstappen is the verb, not de overstappen. */
const wordOf = (dutch: string) => plain.find(c => c.b === dutch) ?? plain.find(c => bare(c.b) === dutch);
const pairs = cardsOf(deck).filter(c => isAffix(c.b) && c.xb && wordOf(c.xb)).map(c => [c, wordOf(c.xb!)!] as const);

/** Pronouncing an affix asks for its example word, so the prompt must tell that word from its near twins (имя: naam or voornaam). */
describe("an affix's example word", () => {
  it('is glossed as its own card in Russian', () => {
    expect(pairs.length).toBeGreaterThan(0);
    const wrong = pairs.filter(([affix, word]) => affix.xf !== word.f).map(([affix, word]) => `${affix.b}: ${affix.xf} ≠ ${word.f}`);
    expect(wrong).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`is glossed as its own card in ${lang}`, () => {
      const overlay = overlayOf(lang);
      const wrong = pairs.filter(([affix, word]) => overlay[affix.id]?.[1] !== overlay[word.id]?.[0]).map(([affix]) => affix.b);
      expect(wrong).toEqual([]);
    });
  }
});

const affixes = cardsOf(deck).filter(c => isAffix(c.b) && c.xb);
const stem = (affix: string) => affix.replace(/^-|-$/g, '');

describe('an affix', () => {
  it('shows itself in its example word', () => {
    const wrong = affixes.filter(c => !(c.b.endsWith('-') ? c.xb!.startsWith(stem(c.b)) : c.xb!.endsWith(stem(c.b)))).map(c => `${c.b}: ${c.xb}`);
    expect(wrong).toEqual([]);
  });

  it('breaks its example word down in Russian', () => {
    expect(affixes.filter(c => !c.xl?.includes(c.b)).map(c => c.b)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`breaks its example word down in ${lang}`, () => {
      const overlay = overlayOf(lang);
      expect(affixes.filter(c => !String(overlay[c.id]?.[5] ?? '').includes(c.b)).map(c => c.b)).toEqual([]);
    });
  }
});
