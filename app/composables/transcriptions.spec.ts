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

// liggen's root ig is stressed, never the suffix
const ROOT_IG = /ligt$|liggen$/;

// h stays һ and each root keeps its own vowels wherever it stands
const ROOT_SOUNDS: Record<string, string> = {
  hui: 'һөй',
  heid: 'һәйт',
  heden: 'һэйдэ',
  honderd: 'һондэр',
  machine: 'маашиинэ',
  alarm: 'аалар',
  pasta: 'пастаа',
  program: 'проохра',
  hotel: 'һоотэ',
  muziek: 'мүүзи',
  probe: 'прообэ',
  drogist: 'дроохи',
  vitamine: 'фитаамии',
  journalist: 'журнаали',
  klarinet: 'клаари',
  salon: 'саало',
  calorie: 'каалоо',
  parasol: 'паараасо',
  anekdot: 'аанэкдоо',
  fantasie: 'фантаазии',
  organis: 'орхаани',
  kunstena: 'күнстэнаа',
  assistent: 'асистэ',
  apothe: 'аапоотэ',
  annule: 'аанүүлэ',
  produc: 'проодүк',
  sollicit: 'солиси',
  direct: 'дирэк',
  serie: 'сэйри',
};

// English loans keep their English "you" sound
const ENGLISH_YU = /interview|new york|steward/i;

describe('ru transcriptions', () => {
  it('use no ы, е, ё or ː', () => {
    expect(cards.filter(c => /[ыеёː]/.test(c.tr)).map(c => `${c.b} /${c.tr}/`)).toEqual([]);
  });

  // In the Netherlands a word-initial v sounds close to f.
  it('write a word-initial v as ф', () => {
    const words = (s: string) => s.toLowerCase().match(/[\p{L}'-]+/gu) ?? [];
    const offenders = cards.filter(c => c.b.length > 1).filter((c) => {
      const [dutch, ru] = [words(c.b), c.tr.split(' ')];
      return dutch.length === ru.length && dutch.some((w, i) => w.startsWith('v') && ru[i]!.startsWith('в'));
    });
    expect(offenders.map(c => `${c.b} /${c.tr}/`)).toEqual([]);
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

  // Dutch has no long consonants, not even across a compound seam (afval, aannemen)
  it('write no doubled consonant', () => {
    expect(cards.filter(c => /([бвгджзйклмнпрстфхцчшщңһ])\1/.test(c.tr.replace(/\(н\)/g, ''))).map(c => `${c.b} /${c.tr}/`)).toEqual([]);
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

  it('write the unstressed suffix -ig as эх in every form', () => {
    const misspelt = cards.filter(c => {
      const words = c.b.replace(/[?,.!]/g, '').split(' ');
      const sounds = c.tr.replace(/[?,.!]/g, '').split(' ');
      return words.length === sounds.length && words.some((w, i) =>
        w.length > 4 && /[^e]ig(e|en|t|de)?$/.test(w) && !ROOT_IG.test(w) && /и[хг](э|э\(н\)|т|дэ)?$/.test(sounds[i]!));
    });
    expect(misspelt.map(c => `${c.b} /${c.tr}/`)).toEqual([]);
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

  it('keep a root\'s own sound inside a compound', () => {
    const count = (s: string, part: string) => s.split(part).length - 1;
    // digits are read out whole; th and sch are their own sounds
    const misread = cards.filter(c => !/\d/.test(c.b)).filter(c => {
      const b = c.b.toLowerCase().replace(/\bthui|sch/g, '');
      const tr = c.tr.replace(/\u0301/g, '');
      return Object.entries(ROOT_SOUNDS).some(([root, sound]) => count(b, root) !== count(tr, sound));
    });
    expect(misread.map(c => `${c.b} /${c.tr}/`)).toEqual([]);
  });

  it('keep the optional n of a linking -en-', () => {
    const byFront = new Map(cards.map(c => [c.b, c.tr]));
    expect(['de docentenkamer', 'zesentwintig', 'de kopieën', 'drieëntwintig'].map(b => byFront.get(b)))
      .toEqual(['дэ доосэ́нтэ(н)каамэр', 'зэсэ(н)тви́нтэх', 'дэ коопии́йэ(н)', 'дриийэ(н)тви́нтэх']);
  });
});
