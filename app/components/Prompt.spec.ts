import { mountSuspended } from '@nuxt/test-utils/runtime';
import { enableAutoUnmount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Prompt from './Prompt.vue';
import Toast from './Toast.vue';
import Answer from './Answer.vue';
import { flip, toStudyCard, type DeckCard } from '@/utils/deck';
import { useStore } from '@/composables/useStore';
import { contrastOf } from '../../tests/contrast';

const CARD = { id: 'c0', prompt: 'huis', answer: 'дом', promptExample: 'Een huis.' } as never;

afterEach(() => vi.unstubAllGlobals());
// Mounted attached: a hidden line is told by its computed style, which a detached element lacks.
enableAutoUnmount(afterEach);

describe('a tap on a card text', () => {
  it('copies that text alone and says so', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const toast = await mountSuspended(Toast);
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: CARD } });
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
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card) } });
    expect(w.get('[data-testid="prompt-note"]').text()).toBe('речь, не орган');
    expect(w.get('[data-testid="prompt-example"]').text()).toBe('Язык Нидерландов.');
  });

  it('is left off the Dutch prompt', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: flip(toStudyCard(card)) } });
    expect(w.find('[data-testid="prompt-note"]').exists()).toBe(false);
  });

  it('comes with the native answer', async () => {
    const w = await mountSuspended(Answer, { props: { card: flip(toStudyCard(card)), silent: true } });
    expect(w.get('[data-testid="answer-note"]').text()).toBe('речь, не орган');
  });
});

describe('the example on an answer', () => {
  const card = { id: 'c1', f: 'язык', b: 'de taal', xf: 'Язык Нидерландов.', xb: 'De taal van Nederland.' };

  it.each([['Dutch', toStudyCard(card)], ['native', flip(toStudyCard(card))]])('is marked with the outline example icon on the %s side', async (_, side) => {
    const w = await mountSuspended(Answer, { props: { card: side, silent: true } });
    expect(w.get('[data-testid="answer-context"] [data-testid="context-icon"]').attributes()).toMatchObject({ fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' });
  });
});

describe('a Dutch note', () => {
  const card = { id: 'c2', f: 'большой', b: 'grote', n: 'с -e: сразу за ним сущ.', nb: 'de grote man\nhet grote huis\neen groot huis' };

  it('comes with the Dutch answer, a line per example', async () => {
    const w = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
    expect(w.findAll('[data-testid="answer-note-line"]').map(l => l.text())).toEqual(['de grote man', 'het grote huis', 'een groot huis']);
  });

  it('is left off the native prompt', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card) } });
    expect(w.text()).not.toContain('grote man');
  });

  it('stands under the Dutch prompt, a line per example', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: flip(toStudyCard(card)) } });
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

  // The Dutch is the whole line, so its own example colour hid the mark.
  it('sets its Dutch in the exception colour', async () => {
    const w = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
    expect(w.findAll('[data-testid="note-dutch"]').map(d => d.classes().some(c => c.includes('oklch')))).toEqual([false, true]);
  });

  // WCAG AA asks 4.5:1 for body text, on the card and on the grey box inside it.
  for (const [theme, backgrounds] of [
    ['light', ['#ffffff', '#f5f5f4']],
    ['dark', ['#1c1917', '#292524']],
  ] as const) {
    it(`reads at AA contrast in the ${theme} theme`, async () => {
      const w = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
      const line = w.findAll('[data-testid="answer-note-line"]')[1]!;
      const colour = line.classes().find(c => c.includes('oklch') && c.startsWith('dark:') === (theme === 'dark'))!;
      for (const background of backgrounds) expect(contrastOf(colour, background)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('native example lines', () => {
  const card = { id: 'c4', f: 'большой', b: 'grote', n: 'с -e: сразу за ним сущ.', nx: 'большой мужчина (конкретный)\n!большой дом (абстрактный)', nb: 'de grote man\n!een groot huis' };

  it('stand under the native rule, a line each, exceptions marked', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card) } });
    const lines = w.findAll('[data-testid="prompt-note-line"]');
    expect(lines.map(l => l.text())).toEqual(['с -e: сразу за ним сущ.', 'большой мужчина (конкретный)', 'большой дом (абстрактный)']);
    expect(lines.map(l => l.attributes('data-exception') === 'true')).toEqual([false, false, true]);
    expect(lines.map(l => l.attributes('data-kind'))).toEqual(['label', 'example', 'example']);
  });
});

