import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string; tr?: string; xb?: string; xf?: string; xl?: string; xt?: string }
interface Node { cards?: Card[]; children?: Node[] }
type Overlay = Record<string, [string, string?, string?, string?, string?, string?, string?]>;
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

  it('is written as its own card, a noun with its article', () => {
    expect(pairs.filter(([affix, word]) => affix.xb !== word.b).map(([affix, word]) => `${affix.xb} ≠ ${word.b}`)).toEqual([]);
  });

  it('is transcribed as its own card in Russian', () => {
    expect(pairs.filter(([affix, word]) => affix.xt !== word.tr).map(([affix, word]) => `${affix.b}: ${affix.xt} ≠ ${word.tr}`)).toEqual([]);
  });

  it('is transcribed even without a card of its own', () => {
    expect(cardsOf(deck).filter(c => isAffix(c.b) && c.xb && !c.xt).map(c => c.b)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`is transcribed as its own card in ${lang}`, () => {
      const overlay = overlayOf(lang);
      expect(pairs.filter(([affix, word]) => overlay[affix.id]?.[6] !== overlay[word.id]?.[2]).map(([affix]) => affix.b)).toEqual([]);
    });

    it(`is glossed as its own card in ${lang}`, () => {
      const overlay = overlayOf(lang);
      const wrong = pairs.filter(([affix, word]) => overlay[affix.id]?.[1] !== overlay[word.id]?.[0]).map(([affix]) => affix.b);
      expect(wrong).toEqual([]);
    });
  }
});

const affixes = cardsOf(deck).filter(c => isAffix(c.b) && c.xb);
const stem = (affix: string) => affix.replace(/^-|-$/g, '');
/** The affix's transcription opens its example word's, past an article, or closes it. */
const soundsIn = (affix: string, tr = '', word = '') => !!tr && (affix.endsWith('-') ? word.replace(/^\S+ /, '').startsWith(tr) : word.endsWith(tr));

describe('an affix', () => {
  it('shows itself in its example word', () => {
    const wrong = affixes.filter(c => !(c.b.endsWith('-') ? bare(c.xb!).startsWith(stem(c.b)) : c.xb!.endsWith(stem(c.b)))).map(c => `${c.b}: ${c.xb}`);
    expect(wrong).toEqual([]);
  });

  it('is transcribed as it sounds in its example word in Russian', () => {
    expect(affixes.filter(c => !soundsIn(c.b, c.tr, c.xt)).map(c => `${c.b}: ${c.tr} in ${c.xt}`)).toEqual([]);
  });

  it('breaks its example word down in Russian', () => {
    expect(affixes.filter(c => !c.xl?.includes(c.b)).map(c => c.b)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`is transcribed as it sounds in its example word in ${lang}`, () => {
      const overlay = overlayOf(lang);
      expect(affixes.filter(c => !soundsIn(c.b, overlay[c.id]?.[2], overlay[c.id]?.[6])).map(c => `${c.b}: ${overlay[c.id]?.[2]} in ${overlay[c.id]?.[6]}`)).toEqual([]);
    });

    it(`breaks its example word down in ${lang}`, () => {
      const overlay = overlayOf(lang);
      expect(affixes.filter(c => !String(overlay[c.id]?.[5] ?? '').includes(c.b)).map(c => c.b)).toEqual([]);
    });
  }
});

/** An affix named in another card's note or breakdown carries its own card's gloss, or a piece of it: the card is the one source. */
describe('an affix named in another card', () => {
  const REF = /(?<![\p{L}-])(-\p{L}+|\p{L}+-) \(([^()]*)\)/gu;
  const glossesOf = (f?: string) => (f ? [f, ...f.split('; '), ...f.split(': '), ...f.split(/; |, |: /)] : []);
  const mismatches = (texts: Array<[string, string | undefined]>, glossOf: (affix: Card) => string | undefined) => {
    const byWord = new Map(cardsOf(deck).filter(c => isAffix(c.b)).map(c => [c.b, c]));
    return texts.flatMap(([where, text]) => [...(text ?? '').matchAll(REF)].flatMap(([, affix, gloss]) => {
      const card = byWord.get(affix!);
      return card && !glossesOf(glossOf(card)).includes(gloss!) ? [`${where}: ${affix} (${gloss}) ≠ ${glossOf(card)}`] : [];
    }));
  };

  it('carries its gloss in Russian', () => {
    const cards = cardsOf(deck) as Array<Card & { n?: string }>;
    expect(mismatches(cards.flatMap(c => [[c.b, c.n], [c.b, c.xl]] as Array<[string, string | undefined]>), c => c.f)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`carries its gloss in ${lang}`, () => {
      const overlay = overlayOf(lang);
      const texts = cardsOf(deck).flatMap(c => [[c.b, overlay[c.id]?.[3]], [c.b, overlay[c.id]?.[5]]] as Array<[string, string | undefined]>);
      expect(mismatches(texts, c => overlay[c.id]?.[0])).toEqual([]);
    });
  }
});

/** Two affixes with one meaning leave the learner guessing which to recall: each gloss says what sets it apart. */
describe('an affix meaning', () => {
  const shared = (glossOf: (c: Card) => string | undefined) => Object.values(Object.groupBy(cardsOf(deck).filter(c => isAffix(c.b)), c => glossOf(c) ?? '')).filter(g => g!.length > 1).map(g => g!.map(c => c.b).join(' = '));

  it('belongs to one affix in Russian', () => {
    expect(shared(c => c.f)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`belongs to one affix in ${lang}`, () => {
      const overlay = overlayOf(lang);
      expect(shared(c => overlay[c.id]?.[0])).toEqual([]);
    });
  }
});
