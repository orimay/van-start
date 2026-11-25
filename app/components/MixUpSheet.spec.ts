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

  it('lists the words a typed answer may be first, and only there', async () => {
    using w = await doMount('kamer', ['kamp', 'koken']);
    expect(readSections(w)[0]).toEqual(['The typed answer is', 'koken', 'het kamp']);
    expect(optionsOf(w).filter(o => o === 'het kamp')).toHaveLength(1);
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

  it('leaves out the card itself', async () => {
    using w = await doMount('kamer');
    await doSearch(w, 'kam');
    expect(optionsOf(w)).not.toContain('de kamer');
  });

  it('lists the cards already linked first, ticked', async () => {
    useStore().confuse('kamer', 'koken');
    using w = await doMount('kamer');
    expect(readSections(w)).toEqual([
      ['Mixed up with', 'koken ✓'],
      ['Looks alike', 'de kameraad', 'de slaapkamer', 'het kamp'],
    ]);
  });

  it('says when nothing is found, and clears the search on a tap', async () => {
    using w = await doMount('kamer');
    await doSearch(w, 'zzz');
    expect(w.get('[data-testid="mix-up-none"]').text()).toContain('Nothing found');
    await w.get('[data-testid="mix-up-clear"]').trigger('click');
    expect(optionsOf(w).slice(0, 3)).toEqual(['de kameraad', 'de slaapkamer', 'het kamp']);
  });

  describe('a card tapped', () => {
    it('is linked, handed over and stays in the list ticked', async () => {
      using w = await doMount('kamer');
      await doSearch(w, 'спал');
      await doTap(w, 'de slaapkamer');
      expect(useStore().confusions.value.kamer).toEqual(['slaapkamer']);
      expect(w.emitted('pick')).toEqual([['slaapkamer', true]]);
      expect(readOptions(w)).toEqual(['de slaapkamer ✓']);
    });

    it('is unlinked and handed back when tapped again', async () => {
      using w = await doMount('kamer');
      await doTap(w, 'het kamp');
      await doTap(w, 'het kamp');
      expect(useStore().confusions.value.kamer ?? []).toEqual([]);
      expect(w.emitted('drop')).toEqual([['kamp']]);
      expect(readOptions(w)).toContain('het kamp');
    });
  });

  describe('in a step', () => {
    it('lists the cards linked before first, not ticked until mixed up again', async () => {
      useStore().confuse('kamer', 'koken');
      using w = await doMount('kamer', undefined, []);
      expect(readSections(w)[0]).toEqual(['Mixed up before', 'koken']);
    });

    it('counts a card linked before as mixed up again, its link kept', async () => {
      useStore().confuse('kamer', 'koken');
      using w = await doMount('kamer', undefined, []);
      await doTap(w, 'koken');
      expect(w.emitted('pick')).toEqual([['koken', false]]);
      expect(w.emitted('drop')).toBeUndefined();
      expect(useStore().confusions.value.kamer).toEqual(['koken']);
    });

    it('takes back that mix-up on another tap, its link kept', async () => {
      useStore().confuse('kamer', 'koken');
      using w = await doMount('kamer', undefined, ['koken']);
      expect(readSections(w)[0]).toEqual(['Mixed up before', 'koken ✓']);
      await doTap(w, 'koken');
      expect(w.emitted('drop')).toEqual([['koken']]);
      expect(useStore().confusions.value.kamer).toEqual(['koken']);
    });

    it('links a new card and says so', async () => {
      using w = await doMount('kamer', undefined, []);
      await doTap(w, 'het kamp');
      expect(w.emitted('pick')).toEqual([['kamp', true]]);
      expect(useStore().confusions.value.kamer).toEqual(['kamp']);
    });

    it('unlinks a card linked in this step when taken back', async () => {
      using w = await doMount('kamer', undefined, []);
      await doTap(w, 'het kamp');
      await w.setProps({ mixed: ['kamp'], fresh: ['kamp'] });
      await doTap(w, 'het kamp');
      expect(w.emitted('drop')).toEqual([['kamp']]);
      expect(useStore().confusions.value.kamer ?? []).toEqual([]);
    });
  });

  it('closes on Done', async () => {
    using w = await doMount('kamer');
    await w.get('[data-testid="mix-up-done"]').trigger('click');
    expect(w.emitted('close')).toHaveLength(1);
  });

  it('keeps the search and Done under the list, in thumb reach', async () => {
    using w = await doMount('kamer');
    const order = w.findAll('[data-testid="mix-up-options"], [data-testid="mix-up-search"], [data-testid="mix-up-done"]').map(e => e.attributes('data-testid'));
    expect(order).toEqual(['mix-up-options', 'mix-up-search', 'mix-up-done']);
  });

  it('closes on the device back button', async () => {
    using w = await doMount('kamer');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await flushPromises();
    expect(w.emitted('close')).toHaveLength(1);
  });
});

// declarative helpers

/** `mixed`: opened from a step, with these cards taken for it there. */
async function doMount(id: string, typed?: string[], mixed?: string[]) {
  const w = await mountSuspended(MixUpSheet, { props: { id, open: true, typed, mixed } });
  return Object.assign(w, { [Symbol.dispose]: () => w.unmount() });
}

async function doSearch(w: VueWrapper, query: string) {
  const search = w.get('[data-testid="mix-up-search"]');
  search.element.textContent = query;
  await search.trigger('input');
  await nextTick();
}

function optionsOf(w: VueWrapper) {
  return w.findAll('[data-testid="mix-up-option"] [data-testid="mix-up-word"]').map(o => o.text());
}

/** Each option's word, with a tick when it is linked. */
function readOptions(w: VueWrapper) {
  return w.findAll('[data-testid="mix-up-option"]').map(o => `${o.get('[data-testid="mix-up-word"]').text()}${o.attributes('aria-pressed') === 'true' ? ' ✓' : ''}`);
}

/** Each section's header, then its options read as by `readOptions`. */
function readSections(w: VueWrapper) {
  return w.findAll('[data-testid="mix-up-typed"], [data-testid="mix-up-section"]').map(section => [section.get('h3').text(), ...readOptions(section as unknown as VueWrapper)]);
}

async function doTap(w: VueWrapper, word: string) {
  await w.findAll('[data-testid="mix-up-option"]').find(o => o.get('[data-testid="mix-up-word"]').text() === word)!.trigger('click');
  await nextTick();
}
