<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import type { StudyCard } from '@/utils/deck';
import { speak } from '@/utils/speak';

const props = defineProps<{ card: StudyCard; options: StudyCard[]; state?: { picked?: string } }>();
const emit = defineEmits<{ result: [ok: boolean, guessed?: boolean]; progress: [state: { picked: string }] }>();
const picked = shallowRef(props.state?.picked);
/** Set before the pick: a right one is then counted as a guess. */
const guessing = shallowRef(false);
/** A prompt row and room for five options, so tiles keep their size when fewer are offered. */
/** Next only moves past a miss; a right pick moves on by itself. */
const missed = computed(() => picked.value !== undefined && picked.value !== props.card.answer);
const rows = computed(() => Math.max(6, props.options.length + 1));

function pick(option: string) {
  if (picked.value !== undefined) return;
  picked.value = option;
  emit('progress', { picked: option });
  speak(props.card);
  if (option === props.card.answer) setTimeout(() => (guessing.value ? emit('result', false, true) : emit('result', true)), 500);
}

function tone(option: string) {
  if (picked.value === undefined) return '';
  if (option === props.card.answer) return 'border-green-500 bg-green-50 dark:bg-green-950';
  return option === picked.value ? 'border-red-500 bg-red-50 dark:bg-red-950' : 'opacity-50';
}
</script>

<template>
  <div class="flex flex-1 flex-col justify-between gap-2">
    <div class="grid flex-1 gap-2" data-testid="choice-grid" :style="{ gridTemplateRows: `minmax(calc((100% - ${(rows - 1) * 0.5}rem) / ${rows}), auto) repeat(${rows - 1}, minmax(0, 1fr))` }">
      <Prompt :card="card" :secret="picked === undefined" />
      <button v-for="option in options" :key="option.id" class="tile grid min-h-0 grid-rows-2 overflow-hidden" :class="tone(option.answer)" data-testid="option" @click="pick(option.answer)">
        <span class="self-end pb-1 font-medium"><KeepAffixes :text="option.answer" /><AffixTag :card="option" :text="option.answer" /></span>
        <span class="line-clamp-3 self-stretch border-t border-stone-200 pt-1 text-xs text-stone-500 dark:text-stone-400 dark:border-stone-700">{{ option.answerExample }}</span>
      </button>
    </div>
    <div class="actions flex gap-2">
      <BackButton /><LaterButton />
      <button class="btn-ghost" :class="{ 'bg-stone-200 dark:bg-stone-700': guessing }" :aria-pressed="guessing" :disabled="picked !== undefined" data-testid="guessing" @click="guessing = !guessing">Guessing</button>
      <button class="btn-primary flex-1" :class="{ invisible: !missed }" :disabled="!missed" data-testid="next" @click="emit('result', false)">Next</button>
    </div>
  </div>
</template>
