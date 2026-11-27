import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, shallowRef } from 'vue';
import CardSheet from './CardSheet.vue';
import Answer from './Answer.vue';
import Prompt from './Prompt.vue';
import { linkable, toStudyCard, type DeckNode } from '@/utils/deck';
import { basesOf, buildIndex, familyOfWord } from '@/utils/links';
import { type Confusions, linked, unlinked } from '@/utils/confusions';

const { deck, learned, settings } = vi.hoisted(() => ({ deck: { value: undefined as DeckNode | undefined }, learned: new Set<string>(), settings: { value: { language: 'en' } as { language: string; relearnDeep?: boolean } } }));
mockNuxtImport('useStore', () => () => {
  const index = buildIndex(deck.value ? linkable(deck.value) : []);
  const familyOf = (id: string) => familyOfWord(index, basesOf(index), id);
  return {
    deck,
    index: { value: index },
    // Reads `relearned` so the sheet re-renders once a word is learned again.
    isLearned: (id: string) => relearned.value >= 0 && learned.has(id),
    familyOf,
    relearn: (id: string, deep: boolean) => {
      for (const each of [id, ...(deep ? familyOf(id) : [])]) learned.delete(each);
      settings.value = { ...settings.value, relearnDeep: deep };
      relearned.value++;
    },
    settings,
    confusions: mixUps,
    confuse: (a: string, b: string) => (mixUps.value = linked(mixUps.value, a, b)),
    unconfuse: (a: string, b: string) => (mixUps.value = unlinked(mixUps.value, a, b)),
  };
});
const mixUps = shallowRef<Confusions>({});
const relearned = shallowRef(0);

const cards = [
  { id: 'ver', f: 'пере-, изменение; прочь, от-', b: 'ver-', xb: 'verkopen, verhuizen' },
  { id: 'kopen', f: 'покупать', b: 'kopen', tr: 'ко:пэн', xb: 'Ik wil brood kopen.', xf: 'Я хочу купить хлеб.' },
  { id: 'verliezen', f: 'терять', b: 'verliezen', n: 'от: ver- (прочь, от-) + liezen' },
  { id: 'verkopen', f: 'продавать', b: 'verkopen', n: 'от: ver- (пере-, изменение) + kopen (покупать)' },
  { id: 'koper', f: 'покупатель', b: 'de koper', n: 'от: kopen (покупать)' },
  { id: 'kopers', f: 'покупатели', b: 'de kopers', n: 'мн. ч. от: de koper (покупатель)' },
  { id: 'zus', f: 'звук ү, как в нидерландском слове «сестра»', b: 'u', tr: 'ү', k: 'sound', xb: 'de zus, de bus', xm: 'de z[u]s, de b[u]s', xt: 'дэ з[ү]с, дэ б[ү]с', xf: 'Примеры: сестра, автобус.' },
  { id: 'ltr-u', f: 'буква «үү»', b: 'u', tr: 'үү', p: 'letter', xb: 'de bus, nu', xm: 'de b[u]s, n[u]', xf: 'Примеры: автобус, сейчас.' },
  { id: 'be', f: 'действие на кого-то', b: 'be-', tr: 'бэ', xb: 'begroeten', xf: 'приветствовать', xt: 'бэхру́тэн' },
];
deck.value = shallowRef({ id: 'root', name: 'root', cards, roots: [{ id: 'liezen', f: 'терять', b: 'liezen', tr: 'ли:зэн', k: 'root' as const }] }).value;

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
  mixUps.value = {};
  settings.value = { language: 'en' };
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
    expect(readSheet(w)).toEqual({ word: 'kopen', transcription: '[ко:пэн]', senses: ['покупать'], example: ['Ik wil brood kopen.', 'Я хочу купить хлеб.'], status: 'Learned', derived: ['verkopen продавать new', 'de koper покупатель new'], related: [], mixedUp: [] });
  });
});

