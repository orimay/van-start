<script lang="ts">
import { noteHead, noteLines, type NoteKind } from '@/utils/deck';

/** Rules read as plain text, examples hang under them with their Dutch to the fore, labels and the origin stay quiet. */
const LOOK: Record<NoteKind, string> = {
  rule: 'list-disc text-stone-700 dark:text-stone-300',
  example: 'ml-1 list-none border-l-2 border-stone-300 pl-2 italic text-stone-500 dark:border-stone-600 dark:text-stone-400',
  label: 'list-none text-stone-600 dark:text-stone-400',
  origin: 'mt-1.5 list-none border-t border-stone-200 pt-1.5 text-stone-500 dark:border-stone-700 dark:text-stone-400',
};
/** What the card is and where it comes from go before the examples of it. */
const RANK: Record<NoteKind, number> = { rule: 0, label: 0, origin: 1, example: 2 };
const HEAD: Record<NoteKind, string> = {
  rule: '',
  example: 'font-medium not-italic text-stone-900 dark:text-stone-100',
  label: 'mr-0.5 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500',
  origin: 'mr-0.5 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500',
};
</script>

<script setup lang="ts">
/** A card's note, a line per item; `hidden`: per line, kept back in place until the answer is out. */
const props = defineProps<{ note: string; kinds?: NoteKind[]; self: string; secret?: boolean; hidden?: boolean[]; testid: string }>();
const lines = computed(() => noteLines(props.note).map((line, i) => {
  const kind = props.kinds?.[i] ?? 'rule';
  return { ...line, kind, head: noteHead(line.text, kind), hidden: props.hidden?.[i] };
}).sort((a, b) => RANK[a.kind] - RANK[b.kind]));
</script>

<template>
  <ul class="mx-auto w-fit max-w-full space-y-1 text-sm" :class="{ 'pl-5 text-left': lines.length > 1 }" :data-testid="testid">
    <li v-for="line in lines" :key="line.text" :class="[lines.length > 1 ? LOOK[line.kind] : 'text-stone-600 dark:text-stone-300', { 'text-[oklch(55.3%_0.2_25)]!': line.exception, invisible: line.hidden }]" :data-kind="line.kind" :data-exception="line.exception" :data-testid="`${testid}-line`">
      <NoteText :text="line.text" :self="self" :secret="secret" :head="line.head" :head-class="HEAD[line.kind]" :head-testid="line.kind === 'example' ? 'note-dutch' : 'note-label'" />
    </li>
  </ul>
</template>
