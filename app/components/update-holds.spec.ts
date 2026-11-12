import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import MatchGame from './MatchGame.vue';
import TextField from './TextField.vue';
import { toStudyCard } from '@/utils/deck';
import { installWhenIdle } from '@/utils/update-hold';
import { takeUpdateReload } from '@/utils/update-reload';

vi.mock('@/utils/speak');

let scope = effectScope();
afterEach(() => {
  scope.stop();
  scope = effectScope();
  takeUpdateReload(location.pathname + location.search);
});

describe('a waiting update', () => {
  it('waits for the second half of a pair', async () => {
    const cards = [{ id: 'a', f: 'pa', b: 'na' }, { id: 'b', f: 'pb', b: 'nb' }].map(c => toStudyCard(c));
    const w = await mountSuspended(MatchGame, { props: { cards, seed: 's' } });
    const left = w.findAll('[data-testid="match-left"]')[0]!;
    await left.trigger('click');
    await nextTick();
    const update = whenUpdateWaits();
    expect(update).not.toHaveBeenCalled();
    const pair = w.findAll('[data-testid="match-right"]').find(r => r.text().startsWith(left.text().replace('p', 'n')))!;
    await pair.trigger('click');
    await nextTick();
    expect(update).toHaveBeenCalledOnce();
  });

  it('waits while there is typed text', async () => {
    const w = await mountSuspended(TextField);
    await doType(w, 'huis');
    const update = whenUpdateWaits();
    expect(update).not.toHaveBeenCalled();
    await doType(w, '');
    expect(update).toHaveBeenCalledOnce();
  });
});

// declarative helpers

function whenUpdateWaits() {
  const update = vi.fn();
  scope.run(() => installWhenIdle(() => true, update));
  return update;
}

async function doType(w: VueWrapper, text: string) {
  w.get('[role="textbox"]').element.textContent = text;
  await w.get('[role="textbox"]').trigger('input');
  await nextTick();
}
