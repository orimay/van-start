<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core';
import { onBeforeUnmount, shallowRef } from 'vue';
import type { StudyCard } from '@/utils/deck';
import { play } from '@/utils/play';
import { speak } from '@/utils/speak';

/**
 * `dutchShown`: the prompt is the Dutch side, voiced and playable from the start; `quiet`: only once revealed.
 * `listening`: it is only heard, untimed, until revealed; `pronouncing`: said aloud, untimed, optionally recorded.
 */
const props = defineProps<{ card: StudyCard; dutchShown?: boolean; quiet?: boolean; listening?: boolean; pronouncing?: boolean; state?: { revealed?: 'self' | 'timeout' } }>();
const emit = defineEmits<{ result: [ok: boolean, guessed?: boolean]; progress: [state: { revealed: 'self' | 'timeout' }] }>();

if (props.dutchShown && !props.quiet && !props.state?.revealed) speak(props.card);

const SECONDS = useStore().settings.value.recallSeconds;
const left = shallowRef(SECONDS * 10);
/** `self`: the learner opened it and judges themselves; `timeout`: time ran out. */
const revealed = shallowRef(props.state?.revealed);
/** The learner's own try, played before the right one on reveal. */
const mine = shallowRef<string>();
onBeforeUnmount(() => mine.value && URL.revokeObjectURL(mine.value));

const timer = useIntervalFn(() => {
  left.value -= 1;
  if (left.value <= 0) reveal('timeout');
}, 100, { immediate: !revealed.value && !props.listening && !props.pronouncing });
if (revealed.value) left.value = 0;

/** The learner's try, if recorded, then the right one. */
function compare() {
  if (mine.value) play(mine.value, 'mine', () => speak(props.card), () => speak(props.card));
  else speak(props.card);
}

function reveal(how: 'self' | 'timeout') {
  timer.pause();
  revealed.value = how;
  if (props.pronouncing) compare();
  else if (props.quiet) speak(props.card);
  emit('progress', { revealed: how });
}
</script>

<template>
  <div class="flex flex-1 flex-col justify-between gap-2">
    <div class="relative flex flex-1 flex-col gap-2">
      <Prompt v-if="!listening || revealed" :card="card" :secret="!revealed && !pronouncing" />
      <ListenButton v-else :card="card" />
      <Answer :card="card" :hidden="!revealed && !pronouncing" :no-transcription="pronouncing && !revealed" :silent="dutchShown" />
    </div>
    <div class="flex flex-col gap-2">
      <div class="h-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800" :class="{ invisible: revealed || listening || pronouncing }" data-testid="timer">
        <div class="h-full bg-stone-500 transition-[width] duration-100 ease-linear" :style="{ width: `${left / (SECONDS * 10) * 100}%` }" />
      </div>
      <div v-if="pronouncing" class="flex flex-col gap-2">
        <RecordButton v-model="mine" />
        <ExampleButton :card="card" :disabled="!revealed" :comparing="!!mine" @compare="compare" />
      </div>
      <div v-else class="flex gap-2">
        <ExampleButton class="flex-1" :card="card" :disabled="!revealed && (!dutchShown || quiet)" />
        <button v-if="revealed === 'self'" class="btn-ghost" data-testid="guessed" @click="emit('result', false, true)">Guessed</button>
      </div>
      <div class="actions flex gap-2"><BackButton /><LaterButton /><div class="grid flex-1">
      <button v-if="!revealed" class="btn-primary" data-testid="reveal" @click="reveal('self')">Reveal</button>
      <div v-else-if="revealed === 'self'" class="grid grid-cols-2 gap-2">
        <button class="btn-ghost" data-testid="forgot" @click="emit('result', false)">{{ pronouncing ? 'Said wrong' : 'Forgot' }}</button>
        <button class="btn-primary" data-testid="remembered" @click="emit('result', true)">{{ pronouncing ? 'Said right' : 'Remembered' }}</button>
      </div>
      <button v-else class="btn-primary" data-testid="next" @click="emit('result', false)">Next</button>
      </div></div>
    </div>
  </div>
</template>
