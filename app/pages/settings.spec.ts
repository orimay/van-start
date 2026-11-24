import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { Rating } from 'ts-fsrs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import Settings from './settings.vue';
import { addCard, CUSTOM_ID, emptyCustom } from '@/utils/custom';
import { card, deck, lxb } from '@/utils/lexilize.fixtures';
import { sessions } from '@/db/sessions';

afterEach(() => vi.restoreAllMocks());

describe('a backup', () => {
  it('is saved as a file dated to the minute and named after the app version', async () => {
    const w = await mountSuspended(Settings);
    const download = givenDownloadsCaught();
    await doSave(w);
    const version = (useRuntimeConfig().public.version as string).replace(/\D/g, '');
    expect(download.name).toMatch(new RegExp(`^van-start-\\d{4}-\\d{2}-\\d{2}-\\d{4}-v${version.slice(0, 8)}-${version.slice(8)}\\.json$`));
    expect(w.get('[data-testid="imported"]').text()).toBe('Backup saved');
  });

  it('goes to the share sheet where the device has one', async () => {
    const shared: File[] = [];
    Object.assign(navigator, { canShare: () => true, share: async (data: ShareData) => void shared.push(...(data.files ?? [])) });
    const w = await mountSuspended(Settings);
    await doSave(w);
    Object.assign(navigator, { canShare: undefined, share: undefined });
    expect(shared.map(f => f.name)).toEqual([expect.stringMatching(/^van-start-\d{4}-\d{2}-\d{2}-\d{4}-v\d{8}-\d{4}\.json$/)]);
  });

  it('brings back progress and unfinished sessions', async () => {
    const store = useStore();
    await store.ready;
    store.rate('u1', Rating.Good);
    sessions.set('review-left:1:recall', '{"seed":"s"}');
    sessions.set('learn-resume:1', '{"at":3}');
    const w = await mountSuspended(Settings);
    const download = givenDownloadsCaught();
    await doSave(w);
    store.forgetLearning(['u1']);
    sessions.remove('review-left:1:recall');
    sessions.remove('learn-resume:1');
    await doPick(w, 'import', new File([await download.blob!.text()], 'van-start.json'));
    expect(store.isLearned('u1')).toBe(true);
    expect(sessions.get('review-left:1:recall')).toBe('{"seed":"s"}');
    expect(sessions.get('learn-resume:1')).toBe('{"at":3}');
  });
});

describe('loading Lexilize progress', () => {
  it('schedules the studied cards of our deck and counts them', async () => {
    const store = useStore();
    await store.ready;
    store.deck.value = { id: 'root', name: 'Root', cards: [{ id: 'k1' }, { id: 'k2' }, { id: 'k3' }] } as never;
    const due = Date.now() + 5 * 86_400_000;
    const w = await mountSuspended(Settings);
    await doPick(w, 'import', new File([lxb(deck(card('k1', { state: 3, due, since: Date.now() }), card('k2', { state: 1, due: 0, since: 0 }), card('elsewhere', { state: 3, due, since: 0 })))], 'backup.lxb'));
    expect(w.get('[data-testid="imported"]').text()).toBe('Lexilize: 1 studied cards loaded');
    expect(store.isLearned('k1')).toBe(true);
    expect(store.isDue('k1')).toBe(false);
    expect(store.isDue('k1', new Date(due + 1))).toBe(true);
    expect(store.isLearned('k2')).toBe(false);
  });
});

describe('a card learned after its last Lexilize review', () => {
  it('counts the Lexilize interval from the learning', async () => {
    const store = useStore();
    await store.ready;
    store.deck.value = { id: 'root', name: 'Root', cards: [{ id: 'k1' }] } as never;
    store.progress.value = {};
    store.reviews.value = {};
    store.rate('k1', Rating.Good);
    const now = Date.now();
    const w = await mountSuspended(Settings);
    await doPick(w, 'import', new File([lxb(deck(card('k1', { state: 3, due: now + 86_400_000, since: now - 30 * 86_400_000 })))], 'backup.lxb'));
    expect(store.isDue('k1', new Date(now + 2 * 86_400_000))).toBe(false);
    expect(store.isDue('k1', new Date(now + 32 * 86_400_000))).toBe(true);
  });
});

