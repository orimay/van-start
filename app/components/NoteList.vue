<script lang="ts">
import { noteHead, noteLines, type NoteKind } from '@/utils/deck';

/** Rules read as plain text, examples hang under them with their Dutch to the fore, labels and the origin stay quiet. */
const LOOK: Record<NoteKind, string> = {
  rule: 'list-disc text-stone-700 dark:text-stone-300',
  example: 'ml-1 list-none border-l-2 border-stone-300 pl-2 italic text-stone-500 dark:border-stone-600 dark:text-stone-400',
  label: 'list-none text-stone-600 dark:text-stone-400',
  origin: 'list-none border-t border-stone-200 pt-2 text-stone-500 dark:border-stone-700 dark:text-stone-400',
};
/** An exception line reads red, its Dutch head too; lighter on dark, to keep AA contrast. */
const EXCEPTION = 'text-[oklch(55.3%_0.2_25)]! dark:text-[oklch(70.4%_0.191_22.2)]!';
/** What the card is and where it comes from go before the examples of it; each rank is a group of its own. */
const RANK: Record<NoteKind, number> = { rule: 0, label: 0, origin: 1, example: 2 };
/** Lines of one group sit closer to each other than to the next group. */
function gapBefore(previous: NoteKind | undefined, kind: NoteKind) {
  if (!previous) return undefined;
  return RANK[previous] === RANK[kind] ? 'mt-1' : 'mt-2';
}
const HEAD: Record<NoteKind, string> = {
  rule: '',
  example: 'font-medium not-italic text-stone-900 dark:text-stone-100',
  label: 'mr-0.5 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400',
  origin: 'mr-0.5 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400',
};
</script>

<script setup lang="ts">
/** A card's note, a line per item; `hidden`: per line, taken out of the layout until the answer is out. */
const props = defineProps<{ note: string; kinds?: NoteKind[]; self: string; secret?: boolean; hidden?: boolean[]; testid: string }>();
const lines = computed(() => noteLines(props.note).map((line, i) => {
  const kind = props.kinds?.[i] ?? 'rule';
  return { ...line, kind, head: noteHead(line.text, kind), headClass: line.exception ? `${HEAD[kind]} ${EXCEPTION}` : HEAD[kind], hidden: props.hidden?.[i] };
}).sort((a, b) => RANK[a.kind] - RANK[b.kind]).map((line, i, all) => ({ ...line, gap: gapBefore(all.slice(0, i).findLast(l => !l.hidden)?.kind, line.kind) })));
</script>

<template>
  <ul class="mx-auto w-fit max-w-full text-sm" :class="{ 'pl-5 text-left': lines.length > 1 }" :data-testid="testid">
    <li v-for="line in lines" :key="line.text" v-show="!line.hidden" :class="[lines.length > 1 ? LOOK[line.kind] : 'text-stone-600 dark:text-stone-300', line.gap, { [EXCEPTION]: line.exception }]" :data-kind="line.kind" :data-exception="line.exception" :data-testid="`${testid}-line`">
      <NoteText :text="line.text" :self="self" :secret="secret" :head="line.head" :head-class="line.headClass" :head-testid="line.kind === 'example' ? 'note-dutch' : 'note-label'" />
    </li>
  </ul>
</template>