describe('a note of several items', () => {
  const card = { id: 'c5', f: 'большой', b: 'groot', n: '1) за ним нет сущ.; 2) een/geen + het-слово' };

  it('puts each item on its own line', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card) } });
    expect(w.findAll('[data-testid="prompt-note-line"]').map(l => l.text())).toEqual(['1) за ним нет сущ.', '2) een/geen + het-слово']);
  });
});

describe('a native note that gives the answer away', () => {
  const card = { id: 'c3', f: 'ты хочешь', b: 'jij wil', n: 'разговорно; вариант: jij wilt', nx: 'просить — om iets willen' };
  const shownLines = (w: VueWrapper) =>
    w.findAll('[data-testid="prompt-note-line"]').map(l => ({ text: l.text(), shown: l.isVisible() }));

  it('takes no room for the giveaway while the answer is secret', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card), secret: true } });
    expect(shownLines(w)).toEqual([
      { text: 'разговорно', shown: true },
      { text: 'вариант: jij wilt', shown: false },
      { text: 'просить — om iets willen', shown: false },
    ]);
  });

  it('shows in full once the answer is out', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card) } });
    expect(shownLines(w).every(l => l.shown)).toBe(true);
  });
});

describe('a variant in a native note', () => {
  it('stays hidden while the answer is secret, even with another stem', async () => {
    const card = { id: 'c5', f: 'ты можешь', b: 'jij kan', n: 'вариант: jij kunt' };
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card), secret: true } });
    expect(w.get('[data-testid="prompt-note-line"]').isVisible()).toBe(false);
  });
});

describe('a native note item with a Dutch word', () => {
  const hidden = async (card: DeckCard) => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card), secret: true } });
    return w.findAll('[data-testid="prompt-note-line"]').map(l => !l.isVisible());
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
    expect(await hidden({ id: 'c11', f: 'сейчас', b: 'nu', n: 'текущий момент; не путать с: meteen' })).toEqual([false, true]);
    for (const label of ["don't confuse with", 'no confundir con', 'não confundir com', 'karıştırma'])
      expect(await hidden({ id: 'c11', f: 'now', b: 'nu', n: `the present moment; ${label}: meteen` })).toEqual([false, true]);
  });

  it('stays hidden when it is Dutch alone, its meaning shown', async () => {
    expect(await hidden({ id: 'c12', f: 'делать', b: 'maken', n: 'изготавливать или чинить; de fiets …' })).toEqual([false, true]);
  });

  it('stays hidden when it is Dutch alone, in any language', async () => {
    expect(await hidden({ id: 'c13', f: 'to make', b: 'maken', n: 'produce or fix; de fiets …', nr: 'изготавливать или чинить; de fiets …' })).toEqual([false, true]);
  });

  it('stays hidden when it is a Dutch usage example, its hint shown', async () => {
    expect(await hidden({ id: 'c10', f: 'to register', b: 'inschrijven', n: 'get onto an official list; … bij de gemeente', nr: 'попасть в официальный список; … bij de gemeente' })).toEqual([false, true]);
  });
});

describe('a usage rule in a native note', () => {
  it('stays shown while the answer is secret', async () => {
    const card = { id: 'c4', f: 'хороший', b: 'goed', n: '1) за ним нет сущ.; 2) een/geen + het-слово' };
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card), secret: true } });
    expect(w.findAll('[data-testid="prompt-note-line"]').some(l => !l.isVisible())).toBe(false);
  });
});

describe('a picture', () => {
  const card = { id: 'c2', f: 'зонт', b: 'de paraplu', img: 'p.jpg' };
  const pictureOf = async (studyCard: never, secret: boolean) => {
    const img = (await mountSuspended(Prompt, { attachTo: document.body, props: { card: studyCard, secret } })).find('img');
    return img.exists() && !img.classes('invisible');
  };

  it('is hidden on the Dutch side until the meaning is out', async () => {
    expect([await pictureOf(flip(toStudyCard(card)) as never, true), await pictureOf(flip(toStudyCard(card)) as never, false)]).toEqual([false, true]);
  });

  it('keeps its place while hidden', async () => {
    expect((await mountSuspended(Prompt, { attachTo: document.body, props: { card: flip(toStudyCard(card)) as never, secret: true } })).find('img').exists()).toBe(true);
  });

  it('is shown with the native side', async () => {
    expect(await pictureOf(toStudyCard(card) as never, true)).toBe(true);
  });
});