describe('settings', () => {
  it('offer a way back on the first visit', async () => {
    const store = useStore();
    await store.ready;
    store.configured.value = false;
    const w = await mountSuspended(Settings);
    expect(w.find('[data-testid="back"]').exists()).toBe(true);
    expect(store.configured.value).toBe(true);
  });

  it('are kept as soon as changed', async () => {
    const store = useStore();
    await store.ready;
    const w = await mountSuspended(Settings);
    await w.get('[data-testid="group-size"]').setValue('20');
    await w.get('[data-testid="ignore-case"]').setValue(false);
    expect(store.settings.value).toMatchObject({ groupSize: 20, ignoreCase: false });
  });

  it('take any group size of five or more', async () => {
    const store = useStore();
    await store.ready;
    const w = await mountSuspended(Settings);
    await w.get('[data-testid="group-size"]').setValue('7');
    expect(store.settings.value.groupSize).toBe(7);
    await w.get('[data-testid="group-size"]').setValue('3');
    expect(store.settings.value.groupSize).toBe(7);
  });

  it('explain what each game asks', async () => {
    const w = await mountSuspended(Settings);
    expect(w.get('[data-testid="game-hint-dictation"]').text()).toBe('Listen to the Dutch and write it down.');
  });
});

// declarative helpers

function givenDownloadsCaught() {
  const download: { name?: string; blob?: Blob } = {};
  vi.spyOn(URL, 'createObjectURL').mockImplementation(b => ((download.blob = b as Blob), 'blob:x'));
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    download.name = this.download;
  });
  return download;
}

async function doSave(w: VueWrapper) {
  await w.get('[data-testid="export"]').trigger('click');
  for (let i = 0; i < 5; i++) await flushPromises();
}

async function doPick(w: VueWrapper, testId: string, file: File) {
  let picker: HTMLInputElement | undefined;
  const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
    picker = this;
  });
  await w.get(`[data-testid="${testId}"]`).trigger('click');
  click.mockRestore();
  Object.defineProperty(picker!, 'files', { value: [file], configurable: true });
  picker!.dispatchEvent(new Event('change'));
  for (let i = 0; i < 5; i++) await flushPromises();
}

describe('games', () => {
  it('turns a game off', async () => {
    const store = useStore();
    await store.ready;
    store.updateSettings({ games: ['match', 'choice', 'recallNative', 'recall', 'type'] });
    const w = await mountSuspended(Settings);
    await w.get('[data-testid="game-match"]').setValue(false);
    expect(store.settings.value.games).toEqual(['choice', 'recallNative', 'recall', 'type']);
  });

  it('can open a group with pronouncing in place of the intro', async () => {
    const store = useStore();
    await store.ready;
    store.updateSettings({ games: ['match', 'pronounce'] });
    const w = await mountSuspended(Settings);
    await w.get('[data-testid="pronounce-first"]').setValue(true);
    expect(store.settings.value.pronounceFirst).toBe(true);
  });

  it('tops a short group up from the next group on choice', async () => {
    const store = useStore();
    await store.ready;
    store.updateSettings({ topUp: undefined });
    const w = await mountSuspended(Settings);
    expect((w.get('[data-testid="top-up"]').element as HTMLSelectElement).value).toBe('trouble');
    await w.get('[data-testid="top-up"]').setValue('next');
    expect(store.settings.value.topUp).toBe('next');
  });

  it('keeps the last game on', async () => {
    const store = useStore();
    await store.ready;
    store.updateSettings({ games: ['type'] });
    const w = await mountSuspended(Settings);
    expect(w.get('[data-testid="game-type"]').attributes('disabled')).toBeDefined();
  });
});

describe('recall time', () => {
  it('is saved as picked', async () => {
    const store = useStore();
    await store.ready;
    const w = await mountSuspended(Settings);
    await w.get('[data-testid="recall-seconds"]').setValue('20');
    expect(store.settings.value.recallSeconds).toBe(20);
    store.updateSettings({ recallSeconds: 10 });
  });
});

describe('sentences and combinations', () => {
  afterEach(() => useStore().updateSettings({ kinds: {}, groupKinds: {} }));

  it('are on by default and switch off each', async () => {
    const store = useStore();
    await store.ready;
    store.updateSettings({ kinds: {}, groupKinds: {} });
    const w = await mountSuspended(Settings);
    expect(['kind-sentence', 'kind-combination'].map(id => (w.get(`[data-testid="${id}"]`).element as HTMLInputElement).checked)).toEqual([true, true]);
    await w.get('[data-testid="kind-sentence"]').setValue(false);
    expect(store.settings.value.kinds).toEqual({ sentence: false });
  });

  it('say when groups keep their own and reset them on ask', async () => {
    const store = useStore();
    await store.ready;
    store.updateSettings({ kinds: {}, groupKinds: { g1: { sentence: true, combination: false }, g2: { sentence: false } } });
    const w = await mountSuspended(Settings);
    await w.get('[data-testid="kind-sentence"]').setValue(false);
    expect(w.get('[data-testid="kind-own-sentence"]').text()).toContain('2 groups keep their own');
    await w.get('[data-testid="kind-reset-sentence"]').trigger('click');
    expect([store.settings.value.groupKinds, w.find('[data-testid="kind-own-sentence"]').exists()]).toEqual([{ g1: { combination: false } }, false]);
  });
});
