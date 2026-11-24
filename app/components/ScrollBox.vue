<script setup lang="ts">
/** Scrolls its content with a thumb that stays drawn: a phone's own scrollbar fades out after each swipe. */
const props = defineProps<{ testid: string; boxClass?: string }>();
const box = useTemplateRef<HTMLElement>('box');
const thumb = shallowRef<{ top: string; height: string }>();

function measure() {
  const el = box.value;
  if (!el) return;
  const { scrollHeight, clientHeight, scrollTop } = el;
  const next = scrollHeight > clientHeight
    ? { top: `${(scrollTop / scrollHeight) * 100}%`, height: `${(clientHeight / scrollHeight) * 100}%` }
    : undefined;
  // A new object on every measure would re-render, and `onUpdated` would measure again forever.
  if (next?.top !== thumb.value?.top || next?.height !== thumb.value?.height) thumb.value = next;
}

onMounted(() => {
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(box.value!);
  onBeforeUnmount(() => observer.disconnect());
});
onUpdated(() => nextTick(measure));
</script>

<template>
  <div class="relative flex min-h-0 w-full flex-col">
    <div ref="box" :class="props.boxClass" class="flex min-h-0 w-full flex-col items-center overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" :data-testid="props.testid" @scroll.passive="measure">
      <slot />
    </div>
    <div v-if="thumb" class="pointer-events-none absolute right-0 w-1 rounded-full bg-stone-400/60 dark:bg-stone-500/60" :style="thumb" :data-testid="`${props.testid}-thumb`" />
  </div>
</template>