describe('a verbal noun mark', () => {
  const lines = async (card: DeckCard, secret: boolean) => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card), secret } });
    return w.findAll('[data-testid="prompt-note-line"]').map(l => ({ text: l.text(), shown: l.isVisible() }));
  };

  const prompt = async (card: DeckCard, secret: boolean) => (await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card), secret } })).get('[data-testid="prompt"]').text();

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

describe('a long card', () => {
  const card = toStudyCard({ id: 'c2', f: 'из, наружу', b: 'uit-', n: 'в предложении отрывается; ik kies het uit (я это выбираю)', xf: 'выбирать', xb: 'uitkiezen' });

  it('scrolls its notes and keeps the word in view, on both sides', async () => {
    const prompt = await mountSuspended(Prompt, { attachTo: document.body, props: { card } });
    const answer = await mountSuspended(Answer, { props: { card: flip(card) } });
    for (const [w, side] of [[prompt, 'prompt'], [answer, 'answer']] as const) {
      const scroll = w.get(`[data-testid="${side}-scroll"]`);
      expect(scroll.find(`[data-testid="${side}"]`).exists()).toBe(false);
      expect(scroll.find(`[data-testid="${side}-note"], [data-testid="${side}-example"]`).exists()).toBe(true);
    }
  });

  it('gives the example with its meaning before the notes, each note its own list item, on both sides', async () => {
    const prompt = await mountSuspended(Prompt, { attachTo: document.body, props: { card } });
    const answer = await mountSuspended(Answer, { props: { card: flip(card) } });
    for (const [w, side] of [[prompt, 'prompt'], [answer, 'answer']] as const) {
      const order = w.get(`[data-testid="${side}-scroll"]`).findAll('[data-testid]').map(e => e.attributes('data-testid'));
      expect(order.indexOf(`${side}-example`)).toBeLessThan(order.indexOf(`${side}-note`));
      expect(w.findAll(`li[data-testid="${side}-note-line"]`)).toHaveLength(2);
      const context = w.get(`[data-testid="${side}-context"]`);
      expect(context.find(`[data-testid="${side}-example"]`).exists()).toBe(true);
      expect(context.find(`[data-testid="${side}-note"]`).exists()).toBe(false);
    }
  });
});

describe('the context of a closed card', () => {
  const card = toStudyCard({ id: 'c3', f: 'бросать', b: 'werpen', xf: 'Он бросает мяч.', xb: 'Hij werpt de bal.' });
  const exampleShown = (w: VueWrapper) => w.get('[data-testid="prompt-example"]').isVisible();

  it('stays hidden until asked for, so the word is recalled on its own', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: flip(card), secret: true } });
    expect(exampleShown(w)).toBe(false);
    await w.get('[data-testid="show-context"]').trigger('click');
    expect(exampleShown(w)).toBe(true);
    expect(w.find('[data-testid="show-context"]').exists()).toBe(false);
  });

  it('takes no room while hidden: only its icon shows, in the corner', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: flip(card), secret: true } });
    expect(w.get('[data-testid="prompt-context"]').isVisible()).toBe(false);
    expect(w.get('[data-testid="show-context"]').classes()).toContain('absolute');
  });

  it('shows its icon before it once shown', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: flip(card), secret: true } });
    await w.get('[data-testid="show-context"]').trigger('click');
    const order = [...w.get('[data-testid="prompt-context"]').element.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid'));
    expect(order.indexOf('context-icon')).toBe(order.indexOf('prompt-example') - 1);
  });

  it('draws its icon in the outline style of the other icons', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: flip(card), secret: true } });
    const button = w.get('[data-testid="show-context"] svg');
    await w.get('[data-testid="show-context"]').trigger('click');
    for (const icon of [button, w.get('[data-testid="context-icon"]')]) {
      expect(icon.element.tagName).toBe('svg');
      expect(icon.attributes()).toMatchObject({ fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' });
    }
  });

  it('shows on a tap anywhere on the card', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: flip(card), secret: true } });
    await w.get('[data-testid="prompt-card"]').trigger('click');
    expect(exampleShown(w)).toBe(true);
  });

  it('shows once the card is open', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: flip(card) } });
    expect(exampleShown(w)).toBe(true);
    expect(w.find('[data-testid="show-context"]').exists()).toBe(false);
  });

  describe('with usage examples in its note', () => {
    const noted = flip(toStudyCard({ id: 'c14', f: 'дорогой', b: 'duur', nb: 'De telefoon is duur.\neen duur restaurant', nx: 'Телефон дорогой.\nдорогой ресторан' }));
    const linesShown = (w: VueWrapper) => w.findAll('[data-testid="prompt-note-line"]').filter(l => l.isVisible()).map(l => l.text());

    it('keeps them back until asked for', async () => {
      const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: noted, secret: true } });
      expect(linesShown(w)).toEqual([]);
      await w.get('[data-testid="show-context"]').trigger('click');
      expect(linesShown(w)).toEqual(['De telefoon is duur.', 'een duur restaurant']);
    });

    it('shows them once the card is open', async () => {
      const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: noted } });
      expect(linesShown(w)).toEqual(['De telefoon is duur.', 'een duur restaurant']);
    });
  });
});

