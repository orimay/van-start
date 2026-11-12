import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { Rating } from 'ts-fsrs';
import { beforeEach, describe, expect, it } from 'vitest';
import Edit from './edit.vue';
import { cardsOf } from '@/utils/deck';
import { emptyCustom } from '@/utils/custom';
import { noEdits } from '@/utils/edits';

beforeEach(async () => {
  const store = useStore();
  await store.ready;
  store.course.value = { id: 'root', name: 'Root', children: [{ id: 'course', name: 'Course', cards: [{ id: 'c1', f: 'one', b: 'een', au: 'een', xb: 'Een ei.', axb: 'een-ei' }] }] };
  store.saveEdits(noEdits());
  store.saveCustom(emptyCustom());
});

describe('the root', () => {
  it('lists course sections and own groups', async () => {
    givenSection('Home');
    const w = await doMount();
    expect(w.findAll('[data-testid="section"]').map(s => s.text())).toEqual(['Course', 'Home']);
  });

  it('holds no cards and cannot be deleted or renamed', async () => {
    const w = await doMount();
    expect(w.find('[data-testid="save-card"]').exists()).toBe(false);
    expect(w.find('[data-testid="delete-section"]').exists()).toBe(false);
    expect(w.find('[data-testid="rename"]').exists()).toBe(false);
  });
});

describe('an own group', () => {
  it('stays out of the deck while it holds no card', async () => {
    const w = await doMount();
    await doAddSection(w, 'Home');
    expect(sectionNames()).toEqual(['Course']);
  });

  it('joins the deck under its own name once a card is added', async () => {
    const w = await doMount(givenSection('Home'));
    await doAddCard(w, { dutch: 'het huis', native: 'house' });
    expect(sectionNames()).toEqual(['Course', 'Home']);
    expect(cardsOf(useStore().deck.value!).map(c => c.b)).toEqual(['een', 'het huis']);
    expect(cardTexts(w)).toEqual(['het huis — house']);
  });

  it('is added and opened', async () => {
    const w = await doMount();
    await doAddSection(w, 'Home');
    expect(w.findAll('[data-testid="section"]').at(-1)!.attributes('href')).toMatch(/\/edit\?id=/);
  });

  it('is renamed', async () => {
    const w = await doMount(givenSection('Home'));
    await doType(w, 'name', 'House');
    await doClick(w, 'rename');
    const root = await doMount();
    expect(root.findAll('[data-testid="section"]').map(s => s.text())).toEqual(['Course', 'House']);
  });

  it('is deleted with its cards and their progress', async () => {
    const w = await doMount(givenSection('Home'));
    await doAddCard(w, { dutch: 'het huis', native: 'house' });
    const card = cardsOf(useStore().custom.value)[0]!.id;
    useStore().rate(card, Rating.Good);
    await doClick(w, 'delete-section');
    expect(useStore().isLearned(card)).toBe(false);
    expect(sectionNames()).toEqual(['Course']);
    const root = await doMount();
    expect(root.findAll('[data-testid="section"]').map(s => s.text())).toEqual(['Course']);
  });
});

describe('a course section', () => {
  it('is renamed', async () => {
    const w = await doMount('course');
    await doType(w, 'name', 'Basics');
    await doClick(w, 'rename');
    expect(sectionNames()).toEqual(['Basics']);
  });

  it('is deleted with its cards and their progress', async () => {
    useStore().rate('c1', Rating.Good);
    const w = await doMount('course');
    await doClick(w, 'delete-section');
    expect(sectionNames()).toEqual([]);
    expect(useStore().isLearned('c1')).toBe(false);
    const root = await doMount();
    expect(root.findAll('[data-testid="section"]').map(s => s.text())).toEqual([]);
  });

  it('lists its cards', async () => {
    const w = await doMount('course');
    expect(cardTexts(w)).toEqual(['een — one']);
  });

  it('takes a new card', async () => {
    const w = await doMount('course');
    await doAddCard(w, { dutch: 'twee', native: 'two' });
    expect(cardsOf(useStore().deck.value!).map(c => c.b)).toEqual(['een', 'twee']);
    expect(cardTexts(w)).toEqual(['een — one', 'twee — two']);
  });
});

