<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from 'vue';
import { onBack } from '@/utils/back';

/**
 * A modal sheet rising from the bottom: a title with a cross, a scrolling body and a footer of actions in thumb reach.
 * Its backdrop, cross, Escape, the device back button or a pull down past a quarter of its height closes it.
 * `tall` keeps it at full height while its content changes; `over` lifts it above another sheet.
 */
const props = defineProps<{ open: boolean; testid: string; tall?: boolean; over?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const titleId = useId();
const panel = useTemplateRef('panel');
const body = useTemplateRef('body');
const close = () => emit('close');
const { dragY, dragging, onDragStart } = useSheetDrag(body, close);

/** Where the focus was before opening, to give it back on close. */
let opener: HTMLElement | undefined;
let dropBack: (() => void) | undefined;

async function opened() {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  dropBack = onBack(close);
  await nextTick();
  panel.value?.focus({ preventScroll: true });
}

function closed() {
  dropBack?.();
  dropBack = undefined;
  if (opener?.isConnected) opener.focus({ preventScroll: true });
  opener = undefined;
}

onMounted(() => props.open && opened());
watch(() => props.open, open => (open ? opened() : closed()));
onBeforeUnmount(closed);
</script>

<template>
  <Transition name="sheet-fade" appear>
    <div v-if="open" class="fixed inset-0 bg-black/60" :class="over ? 'z-60' : 'z-40'" :data-testid="`${testid}-backdrop`" @click="close" />
  </Transition>
  <Transition name="sheet-slide" appear @after-leave="dragY = 0">
    <div
      v-if="open"
      ref="panel"
      class="sheet-panel fixed inset-x-0 bottom-0 mx-auto flex max-w-md flex-col rounded-t-2xl bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] outline-none dark:bg-stone-900"
      :class="[over ? 'z-70' : 'z-50', tall ? 'h-[85dvh]' : 'max-h-[85dvh]', { 'sheet-dragging': dragging }]"
      :style="dragY ? { translate: `0 ${dragY}px` } : undefined"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      :data-testid="testid"
      @pointerdown="onDragStart"
      @keydown.esc.stop="close"
    >
      <div class="flex shrink-0 touch-none flex-col gap-1 px-4 pt-2 pb-2">
        <div class="mx-auto mb-1 h-1 w-10 rounded-full bg-stone-300 dark:bg-stone-600" />
        <div class="flex items-center gap-2">
          <h2 :id="titleId" class="flex-1 text-lg font-semibold" :data-testid="`${testid}-title`"><slot name="title" /></h2>
          <button type="button" class="btn-ghost px-2" aria-label="Close" :data-testid="`${testid}-close`" @click="close">✕</button>
        </div>
      </div>
      <div ref="body" class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-3" :data-testid="`${testid}-body`"><slot /></div>
      <div v-if="$slots.footer" class="flex shrink-0 flex-col gap-2 border-t border-stone-200 px-4 pt-3 pb-3 dark:border-stone-800"><slot name="footer" /></div>
    </div>
  </Transition>
</template>
