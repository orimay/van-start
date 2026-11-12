<script setup lang="ts">
import type { StudyCard } from '@/utils/deck';
import { cardKey } from '@/utils/play';
import { speak } from '@/utils/speak';

/** Stands in for the prompt while the card is only heard: a tap plays it again, the transcription stands in for the ear. */
defineProps<{ card: StudyCard }>();
</script>

<template>
  <PlayButton class="flex min-h-0 flex-1 basis-0 flex-col items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white text-5xl shadow-sm dark:border-stone-700 dark:bg-stone-900" aria-label="Play again" data-testid="listen-again" :sound="cardKey(card)" play-icon="🔊" stop-icon="🔊" @play="speak(card)"><span v-if="card.tr" class="text-base text-stone-500" data-testid="listen-transcription">[{{ card.tr }}]</span></PlayButton>
</template>
