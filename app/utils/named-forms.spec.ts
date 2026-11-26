import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { DeckCard, DeckNode } from './deck';
import { buildIndex, linkSegments } from './links';

const flat = (node: DeckNode): DeckCard[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(flat)];
const cards = flat(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const index = buildIndex(cards);
const itemsOf = (card: DeckCard) => (card.n ?? '').split('\n').flatMap(line => line.replace(/^!/, '').split('; '));

/** Labels naming another form of the word: a plural, the other gender, a past, a request, a participle, a degree. */
const FORM = /^(?:(?:мн\. ч\.|ед\. ч\.|форма(?: «[^»]*»)?|прошедшее \([^()]*\)|просьба\/приказ,|причастие|женский род|уменьш\.|(?:сравнительная|превосходная) степень) от|мн\. ч\.|ед\. ч\.|о мужчине|о женщине): /;
/** Top-level Dutch parts of a list: `kijken (смотреть) + naar (на)` has two, `nemen (брать), нейтрально` one. */
const partsIn = (list: string) => list.replace(/\((?:[^()]|\([^()]*\))*\)/g, '').split(/ [+=] |, | \/ /).map(p => p.trim()).filter(p => p && !/\p{Script=Cyrillic}/u.test(p));
const linksIn = (item: string, card: DeckCard) => linkSegments(item, index, card.id).filter(s => s.link).length;

// The verb is bookish or old, so the deck holds no card for it; the note marks it so.
const OLD_VERB: Record<string, string> = {
  geachte: 'achten (to esteem) is bookish',
  geboren: 'baren (to give birth) is bookish',
  'het verleden': 'verlijden (to pass) is gone',
  beroerd: 'beroeren (to stir) is bookish',
  gewond: 'wonden is old; today verwonden',
  ingewikkeld: 'inwikkelen (to wrap) lost its sense here',
  inbegrepen: 'inbegrijpen (to include) is bookish',
};

describe('a form a note names', () => {
  it('links its card', () => {
    const unlinked = cards.filter(c => !(c.b in OLD_VERB)).flatMap(card =>
      itemsOf(card).filter(item => FORM.test(item) && linksIn(item, card) < partsIn(item.replace(FORM, '')).length).map(item => `${card.b}: ${item}`));
    expect(unlinked).toEqual([]);
  });

  it('is named under a label', () => {
    const bare = cards.flatMap(card =>
      itemsOf(card).filter(item => /^(?:мн\. ч\.|ед\. ч\.) (?!от:)(?:de |het )?\p{L}|^прош\. |^(?:мужчина|женщина) — /u.test(item)).map(item => `${card.b}: ${item}`));
    expect(bare).toEqual([]);
  });

  it('is left unlinked only for an old verb the note marks', () => {
    const stale = Object.keys(OLD_VERB).filter(b => {
      const card = cards.find(c => c.b === b);
      return !card || itemsOf(card).filter(item => FORM.test(item)).every(item => linksIn(item, card) > 0) || !/книжное|старое|устар/.test(card.n ?? '');
    });
    expect(stale).toEqual([]);
  });
});
