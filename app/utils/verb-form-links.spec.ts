import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formsOf } from '@/utils/verb-forms';

type Card = { id: string; b: string; f: string; n?: string; p?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cardsOf = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
const deck = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const itemsOf = (note: string) => note.split('\n').flatMap(line => line.replace(/^!/, '').split('; '));
const spelling = (b: string) => b.toLowerCase().replace(/[?!.]$/, '');

/** How each language says a card is a form of, or comes from, a word: `форма от: nemen (брать)`. */
const LABEL: Record<string, string> = { ru: 'от', en: '(?:of|from)', es: 'de', pt: 'de', tr: '(?:biçimi|kökü)', ro: '(?:lui|de la)' };
const noteIn = (lang: string): ((card: Card) => string) => {
  if (lang === 'ru') return card => card.n ?? '';
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => rows[card.id]?.[3] ?? '';
};
const words = (s: string) => s.split(' ');
/** `vrij zijn` names `zijn`, and `zich voorstellen` names `voorstellen`. */
const overlaps = (a: string, b: string) => words(a).every(w => words(b).includes(w)) || words(b).every(w => words(a).includes(w));
const names = (note: string, lang: string, verb: string) => {
  const item = new RegExp(`^(?:.{0,60} )?${LABEL[lang]}: (.+?) \\(`);
  return itemsOf(note).some(i => {
    const named = i.match(item)?.[1];
    return named !== undefined && overlaps(named, verb);
  });
};
// Spelled like a verb form, but another word: het (heten), het hout (houden), laat (laten), vier (vieren), gewond (wonden, not wonen), bestaan (its own verb), vraag aan (vragen aan, not aanvragen), ruim (the adjective ruimen comes from).
const NOT_A_FORM = [
  'het', 'met', 'hoor', 'pas', 'laat', 'vier', 'los', 'open', 'duur', 'droog', 'heet', 'lijk', 'gezond', 'gewond', 'bestaan', 'ruim',
  'het ontbijt', 'het hout', 'met je', 'vraag aan',
];

/** A dictionary verb: its front opens on a Russian infinitive (сдаться), not a form (я сдался) or a request (сдайся!). */
const INFINITIVE = /^[а-яё-]+(ть|ти|чь)(ся|сь)?(?=[\s,;:(]|$)/;
const verbs = deck.filter(c => c.p === 'verb' && INFINITIVE.test(c.f) && !c.f.includes('!'));
const formsByVerb = new Map(verbs.map(v => [v.b, formsOf(v.b.toLowerCase())]));
/** The verbs a card is a form of. */
const verbsOf = (card: Card) => verbs.filter(v => v.id !== card.id && formsByVerb.get(v.b)!.has(spelling(card.b))).map(v => v.b);
const forms = deck.filter(card => !NOT_A_FORM.includes(card.b)).map(card => ({ card, of: verbsOf(card) })).filter(f => f.of.length);

/** hij stelt de vraag holds hij stelt, a form of stellen. */
const holdsForm = (card: Card, verb: string) =>
  [...formsByVerb.get(verb)!.keys()].some(form => words(form).every(w => words(spelling(card.b)).includes(w)));

describe('a verb form', () => {
  it.each(Object.keys(LABEL))('names its verb in %s', (lang) => {
    const note = noteIn(lang);
    expect(forms.filter(({ card, of }) => !of.some(v => names(note(card), lang, v))).map(({ card, of }) => `${card.b} ← ${of.join(' / ')}`)).toEqual([]);
  });

  it('is named the form only of a verb it is a form of', () => {
    const FORM = /^(форма|прошедшее[^:]*|просьба\/приказ,) от: (.+?) \(/;
    const byB = new Map(verbs.map(v => [v.b, v]));
    const wrong = deck.flatMap(card =>
      itemsOf(card.n ?? '').flatMap(i => {
        const verb = i.match(FORM)?.[2];
        return verb && byB.has(verb) && !holdsForm(card, verb) ? [`${card.b} → ${verb}`] : [];
      }),
    );
    expect(wrong).toEqual([]);
  });

  it('is reviewed as not a form only while it is spelled like one', () => {
    expect(NOT_A_FORM.filter(b => !deck.some(card => card.b === b && verbsOf(card).length))).toEqual([]);
  });
});
