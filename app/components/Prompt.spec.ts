import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Prompt from './Prompt.vue';
import Toast from './Toast.vue';
import Answer from './Answer.vue';
import { flip, toStudyCard, type DeckCard } from '@/utils/deck';

const CARD = { id: 'c0', prompt: 'huis', answer: 'дом', promptExample: 'Een huis.' } as never;

afterEach(() => vi.unstubAllGlobals());

describe('a tap on a card text', () => {
  it('copies that text alone and says so', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const toast = await mountSuspended(Toast);
    const w = await mountSuspended(Prompt, { props: { card: CARD } });
    await w.get('[data-testid="prompt"]').trigger('click');
    await w.get('[data-testid="prompt-example"]').trigger('click');
    await flushPromises();
    expect(writeText.mock.calls).toEqual([['huis'], ['Een huis.']]);
    expect(toast.get('[data-testid="toast"]').text()).toBe('Copied');
  });
});

describe('a native note', () => {
  const card = { id: 'c1', f: 'язык', b: 'de taal', n: 'речь, не орган', xf: 'Язык Нидерландов.', xb: 'De taal van Nederland.' };

  it('stands apart from the example on the native prompt', async () => {
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(card) } });
    expect(w.get('[data-testid="prompt-note"]').text()).toBe('речь, не орган');
    expect(w.get('[data-testid="prompt-example"]').text()).toBe('Язык Нидерландов.');
  });

  it('is left off the Dutch prompt', async () => {
    const w = await mountSuspended(Prompt, { props: { card: flip(toStudyCard(card)) } });
    expect(w.find('[data-testid="prompt-note"]').exists()).toBe(false);
  });

  it('comes with the native answer', async () => {
    const w = await mountSuspended(Answer, { props: { card: flip(toStudyCard(card)), silent: true } });
    expect(w.get('[data-testid="answer-note"]').text()).toBe('речь, не орган');
  });
});

describe('a Dutch note', () => {
  const card = { id: 'c2', f: 'большой', b: 'grote', n: 'с -e: сразу за ним сущ.', nb: 'de grote man\nhet grote huis\neen groot huis' };

  it('comes with the Dutch answer, a line per example', async () => {
    const w = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
    expect(w.findAll('[data-testid="answer-note-line"]').map(l => l.text())).toEqual(['de grote man', 'het grote huis', 'een groot huis']);
  });

  it('is left off the native prompt', async () => {
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(card) } });
    expect(w.text()).not.toContain('grote man');
  });

  it('stands under the Dutch prompt, a line per example', async () => {
    const w = await mountSuspended(Prompt, { props: { card: flip(toStudyCard(card)) } });
    expect(w.findAll('[data-testid="prompt-note-line"]').map(l => l.text())).toEqual(['de grote man', 'het grote huis', 'een groot huis']);
  });
});

describe('an exception line', () => {
  const card = { id: 'c3', f: 'большой', b: 'grote', nb: 'de grote man\n!een groot huis' };

  it('is marked apart from the rule lines', async () => {
    const w = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
    expect(w.findAll('[data-testid="answer-note-line"]').map(l => l.text())).toEqual(['de grote man', 'een groot huis']);
    expect(w.findAll('[data-testid="answer-note-line"]').map(l => l.attributes('data-exception') === 'true')).toEqual([false, true]);
  });
});

describe('native example lines', () => {
  const card = { id: 'c4', f: 'большой', b: 'grote', n: 'с -e: сразу за ним сущ.', nx: 'большой мужчина (конкретный)\n!большой дом (абстрактный)', nb: 'de grote man\n!een groot huis' };

  it('stand under the native rule, a line each, exceptions marked', async () => {
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(card) } });
    const lines = w.findAll('[data-testid="prompt-note-line"]');
    expect(lines.map(l => l.text())).toEqual(['с -e: сразу за ним сущ.', 'большой мужчина (конкретный)', 'большой дом (абстрактный)']);
    expect(lines.map(l => l.attributes('data-exception') === 'true')).toEqual([false, false, true]);
  });
});

describe('a note of several items', () => {
  const card = { id: 'c5', f: 'большой', b: 'groot', n: '1) за ним нет сущ.; 2) een/geen + het-слово' };

  it('puts each item on its own line', async () => {
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(card) } });
    expect(w.findAll('[data-testid="prompt-note-line"]').map(l => l.text())).toEqual(['1) за ним нет сущ.', '2) een/geen + het-слово']);
  });
});

describe('a native note that gives the answer away', () => {
  const card = { id: 'c3', f: 'ты хочешь', b: 'jij wil', n: 'разговорно; вариант: jij wilt', nx: 'просить — om iets willen' };
  const shownLines = (w: VueWrapper) =>
    w.findAll('[data-testid="prompt-note-line"]').map(l => ({ text: l.text(), shown: !l.classes('invisible') }));

  it('keeps its place but hides the giveaway while the answer is secret', async () => {
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(card), secret: true } });
    expect(shownLines(w)).toEqual([
      { text: 'разговорно', shown: true },
      { text: 'вариант: jij wilt', shown: false },
      { text: 'просить — om iets willen', shown: false },
    ]);
  });

  it('shows in full once the answer is out', async () => {
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(card) } });
    expect(shownLines(w).every(l => l.shown)).toBe(true);
  });
});

