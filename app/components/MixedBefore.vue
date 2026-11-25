<script setup lang="ts">
import { computed } from 'vue';

/** The words `id` was linked with as mixed up, newest on top; a miss counts them as missed too. `except`: taken for it on this step, named elsewhere. */
const props = defineProps<{ id: string; except: readonly string[] }>();
const store = useStore();
const { index } = useCardSheet();
const words = computed(() =>
  (store.confusions.value[props.id] ?? [])
    .filter(other => !props.except.includes(other))
    .map(other => index.value.byId.get(other)?.b ?? other)
    .reverse(),
);
</script>

<template>
  <ul v-if="words.length" class="flex flex-col text-sm text-stone-500 dark:text-stone-400" aria-label="Mixed up before" data-testid="mixed-before">
    <li v-for="word in words" :key="word" class="max-w-40 truncate">{{ word }}</li>
  </ul>
</template>