describe('a course card', () => {
  it('is edited, keeping its voice while the Dutch stays', async () => {
    const w = await doMount('course');
    await doClick(w, 'card');
    await doType(w, 'native', 'a, one');
    await doClick(w, 'save-card');
    expect(cardsOf(useStore().deck.value!)).toEqual([expect.objectContaining({ id: 'c1', b: 'een', f: 'a, one', au: 'een', axb: 'een-ei' })]);
  });

  it('loses the voice of the Dutch it no longer has', async () => {
    const w = await doMount('course');
    await doClick(w, 'card');
    await doType(w, 'dutch', 'één');
    await doClick(w, 'save-card');
    const [card] = cardsOf(useStore().deck.value!);
    expect(card).toEqual(expect.objectContaining({ b: 'één', axb: 'een-ei' }));
    expect(card!.au).toBeUndefined();
  });

  it('is deleted with its progress', async () => {
    useStore().rate('c1', Rating.Good);
    const w = await doMount('course');
    await doClick(w, 'delete-card');
    expect(cardTexts(w)).toEqual([]);
    expect(cardsOf(useStore().deck.value!)).toEqual([]);
    expect(useStore().isLearned('c1')).toBe(false);
  });

  it('added by the learner is edited and deleted', async () => {
    const w = await doMount('course');
    await doAddCard(w, { dutch: 'twee', native: 'two' });
    await w.findAll('[data-testid="card"]')[1]!.trigger('click');
    await doType(w, 'native', 'a pair');
    await doClick(w, 'save-card');
    expect(cardTexts(w)).toEqual(['een — one', 'twee — a pair']);
    await w.findAll('[data-testid="delete-card"]')[1]!.trigger('click');
    await flushPromises();
    expect(cardsOf(useStore().deck.value!).map(c => c.b)).toEqual(['een']);
  });
});

describe('an own card', () => {
  it('keeps transcription and examples', async () => {
    const w = await doMount(givenSection('Home'));
    await doAddCard(w, { dutch: 'het huis', native: 'house', transcription: 'hœys', note: 'a building', dutchExample: 'Het huis is groot.', nativeExample: 'The house is big.' });
    expect(cardsOf(useStore().custom.value)).toEqual([expect.objectContaining({ b: 'het huis', f: 'house', tr: 'hœys', n: 'a building', xb: 'Het huis is groot.', xf: 'The house is big.' })]);
  });

  it('is not added without both sides', async () => {
    const w = await doMount(givenSection('Home'));
    await doAddCard(w, { dutch: 'het huis', native: '' });
    expect(cardsOf(useStore().custom.value)).toEqual([]);
  });

  it('is edited', async () => {
    const w = await doMount(givenSection('Home'));
    await doAddCard(w, { dutch: 'het huis', native: 'house' });
    await doClick(w, 'card');
    expect(textOf(w, 'dutch')).toBe('het huis');
    await doType(w, 'native', 'home');
    await doClick(w, 'save-card');
    expect(cardTexts(w)).toEqual(['het huis — home']);
  });

  it('is deleted with its progress', async () => {
    const w = await doMount(givenSection('Home'));
    await doAddCard(w, { dutch: 'het huis', native: 'house' });
    const id = cardsOf(useStore().custom.value)[0]!.id;
    useStore().rate(id, Rating.Good);
    await doClick(w, 'delete-card');
    expect(cardTexts(w)).toEqual([]);
    expect(useStore().isLearned(id)).toBe(false);
  });
});

// declarative helpers

function doMount(id?: string) {
  return mountSuspended(Edit, { route: id ? `/edit?id=${id}` : '/edit' });
}

function givenSection(name: string) {
  const store = useStore();
  const before = new Set((store.custom.value.children ?? []).map(c => c.id));
  const next = { ...store.custom.value, children: [...(store.custom.value.children ?? []), { id: crypto.randomUUID(), name, children: [] }] };
  store.saveCustom(next);
  return next.children.find(c => !before.has(c.id))!.id;
}

function sectionNames() {
  return (useStore().deck.value!.children ?? []).map(c => c.name);
}

function cardTexts(w: VueWrapper) {
  return w.findAll('[data-testid="card"]').map(c => c.text().replace(/\s+/g, ' ').trim());
}

function textOf(w: VueWrapper, testId: string) {
  return w.get(`[data-testid="${testId}"]`).element.textContent;
}

async function doType(w: VueWrapper, testId: string, text: string) {
  const el = w.get(`[data-testid="${testId}"]`);
  el.element.textContent = text;
  await el.trigger('input');
}

async function doClick(w: VueWrapper, testId: string) {
  await w.get(`[data-testid="${testId}"]`).trigger('click');
  await flushPromises();
}

async function doAddSection(w: VueWrapper, name: string) {
  await doType(w, 'new-section', name);
  await doClick(w, 'add-section');
}

async function doAddCard(w: VueWrapper, card: { dutch: string; native: string; transcription?: string; note?: string; dutchExample?: string; nativeExample?: string }) {
  await doType(w, 'dutch', card.dutch);
  await doType(w, 'native', card.native);
  if (card.transcription) await doType(w, 'transcription', card.transcription);
  if (card.note) await doType(w, 'note', card.note);
  if (card.dutchExample) await doType(w, 'dutch-example', card.dutchExample);
  if (card.nativeExample) await doType(w, 'native-example', card.nativeExample);
  await doClick(w, 'save-card');
}
