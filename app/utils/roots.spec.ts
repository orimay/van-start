import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardsOf, linkable, type DeckCard, type DeckNode } from './deck';
import { buildIndex, linkSegments } from './links';

const deck = JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode;
const roots = deck.roots ?? [];
const LANGS = ['en', 'es', 'pt', 'tr', 'ro'];
const overlays: Record<string, Record<string, string[]>> = Object.fromEntries(
  LANGS.map(lang => [lang, JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards]));
/** The deck as a learner of a language reads it: front and note from the overlay. */
const readIn = (lang: string): DeckCard[] => linkable(deck).map(card => lang === 'ru' ? card
  : { ...card, f: overlays[lang]![card.id]?.[0] ?? card.f, n: overlays[lang]![card.id]?.[3] ?? '' });
const byWord = new Map(cardsOf(deck).map(card => [card.b, card]));

// Each old root, with the course words whose notes derive from it
const DERIVED: Record<string, string[]> = {
  'moeten': ['ontmoeten'], 'ant-': ['het antwoord'], '-woord': ['tegenwoordig'], 'ginnen': ['beginnen'],
  'meen': ['gemeen'], 'geten': ['vergeten'], 'mak': ['het gemak'], 'wed': ['de wedstrijd'], 'gaderen': ['vergaderen'],
  'liezen': ['verliezen'], 'lijk': ['gelijk'], 'derven': ['bederven'], 'reed': ['gereed'],
  'de rede': ['de directe rede', 'de indirecte rede'], 'waren': ['bewaren'], 'wegen': ['bewegen'], 'dwijnen': ['verdwijnen'],
  'geschieden': ['de geschiedenis'], 'walden': ['het geweld'], 'inner': ['herinneren'], 'eer': ['eergisteren'],
  'vro': ['vrolijk'], 'stede': ['besteden'], 'wezen': ['aanwezig'], 'loven': ['beloven'], 'reiden': ['bereiden'],
  'langen': ['het belang'], 'verrukken': ['verrukkelijk'],
  'des': ["'s ochtends", "'s middags", "'s avonds", "'s nachts"], 'der': ['inderdaad'], 'den': ['ten slotte', 'ten oosten van'],
  'achten': ['geachte'], 'baren': ['geboren'], 'verlijden': ['het verleden'], 'beroeren': ['beroerd'], 'wonden': ['gewond'],
  'inwikkelen': ['ingewikkeld'], 'inbegrijpen': ['inbegrepen'],
  'de gezel': ['gezellig'], 'dulden': ['het geduld'], 'schuw': ['de afschuw'], 'makelen': ['de makelaar'],
};
// An old word named outside a link: `moeten — старое «встречать»`, `wed is old "wager"`, `ten es el antiguo te den`
const UNLINKED_OLD = /(^|; )[\w'-]+ (—|=|is|es|é|e|este)( el| o| the| vechiul)? (old|antiguo|antigo|eski|vechi|старое)|(old word for|старое -|old -|antiguo -|antigo -|eski -|vechiul -)/;

describe('an old root', () => {
  it.each(Object.keys(DERIVED))('%s is a root card', (word) => {
    expect(roots.find(root => root.b === word)).toMatchObject({ k: 'root', au: expect.any(String) });
  });

  it('is read in every language', () => {
    const unread = roots.flatMap(root => [
      ...(root.f && root.tr ? [] : [`${root.b} ru`]),
      ...LANGS.filter(lang => !overlays[lang]![root.id]?.[0] || !overlays[lang]![root.id]?.[2]).map(lang => `${root.b} ${lang}`),
    ]);
    expect(unread).toEqual([]);
  });

  it('is no card of the course', () => {
    expect(roots.filter(root => cardsOf(deck).some(card => card.id === root.id)).map(root => root.b)).toEqual([]);
  });

  it.each(['ru', ...LANGS])('opens from the note of every word derived from it in %s', (lang) => {
    const cards = readIn(lang);
    const index = buildIndex(cards);
    const unlinked = Object.entries(DERIVED).flatMap(([word, derived]) => {
      const root = roots.find(r => r.b === word);
      return derived.filter((b) => {
        const card = cards.find(c => c.id === byWord.get(b)!.id)!;
        const links = (card.n ?? '').split('\n').flatMap(line => line.replace(/^!/, '').split('; '))
          .flatMap(item => linkSegments(item, index, card.id)).map(segment => segment.link);
        return !root || !links.includes(root.id);
      }).map(b => `${b} -> ${word}`);
    });
    expect(unlinked).toEqual([]);
  });

  it.each(['ru', ...LANGS])('is never named unlinked in %s', (lang) => {
    const named = readIn(lang).filter(card => UNLINKED_OLD.test(card.n ?? '')).map(card => `${card.b}: ${card.n}`);
    expect(named).toEqual([]);
  });
});
