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
    const byWord = Object.groupBy(cardsOf(deck).filter(c => isAffix(c.b)), c => c.b);
    return texts.flatMap(([where, text]) => [...(text ?? '').matchAll(REF)].flatMap(([, affix, gloss]) => {
      const cards = byWord[affix!] ?? [];
      return cards.length && !cards.some(card => glossesOf(glossOf(card)).includes(gloss!)) ? [`${where}: ${affix} (${gloss}) ≠ ${cards.map(glossOf).join(' | ')}`] : [];
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

/** A meaning that names Russian suffixes promises them: "-ция" over "поздравление" teaches the wrong match. */
describe('a suffix naming its Russian match', () => {
  const NAMED = /^(-\p{L}+(?:, -\p{L}+)*): /u;
  const named = cardsOf(deck).filter(c => c.b.startsWith('-') && NAMED.test(c.f));

  it('exists in the deck', () => {
    expect(named.length).toBeGreaterThan(3);
  });

  it('shows one of them in its example word', () => {
    const wrong = named.filter(c => !NAMED.exec(c.f)![1]!.split(', ').some(s => c.xf?.includes(s.slice(1)))).map(c => `${c.b}: ${c.f} → ${c.xf}`);
    expect(wrong).toEqual([]);
  });
});

/** An affix's meaning past its own-language suffix: `-ция: действие` means `действие`. */
const meaningGroups = (gloss: string) => gloss.replace(/^-\S+: /, '').split('; ');
const everyAffix = cardsOf(deck).filter(c => isAffix(c.b));

/** A prompt names the affix by its gloss alone, so two affixes must not read alike (-tie and -ing once both said «действие или его результат»). */
describe("an affix's gloss", () => {
  for (const lang of ['ru', 'en', 'es', 'pt', 'tr', 'ro']) {
    it(`tells it apart from every other affix in ${lang}`, () => {
      const overlay = lang === 'ru' ? undefined : overlayOf(lang);
      const glossOf = (c: Card) => (overlay ? overlay[c.id]![0] : c.f);
      const alike = everyAffix.flatMap(a => everyAffix.filter(b => b !== a && meaningGroups(glossOf(a)).every(g => meaningGroups(glossOf(b)).includes(g))).map(b => `${a.b} ≈ ${b.b}: ${glossOf(a)}`));
      expect(alike).toEqual([]);
    });
  }
});

/** "Changes the verb's meaning" is true of every prefix and teaches nothing: a meaning says what the affix does. */
describe("an affix's meaning", () => {
  const EMPTY: Record<string, RegExp> = { ru: /меняет смысл/, en: /changes the verb/, es: /cambia el sentido/, pt: /muda o sentido/, tr: /anlamını değiştirir/, ro: /schimbă sensul/ };
  for (const lang of Object.keys(EMPTY)) {
    it(`says what it does in ${lang}`, () => {
      const overlay = lang === 'ru' ? undefined : overlayOf(lang);
      const glossOf = (c: Card) => (overlay ? overlay[c.id]![0] : c.f);
      expect(everyAffix.filter(c => EMPTY[lang]!.test(glossOf(c))).map(c => `${c.b}: ${glossOf(c)}`)).toEqual([]);
    });
  }
});

/** The breakdown under an affix's example splits that word, not another: -baar once showed middelbaar over «dank + -baar». */
describe("an affix's breakdown", () => {
  it('names the parts of its own example word', () => {
    const notes = cardsOf(deck) as Array<Card & { n?: string }>;
    const noteOf = (dutch: string) => notes.find(c => c.b === dutch)?.n ?? '';
    const partsOf = (xl: string) => xl.split(': ')[0]!.split(' + ').map(part => bare(part.replace(/ \(.*$/, '')));
    const wrong = pairs.filter(([affix]) => affix.xl).flatMap(([affix]) => partsOf(affix.xl!).filter(part => !noteOf(affix.xb!).includes(part)).map(part => `${affix.b}: ${part} not in ${affix.xb}`));
    expect(wrong).toEqual([]);
  });
});

/** A front with several meanings teaches each one only through a word that has it: "-емый" over dankbaar (благодарный) misleads. */
describe('each meaning of an affix', () => {
  const NAMED = /^-\p{L}+(?:, -\p{L}+)*: /u;
  const unshown = (glossOf: (c: Card) => string | undefined, noteOf: (c: Card) => string | undefined) => cardsOf(deck)
    .filter(c => isAffix(c.b) && glossOf(c)?.includes('; '))
    .flatMap(c => glossOf(c)!.split('; ').map(sense => sense.replace(NAMED, '')).filter(sense => !(noteOf(c) ?? '').split('; ').some(item => item.endsWith(`: ${sense}`) && item.indexOf('(') < item.lastIndexOf(`: ${sense}`))).map(sense => `${c.b}: ${sense}`));

  it('is shown on an example word in its Russian note', () => {
    expect(unshown(c => c.f, c => (c as Card & { n?: string }).n)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`is shown on an example word in its ${lang} note`, () => {
      const overlay = overlayOf(lang);
      expect(unshown(c => overlay[c.id]?.[0], c => overlay[c.id]?.[3])).toEqual([]);
    });
  }
});