describe('a variant in a native note', () => {
  it('stays hidden while the answer is secret, even with another stem', async () => {
    const card = { id: 'c5', f: 'ты можешь', b: 'jij kan', n: 'вариант: jij kunt' };
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(card), secret: true } });
    expect(w.get('[data-testid="prompt-note-line"]').classes()).toContain('invisible');
  });
});

describe('a native note item with a Dutch word', () => {
  const hidden = async (card: DeckCard) => {
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(card), secret: true } });
    return w.findAll('[data-testid="prompt-note-line"]').map(l => l.classes().includes('invisible'));
  };

  it('stays hidden while the answer is secret, a related word too', async () => {
    expect(await hidden({ id: 'c6', f: 'ключ', b: 'de sleutel', n: 'родственное: sluiten (закрывать)' })).toEqual([true]);
  });

  it('stays hidden when it names the base word, in any language', async () => {
    expect(await hidden({ id: 'c9', f: 'farewell', b: 'het afscheid', n: 'from: scheiden (part)', nr: 'от: scheiden (разделять)' })).toEqual([true]);
  });

  it('stays hidden when it names another word', async () => {
    expect(await hidden({ id: 'c7', f: 'раз', b: 'maal', n: 'в обиходе «раз» — keer' })).toEqual([true]);
  });

  it('stays hidden in another language when the Russian item gives the word away', async () => {
    expect(await hidden({ id: 'c8', f: 'time', b: 'maal', n: 'in everyday speech: keer; formal', nr: 'в обиходе «раз» — keer; книжно' })).toEqual([true, false]);
  });

  it('stays hidden when it names the word not to confuse it with, in any language', async () => {
    for (const label of ['не путать с', "don't confuse with", 'no confundir con', 'não confundir com', 'karıştırma'])
      expect(await hidden({ id: 'c11', f: 'now', b: 'nu', n: `the present moment; ${label}: meteen` })).toEqual([false, true]);
  });

  it('stays hidden when it is a Dutch usage example, its hint shown', async () => {
    expect(await hidden({ id: 'c10', f: 'to register', b: 'inschrijven', n: 'get onto an official list; … bij de gemeente', nr: 'попасть в официальный список; … bij de gemeente' })).toEqual([false, true]);
  });
});

describe('a usage rule in a native note', () => {
  it('stays shown while the answer is secret', async () => {
    const card = { id: 'c4', f: 'хороший', b: 'goed', n: '1) за ним нет сущ.; 2) een/geen + het-слово' };
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(card), secret: true } });
    expect(w.findAll('[data-testid="prompt-note-line"]').some(l => l.classes().includes('invisible'))).toBe(false);
  });
});

describe('a picture', () => {
  const card = { id: 'c2', f: 'зонт', b: 'de paraplu', img: 'p.jpg' };
  const pictureOf = async (studyCard: never, secret: boolean) => {
    const img = (await mountSuspended(Prompt, { props: { card: studyCard, secret } })).find('img');
    return img.exists() && !img.classes('invisible');
  };

  it('is hidden on the Dutch side until the meaning is out', async () => {
    expect([await pictureOf(flip(toStudyCard(card)) as never, true), await pictureOf(flip(toStudyCard(card)) as never, false)]).toEqual([false, true]);
  });

  it('keeps its place while hidden', async () => {
    expect((await mountSuspended(Prompt, { props: { card: flip(toStudyCard(card)) as never, secret: true } })).find('img').exists()).toBe(true);
  });

  it('is shown with the native side', async () => {
    expect(await pictureOf(toStudyCard(card) as never, true)).toBe(true);
  });
});

describe('a verbal noun mark', () => {
  const lines = async (card: DeckCard, secret: boolean) => {
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(card), secret } });
    return w.findAll('[data-testid="prompt-note-line"]').map(l => ({ text: l.text(), shown: !l.classes('invisible') }));
  };

  const prompt = async (card: DeckCard, secret: boolean) => (await mountSuspended(Prompt, { props: { card: toStudyCard(card), secret } })).get('[data-testid="prompt"]').text();

  it('marks the prompt itself as a process', async () => {
    expect(await prompt({ id: 'c9', f: 'мастерение', b: 'het knutselen', n: 'процесс: het + глагол (knutselen — мастерить)' }, true)).toBe('мастерение (процесс)');
    expect(await prompt({ id: 'c10', f: 'crafting', b: 'het knutselen', n: 'process: het + verb (knutselen — to craft)', nr: 'процесс: het + глагол (knutselen — мастерить)' }, true)).toBe('crafting (process)');
  });

  it('hides its origin while the answer is secret', async () => {
    expect(await lines({ id: 'c9', f: 'мастерение', b: 'het knutselen', n: 'процесс: het + глагол (knutselen — мастерить)' }, true)).toEqual([{ text: 'процесс: het + глагол (knutselen — мастерить)', shown: false }]);
  });

  it('shows its origin once the answer is out', async () => {
    expect(await lines({ id: 'c9', f: 'мастерение', b: 'het knutselen', n: 'процесс: het + глагол (knutselen — мастерить)' }, false)).toEqual([{ text: 'процесс: het + глагол (knutselen — мастерить)', shown: true }]);
  });
});