describe('a sheet on an old root', () => {
  it('says no game asks it and lists the words built on it', async () => {
    const w = await doMount('verliezen');
    await findLinks(w)[1]!.trigger('click');
    expect(readSheet(w)).toEqual({ word: 'liezen', transcription: '[ли:зэн]', senses: ['терять'], example: [], status: 'Old word, not studied', derived: ['verliezen терять new'], related: [], mixedUp: [] });
  });

  it('offers neither learning it again nor a mix-up', async () => {
    learned.add('liezen');
    const w = await doMount('verliezen');
    await findLinks(w)[1]!.trigger('click');
    expect(['card-sheet-relearn', 'card-sheet-mixed'].filter(testid => w.find(`[data-testid="${testid}"]`).exists())).toEqual([]);
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

describe('a sheet on a word another card is a form of', () => {
  it('links that card back', async () => {
    const w = await doMount('kopers');
    await findLinks(w)[0]!.trigger('click');
    expect(readSheet(w)).toMatchObject({ word: 'de koper', related: ['de kopers покупатели new'] });
  });
});

describe('a sheet opened while the answer is secret', () => {
  it('leaves the card being asked out of its derived words', async () => {
    const w = await doMount('verkopen', true);
    await findLinks(w)[1]!.trigger('click');
    expect(readSheet(w).derived).toEqual(['de koper покупатель new']);
  });
});

describe('the details button on an answer card', () => {
  it('opens the sheet on the card it shows', async () => {
    const w = await doMountAnswer('verkopen');
    await w.get('[data-testid="card-details"]').trigger('click');
    expect(readSheet(w).word).toBe('verkopen');
    expect(readSheet(w).derived).toEqual([]);
  });

  it('is not there while the answer is secret', async () => {
    const w = await doMountAnswer('verkopen', true);
    expect(w.find('[data-testid="card-details"]').exists()).toBe(false);
  });
});

describe('a sheet on an affix', () => {
  it('marks the affix in its example word and in the transcription of it', async () => {
    const w = await doMountAnswer('be');
    await w.get('[data-testid="card-details"]').trigger('click');
    expect(readSheet(w).example).toEqual(['begroeten', '[бэхру́тэн]', 'приветствовать']);
    expect(w.findAll('[data-testid="card-sheet-example"] [data-testid="affix-part"]').map(p => p.text())).toEqual(['be', 'бэ']);
  });
});

describe('a sheet on a sound', () => {
  it('marks the sound in its example words and in their transcription', async () => {
    const w = await doMountAnswer('zus');
    await w.get('[data-testid="card-details"]').trigger('click');
    expect(readSheet(w).example).toEqual(['de zus, de bus', '[дэ зүс, дэ бүс]', 'Примеры: сестра, автобус.']);
    expect(w.findAll('[data-testid="card-sheet-example"] [data-testid="sound-part"]').map(p => p.text())).toEqual(['u', 'u', 'ү', 'ү']);
  });
});

describe('a sheet on a letter', () => {
  it('marks the letter in its example words', async () => {
    const w = await doMountAnswer('ltr-u');
    await w.get('[data-testid="card-details"]').trigger('click');
    expect(readSheet(w).example).toEqual(['de bus, nu', 'Примеры: автобус, сейчас.']);
    expect(w.findAll('[data-testid="card-sheet-example"] [data-testid="sound-part"]').map(p => p.text())).toEqual(['u', 'u']);
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

describe('a word mixed up with this one', () => {
  it('is listed with its meaning', async () => {
    mixUps.value = linked({}, 'kopen', 'koper');
    const w = await doOpenKopen();
    expect(readSheet(w).mixedUp).toEqual(['de koper покупатель']);
  });

  it('opens on a tap', async () => {
    mixUps.value = linked({}, 'kopen', 'koper');
    const w = await doOpenKopen();
    await w.get('[data-testid="card-sheet-mixed-word"]').trigger('click');
    expect(readSheet(w).word).toBe('de koper');
  });

  it('comes off on its cross, on both cards', async () => {
    mixUps.value = linked({}, 'kopen', 'koper');
    const w = await doOpenKopen();
    await w.get('[data-testid="card-sheet-mixed-remove"]').trigger('click');
    expect(readSheet(w).mixedUp).toEqual([]);
    expect(mixUps.value).toEqual({});
  });

  it('is added from the search, which stays open till Done', async () => {
    const w = await doOpenKopen();
    await w.get('[data-testid="card-sheet-mixed-add"]').trigger('click');
    const search = w.get('[data-testid="mix-up-search"]');
    search.element.textContent = 'покупатели';
    await search.trigger('input');
    await w.get('[data-testid="mix-up-option"]').trigger('click');
    await flushPromises();
    expect(readSheet(w).mixedUp).toEqual(['de kopers покупатели']);
    await w.get('[data-testid="mix-up-done"]').trigger('click');
    await flushPromises();
    expect(w.find('[data-testid="mix-up-sheet"]').exists()).toBe(false);
  });

  it('closes the search first on the back button', async () => {
    const w = await doOpenKopen();
    await w.get('[data-testid="card-sheet-mixed-add"]').trigger('click');
    await doPressBack(w);
    expect(w.find('[data-testid="mix-up-sheet"]').exists()).toBe(false);
    expect(readSheet(w).word).toBe('kopen');
  });
});

describe('a word learned again', () => {
  it('goes back to new alone, the words built on it kept', async () => {
    for (const id of ['kopen', 'koper', 'kopers']) learned.add(id);
    const w = await doOpenKopen();
    await doRelearn(w, 'Only this word');
    expect(readSheet(w).status).toBe('Not learned yet');
    expect(readSheet(w).derived).toEqual(['verkopen продавать new', 'de koper покупатель']);
  });

  it('takes every learned word built on it along, at any depth', async () => {
    for (const id of ['kopen', 'koper', 'kopers']) learned.add(id);
    const w = await doOpenKopen();
    await doRelearn(w, 'With 2 learned words from it');
    expect(readSheet(w).status).toBe('Not learned yet');
    expect([...learned]).toEqual([]);
  });

  it('offers the last choice first', async () => {
    for (const id of ['kopen', 'koper']) learned.add(id);
    settings.value = { language: 'en', relearnDeep: true };
    const w = await doOpenKopen();
    await w.get('[data-testid="card-sheet-relearn"]').trigger('click');
    expect(readRelearnChoices(w)).toEqual(['With 1 learned word from it', 'Only this word', 'Cancel']);
  });

  it('goes back to new at once when no learned word is built on it', async () => {
    learned.add('kopen');
    const w = await doOpenKopen();
    await w.get('[data-testid="card-sheet-relearn"]').trigger('click');
    expect(readSheet(w).status).toBe('Not learned yet');
    expect(readRelearnChoices(w)).toEqual([]);
  });

  it('is not offered while neither it nor a word built on it is learned', async () => {
    const w = await doOpenKopen();
    expect(w.find('[data-testid="card-sheet-relearn"]').exists()).toBe(false);
  });
});

// declarative helpers

async function doMount(id: string, secret = false) {
  const card = toStudyCard(cards.find(c => c.id === id)!);
  return mountSuspended(defineComponent(() => () => [h(Prompt, { card, secret }), h(CardSheet)]));
}

async function doMountAnswer(id: string, hidden = false) {
  const card = toStudyCard(cards.find(c => c.id === id)!);
  return mountSuspended(defineComponent(() => () => [h(Answer, { card, hidden, silent: true }), h(CardSheet)]));
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
    derived: w.findAll('[data-testid="card-sheet-derived-word"]').map(d => d.findAll(':scope > span').map(s => s.text()).join(' ')),
    related: w.findAll('[data-testid="card-sheet-related-word"]').map(d => d.findAll('span').map(s => s.text()).join(' ')),
    mixedUp: w.findAll('[data-testid="card-sheet-mixed-word"]').map(d => d.findAll('span').map(s => s.text()).join(' ')),
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

const readRelearnChoices = (w: VueWrapper) => w.findAll('[data-testid="card-sheet-relearn-choice"]').map(b => b.text());

async function doRelearn(w: VueWrapper, choice: string) {
  await w.get('[data-testid="card-sheet-relearn"]').trigger('click');
  await w.findAll('[data-testid="card-sheet-relearn-choice"]').find(b => b.text() === choice)!.trigger('click');
}
