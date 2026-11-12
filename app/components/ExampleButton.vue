<script setup lang="ts">
import type { StudyCard } from '@/utils/deck';
import { cardKey, exampleKey } from '@/utils/play';
import { speak, speakExample } from '@/utils/speak';

/** `comparing`: the learner's recording is there, so Compare takes the card's place. */
defineProps<{ card: StudyCard; disabled?: boolean; comparing?: boolean }>();
const emit = defineEmits<{ compare: [] }>();
</script>

<template>
  <div class="flex gap-2">
    <PlayButton v-if="comparing" class="btn-ghost" :class="card.nlExample ? 'w-1/3' : 'flex-1'" data-testid="play" :disabled="disabled" sound="mine" @play="emit('compare')">Compare</PlayButton>
    <PlayButton v-else class="btn-ghost" :class="card.nlExample ? 'w-1/3' : 'flex-1'" data-testid="play-card" :disabled="disabled" :sound="cardKey(card)" @play="speak(card)">Card</PlayButton>
    <PlayButton v-if="card.nlExample" class="btn-ghost flex-1" data-testid="play-example" :disabled="disabled" :sound="exampleKey(card)" @play="speakExample(card)">Example</PlayButton>
  </div>
</template>
