import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import SectionTree from './SectionTree.vue';
import { LONG_PRESS_MS } from '@/composables/useLongPress';
import type { DeckNode } from '@/utils/deck';

const { navigate, learned, settings, reviewLog, forgetLearning, forgetReviews } = vi.hoisted(() => ({ forgetLearning: vi.fn(), forgetReviews: vi.fn(), navigate: vi.fn(), learned: new Set<string>(), settings: { value: { groupSize: 5, games: ['recall'] as string[] } }, reviewLog: { value: undefined as { day: string; ids: string[] } | undefined } }));
mockNuxtImport('navigateTo', () => navigate);
mockNuxtImport('useStore', () => () => ({ isLearned: (id: string) => learned.has(id), isThrough: (id: string) => learned.has(id), settings, reviewLog, forgetLearning, forgetReviews }));

const section: DeckNode = { id: 's', name: 'Lesson 1', cards: [{ id: 'a', f: 'f', b: 'b' }, { id: 'b', f: 'f', b: 'b' }] };

beforeEach(async () => {
  await useRouter().replace({ hash: '' });
  navigate.mockReset();
  forgetLearning.mockReset();
  forgetReviews.mockReset();
  learned.clear();
  reviewLog.value = undefined;
  settings.value = { groupSize: 5, games: ['recall'] };
});

describe('section progress', () => {
  it('shows the learned share as a percentage before the counts', async () => {
    learned.add('a');
    const w = await doMount();
    expect(w.get('[data-testid="learned-share"]').text()).toBe('50%');
    expect(w.get('[data-testid="learned-count"]').text()).toBe('1/2');
  });
});

describe('review menu', () => {
  it('shows how many learned cards of the section each game reviewed today', async () => {
    learned.add('a').add('b');
    reviewLog.value = { day: new Date().toDateString(), ids: ['type:a', 'type:x', 'recall:b'] };
    const w = await doMount();
    await doStart(w);
    const writing = w.get('[data-testid="review-type"]');
    expect(writing.findAll('span').filter(s => !s.find('span').exists()).map(s => s.text()).filter(Boolean)).toEqual(['Review: Writing', '1/2']);
    expect(writing.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('50');
  });
});

describe('groups left', () => {
  it('count the groups the new cards still make', async () => {
    settings.value = { groupSize: 2, games: ['recall'] };
    const w = await doMount({ ...section, cards: Array.from({ length: 7 }, (_, i) => ({ id: `c${i}`, f: 'f', b: 'b' })) });
    expect(w.get('[data-testid="groups-left"]').text()).toBe('4/4 groups left');
  });

  it('leave out the learned cards', async () => {
    settings.value = { groupSize: 1, games: ['recall'] };
    learned.add('a');
    const w = await doMount();
    expect(w.get('[data-testid="groups-left"]').text()).toBe('1/2 groups left');
  });

  it('are not shown for a learned section', async () => {
    learned.add('a').add('b');
    const w = await doMount();
    expect(w.find('[data-testid="groups-left"]').exists()).toBe(false);
  });
});

describe('start button', () => {
  it('goes straight to learning when nothing is learned', async () => {
    const w = await doMount();
    await doStart(w);
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ path: '/learn' }));
    expect(w.find('[data-testid="start-menu"]').exists()).toBe(false);
  });

  it('offers a review per review game, on or off, when everything is learned', async () => {
    settings.value = { groupSize: 5, games: ['match'] };
    learned.add('a').add('b');
    const w = await doMount();
    await doStart(w);
    expect(navigate).not.toHaveBeenCalled();
    expect(w.findAll('[data-testid="start-menu"] a').map(a => a.findAll('span').filter(s => !s.find('span').exists()).map(s => s.text()).filter(Boolean).join(' '))).toEqual(['Review: Writing 0/2', 'Review: Dictation 0/2', 'Review: Speaking 0/2', 'Review: Listening 0/2', 'Review: Reading 0/2', 'Review: Pronouncing 0/2']);
    expect(w.get('[data-testid="review-type"]').attributes('href')).toContain('game=type');
  });

  it('leaves affixes out of the games played by ear', async () => {
    learned.add('a').add('b').add('c');
    const w = await doMount({ ...section, cards: [{ id: 'c', f: 'f', b: 'be-', xb: 'bewonen' }, ...section.cards!] });
    await doStart(w);
    expect(w.findAll('[data-testid="start-menu"] a').map(a => a.findAll('span').filter(s => !s.find('span').exists()).map(s => s.text()).filter(Boolean).join(' '))).toEqual(['Review: Writing 0/3', 'Review: Dictation 0/2', 'Review: Speaking 0/3', 'Review: Listening 0/2', 'Review: Reading 0/3', 'Review: Pronouncing 0/3']);
  });

  it('offers no game played by ear to a section of affixes', async () => {
    learned.add('c');
    const w = await doMount({ ...section, cards: [{ id: 'c', f: 'f', b: 'be-', xb: 'bewonen' }] });
    await doStart(w);
    expect(w.findAll('[data-testid="start-menu"] a').map(a => a.attributes('data-testid'))).toEqual(['review-type', 'review-recall', 'review-recallNative', 'review-pronounce']);
  });

  it('offers review and then learn in a popup when both apply, keeping the button', async () => {
    learned.add('a');
    const w = await doMount();
    await doStart(w);
    expect(navigate).not.toHaveBeenCalled();
    expect(w.findAll('[data-testid="start-menu"] a').map(a => a.findAll('span').filter(s => !s.find('span').exists()).map(s => s.text()).filter(Boolean)[0] ?? a.text())).toEqual(['Review: Writing', 'Review: Dictation', 'Review: Speaking', 'Review: Listening', 'Review: Reading', 'Review: Pronouncing', 'Learn']);
    expect(w.find('[data-testid="start"]').exists()).toBe(true);
  });
});

