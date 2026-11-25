import { useEventListener } from '@vueuse/core';
import { nextTick, type Ref, shallowRef } from 'vue';

const DRAG_SLOP_PX = 6;

/**
 * A sheet panel follows the finger down; let go past a quarter of its height it closes, short of that it springs back.
 * The scrolling `body` owns the gesture while scrolled or moving up, so its own scroll still works.
 */
export function useSheetDrag(body: Readonly<Ref<HTMLElement | null>>, close: () => void) {
  const dragY = shallowRef(0);
  const dragging = shallowRef(false);
  let drag: { id: number; startY: number; fromBody: boolean; panel: HTMLElement } | undefined;
  let stopListening: (() => void)[] = [];

  function endDrag(dismiss: boolean) {
    for (const stop of stopListening) stop();
    stopListening = [];
    const wasDragging = dragging.value;
    const past = dismiss && wasDragging && !!drag && dragY.value > drag.panel.offsetHeight / 4;
    drag = undefined;
    dragging.value = false;
    // Closing slides on from where the finger let go, once the drag's no-transition style is off.
    if (past) return void nextTick(close);
    dragY.value = 0;
    // A drag let go over the button it started on would otherwise press it.
    if (wasDragging) {
      const swallow = (e: Event) => e.stopPropagation();
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }));
    }
  }

  function onDragMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.startY;
    if (!dragging.value) {
      if (dy < 0 && drag.fromBody) return endDrag(false);
      if (Math.abs(dy) < DRAG_SLOP_PX) return;
      dragging.value = true;
    }
    dragY.value = Math.max(0, dy);
  }

  function onDragStart(e: PointerEvent) {
    if (!e.isPrimary || e.button !== 0) return;
    const fromBody = !!body.value?.contains(e.target as Node);
    if (fromBody && body.value!.scrollTop > 0) return;
    endDrag(false);
    drag = { id: e.pointerId, startY: e.clientY, fromBody, panel: e.currentTarget as HTMLElement };
    stopListening = [
      useEventListener(window, 'pointermove', onDragMove),
      useEventListener(window, 'pointerup', (ev: PointerEvent) => ev.pointerId === drag?.id && endDrag(true)),
      useEventListener(window, 'pointercancel', (ev: PointerEvent) => ev.pointerId === drag?.id && endDrag(false)),
    ];
  }

  // At scrollTop 0 the browser would take a downward swipe as a scroll and cancel the pointer stream.
  useEventListener(
    body,
    'touchmove',
    (e: TouchEvent) => {
      if (drag?.fromBody && (dragging.value || (e.touches[0]?.clientY ?? 0) > drag.startY)) e.preventDefault();
    },
    { passive: false },
  );

  return { dragY, dragging, onDragStart };
}
