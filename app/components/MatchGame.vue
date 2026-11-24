<script setup lang="ts">
import { shallowRef, triggerRef } from 'vue';
import type { StudyCard } from '@/utils/deck';
import { speak } from '@/utils/speak';
import { seeded } from '@/utils/random';
import { shuffle } from '@/utils/shuffle';
import { holdUpdateWhile } from '@/utils/update-hold';

/** `matched` / `mistakes`: where an interrupted round stood. */
const props = defineProps<{ cards: StudyCard[]; matched?: string[]; mistakes?: string[]; seed?: string }>();
const emit = defineEmits<{ done: [mistakes: string[]]; progress: [matched: string[], mistakes: string[]] }>();

const random = props.seed === undefined ? Math.random : seeded(props.seed);
const left = shuffle(props.cards, random);
const right = shuffle(props.cards, random);
type Side = 'left' | 'right';

const selected = shallowRef<{ side: Side; id: string }>();
const matched = shallowRef(new Set(props.matched));
const mistakes = new Set(props.mistakes);
const wrong = shallowRef<{ side: Side; id: string }>();
// Half a pair is not saved; a reload would drop it.
holdUpdateWhile(() => selected.value !== undefined);

/** A pair can be started from either column; the second tap must land on the other one. */
function pick(side: Side, id: string) {
  if (matched.value.has(id)) return;
  const from = selected.value;
  if (from === undefined || from.side === side) {
    selected.value = { side, id };
    return;
  }
  if (from.id === id) {
    matched.value.add(id);
    speak(props.cards.find(c => c.id === id)!);
    triggerRef(matched);
    selected.value = undefined;
    emit('progress', [...matched.value], [...mistakes]);
    if (matched.value.size === props.cards.length) setTimeout(() => emit('done', [...mistakes]), 300);
    return;
  }
  mistakes.add(from.id);
  emit('progress', [...matched.value], [...mistakes]);
  wrong.value = { side, id };
  setTimeout(() => (wrong.value = undefined), 400);
}

function tone(id: string, side: Side) {
  if (matched.value.has(id)) return 'invisible';
  if (selected.value?.side === side && selected.value.id === id) return 'border-orange-500';
  if (wrong.value?.side === side && wrong.value.id === id) return 'border-red-500 bg-red-50 dark:bg-red-950';
  return '';
}
</script>

<template>
  <!-- One grid, row by row, so every tile in a row lines up and all rows share the tallest height. -->
  <div class="grid flex-1 grid-cols-2 gap-3" data-testid="match-grid" :style="{ gridTemplateRows: `repeat(${Math.max(5, left.length)}, minmax(0, 1fr))` }">
    <template v-for="(_, i) in left" :key="i">
      <button class="tile grid grid-rows-2 text-sm" :class="tone(left[i]!.id, 'left')" data-testid="match-left" @click="pick('left', left[i]!.id)">
        <span class="self-end pb-1 font-medium" data-testid="match-text">{{ left[i]!.prompt }}<AffixTag :card="left[i]!" :text="left[i]!.prompt" /></span>
        <span class="line-clamp-3 self-stretch border-t border-stone-200 pt-1 text-xs text-stone-500 dark:border-stone-700">{{ left[i]!.promptExample }}</span>
      </button>
      <button class="tile grid grid-rows-2 text-sm" :class="tone(right[i]!.id, 'right')" data-testid="match-right" @click="pick('right', right[i]!.id)">
        <span class="self-end pb-1 font-medium" data-testid="match-text">{{ right[i]!.answer }}<AffixTag :card="right[i]!" :text="right[i]!.answer" /></span>
        <span class="line-clamp-3 self-stretch border-t border-stone-200 pt-1 text-xs text-stone-500 dark:border-stone-700">{{ right[i]!.answerExample }}</span>
      </button>
    </template>
  </div>
</template>
