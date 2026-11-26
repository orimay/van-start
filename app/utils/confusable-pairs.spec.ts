import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { b: string; f: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cardsOf = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
const deck = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));

const FORM = /(^|; )(мн\. ч\. от|уменьш\. от|форма от|женский род от|сравнительная степень от|превосходная степень от|порядковое от|причастие)/;
/** A single word of its own: no phrase, affix, plural or form of another card. */
const isBase = (card: Card) =>
  !/[ ,.!?]/.test(card.b.replace(/^(de|het) /, '')) && !/^-|-$/.test(card.b) && !/\(мн\.\)/.test(card.f) && !FORM.test(card.n ?? '');
/** The front's senses, split at `; ` and at `, ` outside brackets. */
const piecesOf = (front: string) => front.split(/; |, (?![^(]*\))/).map(s => s.trim());
const LABEL = /^(от|не путать с|синоним|вариант|родственное|форма от|мн\. ч\. от|уменьш\. от|женский род от|процесс): ?/;
/** Every card a note's reference items name. */
const namesIn = (note: string) => new Set(note.split('\n')[0]!.split('; ').filter(item => LABEL.test(item))
  .flatMap(item => item.replace(LABEL, '').split(/, (?![^(]*\))| \+ /)).map(name => name.replace(/ \(.*$/, '').trim()));
const confusables = (card: Card) => new Set((card.n ?? '').split('\n')[0]!.split('; ').filter(item => item.startsWith('не путать с: '))
  .flatMap(item => item.slice(13).split(/, (?![^(]*\))/)).map(name => name.replace(/ \(.*$/, '').trim()));

// Pairs whose shared word means one thing apart from the context the front already gives
const DIFFERENT = new Set([
  'hij|is', 'is|ze', 'is|zij', 'ha|over', 'de verzorger|die',
]);

// Pairs learners mix up though their fronts differ: one Russian word covers both
const MIXED = [['het spel', 'de game'], ['hoog', 'lang'], ['hoge', 'lange'], ['zich', 'zichzelf'], ['praten', 'spreken'], ['allebei', 'beiden'], ['allebei', 'beide']];

const bases = deck.filter(isBase);
const keyOf = (a: Card, b: Card) => [a.b, b.b].sort().join('|');
const pairs = bases.flatMap((a, i) => bases.slice(i + 1).flatMap((b) => {
  const shared = piecesOf(a.f).filter(piece => !piece.includes('(') && piecesOf(b.f).includes(piece));
  return shared.length ? [{ a, b, shared }] : [];
}));

describe('two cards whose fronts share a sense', () => {
  it('name each other in their notes', () => {
    const unnamed = pairs.filter(({ a, b }) => !DIFFERENT.has(keyOf(a, b)) && !(namesIn(a.n ?? '').has(b.b) && namesIn(b.n ?? '').has(a.b)))
      .map(({ a, b, shared }) => `${shared.join('/')}: ${a.b} | ${b.b}`);
    expect(unnamed).toEqual([]);
  });

  it('each say how they differ when they are told apart', () => {
    const plain = (card: Card) => (card.n ?? '').split('\n')[0]!.split('; ').some(item => !LABEL.test(item));
    const bare = bases.filter(card => confusables(card).size && !plain(card)).map(card => card.b);
    expect(bare).toEqual([]);
  });

  it('are told apart, like pairs one Russian word covers', () => {
    const byWord = new Map(deck.map(card => [card.b, card]));
    const unnamed = MIXED.filter(([a, b]) => !(confusables(byWord.get(a!)!).has(b!) && confusables(byWord.get(b!)!).has(a!)))
      .map(pair => pair.join(' | '));
    expect(unnamed).toEqual([]);
  });

  it('are listed as different only while they share a sense', () => {
    const stale = [...DIFFERENT].filter(key => !pairs.some(({ a, b }) => keyOf(a, b) === key));
    expect(stale).toEqual([]);
  });
});
