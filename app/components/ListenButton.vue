<script setup lang="ts">
import type { StudyCard } from '@/utils/deck';
import { cardKey } from '@/utils/play';
import { speak } from '@/utils/speak';
import { surfaceOf } from '@/utils/surface';

/** Stands in for the prompt while the card is only heard: a tap plays it again, the transcription stands in for the ear. */
defineProps<{ card: StudyCard }>();
/** Played again: the word was not caught, so its timing starts over. */
const emit = defineEmits<{ replay: [] }>();
</script>

<template>
  <PlayButton class="flex min-h-0 flex-1 basis-0 flex-col items-center justify-center gap-2 rounded-xl border text-5xl shadow-sm" :class="surfaceOf(card)" aria-label="Play again" data-testid="listen-again" :sound="cardKey(card)" play-icon="🔊" stop-icon="🔊" @play="speak(card); emit('replay')"><span v-if="card.tr" class="text-base text-stone-500 dark:text-stone-400" data-testid="listen-transcription">[{{ card.tr }}]</span></PlayButton>
</template>
