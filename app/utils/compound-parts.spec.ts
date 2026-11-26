import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardsOf, type DeckNode } from './deck';

const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode);
const byDutch = new Map(cards.map(c => [c.b, c]));
const LANGS = ['ru', 'en', 'es', 'pt', 'tr', 'ro'] as const;
const rowsOf = (lang: string): Record<string, string[]> => JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
const ROWS = Object.fromEntries(LANGS.filter(lang => lang !== 'ru').map(lang => [lang, rowsOf(lang)]));
const FROM: Record<string, string> = { ru: 'от', en: 'from', es: 'deriva de', pt: 'deriva de', tr: 'kökü', ro: 'de la' };
const CONFUSE: Record<string, string> = { ru: 'не путать с', en: "don't confuse with", es: 'no confundir con', pt: 'não confundir com', tr: 'karıştırma', ro: 'a nu se confunda cu' };

/** Each compound or derived word and the cards it is built from, in order. */
const PARTS: Array<[string, string[]]> = [
  ['de bijslag', ['bij-', 'de slag']],
  ['de toeslag', ['toe-', 'de slag']],
  ['de uitslag', ['uit-', 'de slag']],
  ['de hagelslag', ['de hagel', 'de slag']],
  ['de slagroom', ['slaan', 'de room']],
  ['de slager', ['slaan', '-er']],
  ['de uitkering', ['uitkeren', '-ing']],
  ['de laboratoriumuitslag', ['het laboratorium', 'de uitslag']],
  ['het identiteitsbewijs', ['de identiteit', 'het bewijs']],
  ['het legitimatiebewijs', ['de legitimatie', 'het bewijs']],
  ['de zalmmoot', ['de zalm', 'de moot']],
  ['de vleeswaren', ['het vlees', 'de waren']],
  ['het bladerdeeg', ['het blad', 'het deeg']],
  ['de vuilniszak', ['het vuilnis', 'de zak']],
  ['het scheerschuim', ['scheren', 'het schuim']],
  ['de douchegel', ['de douche', 'de gel']],
  ['de zelfscankassa', ['zelf', 'scannen', 'de kassa']],
  ['de frituurolie', ['frituren', 'de olie']],
  ['de frituurpan', ['frituren', 'de pan']],
  ['de kauwgom', ['kauwen', 'de gom']],
  ['de elektronicazaak', ['de elektronica', 'de zaak']],
  ['het warenhuis', ['de waren', 'het huis']],
  ['de gordijnrail', ['het gordijn', 'de rail']],
  ['de woonboulevard', ['wonen', 'de boulevard']],
  ['de meubelboulevard', ['het meubel', 'de boulevard']],
  ['het boekenweekgeschenk', ['de boekenweek', 'het geschenk']],
  ['de stroopwafel', ['de stroop', 'de wafel']],
  ['het statiegeld', ['het geld']],
  ['de webwinkel', ['het web', 'de winkel']],
  ['de concertzaal', ['het concert', 'de zaal']],
  ['de stamppot', ['stampen', 'de pot']],
  ['de erwtensoep', ['de erwt', 'de soep']],
  ['het sushirestaurant', ['de sushi', 'het restaurant']],
  ['het currygerecht', ['de curry', 'het gerecht']],
  ['de chocolademousse', ['de chocolade', 'de mousse']],
  ['de garnalencocktail', ['de garnaal', 'de cocktail']],
  ['de lamsstoofschotel', ['het lam', 'stoven', 'de schotel']],
  ['de bosvruchten', ['het bos', 'de vrucht']],
  ['het klaslokaal', ['de klas', 'het lokaal']],
  ['het transportmiddel', ['het transport', 'het middel']],
  ['het combiticket', ['het ticket']],
  ['het vlinderpaviljoen', ['de vlinder', 'het paviljoen']],
  ['het sprookjesfiguur', ['het sprookje', 'het figuur']],
  ['de vrachtauto', ['de vracht', 'de auto']],
  ['de vrachtwagen', ['de vracht', 'de wagen']],
  ['het vliegticket', ['vliegen', 'het ticket']],
  ['de productiedatum', ['de productie', 'de datum']],
  ['de streamingdienst', ['de dienst']],
  ['de huursubsidie', ['de huur', 'de subsidie']],
  ['het rijtjeshuis', ['de rij', 'het huis']],
  ['de loopafstand', ['lopen', 'de afstand']],
  ['het zonnepaneel', ['de zon', 'het paneel']],
  ['de broodtrommel', ['het brood', 'de trommel']],
  ['de salontafel', ['de salon', 'de tafel']],
  ['de gootsteen', ['de goot', 'de steen']],
  ['de kapstok', ['de kap', 'de stok']],
  ['de antibioticakuur', ['de antibiotica', 'de kuur']],
  ['de bruistablet', ['bruisen', 'de tablet']],
  ['de tijmolie', ['de tijm', 'de olie']],
  ['de animatievideo', ['de animatie', 'de video']],
  ['de vliegtuigcrash', ['het vliegtuig', 'de crash']],
  ['het fantasieboek', ['de fantasie', 'het boek']],
  ['de zeilboot', ['zeilen', 'de boot']],
  ['de spoorwegmaatschappij', ['de spoorweg', 'de maatschappij']],
  ['paardrijden', ['het paard', 'rijden']],
  ['de aardrijkskunde', ['de aarde', 'de kunde']],
  ['het minimumloon', ['het minimum', 'het loon']],
  ['het sollicitatiegesprek', ['de sollicitatie', 'het gesprek']],
  ['stampvol', ['stampen', 'vol']],
  ['doodmoe', ['dood', 'moe']],
  ['keihard', ['de kei', 'hard']],
  ['dolgraag', ['dol', 'graag']],
  ['eigenwijs', ['eigen', 'wijs']],
  ['het ogenblik', ['het oog', 'de blik']],
  ['terechtkomen', ['terecht', 'komen']],
  ['misgaan', ['mis', 'gaan']],
  ['kwijtraken', ['kwijt', 'raken']],
  ['stofzuigen', ['het stof', 'zuigen']],
  ['omcirkelen', ['om', 'de cirkel']],
  ['de werkzaamheden', ['werkzaam', '-heid']],
  ['voetballen', ['het voetbal']],
  ['de oliebol', ['de olie', 'de bol']],
  ['de bloesemboom', ['de bloesem', 'de boom']],
  ['tegelijk', ['te', 'gelijk']],
  ['niemand', ['niet', 'iemand']],
  ['nergens', ['niet', 'ergens']],
  ['volgens', ['volgen']],
  ['rechtstreeks', ['recht', 'de streek']],
  ['de fysiotherapeut', ['de therapeut']],
  ['tussenschools', ['tussen', 'de school']],
  ['de maandag', ['de maan', 'de dag']],
  ['de donderdag', ['de donder', 'de dag']],
];

