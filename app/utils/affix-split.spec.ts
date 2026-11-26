import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildIndex, linkSegments } from './links';

type Card = { id: string; b: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const deck = cards(JSON.parse(readFileSync('public/deck.json', 'utf8')));

const word = (b: string) => b.replace(/^(de|het) /, '');
const affixes = (shape: RegExp) => deck.map(c => c.b).filter(b => shape.test(b)).map(b => b.replace('-', ''));
const PREFIXES = affixes(/^[a-z]+-$/);
const SUFFIXES = affixes(/^-[a-z]+$/);
/** A word that starts with a deck prefix or ends with a deck suffix, with at least three letters left. */
const looksAffixed = (w: string) =>
  PREFIXES.some(p => w.startsWith(p) && w.length - p.length >= 3) || SUFFIXES.some(s => w.endsWith(s) && w.length - s.length >= 3);
// Words that only look affixed: the rest is a deck word by chance (de kamer is no kam + -er, het water no wat + -er)
const NOT_SPLIT = [
  'achter', 'geen', 'de kamer', 'het water', 'bijten', 'de broer', 'het gezin', 
  'lekker', 'de lente', 'het tennis', 'het leger', 'de haring', 'de boter',
  'de paling', 'de meter', 'de veter', 'de latte', 'de halte', 'het gevaar', 'de beker', 'beide', 
  'de wekker', 'de navel', 'de penis', 'het been', 'de lever', 'misselijk', 'mager', 'de nagel', 'de schaar',
  'de meester', 'de inversie', 'de optie', 'het weekend', 'de donder', 'de gel', 'de legitimatie', 'de productie', 'de animatie',
  // A marked affix only by look (geen, de koning), or a fossil one (bellen, plotseling, geloven)
  'het beeld', 'geven', 'gelden', 'de koning', 'best', 'bellen', 'weinig', 'de bezem', 'het bed', 'de herfst', 'de bek', 'geel', 'gek',
  'de beurt', 'het ding', 'lelijk', 'vers', 'beige', 'de ring', 'de beschuit', 'de honing', 'ver', 'de verf', 'de ketting', 'de bes',
  'zalig', 'de camping', 'veilig', 'de benzine', 'de geit', 'de hersenen', 'de catering', 'de geest', 'de bende', 'stevig', 'de versie',
  'bezig', 'plotseling', 'ig', 'lijk', 'twaalfhonderdvijftig', 'geloven', 'gebruiken', 'gebeuren', 'genieten', 'genezen', 'genoeg',
  'gezond', 'gewoon', 'beneden', 'het geslacht', 'de genoot', 'de beek', 'het beest', 'nauwelijks',
  // Made from a word the deck lacks or holds in another sense: rechten (prepare); old voor + raad; schenken (give); hakken (chop), not de hakken (heels)
  'het aanrecht', 'de voorraad', 'het geschenk', 'het gehakt',
  // A frozen form, named as related instead: rechter (right-hand) beside recht, eerste beside eerst
  'rechter', 'eerste',
  // Loanwords taken whole: -tie, -ie, -ief, in-, inter- came with the word, no Dutch base inside
  'de politie', 'informeren', 'de infinitief', 'de nationaliteit', 'het interview', 'de vakantie', 'de receptie',
  'de positie', 'de relatie', 'het instituut', 'interessant', 'de functie', 'de suggestie', 'de attractie', 'de negatie', 'de situatie',
  'de interesse', 'de traktatie', 'het internet', 'de instructie', 'de prepositie', 'de garantie', 'internationaal',
  'de conjunctie', 'de locatie', 'de specificatie', 'de conditie', 'de notitie', 'de portie', 'de intercity', 'inclusief', 'installeren',
  'de presentatie', 'de promotie', 'de expositie', 'de communicatie', 'introduceren', 'de advertentie', 'de medicatie', 'de vaccinatie',
  'het ingrediënt', 'het insect', 'intensief', 'individueel', 'informatief', 'de instantie', 'de motivatie', 'de prestatie',
  'de administratie', 'online', 'de toerist', 'de passagier', 'de caissier', 'het formulier',
  // Loanwords whose ending only looks Dutch: -er, -es, -te, -je
  'de partner', 'de computer', 'super', 'de dokter', 'de letter', 'de centimeter', 'het adres', 'het nummer', 'de burger',
  'de manager', 'de tante', 'de kastanje', 'de gitaar', 'het theater', 'het succes', 'het karakter', 'de visite', 'de courgette',
  'de frites', 'het papier', 'de slipper', 'de sneaker', 'de bloes', 'het servies', 'de jenever', 'de folder', 'de manier', 'het advies',
  'precies', 'het diner', 'de sfeer', 'de route', 'de minister', 'de scooter', 'de sigaar', 'de container', 'de glitter', 'de update',
  'de anekdote', 'de rente', 'het plezier',
  // Months and countries
  'oktober', 'september', 'december', 'november', 'Spanje', 'Turkije', 'Egypte',
  // Native words with no affix: -er, -end, -te, in-, on-, na- are part of the root (de moeder, de ochtend, de nacht)
  'ander', 'onder', 'de vriend', 'de natuur', 'wanneer', 'klein', 'de moeder', 'de winter', 'de moeite', 'de ochtend', 'de zomer',
  'de dochter', 'de vader', 'de zwager', 'de trein', 'de peper', 'de honger', 'de kleuter', 'de luier', 'de ooievaar', 'de peuter',
  'zeker', 'zonder', 'de nacht', 'stoer', 'de suiker', 'het vlees', 'duizend', 'bruin', 'donker', 'zilver', 'oranje', 'de vijver',
  'de spijker', 'jammer', 'de komkommer', 'ongeveer', 'bitter', 'het plein', 'de koffer', 'het wonder', 'de rivier', 'de vlinder',
  'de zolder', 'de kelder', 'ieder', 'de vloer', 'de schouder', 'de vinger', 'de spier', 'de pleister', 'wakker', 'het cijfer',
  'het terrein', 'het ijzer', 'naaien', 'de ijver',
  // A frozen form: naast was the superlative of na; het sprookje has no sprook left
  'naast', 'het sprookje',
  // The base of a word in the deck: schilderen is made from de schilder
  'de schilder',
];
// Affixes that mark a word even when the rest has no card (geloven, de schoonheid): the word names its root anyway.
const MARKED = /^(ge|be|ver|ont|her)|(ing|heid|lijks?|ig|baar|loos|schap|nis|ling|achtig)$/;
const candidates = deck.filter(c => !/[ -]/.test(word(c.b)) && (MARKED.test(word(c.b)) || looksAffixed(word(c.b))));

const HEAD = /^(pl\. )?(?:[mfn]|pl)\.(?:\/?(?:[mfn]|pl)\.)* /;
/** An item naming what the word is made of: `от: …`, `мн. ч. от: …`, or a bare `a + b` other than a usage rule (`2) een/geen + het-слово`). */
const ORIGIN: Record<string, RegExp> = {
  ru: /^([^:]{0,40} )?от: /,
  en: /^(from|[^:]{0,40} of): /,
  es: /^[^:]{0,40} de: /,
  pt: /^[^:]{0,40} de: /,
  tr: /^([^:]{0,40} )?(kökü|çoğulu|biçimi|küçültme|derecesi|sayısı): /,
  ro: /^[^:]{0,40}(de la|lui): /,
};
const noteIn = (lang: string): ((card: Card) => string) => {
  if (lang === 'ru') return card => card.n ?? '';
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => rows[card.id]?.[3] ?? '';
};
const names = (note: string, origin: RegExp) =>
  note.split('\n').flatMap(line => line.replace(/^!/, '').split('; ')).some(item => origin.test(item.replace(HEAD, '')) || (item.includes(' + ') && !/^\d\) |een\/geen \+/.test(item)));

