import { describe, expect, it } from 'vitest';
import { formsOf } from '@/utils/verb-forms';

describe('the forms of a verb', () => {
  it.each([
    ['nemen', ['hij neemt', 'ik neem', 'neem', 'ik nam', 'wij namen', 'ik heb genomen', 'genomen', 'wij nemen']],
    ['pakken', ['hij pakt', 'pak', 'ik pakte', 'gepakt']],
    ['zijn', ['ik ben', 'jij bent', 'hij is', 'u bent', 'ben je', 'ik was', 'ik ben geweest']],
    ['kunnen', ['ik kan', 'u kunt', 'u kan', 'kun jij']],
    ['leven', ['ik leef', 'hij leeft', 'hij leefde']],
    ['wandelen', ['ik wandel', 'hij wandelt']],
    ['aankomen', ['hij komt aan', 'zij komen aan', 'aangekomen', 'ik ben aangekomen']],
    ['bespreken', ['hij bespreekt', 'besproken']],
    ['zich aankleden', ['zij kleden zich aan', 'hij kleedt zich aan']],
    ['horen bij', ['hij hoort bij']],
    ['de bus nemen', ['hij neemt de bus']],
    ['gaan zitten', ['hij gaat zitten', 'ga zitten']],
    ['gaan', ['ik ga', 'ga', 'ga jij']],
    ['kennismaken', ['hij maakt kennis', 'wij maken kennis']],
    ['deelnemen', ['hij neemt deel']],
    ['staan', ['sta', 'ik sta']],
    ['houden van', ['ik hou van', 'ik houd van']],
    ['zich inschrijven', ['ik schrijf me in', 'wij schrijven ons in', 'hij schrijft zich in']],
    ['zich voorstellen', ['stel je voor', 'ik stel me voor']],
    ['uitgaan', ['hij uitgaat', 'wij uitgaan']],
    ['zich aankleden', ['hij zich aankleedt']],
  ])('of %s hold the ones it is written as', (verb, written) => {
    const forms = formsOf(verb);
    expect(written.filter(f => !forms.has(f))).toEqual([]);
  });

  it('leave the verb itself out', () => {
    expect(formsOf('nemen').has('nemen')).toBe(false);
  });
});
