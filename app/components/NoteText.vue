<script setup lang="ts">
import { linkBreakdown, linkSegments } from '@/utils/links';

/** A note item, the words it names as links to their cards; `secret`: the note's own card is not answered yet; `breakdown`: a word's parts, `a- (…) + b (…)`. */
const props = defineProps<{ text: string; self?: string; secret?: boolean; breakdown?: boolean }>();
const sheet = useCardSheet();
const segments = computed(() => (props.breakdown ? linkBreakdown : linkSegments)(props.text, sheet.index.value, props.self));
</script>

<template>
  <template v-for="(segment, i) in segments" :key="i">
    <button v-if="segment.link" type="button" class="not-italic text-sky-700 underline decoration-dotted decoration-2 underline-offset-4 dark:text-sky-400" data-testid="note-link" @click.stop="sheet.open(segment.link, segment.gloss, secret ? self : undefined)">{{ segment.text }}</button>
    <template v-else>{{ segment.text }}</template>
  </template>
</template>
