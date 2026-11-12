<script setup lang="ts">
import type { StudyCard } from '@/utils/deck';

defineProps<{ card: StudyCard }>();
const emit = defineEmits<{ result: [ok: boolean] }>();
</script>

<template>
  <div class="flex flex-1 flex-col justify-between gap-2">
    <div class="flex flex-1 flex-col gap-2">
      <Prompt :card="card" />
      <Answer :card="card" />
    </div>
    <div class="flex flex-col gap-2">
      <ExampleButton :card="card" />
      <div class="actions flex gap-2"><BackButton /><button class="btn-primary flex-1" data-testid="next" @click="emit('result', true)">Next</button></div>
    </div>
  </div>
</template>
