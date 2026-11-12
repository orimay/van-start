import { mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import PlayButton from './PlayButton.vue';
import { playing } from '@/utils/play';

afterEach(() => {
  playing.value = undefined;
});

describe('a play button', () => {
  it('asks to play its sound when idle', async () => {
    const w = await mountSuspended(PlayButton, { props: { sound: 's' }, slots: { default: () => 'Card' } });
    expect(w.text()).toBe('▶ Card');
    await w.trigger('click');
    expect(w.emitted('play')).toHaveLength(1);
  });

  it('stops its own sound on a second tap instead of replaying', async () => {
    const w = await mountSuspended(PlayButton, { props: { sound: 's' }, slots: { default: () => 'Card' } });
    playing.value = 's';
    await nextTick();
    expect(w.text()).toBe('■ Card');
    await w.trigger('click');
    expect(w.emitted('play')).toBeUndefined();
    expect(w.text()).toBe('▶ Card');
  });

  it('keeps playing when another sound plays', async () => {
    const w = await mountSuspended(PlayButton, { props: { sound: 's', playIcon: '🔊', stopIcon: '⏹' } });
    playing.value = 'other';
    await nextTick();
    expect(w.text()).toBe('🔊');
  });
});
