import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardsOf, linkable, type DeckCard, type DeckNode } from './deck';
import { buildIndex, linkSegments } from './links';

const deck = JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode;
const cards = cardsOf(deck);
const index = buildIndex(linkable(deck));
const itemsOf = (card: DeckCard) => (card.n ?? '').split('\n').flatMap(line => line.replace(/^!/, '').split('; '));

/** Labels naming another form of the word: a plural, the other gender, a past, a request, a participle, a degree. */
const FORM = /^(?:(?:мн\. ч\.|ед\. ч\.|форма(?: «[^»]*»)?|прошедшее \([^()]*\)|просьба\/приказ,|причастие|женский род|уменьш\.|(?:сравнительная|превосходная) степень) от|мн\. ч\.|ед\. ч\.|о мужчине|о женщине): /;
/** Top-level Dutch parts of a list: `kijken (смотреть) + naar (на)` has two, `nemen (брать), нейтрально` one. */
const partsIn = (list: string) => list.replace(/\((?:[^()]|\([^()]*\))*\)/g, '').split(/ [+=] |, | \/ /).map(p => p.trim()).filter(p => p && !/\p{Script=Cyrillic}/u.test(p));
const linksIn = (item: string, card: DeckCard) => linkSegments(item, index, card.id).filter(s => s.link).length;

describe('a form a note names', () => {
  it('links its card', () => {
    const unlinked = cards.flatMap(card =>
      itemsOf(card).filter(item => FORM.test(item) && linksIn(item, card) < partsIn(item.replace(FORM, '')).length).map(item => `${card.b}: ${item}`));
    expect(unlinked).toEqual([]);
  });

  it('is named under a label', () => {
    const bare = cards.flatMap(card =>
      itemsOf(card).filter(item => /^(?:мн\. ч\.|ед\. ч\.) (?!от:)(?:de |het )?\p{L}|^прош\. |^(?:мужчина|женщина) — /u.test(item)).map(item => `${card.b}: ${item}`));
    expect(bare).toEqual([]);
  });
});
