import { describe, expect, it } from 'vitest';
import { buildIndex, linkBreakdown, linkSegments } from './links';

const cards = [
  { id: 'kopen', f: 'покупать', b: 'kopen' },
  { id: 'ver', f: 'пере-, изменение; прочь, от-', b: 'ver-' },
  { id: 'verkopen', f: 'продавать', b: 'verkopen', n: 'от: ver- (пере-, изменение) + kopen (покупать)' },
  { id: 'boek', f: 'книга', b: 'het boek' },
  { id: 'boekje', f: 'книжечка', b: 'het boekje', n: 'уменьш. от: het boek (книга)' },
  { id: 'boeken', f: 'книги (мн.)', b: 'de boeken', n: 'мн. ч. от: het boek' },
  { id: 'kies-v', f: 'выбери!', b: 'kies', n: 'повелительное от: kiezen (выбирать)' },
  { id: 'kies-n', f: 'коренной зуб', b: 'de kies' },
  { id: 'weer', f: 'снова', b: 'weer', n: 'не путать с: het weer (погода)' },
  { id: 'weer-n', f: 'погода', b: 'het weer' },
  { id: 'pas-1', f: 'лишь', b: 'pas' },
  { id: 'pas-2', f: 'примерь!', b: 'pas' },
  { id: 'pasje', f: 'карточка', b: 'het pasje', n: 'n. diminutivo de: pas (примерь!)' },
  { id: 'snel', f: 'быстро', b: 'snel', n: 'синоним: vlug (быстро)' },
  { id: 'vlug', f: 'быстро', b: 'vlug', n: 'синоним: snel (быстро)' },
];
const index = buildIndex(cards);
const links = (item: string, self?: string) => linkSegments(item, index, self).filter(s => s.link).map(s => [s.text, s.link]);

describe('a reference in a note', () => {
  it('links each part of a compound to its card, glosses staying text', () => {
    expect(linkSegments('от: ver- (пере-, изменение) + kopen (покупать)', index)).toEqual([
      { text: 'от: ' },
      { text: 'ver-', link: 'ver', gloss: 'пере-, изменение' },
      { text: ' (пере-, изменение) + ' },
      { text: 'kopen', link: 'kopen', gloss: 'покупать' },
      { text: ' (покупать)' },
    ]);
  });

  it('links every link of a chain spelled after its parent', () => {
    expect(links('от: verkopen (продавать) = ver- (пере-, изменение) + kopen (покупать)')).toEqual([
      ['verkopen', 'verkopen'],
      ['ver-', 'ver'],
      ['kopen', 'kopen'],
    ]);
  });

  it('finds a noun named with its article', () => {
    expect(links('уменьш. от: het boek (книга)')).toEqual([['het boek', 'boek']]);
  });

  it('reads labels in every language, a gender mark before them', () => {
    expect(links('pl. m. plural de: het boek')).toEqual([['het boek', 'boek']]);
    expect(links('kökü: kopen (almak)')).toEqual([['kopen', 'kopen']]);
    expect(links('înrudit: kopen (a cumpăra)')).toEqual([['kopen', 'kopen']]);
  });

  it('stays text when no card has that word', () => {
    expect(links('повелительное от: kiezen (выбирать)')).toEqual([]);
  });

  it('never links a card to itself', () => {
    expect(links('не путать с: het weer (погода)', 'weer-n')).toEqual([]);
    expect(links('не путать с: het weer (погода)', 'weer')).toEqual([['het weer', 'weer-n']]);
  });

  it('picks the card the gloss names among cards of one spelling', () => {
    expect(links('n. diminutivo de: pas (примерь!)')).toEqual([['pas', 'pas-2']]);
  });

  it('leaves a note item without a reference label alone', () => {
    expect(linkSegments('1) за ним нет сущ.', index)).toEqual([{ text: '1) за ним нет сущ.' }]);
  });
});

describe('a word breakdown', () => {
  const parts = (text: string, self?: string) => linkBreakdown(text, index, self).filter(s => s.link).map(s => [s.text, s.link]);

  it('links each part to its card', () => {
    expect(parts('ver- (пере-, изменение) + het boek (книга): букв. «перекнига»')).toEqual([['ver-', 'ver'], ['het boek', 'boek']]);
  });

  it('keeps the literal sense as text', () => {
    expect(linkBreakdown('ver- (пере-) + kopen (покупать): букв. «kopen»', index).at(-1)).toEqual({ text: ' (покупать): букв. «kopen»' });
  });

  it('never links the card it shows', () => {
    expect(parts('ver- (пере-) + kopen (покупать)', 'ver')).toEqual([['kopen', 'kopen']]);
  });
});

describe('derived words', () => {
  it('are the cards whose origin or diminutive note names the word', () => {
    expect(index.derived.get('kopen')).toEqual([{ id: 'verkopen', gloss: 'покупать' }]);
    expect(index.derived.get('ver')).toEqual([{ id: 'verkopen', gloss: 'пере-, изменение' }]);
    expect(index.derived.get('boek')).toEqual([{ id: 'boekje', gloss: 'книга' }]);
  });
});

describe('related words', () => {
  it("are the cards whose form, variant or don't-confuse note names the word", () => {
    expect(index.related.get('boek')).toEqual([{ id: 'boeken' }]);
    expect(index.related.get('weer-n')).toEqual([{ id: 'weer' }]);
  });

  it("leave out a card the word's own note already links", () => {
    expect(index.related.get('snel')).toBeUndefined();
  });
});
