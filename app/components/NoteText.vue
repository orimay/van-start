<script setup lang="ts">
import { linkSegments } from '@/utils/links';

/** A note item, the words it names as links to their cards; `secret`: the note's own card is not answered yet. */
const props = defineProps<{ text: string; self?: string; secret?: boolean }>();
const sheet = useCardSheet();
const segments = computed(() => linkSegments(props.text, sheet.index.value, props.self));
</script>

<template>
  <template v-for="(segment, i) in segments" :key="i">
    <button v-if="segment.link" type="button" class="not-italic text-sky-700 underline decoration-dotted decoration-2 underline-offset-4 dark:text-sky-400" data-testid="note-link" @click.stop="sheet.open(segment.link, segment.gloss, secret ? self : undefined)">{{ segment.text }}</button>
    <template v-else>{{ segment.text }}</template>
  </template>
</template>
