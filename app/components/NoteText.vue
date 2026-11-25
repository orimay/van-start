<script setup lang="ts">
import { linkBreakdown, linkSegments } from '@/utils/links';

/** A note item, the words it names as links to their cards; `secret`: the note's own card is not answered yet; `breakdown`: a word's parts, `a- (…) + b (…)`. */
/** `head`: the item's opening words (a label, an example's Dutch), set apart by `headClass`; the links still read the whole item. */
const props = defineProps<{ text: string; self?: string; secret?: boolean; breakdown?: boolean; head?: string; headClass?: string; headTestid?: string }>();
const sheet = useCardSheet();
const segments = computed(() => {
  const all = (props.breakdown ? linkBreakdown : linkSegments)(props.text, sheet.index.value, props.self);
  const [first, ...rest] = all;
  if (!props.head || !first || first.link || !first.text.startsWith(props.head)) return all;
  return [{ text: props.head, head: true }, { text: first.text.slice(props.head.length) }, ...rest];
});
</script>

<template>
  <template v-for="(segment, i) in segments" :key="i">
    <button v-if="segment.link" type="button" class="not-italic text-sky-700 underline decoration-dotted decoration-2 underline-offset-4 dark:text-sky-400" data-testid="note-link" @click.stop="sheet.open(segment.link, segment.gloss, secret ? self : undefined)">{{ segment.text }}</button>
    <span v-else-if="'head' in segment" :class="headClass" :data-testid="headTestid">{{ segment.text }}</span>
    <KeepAffixes v-else :text="segment.text" />
  </template>
</template>
