import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, shallowRef } from 'vue';
import CardSheet from './CardSheet.vue';
import Prompt from './Prompt.vue';
import { toStudyCard, type DeckNode } from '@/utils/deck';

const { deck, learned } = vi.hoisted(() => ({ deck: { value: undefined as DeckNode | undefined }, learned: new Set<string>() }));
mockNuxtImport('useStore', () => () => ({ deck, isLearned: (id: string) => learned.has(id) }));

const cards = [
  { id: 'ver', f: 'пере-, изменение; прочь, от-', b: 'ver-', xb: 'verkopen, verhuizen' },
  { id: 'kopen', f: 'покупать', b: 'kopen', tr: 'ко:пэн', xb: 'Ik wil brood kopen.', xf: 'Я хочу купить хлеб.' },
  { id: 'verliezen', f: 'терять', b: 'verliezen', n: 'от: ver- (прочь, от-) + liezen' },
  { id: 'verkopen', f: 'продавать', b: 'verkopen', n: 'от: ver- (пере-, изменение) + kopen (покупать)' },
  { id: 'koper', f: 'покупатель', b: 'de koper', n: 'от: kopen (покупать)' },
];
deck.value = shallowRef({ id: 'root', name: 'root', cards }).value;

/** A browser history: back moves down an entry and tells the page, as the device's back button does. */
const entries: unknown[] = [{}];
let at = 0;
vi.stubGlobal('history', {
  get state() {
    return entries[at];
  },
  get length() {
    return at + 1;
  },
  pushState(state: unknown) {
    entries.splice(++at, Infinity, state);
  },
  replaceState(state: unknown) {
    entries[at] = state;
  },
  back() {
    if (!at) return;
    at--;
    queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
  },
});

afterEach(async () => {
  await doCloseAll();
  learned.clear();
});

describe('a word a note derives the card from', () => {
  it('is a link apart from the note text', async () => {
    const w = await doMount('verkopen');
    expect(findLinks(w).map(l => l.text())).toEqual(['ver-', 'kopen']);
  });

  it('is a link in the breakdown of an affix example too', async () => {
    const card = { ...toStudyCard(cards[0]!), prompt: 'продавать', answer: 'verkopen', breakdown: 'ver- (пере-, изменение) + kopen (покупать): букв. «перекупать»', affix: { dutch: 'ver-' } };
    const w = await mountSuspended(defineComponent(() => () => [h(Prompt, { card }), h(CardSheet)]));
    expect(findLinks(w).map(l => l.text())).toEqual(['kopen']);
  });

  it('opens a sheet on its card', async () => {
    learned.add('kopen');
    const w = await doMount('verkopen');
    await findLinks(w)[1]!.trigger('click');
    expect(readSheet(w)).toEqual({ word: 'kopen', transcription: '[ко:пэн]', senses: ['покупать'], example: ['Ik wil brood kopen.', 'Я хочу купить хлеб.'], status: 'Learned', derived: ['verkopen продавать new', 'de koper покупатель new'] });
  });
});

describe('a sheet on a word of several meanings', () => {
  it('marks the meaning the link gave', async () => {
    const w = await doMount('verkopen');
    await findLinks(w)[0]!.trigger('click');
    expect(w.findAll('[data-testid="card-sheet-sense"]').map(s => s.classes('font-semibold'))).toEqual([true, false]);
  });

  it('lists derived words in deck order, each tagged with the meaning it builds on', async () => {
    const w = await doMount('verkopen');
    await findLinks(w)[0]!.trigger('click');
    expect(readSheet(w).derived).toEqual(['verliezen терять new прочь, от-', 'verkopen продавать new пере-, изменение']);
  });
});

describe('a sheet opened while the answer is secret', () => {
  it('leaves the card being asked out of its derived words', async () => {
    const w = await doMount('verkopen', true);
    await findLinks(w)[1]!.trigger('click');
    expect(readSheet(w).derived).toEqual(['de koper покупатель new']);
  });
});