describe('an affixed word', () => {
  it.each(Object.keys(ORIGIN))('names its parts in %s', (lang) => {
    const note = noteIn(lang);
    const unsplit = candidates.filter(c => !NOT_SPLIT.includes(c.b) && !names(note(c), ORIGIN[lang]!)).map(c => c.b);
    expect(unsplit).toEqual([]);
  });

  it('is reviewed as not split only while it looks affixed and names no parts', () => {
    const stale = NOT_SPLIT.filter(b => !candidates.some(c => c.b === b && !names(c.n ?? '', ORIGIN.ru!)));
    expect(stale).toEqual([]);
  });
});

// The base is archaic, bookish, or lost its meaning, so the deck holds no card for it: the word links its affix only.
const FOSSIL: Record<string, string> = {
  ontmoeten: 'moeten here is old "meet", not "must"',
  beginnen: 'ginnen is gone',
  vergeten: 'geten is gone',
  verliezen: 'liezen is gone',
  'het belang': 'belangen is archaic',
  bederven: 'derven is bookish',
  bewaren: 'waren is archaic',
  bewegen: 'old wegen "move", not today\'s wegen "weigh"',
  verdwijnen: 'dwijnen is gone',
  'de geschiedenis': 'geschieden is bookish',
  herinneren: 'inner is gone as a verb',
  vrolijk: 'vro is gone',
  besteden: 'stede is archaic',
  aanwezig: 'wezen is bookish',
  beslissen: 'slissen is gone',
  gezellig: 'de gezel is archaic',
  verrukkelijk: 'verrukken is bookish',
  'het geduld': 'dulden is bookish',
  beloven: 'loven is bookish',
  'het gemak': 'mak is too rare',
  gelijk: 'lijk "body" is gone',
  gereed: 'reed is gone',
  'het geweld': 'walden is gone',
  gemeen: 'meen is gone',
  vaardig: 'de vaart kept another sense',
  zuinig: 'no base left',
  'de afschuw': 'schuw is too rare',
  bereiden: 'reiden is gone',
  'de makelaar': 'makelen is rare',
  vergaderen: 'gaderen is gone',
};
// Past participles and forms: their verb is named with `причастие от:`, not split into parts.
const FORM = /^(форма «сделанный»|причастие) от: /;
const isForm = (card: Card) => (card.n ?? '').split('\n').some(line => line.replace(/^!/, '').split('; ').some(item => FORM.test(item.replace(HEAD, ''))));
const LANGS = Object.keys(ORIGIN);
const inLanguage = (lang: string): Card[] => {
  if (lang === 'ru') return deck;
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return deck.map(card => ({ ...card, f: rows[card.id]?.[0] ?? '', n: rows[card.id]?.[3] ?? '' }));
};
/** Top-level parts of a reference list: `ont- (навстречу) + moeten (быть должным)` has two. */
const partsIn = (list: string) => list.replace(/\((?:[^()]|\([^()]*\))*\)/g, '').split(/ [+=] /).map(p => p.trim()).filter(Boolean);
const isAffix = (b: string) => /^-|-$/.test(b);

