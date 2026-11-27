import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; f: string; n?: string }
interface Node { cards?: Card[]; children?: Node[] }
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];

// A word whose common senses differ in Russian lists each one, so the learner meets dat kan next to ik kan.
const SENSES: Record<string, string[]> = {
  lijken: ['казаться', 'быть похожим'],
  verdienen: ['зарабатывать', 'заслуживать'],
  aantrekken: ['надевать', 'привлекать'],
  herstellen: ['восстанавливаться', 'исправлять'],
  blijven: ['оставаться', 'продолжать'],
  ontvangen: ['получать', 'принимать'],
  innemen: ['принимать', 'занимать'],
  opzeggen: ['расторгать', 'читать наизусть'],
  aansluiten: ['подключать', 'присоединяться'],
  ophalen: ['забирать', 'собирать'],
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
  steken: ['вставлять', 'жалить'],
  uitgaan: ['выходить', 'ходить развлекаться', 'гаснуть'],
  'de rekening': ['счёт', 'счёт в банке'],
  trekken: ['тянуть', 'проводить', 'путешествовать'],
  voeren: ['вести беседу', 'привозить', 'кормить'],
  leiden: ['вести', 'руководить', 'приводить'],
  'het pak': ['пачка', 'костюм', 'стопка'],
  'het stuk': ['кусок', 'часть', 'статья'],
  'het punt': ['пункт', 'точка', 'балл'],
  'de plaats': ['место', 'населённый пункт'],
  'het deel': ['часть', 'том'],
  'de bank': ['диван', 'банк'],
  'het blad': ['лист', 'поднос', 'журнал'],
  vast: ['постоянный', 'наверняка'],
  wel: ['всё-таки', 'да'],
  maar: ['но', 'только', 'же'],
  even: ['минутку', 'чётный'],
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
  houden: ['houden van', 'hield, gehouden'],
  rijden: ['de trein rijdt niet', 'reed, gereden'],
  komen: ['ik kom eraan', 'kwam, gekomen'],
  halen: ['de trein halen', 'haalde, gehaald'],
  trekken: ['een conclusie trekken', 'trok, getrokken'],
  doen: ['boodschappen doen', 'deed, gedaan'],
  maken: ['het maakt niet uit', 'maakte, gemaakt'],
  zetten: ['de wekker zetten', 'zette, gezet'],
  leggen: ['de tas op tafel leggen', 'legde, gelegd'],
  lopen: ['mijn horloge loopt niet', 'liep, gelopen'],
  'de zin': ['het heeft geen zin', 'zin hebben in'], 'het punt': ['op het punt staan', 'het punt is dat'],
  'de kant': ['aan de andere kant', 'een jurk van kant'], 'de plaats': ['in plaats van', 'op de eerste plaats'],
  'de zaak': ['dat is jouw zaak', 'een eigen zaak'], 'de keer': ['voor de eerste keer', 'twee keer'],
  'het werk': ['naar het werk gaan', 'een werk van Rembrandt'], vast: ['een vaste baan', 'hij komt vast'],
  toch: ['je komt toch?', 'ik ga toch'], wel: ['ik heb het wel gedaan'], maar: ['kom maar binnen', 'ik heb maar twee euro'],
  al: ['ik ben al klaar', 'al het geld', 'al is het koud'], even: ['wacht even', 'een even getal'],
  ook: ['ik ook', 'ook al regent het'], 'het stuk': ['een stuk taart', 'een stuk in de krant'],
  net: ['ik ben net thuis', 'net op tijd'], 'de bank': ['op de bank zitten', 'geld op de bank'], raar: ['wat raar!'],
  lijken: ['lijkt op', 'leek, geleken'],
  verdienen: ['geld verdienen', 'verdiende, verdiend'],
  herinneren: ['herinner me eraan', 'zich herinneren'],
  aantrekken: ['een jas aantrekken', 'trekt veel toeristen aan'],
  zorgen: ['zorg dat', 'zorgen voor'],
  herstellen: ['een fout herstellen', 'herstelde, hersteld'],
  blijven: ['blijven werken', 'bleef, gebleven'],
  ontvangen: ['gasten ontvangen', 'ontving, ontvangen'],
  innemen: ['veel ruimte innemen', 'nam in, ingenomen'],
  opzeggen: ['een gedicht opzeggen', 'zegde op, opgezegd'],
  aansluiten: ['zich aansluiten bij', 'sloot aan, aangesloten'],
  ophalen: ['geld ophalen', 'haalde op, opgehaald'],
  werken: ['het werkt niet', 'werkte, gewerkt'],
  voelen: ['ik voel me goed', 'voelde, gevoeld'],
  kijken: ['naar de tv kijken', 'keek, gekeken'],
  spreken: ['iemand spreken', 'sprak, gesproken'],
  kennen: ['ik ken hem goed', 'kende, gekend'],
  krijgen: ['een cadeau krijgen', 'een kind krijgen', 'griep krijgen', 'kreeg, gekregen'],
  liggen: ['in bed liggen', 'het ligt aan jou', 'lag, gelegen'],
  'het deel': ['voor een deel', 'het eerste deel', 'deel uitmaken van'],
  steken: ['de bij steekt', 'stak, gestoken'],
  uitgaan: ['het licht gaat uit', 'ging uit, uitgegaan'],
  'de rekening': ['geld op je rekening', 'rekening houden met'],
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