const noteIn = (lang: string, dutch: string) => {
  const card = byDutch.get(dutch)!;
  return (lang === 'ru' ? card.n : ROWS[lang]![card.id]?.[3]) ?? '';
};
const itemsOf = (note: string) => note.split('\n').flatMap(line => line.replace(/^!/, '').split('; '));
const unglossed = (part: string) => part.replace(/ \((?:[^()]|\([^()]*\))*\)/g, '').replace(/:.*$/, '').trim();
/** The cards a note's from-item names: `от: a (…) + b (…)`. */
const partsIn = (lang: string, note: string) => itemsOf(note)
  .map(item => item.replace(/^(?:pl\. )?[mfn]\.(?:\/[mfn]\.)? /, '').replace(/^\d\) /, ''))
  .find(item => item.startsWith(`${FROM[lang]}: `))?.slice(FROM[lang]!.length + 2).split(' + ').map(unglossed) ?? [];
/** The cards a note's confuse-item names. */
const confusedIn = (lang: string, note: string) => itemsOf(note).find(item => item.startsWith(`${CONFUSE[lang]}: `))
  ?.slice(CONFUSE[lang]!.length + 2).split(/, (?![^(]*\))/).map(unglossed) ?? [];

describe('a compound', () => {
  it('is a card', () => {
    expect(PARTS.map(([compound]) => compound).filter(compound => !byDutch.has(compound))).toEqual([]);
  });

  it('is built from cards', () => {
    expect(PARTS.flatMap(([, parts]) => parts).filter(part => !byDutch.has(part))).toEqual([]);
  });

  it.each(LANGS)('names exactly its parts in %s', (lang) => {
    const wrong = PARTS.filter(([compound, parts]) => partsIn(lang, noteIn(lang, compound)).join(' + ') !== parts.join(' + '))
      .map(([compound, parts]) => ({ compound, expected: parts, named: partsIn(lang, noteIn(lang, compound)) }));
    expect(wrong).toEqual([]);
  });
});

describe('toeslag, bijslag and uitkering', () => {
  const THREE = ['de toeslag', 'de bijslag', 'de uitkering'];

  it.each(LANGS)('each name the other two as confusable in %s', (lang) => {
    const unnamed = THREE.flatMap(word => THREE.filter(other => other !== word && !confusedIn(lang, noteIn(lang, word)).includes(other)).map(other => `${word}: ${other}`));
    expect(unnamed).toEqual([]);
  });
});
