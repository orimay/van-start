import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string; n?: string }
interface Node { cards?: Card[]; children?: Node[] }
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];

// A word whose common senses differ in Russian lists each one, so the learner meets dat kan next to ik kan.
const SENSES: Record<string, string[]> = {
  krijgen: ['получать', 'рожать'],
  kunnen: ['мочь', 'быть возможным'],
  liggen: ['лежать', 'находиться'],
  beginnen: ['начинать', 'начинаться'],
  afspreken: ['назначать встречу', 'договариваться'],
  aankomen: ['прибывать', 'набирать вес'],
  houden: ['держать', 'оставлять себе'],
  hangen: ['висеть', 'вешать'],
  laten: ['позволять', 'поручать сделать'],
  bewegen: ['двигаться', 'двигать'],
  veranderen: ['менять', 'меняться'],
  eindigen: ['заканчиваться', 'заканчивать'],
  breken: ['ломать', 'ломаться'],
  'de bal': ['мяч', 'бал'],
  'de gang': ['коридор', 'блюдо'],
  'de leiding': ['руководство', 'проводка'],
  'de lijn': ['линия', 'маршрут'],
  'het slot': ['замок', 'конец'],
  eens: ['однажды', 'согласный'],
  pas: ['только', 'недавно'],
  // A word made from another keeps each sense of its base it can carry: geluk is счастье and удача, so gelukkig is удачный too
  gelukkig: ['счастливый', 'удачный', 'к счастью'],
  'de vriendin': ['подруга', 'девушка'],
  schuldig: ['виновный', 'должный'],
  mogelijk: ['возможный', 'возможно'],
  harder: ['усерднее', 'громче', 'твёрже'],
  dunne: ['тонкий', 'худой'],
  dunner: ['тоньше', 'худее'],
  bekende: ['известный', 'знакомый'],
  onregelmatige: ['нерегулярный', 'неправильный'],
  'de voorstelling': ['спектакль', 'представление'],
  // Senses another language listed apart and Russian ran together or lacked
  'de stem': ['голос', 'голосование'],
  eerlijk: ['честный', 'справедливый'],
  'het karton': ['картон', 'пакет'],
  'het gaatje': ['дырочка', 'дупло'],
  'de pech': ['невезение', 'поломка'],
  'het bad': ['ванна', 'купание'],
  licht: ['лёгкий', 'светлый'],
  daarachter: ['за этим', 'после этого'],
  'de man': ['мужчина', 'муж'],
  'de flat': ['многоэтажка', 'квартира'],
  gaan: ['идти', 'собираться'],
  geven: ['давать', 'дарить'],
  stellen: ['задавать', 'ставить', 'предполагать'],
  brengen: ['приносить', 'отвозить'],
  nog: ['ещё', 'до сих пор'],
  'de tijd': ['время', 'грамматическое время'],
  slaan: ['бить', 'сворачивать'],
  staan: ['стоять', 'написанным', 'идти'],
};

const glossesOf = (f: string) => f.split(/[;,] /).map(s => s.replace(/ \(.*$/, ''));

describe('a word with several senses', () => {
  for (const [b, senses] of Object.entries(SENSES)) {
    it(`lists each of them on ${b}`, () => {
      const card = cardsOf(deck).find(c => c.b === b);
      expect(senses.filter(s => !glossesOf(card?.f ?? '').some(g => g.includes(s)))).toEqual([]);
    });
  }
});

const LANGS = ['en', 'es', 'pt', 'tr', 'ro'];

describe("a word's senses", () => {
  for (const lang of LANGS) {
    it(`are as many in ${lang} as in Russian`, () => {
      const rows: Record<string, [string]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      const short = Object.keys(SENSES).flatMap(b => cardsOf(deck).filter(c => c.b === b))
        .filter(c => (rows[c.id]?.[0] ?? '').split('; ').length < c.f.split('; ').length).map(c => c.b);
      expect(short).toEqual([]);
    });
  }
});

// A word whose senses live in set phrases shows them in its note, with its past forms, in every language.
const PHRASES: Record<string, string[]> = {
  gaan: ['hoe gaat het?', 'ging, gegaan'],
  geven: ['een cadeau geven', 'gaf, gegeven'],
  stellen: ['stel dat', 'stelde, gesteld'],
  nemen: ['een besluit nemen', 'nam, genomen'],
  vallen: ['in slaap vallen', 'viel, gevallen'],
  brengen: ['iemand naar huis brengen', 'bracht, gebracht'],
  nog: ['nog een koffie', 'nog niet'],
  'de tijd': ['op tijd', 'de verleden tijd'],
  staan: ['die jas staat je goed', 'stond, gestaan'],
  zitten: ['mijn sleutels zitten', 'zat, gezeten'],
  slaan: ['linksaf slaan', 'sloeg, geslagen'],
  spelen: ['een rol spelen', 'speelde, gespeeld'],
  denken: ['denken aan', 'dacht, gedacht'],
  zien: ['tot ziens', 'zag, gezien'],
  zeggen: ['wat zeg je?', 'zei, gezegd'],
};

describe("a word's set phrases", () => {
  for (const lang of ['ru', ...LANGS]) {
    it(`are in its note in ${lang}`, () => {
      const rows: Record<string, string[]> = lang === 'ru' ? {} : JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      const missing = Object.entries(PHRASES).flatMap(([b, phrases]) => {
        const card = cardsOf(deck).find(c => c.b === b)!;
        const note = lang === 'ru' ? card.n ?? '' : rows[card.id]?.[3] ?? '';
        return phrases.filter(p => !note.includes(p)).map(p => `${b}: ${p}`);
      });
      expect(missing).toEqual([]);
    });
  }
});
