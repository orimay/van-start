import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import ListenButton from './ListenButton.vue';
import { cardKey, playing } from '@/utils/play';

const CARD = { id: 'c0', prompt: 'p', answer: 'a', nl: 'huis' } as never;

describe('the speaker', () => {
  it('keeps its picture while the card plays', async () => {
    const w = await mountSuspended(ListenButton, { props: { card: CARD } });
    playing.value = cardKey(CARD);
    await nextTick();
    expect(w.get('[data-testid="listen-again"]').text()).toContain('🔊');
    playing.value = undefined;
  });
});
