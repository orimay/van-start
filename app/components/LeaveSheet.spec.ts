import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEAVE_WAIT } from '@/utils/back';
import LeaveSheet from './LeaveSheet.vue';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('back on the first page', () => {
  it('asks before leaving the app', async () => {
    using w = await doMount();
    await w.browser.pressBack();
    expect(isAsking(w)).toBe(true);
    expect(w.browser.left).toBe(false);
  });

  it('asks nothing until back is pressed', async () => {
    using w = await doMount();
    expect(isAsking(w)).toBe(false);
  });
});

describe('the leave question', () => {
  it('closes on another back, keeping the app', async () => {
    using w = await doMount();
    await w.browser.pressBack();
    await w.browser.pressBack();
    expect(isAsking(w)).toBe(false);
    expect(w.browser.left).toBe(false);
  });

  for (const [how, act] of [
    ['Stay', (w: Mounted) => doStay(w)],
    ['another back', (w: Mounted) => w.browser.pressBack()],
  ] as const) {
    it(`asks again on the next back after ${how}`, async () => {
      using w = await doMount();
      await w.browser.pressBack();
      await act(w);
      await w.browser.pressBack();
      expect(isAsking(w)).toBe(true);
      expect(w.browser.left).toBe(false);
    });
  }

  it('leaves the app on Leave', async () => {
    using w = await doMount();
    await w.browser.pressBack();
    await doLeave(w);
    expect(w.browser.left).toBe(true);
  });
});

describe('back to the first page from a page opened on it', () => {
  it('asks nothing, then asks on the next back', async () => {
    using w = await doMount({ onPage: true });
    await w.browser.pressBack();
    expect(isAsking(w)).toBe(false);
    await w.browser.pressBack();
    expect(isAsking(w)).toBe(true);
    expect(w.browser.left).toBe(false);
  });
});

describe('with nothing before the app', () => {
  it('tries to close the app on Leave', async () => {
    using w = await doMount({ pageBefore: false });
    await w.browser.pressBack();
    await doLeave(w);
    expect(window.close).toHaveBeenCalled();
  });

  it('leaves on the next back after Leave, saying so', async () => {
    using w = await doMount({ pageBefore: false });
    await w.browser.pressBack();
    await doLeave(w);
    expect(w.get('[data-testid="leave-hint"]').text()).toBe('Press back once more to leave.');
    await w.browser.pressBack();
    expect(w.browser.left).toBe(true);
  });

  it('asks again on the next back after Stay', async () => {
    using w = await doMount({ pageBefore: false });
    await w.browser.pressBack();
    await doLeave(w);
    await doStay(w);
    await w.browser.pressBack();
    expect(isAsking(w)).toBe(true);
    expect(w.browser.left).toBe(false);
  });
});

// declarative helpers

type Mounted = VueWrapper & { browser: FakeBrowser };

/** `onPage`: the app stands on a page it opened from its first one before it guarded against leaving. */
async function doMount({ pageBefore = true, onPage = false } = {}) {
  vi.useFakeTimers();
  vi.spyOn(window, 'close').mockImplementation(() => undefined);
  const browser = useFakeBrowser(pageBefore);
  if (onPage) {
    history.replaceState({ ...history.state, forward: '/settings' }, '', location.href);
    history.pushState({ ...history.state, back: '/', forward: null }, '', location.href);
  }
  const w = await mountSuspended(LeaveSheet);
  await flushPromises();
  return Object.assign(w, { browser, [Symbol.dispose]: () => w.unmount() });
}

async function doStay(w: VueWrapper) {
  await w.get('[data-testid="leave-cancel"]').trigger('click');
  await flushPromises();
}

async function doLeave(w: VueWrapper) {
  await w.get('[data-testid="leave-confirm"]').trigger('click');
  await vi.advanceTimersByTimeAsync(LEAVE_WAIT);
  await flushPromises();
}

function isAsking(w: VueWrapper) {
  return w.find('[data-testid="leave-sheet"]').exists();
}

type FakeBrowser = ReturnType<typeof useFakeBrowser>;

/**
 * The browser's session history, which happy-dom does not move on back: entries from the app's first
 * one on, and whether a page before the app takes a back past it. The device's back button on the
 * app's first entry leaves the app either way; a script's step out of range does nothing.
 */
function useFakeBrowser(pageBefore: boolean) {
  const replace = history.replaceState.bind(history);
  const { leaveGuard: _guard, backLayer: _layer, ...first } = (history.state ?? {}) as Record<string, unknown>;
  replace({ ...first, back: null }, '', location.href);
  const entries: unknown[] = [history.state];
  let at = 0;
  const browser = { left: false, pressBack: async () => {} };
  const leave = () => {
    browser.left = true;
    window.dispatchEvent(new Event('pagehide'));
  };
  const go = (delta = 0) => {
    const to = at + delta;
    if (to < 0) return pageBefore && leave();
    if (to >= entries.length) return;
    at = to;
    replace(entries[at], '', location.href);
    queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate', { state: history.state })));
  };
  vi.spyOn(history, 'pushState').mockImplementation(state => {
    entries.splice(++at, Infinity, state);
    replace(state, '', location.href);
  });
  vi.spyOn(history, 'replaceState').mockImplementation(state => {
    entries[at] = state;
    replace(state, '', location.href);
  });
  vi.spyOn(history, 'go').mockImplementation(go);
  vi.spyOn(history, 'back').mockImplementation(() => go(-1));
  browser.pressBack = async () => {
    if (at === 0) leave();
    else go(-1);
    await flushPromises();
  };
  return browser;
}
