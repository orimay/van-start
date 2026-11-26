import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEAVE_WAIT } from '@/utils/back';
import { useStore } from '@/composables/useStore';
import LeaveSheet from './LeaveSheet.vue';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

describe('back on a lesson opened in place of the first page', () => {
  it('goes home, asking nothing', async () => {
    using w = await doMount({ route: '/learn' });
    await doBackHome(w);
    expect(isAsking(w)).toBe(false);
    expect(w.browser.left).toBe(false);
    expect(pathOf()).toBe('/');
  });

  it('asks on the next back, from home', async () => {
    using w = await doMount({ route: '/learn' });
    await doBackHome(w);
    await w.browser.pressBack();
    expect(isAsking(w)).toBe(true);
    expect(w.browser.left).toBe(false);
  });

  it('goes home on a phone too', async () => {
    using w = await doMount({ route: '/learn', phone: true });
    await doBackHome(w);
    expect(isAsking(w)).toBe(false);
    expect(pathOf()).toBe('/');
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

describe('on a phone that skips entries pushed on back', () => {
  it('asks before leaving the app', async () => {
    using w = await doMount({ phone: true });
    await w.browser.pressBack();
    expect(isAsking(w)).toBe(true);
    expect(w.browser.left).toBe(false);
  });

  it('closes the question on another back, keeping the app', async () => {
    using w = await doMount({ phone: true });
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
      using w = await doMount({ phone: true });
      await w.browser.pressBack();
      await act(w);
      await w.browser.pressBack();
      expect(isAsking(w)).toBe(true);
      expect(w.browser.left).toBe(false);
    });
  }

  it('leaves the app on Leave', async () => {
    using w = await doMount({ phone: true });
    await w.browser.pressBack();
    await doLeave(w);
    expect(w.browser.left).toBe(true);
  });

  it('leaves on the next back after Leave with nothing before the app', async () => {
    using w = await doMount({ phone: true, pageBefore: false });
    await w.browser.pressBack();
    await doLeave(w);
    expect(window.close).toHaveBeenCalled();
    await w.browser.pressBack();
    expect(w.browser.left).toBe(true);
  });
});

// declarative helpers

type Mounted = VueWrapper & { browser: FakeBrowser };

/**
 * `onPage`: the app stands on a page it opened from its first one before it guarded against leaving.
 * `phone`: Chrome on a touch screen, see `useFakeBrowser`.
 * `route`: the page the app stands on, in place of its first one.
 */
async function doMount({ pageBefore = true, onPage = false, phone = false, route = '/' } = {}) {
  useStore().configured.value = true;
  await useRouter().replace(route);
  vi.useFakeTimers();
  vi.spyOn(window, 'close').mockImplementation(() => undefined);
  const browser = useFakeBrowser(pageBefore, phone);
  if (onPage) {
    history.replaceState({ ...history.state, forward: '/settings' }, '', location.href);
    history.pushState({ ...history.state, back: '/', forward: null }, '', location.href);
  }
  const w = await mountSuspended(LeaveSheet, { route });
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

/** Back off the lesson, letting the router's navigation home settle. */
async function doBackHome(w: Mounted) {
  await w.browser.pressBack();
  await vi.runOnlyPendingTimersAsync();
  await flushPromises();
}

const pathOf = () => useRouter().currentRoute.value.path;

function isAsking(w: VueWrapper) {
  return w.find('[data-testid="leave-sheet"]').exists();
}

type FakeBrowser = ReturnType<typeof useFakeBrowser>;

/**
 * The browser's session history, which happy-dom does not move on back: entries from the app's first
 * one on, and whether a page before the app takes a back past it. The device's back button on the
 * app's first entry leaves the app either way; a script's step out of range does nothing.
 * `phone` is Chrome on a touch screen: the back button closes the latest CloseWatcher first, and skips
 * an entry the page pushed another over while handling a back, with no tap since.
 */
function useFakeBrowser(pageBefore: boolean, phone = false) {
  const replace = history.replaceState.bind(history);
  const { leaveGuard: _guard, backLayer: _layer, ...first } = (history.state ?? {}) as Record<string, unknown>;
  replace({ ...first, back: null }, '', location.href);
  const entries: unknown[] = [history.state];
  const skipped = new Set<unknown>();
  let onBack = false;
  let at = 0;
  const watchers: FakeCloseWatcher[] = [];
  class FakeCloseWatcher {
    onclose: (() => void) | null = null;
    constructor() {
      watchers.push(this);
    }
    destroy() {
      const at = watchers.indexOf(this);
      if (at >= 0) watchers.splice(at, 1);
    }
  }
  if (phone) {
    vi.stubGlobal('CloseWatcher', FakeCloseWatcher);
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: query === '(pointer: coarse)', media: query }) as MediaQueryList);
  }
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
    if (phone && onBack) skipped.add(entries[at]);
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
    onBack = true;
    const watcher = phone && watchers.at(-1);
    const to = entries.findLastIndex((entry, i) => i < at && !skipped.has(entry));
    if (watcher) {
      watcher.destroy();
      watcher.onclose?.();
    } else if (to < 0) leave();
    else go(to - at);
    await flushPromises();
    onBack = false;
  };
  return browser;
}
