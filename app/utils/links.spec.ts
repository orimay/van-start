import { describe, expect, it } from 'vitest';
import { basesOf, buildIndex, familyOfWord, linkBreakdown, linkSegments } from './links';

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

  it('reads a word after any label, one the linker never listed', () => {
    expect(links('просьба/приказ, от: kopen (покупать)')).toEqual([['kopen', 'kopen']]);
    expect(links('a woman: het boek')).toEqual([['het boek', 'boek']]);
    expect(links('rugăminte/ordin, de la: kopen (a cumpăra)')).toEqual([['kopen', 'kopen']]);
    expect(links('прошедшее (делал, был) от: kopen (покупать)')).toEqual([['kopen', 'kopen']]);
  });

  it('leaves an example glossed before its colon as text, a meaning following it', () => {
    expect(linkSegments('verkopen (продавать): kopen', index)).toEqual([{ text: 'verkopen (продавать): kopen' }]);
  });

  it('leaves a label without a card after it as text', () => {
    expect(linkSegments('i → a: zingen, zong', index)).toEqual([{ text: 'i → a: zingen, zong' }]);
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

  it('are the cards any other label names the word under', () => {
    const genote = { id: 'genote', f: 'товарищ (о женщине)', b: 'de genote', n: 'женский род от: de genoot (товарищ)' };
    const related = buildIndex([...cards, { id: 'genoot', f: 'товарищ', b: 'de genoot' }, genote]).related;
    expect(related.get('genoot')).toEqual([{ id: 'genote' }]);
  });

  it("leave out a card the word's own note already links", () => {
    expect(index.related.get('snel')).toBeUndefined();
  });
});

describe('the base of a form', () => {
  const card = (id: string, b: string, n?: string) => ({ id, f: id, b, ...(n && { n }) });
  const bases = basesOf(buildIndex([
    card('nemen', 'nemen'), card('pakken', 'pakken'), card('kopen', 'kopen'),
    card('neemt', 'hij neemt', 'форма от: nemen (брать)'),
    card('nam', 'ik heb genomen', 'прошедшее (сделал) от: nemen (брать)'),
    card('pak', 'pak', 'просьба/приказ, от: pakken (брать)'),
    card('gekocht', 'gekocht', 'форма «сделанный» от: kopen (покупать)'),
    card('koper', 'de koper', 'от: kopen (покупать) + -er'),
  ]));

  it('is the card its form label names', () => {
    expect(Object.fromEntries(bases)).toEqual({ neemt: 'nemen', nam: 'nemen', pak: 'pakken', gekocht: 'kopen' });
  });
});

describe('the family of a word', () => {
  const card = (id: string, b: string, n?: string) => ({ id, f: id, b, ...(n && { n }) });
  const family = buildIndex([
    card('kopen', 'kopen'), card('ver', 'ver-'),
    card('verkopen', 'verkopen', 'от: ver- (пере-) + kopen (покупать)'),
    card('koper', 'de koper', 'от: kopen (покупать) + -er'),
    card('kopers', 'de kopers', 'мн. ч. от: de koper (покупатель)'),
    card('verkoper', 'de verkoper', 'от: verkopen (продавать) + -er'),
    card('kocht', 'ik kocht', 'прошедшее (делал) от: kopen (покупать)'),
  ]);
  const familyOf = (id: string) => familyOfWord(family, basesOf(family), id).sort();

  it('is every word built on it or formed from it, at any depth', () => {
    expect(familyOf('kopen')).toEqual(['kocht', 'koper', 'kopers', 'verkopen', 'verkoper']);
  });

  it('leaves out the word itself and its own sources', () => {
    expect(familyOf('verkopen')).toEqual(['verkoper']);
  });

  it('is empty for a word nothing is built on', () => {
    expect(familyOf('kocht')).toEqual([]);
  });
});
