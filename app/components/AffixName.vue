<script setup lang="ts">
defineProps<{ affix: string; meaning: string }>();
</script>

<template>
  <p class="text-sm text-stone-500" data-testid="affix"><span class="font-semibold text-stone-700 dark:text-stone-300">{{ affix }}</span> {{ meaning }}</p>
</template>
