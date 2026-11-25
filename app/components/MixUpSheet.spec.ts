import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';
import { nextTick } from 'vue';
import MixUpSheet from './MixUpSheet.vue';

const cards = [
  { id: 'kamer', f: 'комната', b: 'de kamer' },
  { id: 'kameraad', f: 'товарищ', b: 'de kameraad' },
  { id: 'slaapkamer', f: 'спальня', b: 'de slaapkamer' },
  { id: 'koken', f: 'готовить, варить', b: 'koken' },
  { id: 'kamp', f: 'лагерь', b: 'het kamp' },
];

beforeEach(() => {
  const { deck, confusions, unconfuse } = useStore();
  const was = deck.value;
  deck.value = { id: 'root', name: 'root', cards };
  onTestFinished(() => {
    deck.value = was;
    for (const [a, others] of Object.entries(confusions.value)) for (const b of others) unconfuse(a, b);
  });
});

describe('the mix-up sheet', () => {
  it('offers the words most like it before anything is typed', async () => {
    using w = await doMount('kamer');
    expect(optionsOf(w).slice(0, 3)).toEqual(['de kameraad', 'de slaapkamer', 'het kamp']);
  });

  it('finds a card by its meaning', async () => {
    using w = await doMount('kamer');
    await doSearch(w, 'вари');
    expect(optionsOf(w)).toEqual(['koken']);
  });

  it('finds a card by its Dutch word', async () => {
    using w = await doMount('koken');
    await doSearch(w, 'slaap');
    expect(optionsOf(w)).toEqual(['de slaapkamer']);
  });

  it('leaves out the card itself and the ones already linked', async () => {
    useStore().confuse('kamer', 'kameraad');
    using w = await doMount('kamer');
    await doSearch(w, 'kam');
    expect(optionsOf(w)).toEqual(['het kamp', 'de slaapkamer']);
  });

  it('says when nothing is found', async () => {
    using w = await doMount('kamer');
    await doSearch(w, 'zzz');
    expect(w.get('[data-testid="mix-up-none"]').text()).toBe('Nothing found');
  });

  it('hands over the card picked', async () => {
    using w = await doMount('kamer');
    await doSearch(w, 'спал');
    await w.get('[data-testid="mix-up-option"]').trigger('click');
    expect(w.emitted('pick')).toEqual([['slaapkamer']]);
  });

  it('closes on the device back button', async () => {
    using w = await doMount('kamer');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await flushPromises();
    expect(w.emitted('close')).toHaveLength(1);
  });
});

// declarative helpers

async function doMount(id: string) {
  const w = await mountSuspended(MixUpSheet, { props: { id } });
  return Object.assign(w, { [Symbol.dispose]: () => w.unmount() });
}

async function doSearch(w: VueWrapper, query: string) {
  const search = w.get('[data-testid="mix-up-search"]');
  search.element.textContent = query;
  await search.trigger('input');
  await nextTick();
}

function optionsOf(w: VueWrapper) {
  return w.findAll('[data-testid="mix-up-option"] span:first-child').map(o => o.text());
}
