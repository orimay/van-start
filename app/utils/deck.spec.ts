import { describe, expect, it, vi } from 'vitest';
import { cardsOf, linkable, splitAffix, toStudyCard } from './deck';
import { play } from './play';
import { speak } from './speak';

vi.mock('./play', async importOriginal => ({ ...(await importOriginal<typeof import('./play')>()), play: vi.fn() }));

describe('the affix part of a word', () => {
  it('counts letters only, past brackets and stress', () => {
    expect(splitAffix('sáamu(n)vurkuh(n)', 6, true)).toEqual(['', 'sáamu(n)', 'vurkuh(n)']);
  });

  it('counts a suffix by letters only', () => {
    expect(splitAffix('bewóne(n)', 2, false)).toEqual(['bewón', 'e(n)', '']);
  });
});

describe('a sound card', () => {
  const sound = toStudyCard({ id: 'u', f: 'звук ү, как в нидерландском слове «автобус»', b: 'u', tr: 'ү', au: 'u-clip', xb: 'de zus, de bus', xm: 'de z[u]s, de b[u]s', xt: 'дэ з[ү]с, дэ б[ү]с', axb: 'zus-clip', k: 'sound' });
  const letter = toStudyCard({ id: 'l', f: 'буква «үү»', b: 'u', tr: 'үү', au: 'u-clip', xb: 'de bus', xm: 'de b[u]s', axb: 'bus-clip' });

  it('is told from a letter card', () => {
    expect([sound.sound, letter.sound]).toEqual([true, undefined]);
  });

  it('voices its example words, never the letter', () => {
    speak(sound);
    expect(vi.mocked(play).mock.calls.at(-1)![0].split('/').at(-1)).toEqual('zus-clip.mp3');
  });

  it('is transcribed by its example words, the sound marked in them', () => {
    expect([sound.nl, sound.tr, sound.marks]).toEqual(['de zus, de bus', 'дэ зүс, дэ бүс', { nl: 'de z[u]s, de b[u]s', tr: 'дэ з[ү]с, дэ б[ү]с' }]);
  });
});

describe('a letter card', () => {
  it('keeps its own voice and name, the letter marked in its example', () => {
    const letter = toStudyCard({ id: 'l', f: 'буква «үү»', b: 'u', tr: 'үү', au: 'u-clip', xb: 'de bus', xm: 'de b[u]s', axb: 'bus-clip' });
    expect([letter.nl, letter.tr, letter.audio, letter.marks]).toEqual(['u', 'үү', 'u-clip', { nl: 'de b[u]s' }]);
  });
});

describe('an affix card', () => {
  const affix = toStudyCard({ id: 'be', f: 'acting on someone', b: 'be-', tr: 'bu', au: 'be-clip', xb: 'bewonen', xt: 'buvónun', xf: 'to inhabit', axb: 'bewonen-clip' });

  it('is transcribed by its example word, its own transcription kept to mark it', () => {
    expect([affix.tr, affix.affix]).toEqual(['buvónun', { dutch: 'be-', tr: 'bu' }]);
  });

  it('shows the affix with its example word', () => {
    expect([affix.answer, affix.answerExample]).toEqual(['be-', 'bewonen']);
  });

  it('voices its example word, never the affix', () => {
    speak(affix);
    expect(vi.mocked(play).mock.calls.map(([url]) => url.split('/').at(-1))).toEqual(['bewonen-clip.mp3']);
  });
});

/** English, Spanish, Portuguese and Romanian show the article in the translation, so their note leaves out the Russian article items. */
describe('a translated phrase note without the article items', () => {
  const card = toStudyCard({
    id: 'tocht', f: 'to go on a bike ride', b: 'een fietstocht maken',
    n: 'cycling tour; from: tocht (trip)',
    nr: 'велопрогулка; от: de fiets (велосипед) + de tocht (поездка); een fietstocht: одно из многих или названо впервые, а уже известное — de fietstocht',
  });

  it('reads its items by their Russian twins', () => {
    expect(card.promptKinds).toEqual(['rule', 'origin']);
  });

  it('hides an item whose Russian twin names Dutch', () => {
    expect(card.promptSecret).toEqual([false, true]);
  });
});

/** A phrase's own leading article shows in the translation too, so its Russian item is left out with the rest. */
describe('a translated phrase note without the leading article item', () => {
  const card = toStudyCard({
    id: 'verkopers', f: 'the salespeople in the store', b: 'de verkopers in de winkel',
    n: 'from: verkopen (to sell)',
    nr: 'от: verkopen (продавать); de winkel: то самое, известное обоим; de verkopers: уточнено, чьё или какое — всегда определённый артикль',
  });

  it('reads its items by their Russian twins', () => {
    expect(card.promptKinds).toEqual(['origin']);
  });
});

describe('the old roots of a course', () => {
  const course = { id: 'root', name: 'Course', cards: [{ id: 'gemak', f: 'лёгкость', b: 'het gemak' }], roots: [{ id: 'mak', f: 'ручной', b: 'mak', k: 'root' as const }] };

  it('are no cards of the course', () => {
    expect(cardsOf(course).map(c => c.b)).toEqual(['het gemak']);
  });

  it('are linkable after its cards', () => {
    expect(linkable(course).map(c => c.b)).toEqual(['het gemak', 'mak']);
  });
});
