<script setup lang="ts">
/** Example words with their sound or letter in brackets, `de b[u]s`: the marked part bright and bold, the rest grey. */
const props = defineProps<{ text: string }>();
const parts = computed(() => props.text.split(/\[([^\]]+)\]/));
</script>

<template>
  <span><template v-for="(part, i) in parts" :key="i"><span v-if="i % 2" class="font-semibold text-stone-700 dark:text-stone-200" data-testid="sound-part">{{ part }}</span><span v-else-if="part" class="text-stone-600 dark:text-stone-400">{{ part }}</span></template></span>
</template>
