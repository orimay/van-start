import { describe, expect, it } from 'vitest';
import { matching, suspects } from './mix-up';

const card = (id: string, b: string, f: string) => ({ id, b, f });
const deck = [
  card('1', 'de kamer', 'комната'),
  card('2', 'kameraad', 'товарищ'),
  card('3', 'het café', 'кафе; бар'),
  card('4', 'de slaapkamer', 'спальня'),
  card('5', 'koken', 'готовить, варить'),
];
const found = (query: string) => matching(deck, query).map(c => c.id);

describe('a search for a mixed-up card', () => {
  it('finds a Dutch word past its article', () => {
    expect(found('kam')).toEqual(['1', '2', '4']);
  });

  it('puts words that start with the query first', () => {
    expect(found('kamer')).toEqual(['1', '2', '4']);
    expect(found('slaap')).toEqual(['4']);
  });

  it('finds a meaning in the native language', () => {
    expect(found('бар')).toEqual(['3']);
    expect(found('вари')).toEqual(['5']);
  });

  it('ignores case and accents', () => {
    expect(found('CAFE')).toEqual(['3']);
  });

  it('finds nothing for an empty query', () => {
    expect(found('  ')).toEqual([]);
  });
});

describe('the cards a word may have been taken for', () => {
  const suspected = (id: string) => suspects(deck.find(c => c.id === id)!, deck.filter(c => c.id !== id), () => false).map(c => c.id);

  it('start with the words built on it or it is built on', () => {
    expect(suspected('1').slice(0, 2)).toEqual(['2', '4']);
    expect(suspected('4')[0]).toBe('1');
  });

  it('leave phrases holding the word to the look-alikes', () => {
    const het = card('h', 'het', 'артикль');
    const others = [card('p', 'aan het eind', 'в конце'), card('w', 'heten', 'называться')];
    expect(suspects(het, others, () => false)[0]!.id).toBe('w');
  });

  it('go on with the words looking most like it', () => {
    expect(suspected('1')).toHaveLength(4);
  });
});
