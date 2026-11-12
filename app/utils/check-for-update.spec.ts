import { effectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkWhileOpen } from './check-for-update';

let scope: ReturnType<typeof effectScope>;
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  scope.stop();
  vi.useRealTimers();
  setVisibility('visible');
});

describe('an open app', () => {
  it('checks for an update every minute', () => {
    const check = givenChecking();
    vi.advanceTimersByTime(3 * 60_000);
    expect(check).toHaveBeenCalledTimes(3);
  });

  it('checks as soon as it comes back into view', () => {
    const check = givenChecking();
    setVisibility('hidden');
    setVisibility('visible');
    expect(check).toHaveBeenCalledOnce();
  });
});

describe('a hidden app', () => {
  it('does not check', () => {
    const check = givenChecking();
    setVisibility('hidden');
    vi.advanceTimersByTime(3 * 60_000);
    expect(check).not.toHaveBeenCalled();
  });
});

// declarative helpers

function givenChecking() {
  const check = vi.fn();
  scope = effectScope();
  scope.run(() => checkWhileOpen(check));
  return check;
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}
