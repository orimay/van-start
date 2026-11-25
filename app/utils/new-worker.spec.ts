import { effectScope } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { holdUpdateWhile } from './update-hold';
import { reloadOnNewWorker, takeOverWhenIdle } from './new-worker';
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

function makeWorker(state: string) {
  return Object.assign(new EventTarget(), { state, postMessage: vi.fn() });
}
type Worker = ReturnType<typeof makeWorker>;

function makeRegistration(waiting: Worker | null = null) {
  return Object.assign(new EventTarget(), { waiting, installing: null as Worker | null });
}

/** A newer worker downloads and finishes installing while an older one runs the page. */
function doInstall(registration: ReturnType<typeof makeRegistration>) {
  const worker = makeWorker('installing');
  registration.installing = worker;
  registration.dispatchEvent(new Event('updatefound'));
  worker.state = 'installed';
  registration.installing = null;
  registration.waiting = worker;
  worker.dispatchEvent(new Event('statechange'));
  return worker;
}

const SKIP_WAITING = { type: 'SKIP_WAITING' };

describe('a newer service worker waiting', () => {
  it('takes over right away when found on start', () => {
    const worker = makeWorker('installed');
    inScope(() => takeOverWhenIdle(makeRegistration(worker)));
    expect(worker.postMessage).toHaveBeenCalledWith(SKIP_WAITING);
  });

  it('takes over once it finishes installing', () => {
    const registration = makeRegistration();
    inScope(() => takeOverWhenIdle(registration));
    const worker = doInstall(registration);
    expect(worker.postMessage).toHaveBeenCalledWith(SKIP_WAITING);
  });

  it('waits while something holds the update', () => {
    const worker = makeWorker('installed');
    inScope(() => {
      holdUpdateWhile(() => true);
      takeOverWhenIdle(makeRegistration(worker));
    });
    expect(worker.postMessage).not.toHaveBeenCalled();
  });
});
