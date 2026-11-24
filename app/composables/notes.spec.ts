import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; n?: string };
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