describe('sheets stacked from links inside a sheet', () => {
  it('step back one at a time, then close', async () => {
    const w = await doMount('verkopen');
    await findLinks(w)[1]!.trigger('click');
    await doOpenDerived(w, 'de koper');
    expect(readSheet(w).word).toBe('de koper');
    await doPressBack(w);
    expect(readSheet(w).word).toBe('kopen');
    await doPressBack(w);
    expect(w.find('[data-testid="card-sheet"]').exists()).toBe(false);
  });

  it('go back one with the sheet back button', async () => {
    const w = await doMount('verkopen');
    await findLinks(w)[1]!.trigger('click');
    await doOpenDerived(w, 'de koper');
    await w.get('[data-testid="card-sheet-back"]').trigger('click');
    expect(readSheet(w).word).toBe('kopen');
  });

  it('all close with the close button, taking their history entry with them', async () => {
    const w = await doMount('verkopen');
    const depth = history.length;
    await findLinks(w)[1]!.trigger('click');
    await doOpenDerived(w, 'de koper');
    expect(history.length).toBe(depth + 1);
    await w.get('[data-testid="card-sheet-close"]').trigger('click');
    await flushPromises();
    expect(w.find('[data-testid="card-sheet"]').exists()).toBe(false);
    expect(history.length).toBe(depth);
  });
});

describe('a sheet pulled down by the finger', () => {
  it('follows the finger', async () => {
    const w = await doOpenKopen();
    await doDrag(w, 0, 60, false);
    expect(findPanel(w).attributes('style')).toContain('translate: 0 60px');
  });

  it('closes when let go past a quarter of its height', async () => {
    const w = await doOpenKopen();
    await doDrag(w, 0, 120);
    expect(w.find('[data-testid="card-sheet"]').exists()).toBe(false);
  });

  it('springs back when let go short of a quarter of its height', async () => {
    const w = await doOpenKopen();
    await doDrag(w, 0, 80);
    expect(readSheet(w).word).toBe('kopen');
    expect(findPanel(w).attributes('style') ?? '').not.toContain('translate');
  });

  it('stays put when pulled up', async () => {
    const w = await doOpenKopen();
    await doDrag(w, 0, -120);
    expect(readSheet(w).word).toBe('kopen');
  });
});

// declarative helpers

async function doMount(id: string, secret = false) {
  const card = toStudyCard(cards.find(c => c.id === id)!);
  return mountSuspended(defineComponent(() => () => [h(Prompt, { card, secret }), h(CardSheet)]));
}

const findPanel = (w: VueWrapper) => w.get('[data-testid="card-sheet"]');

/** The kopen sheet, its panel 400px tall. */
async function doOpenKopen() {
  const w = await doMount('verkopen');
  await findLinks(w)[1]!.trigger('click');
  Object.defineProperty(findPanel(w).element, 'offsetHeight', { configurable: true, value: 400 });
  return w;
}

async function doDrag(w: VueWrapper, from: number, by: number, release = true) {
  const at = (type: string, y: number, target: EventTarget) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, button: 0, clientY: y }));
  at('pointerdown', from, findPanel(w).element);
  for (let y = from; Math.abs(y - from) < Math.abs(by); y += Math.sign(by) * 10) at('pointermove', y, window);
  at('pointermove', from + by, window);
  if (release) at('pointerup', from + by, window);
  await flushPromises();
}

const findLinks = (w: VueWrapper) => w.findAll('[data-testid="note-link"]');

function readSheet(w: VueWrapper) {
  const text = (testid: string) => {
    const found = w.find(`[data-testid="${testid}"]`);
    return found.exists() ? found.text() : undefined;
  };
  return {
    word: text('card-sheet-word'),
    transcription: text('card-sheet-transcription'),
    senses: w.findAll('[data-testid="card-sheet-sense"]').map(s => s.text()),
    example: w.findAll('[data-testid="card-sheet-example"] p').map(p => p.text()),
    status: text('card-sheet-status'),
    derived: w.findAll('[data-testid="card-sheet-derived-word"]').map(d => d.findAll('span').map(s => s.text()).join(' ')),
  };
}

async function doOpenDerived(w: VueWrapper, word: string) {
  await w.findAll('[data-testid="card-sheet-derived-word"]').find(d => d.text().startsWith(word))!.trigger('click');
}

async function doPressBack(w: VueWrapper) {
  history.back();
  await flushPromises();
  await w.vm.$nextTick();
}

async function doCloseAll() {
  useCardSheet().close();
  await flushPromises();
}