describe('a note of several kinds', () => {
  const ru = 'в предложении отрывается и уходит в конец; ik maak het af (я это доделываю); afmaken (заканчивать): до конца; не путать с: of (или); от: af (готово)';
  const card = { id: 'c9', f: 'до конца', b: 'af-', n: ru };
  const kinds = (w: VueWrapper) => w.findAll('[data-testid="answer-note-line"]').map(l => l.attributes('data-kind'));
  const texts = (w: VueWrapper, id: string) => w.findAll(`[data-testid="${id}"]`).map(l => l.text());

  it('tells rules, Dutch examples, labelled items and the origin apart, the origin before the examples', async () => {
    const w = await mountSuspended(Answer, { props: { card: flip(toStudyCard(card)), silent: true } });
    expect(kinds(w)).toEqual(['rule', 'label', 'origin', 'example', 'example']);
    expect(texts(w, 'note-dutch')).toEqual(['ik maak het af', 'afmaken']);
    expect(texts(w, 'note-label')).toEqual(['не путать с', 'от']);
  });

  it('sets apart only the Dutch of an example glossed after a dash', async () => {
    const w = await mountSuspended(Answer, { props: { card: flip(toStudyCard({ id: 'c11', f: 'явиться', b: 'melden', n: 'zich melden — явиться, отметиться' })), silent: true } });
    expect(texts(w, 'note-dutch')).toEqual(['zich melden']);
  });

  it('keeps the kinds of the Russian note in a translation', async () => {
    const en = { ...card, n: 'it splits off to the end; ik maak het af (I finish it); afmaken (to finish): to the end; don\'t confuse with: of (or); from: af (done)', nr: ru };
    const w = await mountSuspended(Answer, { props: { card: flip(toStudyCard(en)), silent: true } });
    expect(kinds(w)).toEqual(['rule', 'label', 'origin', 'example', 'example']);
    expect(texts(w, 'note-label')).toEqual(["don't confuse with", 'from']);
  });

  it('scrolls the transcription with the notes, so the word alone stays put', async () => {
    const w = await mountSuspended(Answer, { props: { card: toStudyCard({ ...card, tr: 'аф' }), silent: true } });
    expect(w.get('[data-testid="answer-scroll"]').find('[data-testid="transcription"]').exists()).toBe(true);
  });

  it('never breaks an affix at its hyphen', async () => {
    const w = await mountSuspended(Answer, { props: { card: flip(toStudyCard({ ...card, n: 'не путать с: x (-ющий: делающий что-то)' })), silent: true } });
    expect(w.findAll('[data-testid="unbroken"]').map(e => e.text())).toEqual(['(-ющий:']);
  });

  /** Spacing ladder: lines of one group sit 4px apart, the next group 8px. */
  it('sets each group of lines further apart than the lines within it', async () => {
    const w = await mountSuspended(Answer, { props: { card: flip(toStudyCard(card)), silent: true } });
    const gaps = w.findAll('[data-testid="answer-note-line"]').map(l => l.classes().find(c => /^mt-/.test(c)));
    expect(gaps).toEqual([undefined, 'mt-1', 'mt-2', 'mt-2', 'mt-1']);
  });

  it('shows each Dutch line of a Dutch note as an example', async () => {
    const w = await mountSuspended(Answer, { props: { card: toStudyCard({ id: 'c10', f: 'большой', b: 'grote', nb: 'de grote man\nhet grote huis' }), silent: true } });
    expect(kinds(w)).toEqual(['example', 'example']);
  });
});

