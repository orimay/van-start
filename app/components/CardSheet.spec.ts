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
  { id: 'verkopen', f: 'продавать', b: 'verkopen', n: 'от: ver- (пере-, изменение) + kopen (покупать)' },
  { id: 'verliezen', f: 'терять', b: 'verliezen', n: 'от: ver- (прочь, от-) + liezen' },
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

  it('opens a sheet on its card', async () => {
    learned.add('kopen');
    const w = await doMount('verkopen');
    await findLinks(w)[1]!.trigger('click');
    expect(readSheet(w)).toEqual({ word: 'kopen', transcription: '[ко:пэн]', senses: ['покупать'], example: ['Ik wil brood kopen.', 'Я хочу купить хлеб.'], status: 'Learned', derived: ['verkopen продавать new', 'de koper покупатель new'] });
  });
});

describe('a sheet on a word of several meanings', () => {
  it('marks the meaning the link gave and lists derived words under each meaning', async () => {
    const w = await doMount('verkopen');
    await findLinks(w)[0]!.trigger('click');
    expect(w.findAll('[data-testid="card-sheet-sense"]').map(s => s.classes('font-semibold'))).toEqual([true, false]);
    expect(w.findAll('[data-testid="card-sheet-derived-sense"]').map(s => s.text())).toEqual(['пере-, изменение', 'прочь, от-']);
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

// declarative helpers

async function doMount(id: string, secret = false) {
  const card = toStudyCard(cards.find(c => c.id === id)!);
  return mountSuspended(defineComponent(() => () => [h(Prompt, { card, secret }), h(CardSheet)]));
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
