import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardsOf, type DeckNode } from './deck';
import { buildIndex, linkSegments } from './links';

const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode);
const index = buildIndex(cards);

const STOP = new Set('и в на с к от по для до за о у не а же ли то что как это без старое здесь смысл значение'.split(' '));
/** The 4-letter stems of a text's Russian words: `руководить` and `руководство` share `руко`. */
const stemsOf = (text: string) => new Set((text.toLowerCase().replace(/ё/g, 'е').match(/[а-я]+/g) ?? []).filter(w => w.length > 1 && !STOP.has(w)).map(w => w.slice(0, 4)));

/** Glosses that rightly say what no sense on the linked card says, each with the reason. */
const REVIEWED: Record<string, string> = {
  'welkom → wel': 'etymology: wel is "well" in the old sense',
  'makkelijk → gemakkelijk': 'the gloss says how the word was clipped, not what it means',
  'de echtgenoot → echt': 'etymology: echt meant "marriage"',
  'geleden → lijden': 'etymology: lijden meant "to pass"',
  'de schoonheid → schoon': 'the old sense "beautiful" lives on only in the compound',
  'doorverwijzen → door': 'the prefix sense "further", not the preposition',
  'hardop → op': 'op adds no sense of its own',
  'het liefst → het liefste': 'variant spelling, same meaning',
  'het liefste → het liefst': 'variant spelling, same meaning',
  'de timmerlieden → de timmerman': 'the gloss marks the plural irregular',
  'dit → dat': 'the gloss sets near against far',
  'dat → dit': 'the gloss sets near against far',
  'inmiddels → middel': 'etymology: middel meant "middle"',
  'aanstaande → aanstaan': 'the old sense "to be imminent" lives on only in the participle',
};

/** `card → linked word` for every linked gloss sharing no stem with the front of the card it links to. */
function strayGlosses() {
  return cards.flatMap(card => (card.n ?? '').split('\n').flatMap(line => line.replace(/^!/, '').split('; '))
    .flatMap(item => linkSegments(item, index, card.id))
    .filter(segment => segment.link && segment.gloss)
    .filter(({ link, gloss }) => {
      const front = stemsOf(index.byId.get(link!)!.f);
      const stems = stemsOf(gloss!);
      return stems.size > 0 && ![...stems].some(stem => front.has(stem));
    })
    .map(({ text }) => `${card.b} → ${text.trim()}`));
}

/** `card → word` for every bare linked word that both a de and a het card spell: `pad` reads as de pad (жаба), never het pad (тропинка). */
function bareHomonyms() {
  const spelled = new Set(cards.map(c => c.b.toLowerCase()));
  return cards.flatMap(card => (card.n ?? '').split('\n').flatMap(line => line.replace(/^!/, '').split('; '))
    .flatMap(item => linkSegments(item, index, card.id))
    .map(({ text, link }) => link && text.trim().toLowerCase())
    .filter((word): word is string => !!word && !spelled.has(word) && spelled.has(`de ${word}`) && spelled.has(`het ${word}`))
    .map(word => `${card.b} → ${word}`));
}

describe('a linked word', () => {
  it('carries its article when a de and a het card share its spelling', () => {
    expect(bareHomonyms()).toEqual([]);
  });
});

describe('a linked gloss', () => {
  const stray = strayGlosses();

  it('shares a sense with the card it links to, unless reviewed', () => {
    expect(stray.filter(hit => !(hit in REVIEWED))).toEqual([]);
  });

  it('keeps no reviewed exception the deck no longer has', () => {
    expect(Object.keys(REVIEWED).filter(hit => !stray.includes(hit))).toEqual([]);
  });
});