/** A native gloss alone reads as a word of its own: the card says it means an affix. */
describe('an affix meaning', () => {
  const suffix = { id: 'a1', f: 'о женщине: после -er, -aar', b: '-es', xf: 'певица', xb: 'de zangeres' };
  const prefix = { id: 'a2', f: 'из глагола делает существительное', b: 'ge-', xf: 'разговор', xb: 'het gesprek' };
  const setLanguage = (language: 'en' | 'ru') => { const { settings } = useStore(); settings.value = { ...settings.value, language }; };
  afterEach(() => setLanguage('en'));

  it('says it is an affix', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(suffix) } });
    expect(w.get('[data-testid="prompt"]').text()).toBe('о женщине: после -er, -aar (affix)');
  });

  it('says it is an affix on the answer', async () => {
    const w = await mountSuspended(Answer, { props: { card: flip(toStudyCard(prefix)), silent: true } });
    expect(w.get('[data-testid="answer"]').text()).toBe('из глагола делает существительное (affix)');
  });

  it('says so in the native language', async () => {
    setLanguage('ru');
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(suffix) } });
    expect(w.get('[data-testid="prompt"]').text()).toBe('о женщине: после -er, -aar (аффикс)');
  });

  /** A break after the hyphen reads `не после -` / `er`. */
  it('never breaks an affix it names from its hyphen', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(suffix) } });
    expect(w.get('[data-testid="prompt"]').findAll('[data-testid="unbroken"]').map(e => e.text())).toEqual(['-er,', '-aar']);
  });

  it('never breaks an affix it names from its hyphen on the answer', async () => {
    const w = await mountSuspended(Answer, { props: { card: flip(toStudyCard(suffix)), silent: true } });
    expect(w.get('[data-testid="answer"]').findAll('[data-testid="unbroken"]').map(e => e.text())).toEqual(['-er,', '-aar']);
  });

  it('leaves the affix itself bare', async () => {
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: flip(toStudyCard(suffix)) } });
    expect(w.get('[data-testid="prompt"]').text()).toBe('-es');
  });

  it('copies without the tag', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(suffix) } });
    await w.get('[data-testid="prompt"]').trigger('click');
    expect(writeText.mock.calls).toEqual([['о женщине: после -er, -aar']]);
  });
});

/** A phone's own scrollbar fades out after each swipe, so the card draws its own. */
describe('a scrolling card', () => {
  const card = { id: 's1', f: 'дом', b: 'het huis', tr: 'һөйс', n: 'длинное пояснение', xf: 'Мой дом.', xb: 'Mijn huis.' };
  const next = { id: 's2', f: 'кот', b: 'de kat', tr: 'кат', n: 'другое пояснение', xf: 'Мой кот.', xb: 'Mijn kat.' };
  function givenContentHeight(content: number, box = 100) {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(content);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(box);
  }
  const findThumb = (w: VueWrapper, side: string) => w.find(`[data-testid="${side}-scroll-thumb"]`);
  afterEach(() => vi.restoreAllMocks());

  it('shows its thumb before any scroll on the answer', async () => {
    givenContentHeight(400);
    const w = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
    await flushPromises();
    expect(findThumb(w, 'answer').attributes('style')).toContain('height: 25%');
  });

  it('shows its thumb on the prompt', async () => {
    givenContentHeight(400);
    const w = await mountSuspended(Prompt, { attachTo: document.body, props: { card: toStudyCard(card) } });
    await flushPromises();
    expect(findThumb(w, 'prompt').exists()).toBe(true);
  });

  it('shows no thumb when everything fits', async () => {
    givenContentHeight(100);
    const w = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
    await flushPromises();
    expect(findThumb(w, 'answer').exists()).toBe(false);
    expect(w.find('[data-testid="answer-scroll-track"]').exists()).toBe(false);
  });

  /** A thumb alone reads as a stray line; the track shows it is a scrollbar and how far it went. */
  it('draws its thumb on a track', async () => {
    givenContentHeight(400);
    const w = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
    await flushPromises();
    expect(w.get('[data-testid="answer-scroll-track"]').find('[data-testid="answer-scroll-thumb"]').exists()).toBe(true);
  });

  it('moves its thumb with the scroll', async () => {
    givenContentHeight(400);
    const w = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
    const scroll = w.get('[data-testid="answer-scroll"]');
    scroll.element.scrollTop = 150;
    await scroll.trigger('scroll');
    expect(findThumb(w, 'answer').attributes('style')).toContain('top: 37.5%');
  });

  it('keeps its thumb on the next card', async () => {
    givenContentHeight(400);
    const w = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
    await w.setProps({ card: toStudyCard(next) });
    await flushPromises();
    expect(findThumb(w, 'answer').exists()).toBe(true);
  });
});

