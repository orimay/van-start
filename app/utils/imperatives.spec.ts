import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string; n?: string; xb?: string }
interface Node { cards?: Card[]; children?: Node[] }
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const LANGS = ['en', 'es', 'pt', 'ro', 'tr'] as const;
const overlays = Object.fromEntries(LANGS.map(lang =>
  [lang, (JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')) as { cards: Record<string, string[]> }).cards]));
const frontIn = (lang: string, card: Card) => lang === 'ru' ? card.f : overlays[lang]![card.id]![0]!;

const imperatives = cards.filter(card => card.n?.includes('просьба/приказ'));
/** Tasks for a whole class, said to several people. */
const GROUP = ['werk in tweetallen', 'wissel van rol', 'bespreek de vragen', 'voer telefoongesprekken'];
/** A plural or polite «you» form; `-ți` after a hyphen is the Romanian reflexive, `bin!` and `dokun!` are Turkish stems. */
const PLURAL: Record<string, RegExp> = { ru: /(ите|йте|итесь|йтесь)!/, ro: /(?<!-)ți!/, tr: /(?<!\b(b|dok))(ın|in|un|ün)!/ };

describe('an imperative card', () => {
  it('is found', () => {
    expect(imperatives.length).toBeGreaterThan(100);
  });

  // The Dutch form serves ты and вы alike; the deck asks with the ты form, as for every other order.
  it.each(Object.keys(PLURAL))('speaks to one person in %s, unless the task is for a group', (lang) => {
    const offending = imperatives.filter(card => !GROUP.includes(card.b) && PLURAL[lang]!.test(frontIn(lang, card)))
      .map(card => `${card.b}: ${frontIn(lang, card)}`);
    expect(offending).toEqual([]);
  });
});

// praten is to talk with someone; speaking a language is spreken.
describe('praat', () => {
  const praat = cards.find(card => card.b === 'praat')!;
  const TALK: Record<string, RegExp> = { ru: /^разговаривай!/, en: /^talk!/, es: /^¡habla!/, pt: /^converse!/, ro: /^vorbește!/, tr: /^konuş!/ };

  it.each(Object.keys(TALK))('asks to talk in %s', (lang) => {
    expect(frontIn(lang, praat)).toMatch(TALK[lang]!);
  });

  it('has an example about talking, not about a language', () => {
    expect(praat.xb).not.toMatch(/Nederlands/);
  });
});
