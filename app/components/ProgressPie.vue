<script setup lang="ts">
/** A ring with a sector filled to `done` of `total`. */
const props = defineProps<{ done: number; total: number }>();

const R = 7.5;
const sector = computed(() => {
  const share = Math.min(Math.max(props.done / props.total, 0), 1);
  if (share === 0 || share === 1) return undefined;
  const angle = share * 2 * Math.PI;
  const x = 12 + R * Math.sin(angle);
  const y = 12 - R * Math.cos(angle);
  return `M12 12V${12 - R}A${R} ${R} 0 ${share > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`;
});
</script>

<template>
  <svg viewBox="0 0 24 24" class="size-4" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" />
    <circle v-if="done >= total" cx="12" cy="12" :r="R" />
    <path v-else-if="sector" :d="sector" />
  </svg>
</template>
