import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; f: string; n?: string };
type Node = { cards?: Card[]; children?: Node[]; sections?: Node[] };

const deck = JSON.parse(readFileSync('public/deck.json', 'utf8')) as Node | Node[];
const cards: Card[] = [];
const walk = (node: Node) => {
  cards.push(...(node.cards ?? []));
  (node.children ?? node.sections ?? []).forEach(walk);
};
(Array.isArray(deck) ? deck : [deck]).forEach(walk);

const overlayNotes = (lang: string) => Object.values(
  (JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')) as { cards: Record<string, string[]> }).cards,
).map(v => v[3] ?? '');

const overlayCards = (lang: string) =>
  (JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')) as { cards: Record<string, string[]> }).cards;

// each language writes "literally" one way, with its own quotes
const LITERALLY: Record<string, { marker: RegExp; form: RegExp }> = {
  en: { marker: /\blit\.|\bliterally\b|word for word/g, form: /literally "[^"]+"/g },
  es: { marker: /\blit\.|\bliteralmente\b/g, form: /literalmente "[^"]+"/g },
  pt: { marker: /\blit\.|\bliteralmente\b|ao pé da letra/g, form: /literalmente "[^"]+"/g },
  tr: { marker: /kelimesi kelimesine/g, form: /kelimesi kelimesine "[^"]+"/g },
  ro: { marker: /\blit\.|\bliteral\b/g, form: /literal „[^”]+”/g },
};

const count = (s: string, re: RegExp) => s.match(re)?.length ?? 0;

describe('literal translations in notes', () => {
  it('read букв. «…» in Russian', () => {
    const off = cards.map(c => c.n ?? '').filter(n => /дословно/.test(n) || count(n, /букв\./g) !== count(n, /букв\. «[^»]+»/g));
    expect(off).toEqual([]);
  });

  it.each(Object.keys(LITERALLY))('follow the one %s form', (lang) => {
    const { marker, form } = LITERALLY[lang]!;
    expect(overlayNotes(lang).filter(n => count(n, marker) !== count(n, form))).toEqual([]);
  });
});

// an affix makes a noun, not a "thing": the learner needs the part of speech
const THING: Record<string, RegExp> = {
  en: /\bthing\b/, es: /\bcosa\b/, pt: /\bcoisa\b/, tr: /nesne|şey olarak/, ro: /\blucru\b/,
};

describe('affix glosses', () => {
  const affixes = cards.filter(c => /^-|-$/.test(c.b));

  it('name the part of speech in Russian', () => {
    expect(affixes.filter(c => /предмет/.test(`${c.f} ${c.n ?? ''}`)).map(c => c.b)).toEqual([]);
  });

  it.each(Object.keys(THING))('name the part of speech in %s', (lang) => {
    const overlay = overlayCards(lang);
    expect(affixes.filter(c => THING[lang]!.test(`${overlay[c.id]?.[0]} ${overlay[c.id]?.[3]}`)).map(c => c.b)).toEqual([]);
  });
});

// "lives in de postbode" reads as nonsense: a note says plainly where a word is used
const LIVES_IN: Record<string, RegExp> = {
  ru: /живёт в (составн|de |het )/, en: /lives (on )?in (compounds|de |het )/, es: /vive en (palabras|de |het )/,
  pt: /vive em (palavras|de |het )/, tr: /kelimelerde yaşar|\) içinde yaşıyor/, ro: /trăiește în (cuvinte|de |het )/,
};

describe('a note naming where a word is used', () => {
  it.each(Object.keys(LIVES_IN))('says it plainly in %s', (lang) => {
    const notes = lang === 'ru' ? cards.map(c => c.n ?? '') : overlayNotes(lang);
    expect(notes.filter(n => LIVES_IN[lang]!.test(n))).toEqual([]);
  });
});
