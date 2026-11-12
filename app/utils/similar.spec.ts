import { describe, expect, it } from 'vitest';
import { lookalikes } from './similar';
import { seeded } from './random';

const words = (...answers: string[]) => answers.map(answer => ({ id: answer, answer }));
const pick = (answer: string, pool: { id: string; answer: string }[], known: string[] = pool.map(c => c.id)) =>
  lookalikes(answer, pool, { count: 3, isKnown: id => known.includes(id), random: seeded('t') }).map(c => c.answer);

describe('lookalikes', () => {
  it('prefer words with the same start and end', () => {
    expect(pick('zeven', words('de appel', 'geven', 'het boek', 'leven', 'rood', 'zweven', 'de straat'))).toEqual(expect.arrayContaining(['geven', 'leven', 'zweven']));
  });

  it('look past the article', () => {
    expect(pick('het bericht', words('het gewicht', 'de fiets', 'het gezicht', 'lopen', 'het gedicht', 'de melk'))).toEqual(expect.arrayContaining(['het gewicht', 'het gezicht', 'het gedicht']));
  });

  it('skip phrases and forms built on the word itself', () => {
    expect(pick('koud', words('het is koud', 'koude', 'goud', 'houd', 'oud', 'de kat'))).toEqual(expect.arrayContaining(['goud', 'houd', 'oud']));
  });

  it('skip the same answer and single letters', () => {
    expect(pick('de wijn', words('de wijn', 'w', 'ij', 'de lijn', 'de pijn', 'de wijk', 'het huis'))).toEqual(expect.arrayContaining(['de lijn', 'de pijn', 'de wijk']));
  });

  it('prefer known words when unknown ones look alike as much', () => {
    expect(pick('zeven', words('geven', 'leven', 'beven', 'heven', 'de appel', 'het boek', 'rood'), ['heven', 'de appel', 'het boek', 'rood'])).toContain('heven');
  });

  it('still take unknown lookalikes over unrelated known words', () => {
    expect(pick('zeven', words('geven', 'leven', 'zweven', 'de appel', 'het boek', 'rood'), ['de appel', 'het boek', 'rood'])).toEqual(expect.arrayContaining(['geven', 'leven', 'zweven']));
  });

  it('fill up with unrelated words when lookalikes run out', () => {
    expect(pick('zeven', words('de appel', 'het boek'))).toHaveLength(2);
  });

  it('repeat for the same random seed', () => {
    const pool = words('geven', 'leven', 'beven', 'heven', 'weven');
    const run = (seed: string) => lookalikes('zeven', pool, { count: 2, isKnown: () => true, random: seeded(seed) });
    expect(run('a')).toEqual(run('a'));
  });
});
