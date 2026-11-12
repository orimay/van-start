<script setup lang="ts">
/** `inverted`: drawn on an orange button. */
defineProps<{ value: number; inverted?: boolean }>();
</script>

<template>
  <div class="h-1.5 overflow-hidden rounded-full" :class="inverted ? 'bg-white/30' : 'bg-stone-300 dark:bg-stone-700'" role="progressbar" :aria-valuenow="Math.round(value * 100)" aria-valuemin="0" aria-valuemax="100">
    <div class="h-full rounded-full transition-[width] duration-300" :class="inverted ? 'bg-white' : 'bg-orange-600'" :style="{ width: `${value * 100}%` }" />
  </div>
</template>