const originItems = (card: Card, lang: string) =>
  (card.n ?? '').split('\n').flatMap(line => line.replace(/^!/, '').split('; ')).filter(item => ORIGIN[lang]!.test(item.replace(HEAD, '')));
const linksIn = (item: string, index: ReturnType<typeof buildIndex>, id: string) =>
  linkSegments(item, index as never, id).flatMap(s => (s.link ? [index.byId.get(s.link)!.b] : []));

describe('an affixed word', () => {
  it.each(LANGS)('links its base and affix to their cards in %s', (lang) => {
    const cards = inLanguage(lang);
    const index = buildIndex(cards as never);
    const unlinked = cards.filter(c => candidates.some(d => d.id === c.id && !isForm(d)) && !NOT_SPLIT.includes(c.b)).flatMap(card =>
      originItems(card, lang).flatMap(item => {
        const links = linksIn(item, index, card.id);
        const based = links.some(b => !isAffix(b)) || card.b in FOSSIL;
        return links.length < partsIn(item.replace(/^.*?: /, '')).length || !based ? [`${card.b}: ${item}`] : [];
      }),
    );
    expect(unlinked).toEqual([]);
  });

  it('keeps a fossil base only for a word that links no base', () => {
    const index = buildIndex(deck as never);
    const stale = Object.keys(FOSSIL).filter(b => {
      const card = deck.find(c => c.b === b);
      return !card || !candidates.includes(card) || originItems(card, 'ru').some(item => linksIn(item, index, card.id).some(l => !isAffix(l)));
    });
    expect(stale).toEqual([]);
  });
});
