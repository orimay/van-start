import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import BottomSheet from './BottomSheet.vue';

describe('a bottom sheet', () => {
  it('shows nothing while closed', async () => {
    using w = await doMount(false);
    expect(w.find('[data-testid="demo"]').exists()).toBe(false);
  });

  it('shows its title, body and footer while open', async () => {
    using w = await doMount();
    expect(w.get('[data-testid="demo-title"]').text()).toBe('Demo');
    expect(w.get('[data-testid="demo"]').text()).toContain('Body');
    expect(w.get('[data-testid="demo"]').text()).toContain('Footer');
  });

  it('is a modal dialog named by its title', async () => {
    using w = await doMount();
    const panel = w.get('[data-testid="demo"]');
    expect(panel.attributes('role')).toBe('dialog');
    expect(panel.attributes('aria-modal')).toBe('true');
    expect(w.get(`#${panel.attributes('aria-labelledby')}`).text()).toBe('Demo');
  });

  for (const [how, act] of [
    ['its cross', (w: VueWrapper) => w.get('[data-testid="demo-close"]').trigger('click')],
    ['its backdrop', (w: VueWrapper) => w.get('[data-testid="demo-backdrop"]').trigger('click')],
    ['Escape', (w: VueWrapper) => w.get('[data-testid="demo"]').trigger('keydown', { key: 'Escape' })],
    ['the device back button', () => window.dispatchEvent(new PopStateEvent('popstate'))],
  ] as const) {
    it(`closes on ${how}`, async () => {
      using w = await doMount();
      await act(w);
      await flushPromises();
      expect(w.emitted('close')).toHaveLength(1);
    });
  }

  it('closes when pulled down past a quarter of its height', async () => {
    using w = await doMount();
    await doDrag(w, 150);
    expect(w.emitted('close')).toHaveLength(1);
  });

  it('springs back when let go short of a quarter of its height', async () => {
    using w = await doMount();
    await doDrag(w, 50);
    expect(w.emitted('close')).toBeUndefined();
    expect(w.get('[data-testid="demo"]').attributes('style')).toBeUndefined();
  });

  it('takes the focus while open and gives it back on close', async () => {
    const opener = document.body.appendChild(document.createElement('button'));
    opener.focus();
    using w = await doMount(false, true);
    await w.setProps({ open: true });
    await nextTick();
    expect(document.activeElement).toBe(w.get('[data-testid="demo"]').element);
    await w.setProps({ open: false });
    await flushPromises();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

// declarative helpers

async function doMount(open = true, attach = false) {
  const Demo = defineComponent({
    props: { open: Boolean },
    emits: ['close'],
    setup: (props, { emit }) => () =>
      h(BottomSheet, { open: props.open, testid: 'demo', onClose: () => emit('close') }, { title: () => 'Demo', default: () => h('p', 'Body'), footer: () => h('p', 'Footer') }),
  });
  const w = await mountSuspended(Demo, { props: { open }, ...(attach && { attachTo: document.body }) });
  return Object.assign(w, { [Symbol.dispose]: () => w.unmount() });
}

/** Pulls the 400px tall panel down by `by` px and lets go. */
async function doDrag(w: VueWrapper, by: number) {
  const panel = w.get('[data-testid="demo"]').element as HTMLElement;
  Object.defineProperty(panel, 'offsetHeight', { configurable: true, value: 400 });
  const at = (type: string, y: number, target: EventTarget) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, button: 0, clientY: y }));
  at('pointerdown', 0, panel);
  for (let y = 0; y < by; y += 10) at('pointermove', y, window);
  at('pointermove', by, window);
  at('pointerup', by, window);
  await flushPromises();
}