/** One spelling can be an affix, a noun and a verb (op-, de boeken, boeken): the card's own tint tells them apart. */
describe('a card surface', () => {
  const surfaces = async (cards: DeckCard[]) => Promise.all(cards.map(async card => {
    const prompt = await mountSuspended(Prompt, { props: { card: toStudyCard(card) } });
    const answer = await mountSuspended(Answer, { props: { card: toStudyCard(card), silent: true } });
    const tint = (w: VueWrapper, id: string) => w.get(`[data-testid="${id}"]`).classes().filter(c => /^(dark:)?bg-/.test(c)).sort().join(' ');
    return [tint(prompt, 'prompt-card'), tint(answer, 'answer-card')];
  }));

  it('differs for an affix, a noun, a verb and any other word, on both sides', async () => {
    const [affix, noun, verb, other] = await surfaces([
      { id: 's0', f: 'вверх', b: 'op-', xb: 'opstaan', xf: 'вставать' },
      { id: 's1', f: 'книги (мн.)', b: 'de boeken', p: 'noun' },
      { id: 's2', f: 'бронировать', b: 'boeken', p: 'verb' },
      { id: 's3', f: 'на', b: 'op' },
    ]);
    expect(new Set([affix, noun, verb, other].map(s => s![0])).size).toBe(4);
    for (const [prompt, answer] of [affix!, noun!, verb!, other!]) expect(answer).toBe(prompt);
  });

  it('has its own tint in the dark theme too', async () => {
    const tints = await surfaces([
      { id: 's0', f: 'вверх', b: 'op-', xb: 'opstaan', xf: 'вставать' },
      { id: 's1', f: 'книги (мн.)', b: 'de boeken', p: 'noun' },
      { id: 's2', f: 'бронировать', b: 'boeken', p: 'verb' },
      { id: 's3', f: 'на', b: 'op' },
    ]);
    expect(new Set(tints.map(([prompt]) => prompt!.split(' ').filter(c => c.startsWith('dark:')).join(' '))).size).toBe(4);
  });
});

describe('a word of several parts', () => {
  const vroeg: DeckCard = { id: 'v0', f: 'рано; ранний', b: 'vroeg', p: 'adverb', ps: ['adverb', 'adjective'] };
  const readSenses = (w: VueWrapper) => w.findAll('[data-testid="sense"]').map(s => ({ text: s.text(), colour: s.classes().filter(c => /^(dark:)?text-/.test(c)).join(' ') }));

  it('shows each sense in the colour of its part', async () => {
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard(vroeg) } });
    const senses = readSenses(w);
    expect(w.get('[data-testid="prompt"]').text()).toBe('рано; ранний');
    expect(senses.map(s => s.text)).toEqual(['рано', 'ранний']);
    expect(new Set(senses.map(s => s.colour)).size).toBe(2);
  });

  it('shows the Dutch side in one colour', async () => {
    const w = await mountSuspended(Prompt, { props: { card: flip(toStudyCard(vroeg)) } });
    expect(readSenses(w)).toEqual([]);
  });

  it('is one colour with a single part', async () => {
    const w = await mountSuspended(Prompt, { props: { card: toStudyCard({ id: 'v1', f: 'красивый', b: 'mooi', p: 'adjective' }) } });
    expect(readSenses(w)).toEqual([]);
  });
});
