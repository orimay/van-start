import { describe, expect, it } from 'vitest';
import { matching, suspects, typedAs } from './mix-up';

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

  describe('orders by closeness to the query', () => {
    const near = [
      card('a', 'terugkomen', 'возвращаться'),
      card('b', 'achteruit', 'назад'),
      card('c', 'de terugweg', 'обратный путь'),
      card('d', 'terug-', 'обратно-'),
      card('e', 'terug', 'назад'),
      card('f', 'de weg terug', 'путь назад'),
    ];
    const order = (query: string) => matching(near, query).map(c => c.id);

    it('the word itself first, then the ones adding least to it', () => {
      expect(order('terug')).toEqual(['e', 'd', 'c', 'a', 'f']);
    });

    it('the ones starting with it before the ones holding it further in', () => {
      expect(order('teru')).toEqual(['e', 'd', 'c', 'a', 'b', 'f']);
      expect(order('ug')).toEqual(['e', 'd', 'c', 'a', 'f']);
    });

    it('a meaning the same way', () => {
      expect(order('назад')).toEqual(['b', 'e', 'f']);
    });
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

describe('a wrong typed answer', () => {
  const words = [card('1', 'terug', 'назад'), card('2', 'terug-', 'обратно-'), card('3', 'een (a)', 'неопр. артикль'), card('4', 'een (one)', 'один'), card('5', 'Één', 'одна'), card('6', 'de e-mail, de mail', 'письмо')];
  const LENIENT = { ignoreCase: true, ignoreMarks: true };
  const takenFor = (input: string, leniency = LENIENT) => typedAs(input, words, c => c.b, leniency).map(c => c.id);

  it('is the word written exactly so, symbols counted', () => {
    expect(takenFor('terug-')).toEqual(['2']);
    expect(takenFor('een (one)')).toEqual(['4']);
  });

  describe('typed without the hyphen a word carries', () => {
    it('may be either word when marks are ignored', () => {
      expect(takenFor('terug')).toEqual(['1', '2']);
    });

    it('is the plain word when marks count', () => {
      expect(takenFor('terug', { ignoreCase: true, ignoreMarks: false })).toEqual(['1']);
    });

    it('is the hyphenated word when it is the only one', () => {
      expect(typedAs('terug', [card('2', 'terug-', 'обратно-')], c => c.b, LENIENT).map(c => c.id)).toEqual(['2']);
    });
  });

  it('is no word that merely looks like it', () => {
    const short = [card('1', 'de', 'опр. артикль'), card('2', '-te', '-ость'), card('3', '-st', '-ейший')];
    for (const leniency of [LENIENT, { ignoreCase: false, ignoreMarks: false }]) expect(typedAs('-ste', short, c => c.b, leniency)).toEqual([]);
  });

  it('is any word the leniency accepts when none is written so', () => {
    expect(takenFor('een')).toEqual(['3', '4', '5']);
    expect(takenFor('een', { ignoreCase: false, ignoreMarks: false })).toEqual(['3', '4']);
  });

  describe('among words told apart by accents', () => {
    const een = [card('1', 'een', 'неопр. артикль'), card('2', 'één', 'один')];
    const takenAmong = (input: string, leniency = LENIENT) => typedAs(input, een, c => c.b, leniency).map(c => c.id);

    it('is the accented one when typed with its accents', () => {
      expect(takenAmong('één')).toEqual(['2']);
    });

    it('may be either when typed plain and accents are ignored', () => {
      expect(takenAmong('een')).toEqual(['1', '2']);
    });

    it('is the plain one when typed plain and accents count', () => {
      expect(takenAmong('een', { ignoreCase: true, ignoreMarks: false })).toEqual(['1']);
    });

    it('may be either when an accent is off and accents are ignored', () => {
      expect(takenAmong('eén')).toEqual(['1', '2']);
      expect(takenAmong('eén', { ignoreCase: true, ignoreMarks: false })).toEqual([]);
    });
  });

  it('matches one variant of a word', () => {
    expect(takenFor('de mail')).toEqual(['6']);
  });

  it('is no word when none matches', () => {
    expect(takenFor('terugg')).toEqual([]);
    expect(takenFor('')).toEqual([]);
  });
});
