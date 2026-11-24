import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { b: string; tr: string };
type Node = { cards?: Card[]; children?: Node[]; sections?: Node[] };

const deck = JSON.parse(readFileSync('public/deck.json', 'utf8')) as Node | Node[];
const cards: Card[] = [];
const walk = (node: Node) => {
  cards.push(...(node.cards ?? []));
  (node.children ?? node.sections ?? []).forEach(walk);
};
(Array.isArray(deck) ? deck : [deck]).forEach(walk);

// English loans keep their English "you" sound
const ENGLISH_YU = /interview|new york|steward/i;

describe('ru transcriptions', () => {
  it('use no ы, е, ё or ː', () => {
    expect(cards.filter(c => /[ыеёː]/.test(c.tr)).map(c => `${c.b} /${c.tr}/`)).toEqual([]);
  });

  it('stress a diphthong on its first letter', () => {
    expect(cards.filter(c => /[эәөа]й\u0301|ау\u0301/.test(c.tr)).map(c => `${c.b} /${c.tr}/`)).toEqual([]);
  });

  it('write Dutch u as ү, keeping ю for English loans', () => {
    expect(cards.filter(c => c.tr.includes('ю') && !ENGLISH_YU.test(c.b)).map(c => `${c.b} /${c.tr}/`)).toEqual([]);
  });

  // tj is one soft sound (ть); nj is нь (Spanje)
  it('write je after any other consonant as йэ', () => {
    expect(cards.filter(c => /[бвгдзклмпрсфхңһ]ьэ/.test(c.tr)).map(c => `${c.b} /${c.tr}/`)).toEqual([]);
  });

  it('write a word-final a as аа', () => {
    const shortFinalA = cards.filter(c => {
      const words = c.b.split(' ');
      const sounds = c.tr.split(' ');
      return words.length === sounds.length
        && words.some((w, i) => /[^aei]a[?,.!]*$/i.test(w) && /[^а]а[?,.!]*$/.test(sounds[i]!));
    });
    expect(shortFinalA.map(c => `${c.b} /${c.tr}/`)).toEqual([]);
  });

  it('mark no optional n inside a root or before a participle ending', () => {
    const byFront = new Map(cards.map(c => [c.b, c.tr]));
    expect({
      'het winkelcentrum': byFront.get('het winkelcentrum'),
      'de afzender': byFront.get('de afzender'),
      'onbekende': byFront.get('onbekende'),
      'intensief': byFront.get('intensief'),
      'de werkzoekende': byFront.get('de werkzoekende'),
    }).toEqual({
      'het winkelcentrum': 'эт ви́ңкэлсэнтрүм',
      'de afzender': 'дэ а́фзэндэр',
      'onbekende': 'о́нбэкэндэ',
      'intensief': 'интэнсии́ф',
      'de werkzoekende': 'дэ вэ́ркзукэндэ',
    });
  });

  it('keep the optional n of a linking -en-', () => {
    const byFront = new Map(cards.map(c => [c.b, c.tr]));
    expect([byFront.get('de docentenkamer'), byFront.get('zesentwintig')]).toEqual(['дэ доосэ́нтэ(н)каамэр', 'зэсэ(н)тви́нтэх']);
  });
});
