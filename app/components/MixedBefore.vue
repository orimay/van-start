<script setup lang="ts">
import { computed } from 'vue';

/** The words `id` was linked with as mixed up, so they are not marked again by mistake; `except`: taken for it on this step, named elsewhere. */
const props = defineProps<{ id: string; except: readonly string[] }>();
const store = useStore();
const { index } = useCardSheet();
const words = computed(() => (store.confusions.value[props.id] ?? []).filter(other => !props.except.includes(other)).map(other => index.value.byId.get(other)?.b ?? other));
</script>

<template>
  <p v-if="words.length" class="text-center text-sm text-stone-500 dark:text-stone-400" data-testid="mixed-before">Mixed up before: {{ words.join(', ') }}</p>
</template>
