import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; f: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cardsOf = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
const deck = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const LANGS = ['ru', 'en', 'es', 'pt', 'ro', 'tr'] as const;
const overlays = Object.fromEntries(LANGS.filter(lang => lang !== 'ru').map(lang => [lang,
  (JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')) as { cards: Record<string, string[]> }).cards]));
const noteIn = (lang: string, card: Card) => (lang === 'ru' ? card.n : overlays[lang]![card.id]![3]) ?? '';

const CONFUSE: Record<string, string> = { ru: 'не путать с', en: "don't confuse with", es: 'no confundir con', pt: 'não confundir com', ro: 'a nu se confunda cu', tr: 'karıştırma' };
/** Where the -st form goes: after het with no noun (het oudst), or with a verb (het meest). */
const AFTER_HET: Record<string, string[]> = {
  ru: ['после het, без сущ.', 'с глаголом'], en: ['after het, no noun', 'with a verb'], es: ['tras het, sin sustantivo', 'con verbo'],
  pt: ['após het, sem substantivo', 'com verbo'], ro: ['după het, fără substantiv', 'cu verb'], tr: ["het'ten sonra, isim yok", 'fiille'],
};
/** A note item that is a link, not a usage rule. */
const LINK = /^(превосходная степень от|superlative of|superlativo de|superlativul lui|en üstünlük derecesi|не путать с|don't confuse with|no confundir con|não confundir com|a nu se confunda cu|karıştırma):/;

/** A note's items, an es/pt/ro gender head (`m. `) set aside. */
const itemsOf = (note: string) => note.split('\n')[0]!.split('; ').map(item => item.replace(/^(pl\. )?[mfn]\.(\/(pl\. )?[mfn]\.)? /, ''));
const VARIANT: Record<string, string> = { ru: 'вариант', en: 'also', es: 'también', pt: 'também', ro: 'variantă', tr: 'ayrıca' };
const names = (lang: string, card: Card, word: string) => itemsOf(noteIn(lang, card)).some(item =>
  (item.startsWith(`${CONFUSE[lang]}: `) && [`: ${word} (`, `), ${word} (`].some(part => item.includes(part)))
  || new RegExp(`^${VARIANT[lang]}: ${word}( \\(|$)`).test(item));

/** The word a superlative is told by: article and -e aside (oudste, de oudste, het oudst: oudst). */
const coreOf = (dutch: string) => dutch.replace(/^(de|het) /, '').replace(/e$/, '');
const isSuperlative = (card: Card) => !card.b.startsWith('-') && /ste?$/.test(card.b) && /(^|; )превосходная степень от: /.test(card.n ?? '');
const cores = [...new Set(deck.filter(isSuperlative).map(card => coreOf(card.b)))];
const pairs = cores.map(core => ({
  core,
  st: deck.filter(card => /^((de|het) )?[a-z]+$/.test(card.b) && card.b.replace(/^(de|het) /, '') === core),
  ste: deck.filter(card => /^((de|het) )?[a-z]+$/.test(card.b) && card.b.replace(/^(de|het) /, '') === `${core}e`),
}));

describe('a superlative', () => {
  it('is found', () => {
    expect(cores).toEqual(expect.arrayContaining(['oudst', 'nieuwst', 'best', 'jongst']));
  });

  // het oudst (Van alle kinderen is hij het oudst) and de oudste zoon are two cards: which ending is the whole difficulty.
  it('has both its -st and its -ste card', () => {
    const lonely = pairs.filter(({ st, ste }) => !st.length || !ste.length).map(({ core }) => core);
    expect(lonely).toEqual([]);
  });

  it.each(LANGS)('-st card says where it goes, in %s', (lang) => {
    const bare = pairs.flatMap(({ st }) => st).filter(card => !AFTER_HET[lang]!.includes(itemsOf(noteIn(lang, card))[0]!)).map(card => card.b);
    expect(bare).toEqual([]);
  });

  it.each(LANGS)('-ste card opens with where it goes, in %s', (lang) => {
    const bare = pairs.flatMap(({ ste }) => ste).filter(card => LINK.test(itemsOf(noteIn(lang, card))[0]!) || !noteIn(lang, card)).map(card => card.b);
    expect(bare).toEqual([]);
  });

  it.each(LANGS)('-ste card names its -st card, and the -st card a -ste one, in %s', (lang) => {
    const unnamed = pairs.flatMap(({ st, ste }) => [
      ...ste.filter(card => !st.some(other => names(lang, card, other.b))).map(card => `${card.b} -> -st`),
      ...st.filter(card => ste.length && !ste.some(other => names(lang, card, other.b))).map(card => `${card.b} -> -ste`),
    ]);
    expect(unnamed).toEqual([]);
  });
});
