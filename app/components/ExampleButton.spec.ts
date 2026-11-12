import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import ExampleButton from './ExampleButton.vue';
import { cardKey, exampleKey, playing } from '@/utils/play';

const CARD = { id: 'c0', prompt: 'p', answer: 'a', nl: 'huis', nlExample: 'Een huis.' } as never;

describe('example buttons', () => {
  it('stop their own text on a second tap', async () => {
    const w = await mountSuspended(ExampleButton, { props: { card: CARD } });
    playing.value = cardKey(CARD);
    await nextTick();
    expect(w.get('[data-testid="play-card"]').text()).toBe('■ Card');
    expect(w.get('[data-testid="play-example"]').text()).toBe('▶ Example');
    await w.get('[data-testid="play-card"]').trigger('click');
    expect(w.get('[data-testid="play-card"]').text()).toBe('▶ Card');
  });

  it('stop the example on a second tap', async () => {
    const w = await mountSuspended(ExampleButton, { props: { card: CARD } });
    playing.value = exampleKey(CARD);
    await nextTick();
    expect(w.get('[data-testid="play-example"]').text()).toBe('■ Example');
    await w.get('[data-testid="play-example"]').trigger('click');
    expect(w.get('[data-testid="play-example"]').text()).toBe('▶ Example');
  });
});
