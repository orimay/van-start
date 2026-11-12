import { effectScope } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { holdUpdateWhile } from './update-hold';
import { reloadOnNewWorker } from './new-worker';
import { takeUpdateReload } from './update-reload';

const scopes: ReturnType<typeof effectScope>[] = [];
function inScope(run: () => void) {
  const scope = effectScope();
  scopes.push(scope);
  scope.run(run);
}
afterEach(() => {
  scopes.splice(0).forEach(s => s.stop());
  takeUpdateReload(location.pathname + location.search);
});

function makeContainer(controller: object | null) {
  const target = new EventTarget() as EventTarget & { controller: object | null };
  target.controller = controller;
  return target;
}

describe('a new service worker taking over', () => {
  it('reloads the page', () => {
    const container = makeContainer({});
    const reload = vi.fn();
    inScope(() => reloadOnNewWorker(container, reload));
    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload on the very first install', () => {
    const container = makeContainer(null);
    const reload = vi.fn();
    inScope(() => reloadOnNewWorker(container, reload));
    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
  });

  it('waits while something holds the update', () => {
    const container = makeContainer({});
    const reload = vi.fn();
    let busy = true;
    inScope(() => {
      holdUpdateWhile(() => busy);
      reloadOnNewWorker(container, reload);
    });
    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
  });
});
