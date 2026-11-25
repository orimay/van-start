import { describe, expect, it } from 'vitest';
import { diffLetters, isCorrect, soundsLike } from './answer';

const LENIENT = { ignoreCase: true, ignoreMarks: true };
const STRICT = { ignoreCase: false, ignoreMarks: false };

describe('isCorrect', () => {
  it('accepts the exact answer', () => {
    expect(isCorrect('de kat', 'de kat', STRICT)).toBe(true);
  });

  it('accepts any letter case when told to', () => {
    expect(isCorrect('De Kat', 'de kat', LENIENT)).toBe(true);
    expect(isCorrect('De Kat', 'de kat', STRICT)).toBe(false);
  });

  it('accepts letters without marks when told to', () => {
    expect(isCorrect('een', 'één', LENIENT)).toBe(true);
    expect(isCorrect('een', 'één', STRICT)).toBe(false);
  });

  it('accepts each comma-separated variant and the whole line', () => {
    expect(isCorrect('de mail', 'de e-mail, de mail')).toBe(true);
    expect(isCorrect('de e-mail, de mail', 'de e-mail, de mail')).toBe(true);
  });

  it('ignores hints in brackets, extra spaces and trailing punctuation', () => {
    expect(isCorrect('  hoe  gaat het ?', 'hoe gaat het (informeel)?')).toBe(true);
  });

  it('treats typographic apostrophes as plain ones', () => {
    expect(isCorrect("z'n", 'z’n')).toBe(true);
  });

  it('rejects an empty answer', () => {
    expect(isCorrect('', 'de kat', LENIENT)).toBe(false);
  });

  it('counts a hyphen however lenient', () => {
    expect(isCorrect('terug', 'terug-', LENIENT)).toBe(false);
    expect(isCorrect('terug-', 'terug', LENIENT)).toBe(false);
  });

  it('rejects a different word', () => {
    expect(isCorrect('de hond', 'de kat', LENIENT)).toBe(false);
  });
});

describe('diffLetters', () => {
  const show = (input: string, answer: string) =>
    diffLetters(input, answer).map(l => ({ ok: l.char, extra: `[${l.char}]`, missing: '_' })[l.kind]).join('').replace(/\]\[/g, '');

  it('keeps as many letters as can match', () => {
    expect(show('inschrivingen', 'inschrijven')).toBe('inschri_v[ing]en');
  });

  it('strikes a wrong letter, then gives the right one, against the closest variant', () => {
    expect(show('de mael', 'de e-mail, de mail')).toBe('de ma[e]_l');
  });

  it('keeps the letters after a missing one in line', () => {
    expect(show('de anvraagvormuleeren', 'de aanvraagformulieren')).toBe('de a_nvraag[v]_ormul[e]_eren');
  });

  it('keeps the letters after an extra one in line', () => {
    expect(show('het huuis', 'het huis')).toBe('het hu[u]is');
  });

  it('marks what is missing at the end', () => {
    expect(show('het hu', 'het huis')).toBe('het hu__');
  });

  it.each([
    ['naar vakantie gaan', 'op vakantie gaan', '[naar]__ vakantie gaan'],
    ['velicitieren', 'feliciteren', '[v]_elicit[i]eren'],
    ['de doeche', 'de douche', 'de do[e]_che'],
    ['de winkel', 'de wagen', 'de w[ink]__e[l]_'],
    ['kxyzt', 'kat', 'k[xyz]_t'],
  ])('strikes the wrong letters of %s, then gives the right ones of %s', (input, answer, shown) => {
    expect(show(input, answer)).toBe(shown);
  });

  it('ignores letter case', () => {
    expect(show('Het Huis', 'het huis')).toBe('Het Huis');
  });
});

describe('sounding the same', () => {
  it.each([
    ['het hard', 'het hart'],
    ['houd', 'hout'],
    ['het pont', 'het pond'],
    ['ik wordt', 'ik word'],
    ['mei', 'mij'],
    ['de bouw', 'de bauw'],
  ])('holds for %s and %s', (input, answer) => {
    expect(soundsLike(input, answer)).toBe(true);
  });

  it.each([
    ['de echtgenote', 'de echtgenoten'],
    ['t', 'd'],
    ['de hart', 'het hart'],
    ['dat', 'dag'],
  ])('does not hold for %s and %s', (input, answer) => {
    expect(soundsLike(input, answer)).toBe(false);
  });

  it('takes each variant of the answer', () => {
    expect(soundsLike('het hard', 'het hart, het hartje')).toBe(true);
  });
});
