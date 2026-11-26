import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const deck = cards(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const byWord = new Map(deck.map(c => [c.b, c]));
const LANGS = ['ru', 'en', 'es', 'pt', 'tr', 'ro'];
const noteIn = (lang: string): ((card: Card) => string) => {
  if (lang === 'ru') return card => card.n ?? '';
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => rows[card.id]?.[3] ?? '';
};
const LABEL: Record<string, Record<string, string>> = {
  from: { ru: 'от', en: 'from', es: 'deriva de', pt: 'deriva de', tr: 'kökü', ro: 'de la' },
  related: { ru: 'родственное', en: 'related', es: 'relacionado', pt: 'relacionado', tr: 'akraba kelime', ro: 'înrudit' },
  form: { ru: 'форма от', en: 'form of', es: 'forma de', pt: 'forma de', tr: 'biçimi', ro: 'forma lui' },
  plural: { ru: 'мн. ч. от', en: 'plural of', es: 'plural de', pt: 'plural de', tr: 'çoğulu', ro: 'pluralul lui' },
  confuse: { ru: 'не путать с', en: "don't confuse with", es: 'no confundir con', pt: 'não confundir com', tr: 'karıştırma', ro: 'a nu se confunda cu' },
  superlative: { ru: 'превосходная степень от', en: 'superlative of', es: 'superlativo de', pt: 'superlativo de', tr: 'en üstünlük derecesi', ro: 'superlativul lui' },
};
/** A note's items, an es/pt/ro gender prefix (`f. `, `pl. m. `) set aside. */
const itemsOf = (note: string) => note.split('\n').flatMap(line => line.replace(/^!/, '').split('; ')).map(item => item.replace(/^(pl\. )?[mfn]\.(\/[mfn]\.)? /, ''));
/** One link names several words as `label: a (…), b (…)`. */
const names = (note: string, label: string, word: string) =>
  itemsOf(note).some(item => item.startsWith(`${label}: `) && [`: ${word} (`, `: ${word} +`, `), ${word} (`, ` + ${word} (`].some(part => item.includes(part)));

// A word made from another in the deck, by no affix the eye can split off: a verb from its noun, a noun from its verb or adjective
const DERIVED: Array<[string, string]> = [
  ['tellen', 'het tal'], ['haten', 'de haat'], ['noemen', 'de naam'], ['de wil', 'willen'], ['schilderen', 'de schilder'],
  ['de klank', 'klinken'], ['de dank', 'denken'], ['huren', 'de huur'], ['interviewen', 'het interview'], ['de keus', 'kiezen'],
  ['de keuze', 'kiezen'], ['pakken', 'het pak'], ['de trek', 'trekken'], ['gamen', 'de game'], ['roken', 'de rook'],
  ['smaken', 'de smaak'], ['de groei', 'groeien'], ['de band', 'binden'], ['de uitleg', 'uitleggen'], ['ademen', 'de adem'],
  ['de uitgaven', 'uitgeven'], ['het drinken', 'drinken'], ['het eten', 'eten'], ['het leven', 'leven'], ['het geld', 'gelden'],
  ['vluchten', 'de vlucht'], ['de ander', 'ander'], ['fout', 'de fout'], ['het vet', 'vet'], ['de mobiel', 'mobiel'],
  ['de jongen', 'jong'], ['de jarige', 'jarig'], ['succes', 'het succes'], ['Engelse', 'Engels'], ['dag', 'de dag'],
  ['weg', 'de weg'], ['de keuken', 'koken'], ['de vlucht', 'vliegen'], ['allebei', 'alle'], ['allebei', 'beide'],
];
// Peers of one root, neither made from the other
const RELATED: Array<[string, string]> = [
  ['stappen', 'de stap'], ['slapen', 'de slaap'], ['richten', 'recht'], ['het licht', 'licht'], ['roze', 'de roos'], ['eerst', 'eerste'], ['rechter', 'recht'],
];
// A form of another card: an inflected -e, a plural, a superlative
const FORMS: Array<[string, string, string]> = [
  ['vele', 'form', 'veel'], ['elke', 'form', 'elk'], ['welke', 'form', 'welk'], ['onze', 'form', 'ons'],
  ['anderen', 'plural', 'ander'], ['honderden', 'plural', 'honderd'], ['de duizenden', 'plural', 'duizend'],
  ['beiden', 'form', 'beide'], ['sommigen', 'form', 'sommige'],
  ['het meest', 'superlative', 'veel'], ['de meesten', 'superlative', 'veel'],
];

describe('a word made from another', () => {
  it.each(LANGS)('names its base in %s', (lang) => {
    const note = noteIn(lang);
    const pairs = [
      ...DERIVED.map(([word, base]) => [word, 'from', base] as const),
      ...RELATED.flatMap(([a, b]) => [[a, 'related', b], [b, 'related', a]] as const),
      ...FORMS,
    ];
    const unnamed = pairs.filter(([word, kind, base]) => !names(note(byWord.get(word)!), LABEL[kind]![lang]!, base)).map(([word, , base]) => `${word} -> ${base}`);
    expect(unnamed).toEqual([]);
  });
});

// A word with an -n form used alone, only of people: beide boeken, ze zijn beiden thuis
const PEOPLE_FORMS: Array<[string, string]> = [['beide', 'beiden'], ['sommige', 'sommigen']];

describe('a word with a form used only of people', () => {
  it.each(LANGS)('names that form in %s', (lang) => {
    const note = noteIn(lang);
    const unnamed = PEOPLE_FORMS.filter(([word, form]) => !names(note(byWord.get(word)!), LABEL.confuse![lang]!, form)).map(pair => pair.join(' -> '));
    expect(unnamed).toEqual([]);
  });
});

describe('a related word', () => {
  it('names the card that names it', () => {
    const related = (card: Card) => [...(card.n ?? '').matchAll(/(?:^|; )родственное: ([^;]+)/g)].flatMap(m => m[1]!.split(/,? \+ |, (?=(?:de |het )?[a-z])/).map(w => w.replace(/ \(.*$/, '')));
    const oneWay = deck.flatMap(card => related(card).filter(other => byWord.has(other) && !related(byWord.get(other)!).includes(card.b)).map(other => `${card.b} -> ${other}`));
    expect(oneWay).toEqual([]);
  });
});

// Words made from one base by a suffix or none are peers: het bezit, de bezitter and bezittelijk all come from bezitten
const NOT_PEERS = new Set([
  // a participle or -end form, linked to its verb
  'gesloten', 'gegeven', 'gescheiden', 'gefeliciteerd', 'beantwoord', 'gemiddeld', 'pratend',
  // a compound, linked to its parts
  'het vliegtuig', 'de glucosemeting',
  // a variant or a feminine, linked as such
  'de keus', 'de keuze', 'de verkoopster', 'beterschap', 'de beterschap',
]);
// Bases whose words drifted apart: uiterlijk and de uitkering share only uit
const DRIFTED = new Set(['uit', 'over', 'eigen', 'het land', 'de dag', 'één', 'twee', 'vier', 'vijf']);
const peersOf = () => {
  const families = new Map<string, string[]>();
  for (const card of deck) {
    const note = card.n ?? '';
    if (/мн\. ч\. от:|форма «|форма от:/.test(note) || /^-|-$/.test(card.b) || card.b.replace(/^(de|het) /, '').includes(' ') || NOT_PEERS.has(card.b)) continue;
    const parts = /(?:^|; )от: (.+?)(?:; |$)/.exec(note)?.[1]?.split(' + ').map(part => part.replace(/ \(.*$/, '')) ?? [];
    const bases = parts.filter(part => !part.startsWith('-'));
    if (parts.some(part => part.endsWith('-')) || bases.length !== 1 || !byWord.has(bases[0]!) || DRIFTED.has(bases[0]!)) continue;
    families.set(bases[0]!, [...(families.get(bases[0]!) ?? []), card.b]);
  }
  return [...families.values()].flatMap(family => family.flatMap(word => family.filter(other => other !== word).map(other => [word, other] as const)));
};

describe('words made from one base', () => {
  it('are found', () => {
    expect(peersOf()).toContainEqual(['bezittelijk', 'het bezit']);
  });

  it.each(LANGS)('name each other in %s', (lang) => {
    const note = noteIn(lang);
    const unnamed = peersOf().filter(([word, other]) => !names(note(byWord.get(word)!), LABEL.related![lang]!, other)).map(([word, other]) => `${word} -> ${other}`);
    expect(unnamed).toEqual([]);
  });
});
