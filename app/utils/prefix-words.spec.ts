import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; n?: string; xb?: string }
interface Node { cards?: Card[]; children?: Node[] }
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const cards = cardsOf(deck);
const byDutch = new Map(cards.map(c => [c.b, c]));
const items = (c: Card) => (c.n ?? '').split('; ');

const prefixes = cards.filter(c => c.b.endsWith('-') && !c.b.startsWith('-'));
const separable = prefixes.filter(c => (c.n ?? '').startsWith('в предложении отрывается'));

describe('a separable prefix', () => {
  it('is the word it is spelled as, named as its origin', () => {
    const wrong = separable
      .filter(p => byDutch.has(p.b.slice(0, -1)))
      .filter(p => !items(p).some(i => i.startsWith(`от: ${p.b.slice(0, -1)} (`)))
      .map(p => `${p.b}: ${p.n}`);
    expect(wrong).toEqual([]);
  });

  it('shows its split on its own example verb', () => {
    const verbs = separable.filter(p => p.xb && !/^(de|het) /.test(p.xb) && p.xb.endsWith('n'));
    expect(verbs.length).toBeGreaterThan(0);
    const wrong = verbs
      .filter(p => {
        const word = p.b.slice(0, -1);
        const stem = p.xb!.slice(word.length);
        const example = items(p)[1]!.replace(/ \(.*$/, '');
        return !example.endsWith(` ${word}`) && !example.endsWith(` ${word}?`) || !example.split(' ').some(w => w.startsWith(stem.slice(0, 2)));
      })
      .map(p => `${p.b} (${p.xb}): ${items(p)[1]}`);
    expect(wrong).toEqual([]);
  });
});

describe('a prefix and a word of one spelling', () => {
  it('call each other related only when they are', () => {
    const related = cards.filter(c => items(c).some(i => /^родственное: \S+-$/.test(i) || (c.b.endsWith('-') && i === `родственное: ${c.b.slice(0, -1)}`)));
    expect(related.map(c => `${c.b}: ${c.n}`)).toEqual([]);
  });
});