describe('start menu', () => {
  it('is titled with the section name', async () => {
    learned.add('a');
    const w = await doMount();
    await doStart(w);
    expect(w.get('[data-testid="sheet-title"]').text()).toBe(section.name);
  });

  it('shows how much of the section is learned on learn', async () => {
    learned.add('a');
    const w = await doMount();
    await doStart(w);
    expect(w.get('[data-testid="learn"]').text()).toMatch(/Learn\s*1\/\d+/);
    expect(w.find('[data-testid="learn"] [role="progressbar"]').exists()).toBe(true);
  });
});

describe('whole deck row', () => {
  it('links to every card at once', async () => {
    learned.add('a');
    const w = await mountSuspended(SectionTree, { props: { nodes: [section], path: [], whole: true } });
    await doStart(w);
    expect(w.get('[data-testid="learn"]').attributes('href')).toContain('path=all');
  });

  it('keeps the page under it from scrolling while open', async () => {
    learned.add('a');
    const w = await doMount();
    await doStart(w);
    expect(document.body.style.overflow).toBe('hidden');
    w.unmount();
  });
});

describe('a long press', () => {
  it('on a review game resets that game for the section after two yeses', async () => {
    learned.add('a');
    const w = await doMount();
    await doStart(w);
    await doLongPress(w, 'review-type');
    expect(w.get('[data-testid="reset-title"]').text()).toBe('Lesson 1: Review: Writing');
    await doConfirm(w);
    expect(forgetReviews).not.toHaveBeenCalled();
    await doConfirm(w);
    expect(forgetReviews).toHaveBeenCalledWith(['a'], ['type']);
    expect(forgetLearning).not.toHaveBeenCalled();
  });

  it('on learn makes the section new again after two yeses', async () => {
    learned.add('a');
    const w = await doMount();
    await doStart(w);
    await doLongPress(w, 'learn');
    await doConfirm(w);
    await doConfirm(w);
    expect(forgetLearning).toHaveBeenCalledWith(['a', 'b']);
    expect(forgetReviews).not.toHaveBeenCalled();
  });

  it('resets nothing when cancelled at the last step', async () => {
    learned.add('a');
    const w = await doMount();
    await doStart(w);
    await doLongPress(w, 'learn');
    await doConfirm(w);
    await w.get('[data-testid="reset-cancel"]').trigger('click');
    expect(forgetLearning).not.toHaveBeenCalled();
    expect(w.find('[data-testid="reset-sheet"]').exists()).toBe(false);
  });

  it('is not a tap: a tap asks nothing', async () => {
    learned.add('a');
    const w = await doMount();
    await doStart(w);
    await w.get('[data-testid="learn"]').trigger('pointerdown');
    await w.get('[data-testid="learn"]').trigger('pointerup');
    await new Promise(r => setTimeout(r, LONG_PRESS_MS + 50));
    expect(w.find('[data-testid="reset-sheet"]').exists()).toBe(false);
  });
});

// declarative helpers

async function doLongPress(w: VueWrapper, testId: string) {
  await w.get(`[data-testid="${testId}"]`).trigger('pointerdown');
  await new Promise(r => setTimeout(r, LONG_PRESS_MS + 50));
  await w.get(`[data-testid="${testId}"]`).trigger('pointerup');
  await nextTick();
}

async function doConfirm(w: VueWrapper) {
  await w.get('[data-testid="reset-confirm"]').trigger('click');
  await nextTick();
}

function doMount(node = section) {
  return mountSuspended(SectionTree, { props: { nodes: [node], path: [] } });
}

async function doStart(w: VueWrapper) {
  await w.get('[data-testid="start"]').trigger('click');
  // Either it went straight in, or the menu's history entry lands.
  await vi.waitFor(() => expect(navigate.mock.calls.length || useRouter().currentRoute.value.hash).toBeTruthy());
  await flushPromises();
}
