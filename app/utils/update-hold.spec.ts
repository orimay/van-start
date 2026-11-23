import { effectScope, nextTick, shallowRef } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playing } from './play';
import { holdUntilDone, holdUpdateWhile, installWhenIdle, saveBeforeUpdate } from './update-hold';
import { takeUpdateReload } from './update-reload';

const scopes: ReturnType<typeof effectScope>[] = [];
function inScope(run: () => void) {
  const scope = effectScope();
  scopes.push(scope);
  scope.run(run);
  return scope;
}
afterEach(() => {
  scopes.splice(0).forEach(s => s.stop());
  playing.value = undefined;
  takeUpdateReload(location.pathname + location.search);
});

describe('a waiting update', () => {
  it('installs at once when nothing holds it', () => {
    const update = vi.fn();
    inScope(() => installWhenIdle(() => true, update));
    expect(update).toHaveBeenCalledOnce();
  });

  it('installs once it arrives', async () => {
    const ready = shallowRef(false);
    const update = vi.fn();
    inScope(() => installWhenIdle(() => ready.value, update));
    expect(update).not.toHaveBeenCalled();
    ready.value = true;
    await nextTick();
    expect(update).toHaveBeenCalledOnce();
  });

  it('waits for a sound to end', async () => {
    playing.value = 'card:huis';
    const update = vi.fn();
    inScope(() => installWhenIdle(() => true, update));
    expect(update).not.toHaveBeenCalled();
    playing.value = undefined;
    await nextTick();
    expect(update).toHaveBeenCalledOnce();
  });

  it('waits while something busy holds it', async () => {
    const busy = shallowRef(true);
    const update = vi.fn();
    inScope(() => holdUpdateWhile(() => busy.value));
    inScope(() => installWhenIdle(() => true, update));
    expect(update).not.toHaveBeenCalled();
    busy.value = false;
    await nextTick();
    expect(update).toHaveBeenCalledOnce();
  });

  it('is no longer held by something gone', async () => {
    const update = vi.fn();
    const holder = inScope(() => holdUpdateWhile(() => true));
    inScope(() => installWhenIdle(() => true, update));
    holder.stop();
    await nextTick();
    expect(update).toHaveBeenCalledOnce();
  });

  it('saves state and marks the reload before installing', () => {
    const order: string[] = [];
    inScope(() => saveBeforeUpdate(() => order.push('save')));
    inScope(() => installWhenIdle(() => true, () => order.push(takeUpdateReload(location.pathname + location.search) ? 'marked update' : 'update')));
    expect(order).toEqual(['save', 'marked update']);
  });

  it('installs once though saving before it writes', async () => {
    const update = vi.fn();
    inScope(() => saveBeforeUpdate(() => void holdUntilDone(Promise.resolve())));
    inScope(() => installWhenIdle(() => true, update));
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(update).toHaveBeenCalledOnce();
  });

  it('waits for a write to land', async () => {
    let land!: () => void;
    holdUntilDone(new Promise<void>(r => (land = r)));
    const update = vi.fn();
    inScope(() => installWhenIdle(() => true, update));
    expect(update).not.toHaveBeenCalled();
    land();
    await flushPromises();
    expect(update).toHaveBeenCalledOnce();
  });
});

async function flushPromises() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}
