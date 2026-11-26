import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; f: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cardsOf = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
const deck = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const LANGS = ['ru', 'en', 'es', 'pt', 'ro', 'tr'] as const;
const overlays = Object.fromEntries(LANGS.filter(lang => lang !== 'ru').map(lang => [lang,
  (JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')) as { cards: Record<string, string[]> }).cards]));
const frontIn = (lang: string, card: Card) => (lang === 'ru' ? card.f : overlays[lang]![card.id]![0]!);

/** The front's senses, split at `; ` and at `, ` outside brackets. */
const piecesOf = (front: string) => front.split(/; |, (?![^(]*\))/).map(piece => piece.trim());
/** A Russian form's word, its pronoun and `!` aside: «я есть» is «есть». */
const wordOf = (piece: string) => piece.toLowerCase().replace(/^(что )?(я|ты|он|она|оно|мы|вы|они) /, '').replace(/!$/, '');
/** A phrase's front is one sense, its commas included: «счёт, пожалуйста». */
const isPhrase = (card: Card) => /[ ,.!?]/.test(card.b.replace(/^(de|het) /, ''));
const sensesOf = (lang: string, card: Card) => (isPhrase(card) ? [frontIn(lang, card)] : piecesOf(frontIn(lang, card)));

/** Words with several common senses in that language: alone on a front they do not say which one the card asks for. */
const AMBIGUOUS: Record<string, Record<string, string>> = {
  ru: {
    'уход': 'забота или уходить',
    'мука': 'для выпечки или страдание',
    'колонка': 'звуковая, газетная, столбец',
    'печать': 'штамп или вывод на бумагу',
    'плита': 'кухонная или каменная',
    'краны': 'водопроводные или подъёмные',
    'почка': 'орган или на ветке',
    'лёгкое': 'орган или нетрудное',
    'передача': 'в машине, по ТВ, вручение',
    'парить': 'в воздухе или паром',
    'пари': 'в воздухе или спор',
    'залог': 'денежный или грамматический',
    'сдаётся': 'в аренду или уступает',
    'набирать': 'на клавиатуре, вес, людей',
    'загружать': 'груз, деньги, файл',
    'напоминать': 'о чём-то или быть похожим',
    'откладывать': 'на потом или копить',
    'краситься': 'косметикой или о волосах',
    'перемена': 'изменение или на уроках',
    'дух': 'разум или привидение',
    'число': 'в математике или дата',
    'правый': 'о стороне или правота',
    'предложение': 'фраза или оффер',
    'предмет': 'вещь или школьный',
    'бросать': 'кидать или прекращать',
    'опыт': 'жизненный или эксперимент',
    'класс': 'школьный или отлично',
    'край': 'кромка или область',
    'карты': 'местности, игральные, банковские',
    'брак': 'супружество или дефект',
    'бросил': 'кинул или перестал',
    'бросить': 'кинуть или перестать',
    'вводить': 'новое, данные, лекарство',
    'вести': 'беседу, машину, за собой, учёт',
    'выходить': 'из дома, о книге, замуж',
    'гладить': 'утюгом или ладонью',
    'делать': 'заниматься или изготавливать',
    'дорогой': 'о цене или о человеке',
    'духи': 'парфюм или призраки',
    'есть': 'быть или кушать',
    'задавать': 'вопрос или урок',
    'задай': 'вопрос или урок',
    'задаёт': 'вопрос или урок',
    'заходить': 'внутрь или в гости',
    'замок': 'дверной или дворец',
    'звать': 'голосом или по имени',
    'карта': 'местности, банковская, игральная',
    'кисть': 'для краски или руки',
    'ключ': 'от замка, гаечный, родник',
    'команда': 'группа людей или приказ',
    'кран': 'водопроводный или подъёмный',
    'курс': 'обучения, валют, корабля',
    'мир': 'Земля или не война',
    'нести': 'в руках или яйца, чепуху',
    'носить': 'одежду или в руках',
    'остановка': 'транспорта или прекращение',
    'отдел': 'магазина или учреждения',
    'палец': 'на руке или на ноге',
    'пальцы': 'на руке или на ноге',
    'переходить': 'улицу или к другому',
    'печка': 'для отопления или для еды',
    'печь': 'выпекать или печка',
    'подходить': 'по размеру или приближаться',
    'пол': 'в комнате или мужской, женский',
    'полоса': 'линия, дорожная, газетная',
    'представлять': 'знакомить или воображать',
    'принимать': 'предложение, лекарство, гостей',
    'приставка': 'в слове или игровая',
    'проходить': 'мимо, о боли, о времени',
    'пробка': 'на дороге или от бутылки',
    'проводить': 'линию, время, гостей',
    'раз': 'случай или единица счёта',
    'решать': 'задачу или принимать решение',
    'ручка': 'для письма или дверная',
    'садится': 'на стул или в транспорт',
    'садиться': 'на стул или в транспорт',
    'сварил': 'суп или кофе',
    'свет': 'освещение или мир',
    'сдавать': 'экзамен, вещь, квартиру',
    'сдать': 'экзамен, вещь, квартиру',
    'сел': 'на стул или в транспорт',
    'сели': 'на стул или в транспорт',
    'снимал': 'жильё, одежду, фото',
    'снимать': 'жильё, одежду, фото',
    'собирать': 'коллекцию, вещи, урожай',
    'сон': 'отдых или сновидение',
    'среда': 'день недели или окружение',
    'считаешь': 'полагаешь или числа',
    'считать': 'полагать или числа',
    'считаю': 'полагаю или числа',
    'счёт': 'к оплате, банковский, в игре',
    'тема': 'разговора, праздника, урока',
    'тройка': 'группа из трёх или оценка',
    'убирать': 'по местам, прочь, мыть, урожай',
    'успеть': 'на поезд или сделать',
    'ухаживать': 'заботиться или за девушкой',
    'участок': 'земельный или полиции',
    'форма': 'очертание, одежда, бланк',
    'чистить': 'щёткой, овощи, мыть',
  },
  en: {
    'course': 'of study, of a meal, of a ship',
    'form': 'shape or a paper to fill in',
    'to catch': 'a train or a ball',
    'to draw': 'a line or a picture',
    'to pass': 'an exam or a car',
  },
  es: {
    'alcanzar': 'el tren o un objeto',
    'aprobar': 'un examen o una ley',
    'caro': 'de precio o querido',
    'cuenta': 'para pagar o bancaria',
    'curso': 'de formación o escolar, del río',
    'equipo': 'de personas o aparatos',
    'forma': 'figura o manera',
    'hacer': 'una actividad o producir',
    'llave': 'de cerradura, grifo, herramienta',
    'pasarse': 'el dolor, el tiempo, de la raya',
    'ordenar': 'poner en su sitio o mandar',
    'parada': 'de autobús o detención',
    'sección': 'de una tienda o de un texto',
    'trazar': 'una línea o un plan',
  },
  pt: {
    'alcançar': 'o trem ou um objeto',
    'caro': 'de preço ou querido',
    'chamar': 'em voz alta ou dar nome',
    'chave': 'de fechadura ou ferramenta',
    'conta': 'para pagar ou bancária',
    'curso': 'de formação ou do rio',
    'fazer': 'uma atividade ou produzir',
    'forma': 'formato ou molde',
    'passar': 'numa prova, a ferro, o tempo',
    'servir': 'no tamanho ou à mesa',
    'seção': 'de uma loja ou de um texto',
    'traçar': 'uma linha ou um plano',
  },
  ro: {
    'a chema': 'cu glas tare sau a numi',
    'a călca': 'cu fierul sau cu piciorul',
    'a face': 'o activitate sau a produce',
    'a prinde': 'trenul sau o minge',
    'a promova': 'examenul sau un produs',
    'a trece': 'pe lângă, despre durere, timpul',
    'a purta': 'haine sau în mâini',
    'cheie': 'de la ușă sau unealtă',
    'deget': 'de la mână sau de la picior',
    'degete': 'de la mână sau de la picior',
    'curs': 'de formare, valutar, al râului',
    'formă': 'contur sau formular',
    'scump': 'ca preț sau drag',
    'subiect': 'gramatical sau temă',
    'temă': 'de discuție sau pentru acasă',
  },
  tr: {
    'anahtar': 'kapı veya elektrik',
    'geçmek': 'sınavı veya bir yerden',
    'hesap': 'ödenecek veya banka, matematik',
    'takım': 'ekip veya set, elbise',
    'tema': 'parti veya müzik',
    'toplamak': 'ortalığı, bir araya, matematik',
    'yapmak': 'bir işle uğraşmak veya üretmek',
    'yetişmek': 'trene veya büyümek',
    'çizmek': 'çizgi veya resim',
  },
};

/** The base card a form, plural, diminutive or imperative is made from. */
const baseOf = (card: Card) => (card.n ?? '').match(/(?:^|; )(?:форма от|мн\. ч\. от|уменьш\. от|просьба\/приказ, от): (.+?) \(/)?.[1];
const byDutch = new Map(deck.map(card => [card.b, card]));
const hintedWord = (lang: string, base: Card) => sensesOf(lang, base).some(piece => piece.replace(/ \(.*$/, '') in AMBIGUOUS[lang]!);
// A form whose own words already say which sense it is, in one language (`lang:dutch`) or in all (`dutch`).
const CLEAR = new Set([
  'ru:ik heb gebakken', // «я испёк»: только выпекать
  'hij is gehaald', // pulled out, picked up
  'ru:het keertje', // «разок»
  'ru:het groepje', // «группка»
  'ru:het zegeltje', // «наклейка»
  'ru:ik leg', // «я кладу»
  'ru:jij spaart', // «ты копишь»
  'tr:jij spaart', // biriktiriyorsun
  'voer telefoongesprekken', // the object says it: phone calls
  'noem de film', // name the film
  'pt:jij strijkt', 'pt:ik strijk', 'pt:ik heb gestreken', // passar roupa
  'hij eet', 'ik eet', 'wij aten', 'ik heb gegeten', 'jij hebt gegeten', 'ze hebben gegeten', // «ест», «ел»: только кушать
  'hij vindt', 'u vindt', 'zij vinden', 'ik heb gevonden', 'wij hebben gevonden', 'zij vinden het leuk', // находить, нравиться
  'hij stelt de vraag', // the object says it: the question
  'ru:hij heeft gemaakt', // «приготовил»
  'es:hij pakt', 'pt:hij pakt', // agarra, pega
  'pt:zet', 'ro:zet', 'ro:ik zet', 'pt:jij hebt gezet', 'ro:jij hebt gezet', // pôr, a pune
]);

const noteIn = (lang: string, card: Card) => (lang === 'ru' ? card.n : overlays[lang]![card.id]![3]) ?? '';
const cardOf = (dutch: string) => byDutch.get(dutch) ?? byDutch.get(`de ${dutch}`) ?? byDutch.get(`het ${dutch}`);
/** `doen (делать)` in a note: a word with its gloss, one level of brackets inside. */
const GLOSS = /(?<![^\s:;,+])([a-z][a-z'-]*(?: [a-z][a-z'-]*)?) \(((?:[^()]|\([^()]*\))*)\)/g;

describe.each(LANGS)('a note in %s', (lang) => {
  it("glosses a card's ambiguous word with its hint", () => {
    const bare = deck.flatMap(card => [...noteIn(lang, card).matchAll(GLOSS)].filter(([, word, gloss]) => {
      const named = cardOf(word!);
      return named && (isPhrase(named) ? [gloss!] : piecesOf(gloss!)).some(piece => wordOf(piece) in AMBIGUOUS[lang]!);
    }).map(([match]) => `${card.b}: ${match}`));
    expect(bare).toEqual([]);
  });
});

describe.each(LANGS)('a front in %s', (lang) => {
  it('gives an ambiguous word a hint', () => {
    const bare = deck.filter(card => !/^-|-$/.test(card.b)).flatMap(card => sensesOf(lang, card)
      .filter(piece => wordOf(piece) in AMBIGUOUS[lang]!).map(piece => `${card.b}: ${piece}`));
    expect(bare).toEqual([]);
  });

  it('of a form gives a hint when its base needs one', () => {
    const bare = deck.filter((card) => {
      const base = byDutch.get(baseOf(card) ?? '');
      return base && hintedWord(lang, base) && !frontIn(lang, card).includes('(') && !CLEAR.has(`${lang}:${card.b}`) && !CLEAR.has(card.b);
    }).map(card => `${card.b}: ${frontIn(lang, card)}`);
    expect(bare).toEqual([]);
  });
});
