import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { b: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const order = cards(JSON.parse(readFileSync('public/deck.json', 'utf8'))).map(c => c.b);
const firstOf = (word: string) => order.indexOf(word);

describe('a base word', () => {
  it.each([
    ['laden', 'opladen'],
    ['halen', 'afhalen'],
    ['tekenen', 'betekenen'],
    ['trekken', 'vertrekken'],
    ['bakken', 'gebakken'],
    ['scheiden', 'gescheiden'],
    ['de gebruiker', 'de gebruikersnaam'],
    ['de burger', 'burgerzaken'],
    ['sluiten', 'de sleutel'],
    ['koken', 'de kok'],
    ['helpen', 'de hulp'],
  ])('%s comes before %s', (base, derived) => {
    expect(firstOf(base)).toBeGreaterThanOrEqual(0);
    expect(firstOf(base)).toBeLessThan(firstOf(derived));
  });
});

describe('an article', () => {
  it.each(['de', 'het', 'een'])('%s comes before every card opening with it', article => {
    expect(order.filter((b, i) => b.startsWith(`${article} `) && i < firstOf(article))).toEqual([]);
  });
});

const deckCards = cards(JSON.parse(readFileSync('public/deck.json', 'utf8'))) as Array<Card & { n?: string }>;
/** The cards a card's note says it is made of: `от: be- (...) + groeten (...)`, `женский род от: de kapper (...) + -ster (...)`; a diminutive is made with -je too. */
const partsOf = (card: Card & { n?: string }) => {
  const from = /(?:^|; )(уменьш\. |женский род )?от: (.*?)(?:;|$)/.exec(card.n ?? '');
  return from ? [...from[2]!.matchAll(/([^()+]+?) \(/g)].map(m => m[1]!.trim()).concat(from[1] === 'уменьш. ' ? ['-je'] : []) : [];
};

describe('a part a note names', () => {
  it('comes before the card made of it', () => {
    const late = deckCards.flatMap((card, i) => partsOf(card).filter(part => firstOf(part) > i).map(part => `${part} after ${card.b}`));
    expect(late).toEqual([]);
  });
});

describe('an affix', () => {
  it('is voiced by the first card made with it', () => {
    const affixes = deckCards.filter((c: Card & { xb?: string }) => /^-|-$/.test(c.b) && c.xb) as Array<Card & { xb: string; f: string }>;
    /** Two affixes can share a spelling (-er who does, -er comparative): the gloss a note gives it tells which. */
    const twins = (affix: Card) => affixes.filter(a => a.b === affix.b).length > 1;
    const glossed = (card: Card & { n?: string }, affix: Card & { f: string }) => (card.n ?? '').split(/[()]/).some(gloss => affix.f.split(/; |: /).includes(gloss));
    const names = (card: Card & { n?: string }, affix: Card & { f: string }) => partsOf(card).includes(affix.b) && (!twins(affix) || glossed(card, affix));
    const wrong = affixes.flatMap(affix => {
      const first = deckCards.find(card => names(card, affix) && !/^мн\. ч\./.test(card.n ?? ''));
      return first && first.b !== affix.xb ? [`${affix.b}: ${affix.xb}, not ${first.b}`] : [];
    });
    expect(wrong).toEqual([]);
  });
});
