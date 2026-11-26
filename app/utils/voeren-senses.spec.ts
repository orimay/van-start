import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; f: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cardsOf = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
const deck = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const byWord = new Map(deck.map(card => [card.b, card]));
const LANGS = ['ru', 'en', 'es', 'pt', 'tr', 'ro'];
const rowsOf = Object.fromEntries(LANGS.filter(lang => lang !== 'ru').map(lang =>
  [lang, (JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')) as { cards: Record<string, string[]> }).cards]));
const frontIn = (lang: string, card: Card) => lang === 'ru' ? card.f : rowsOf[lang]![card.id]![0]!;
const noteIn = (lang: string, card: Card) => lang === 'ru' ? card.n ?? '' : rowsOf[lang]![card.id]![3] ?? '';
const word = (b: string) => byWord.get(b)!;

const SENSES = 6;
const [TALK, BRING, FEED] = [0, 1, 2];
// The sense of voeren each word is built on
const BUILT_ON: Record<string, number> = {
  'een gesprek voeren': TALK, 'voer telefoongesprekken': TALK, 'de woordvoerder': TALK, leiden: TALK, bijhouden: TALK,
  invoeren: BRING, uitvoeren: BRING, vervoeren: BRING, afvoeren: BRING, aanvoeren: BRING,
  voeden: FEED, 'te eten geven': FEED,
};
/** A sense as a note glosses it: its bracketed context dropped. */
const glossOf = (lang: string, sense: number) => frontIn(lang, word('voeren')).split('; ')[sense]!.replace(/ ?\([^()]*\)/g, '').trim();

describe('voeren', () => {
  it.each(LANGS)('lists its senses in %s, a conversation first', (lang) => {
    expect(frontIn(lang, word('voeren')).split('; ')).toHaveLength(SENSES);
  });

  it.each(LANGS)('is glossed in %s by the sense each word is built on', (lang) => {
    const offending = Object.entries(BUILT_ON).filter(([b, sense]) => !noteIn(lang, word(b)).includes(`voeren (${glossOf(lang, sense)})`))
      .map(([b, sense]) => `${b}: wants voeren (${glossOf(lang, sense)}) in ${noteIn(lang, word(b))}`);
    expect(offending).toEqual([]);
  });

  it('names the other ways to feed, and they name it', () => {
    const feeding = ['voeden', 'te eten geven'];
    const unnamed = feeding.flatMap(other => [[`voeren`, other], [other, 'voeren']])
      .filter(([a, b]) => !/не путать с: [^;]*/.exec(word(a!).n ?? '')?.[0].includes(`${b} (`)).map(pair => pair.join(' -> '));
    expect(unnamed).toEqual([]);
  });
});

describe('a noun of a voeren verb', () => {
  it('comes from that verb', () => {
    const NOUNS: Record<string, string> = { 'het vervoer': 'vervoeren', 'de afvoer': 'afvoeren' };
    const offending = Object.entries(NOUNS).filter(([noun, verb]) => !(word(noun).n ?? '').startsWith(`от: ${verb} (`)).map(([noun]) => `${noun}: ${word(noun).n}`);
    expect(offending).toEqual([]);
  });
});
