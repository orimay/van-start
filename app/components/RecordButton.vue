<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from 'vue';
import { canRecord } from '@/utils/play';
import { holdUpdateWhile } from '@/utils/update-hold';

/** Records the learner saying the card, to play back beside the real one; offered only where the browser can record. */
const supported = canRecord();
const recorder = shallowRef<MediaRecorder>();
const mine = defineModel<string>();
holdUpdateWhile(() => recorder.value !== undefined);

async function toggle() {
  if (recorder.value) return recorder.value.stop();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const r = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  r.ondataavailable = e => chunks.push(e.data);
  r.onstop = () => {
    for (const t of stream.getTracks()) t.stop();
    if (mine.value) URL.revokeObjectURL(mine.value);
    mine.value = URL.createObjectURL(new Blob(chunks));
    recorder.value = undefined;
  };
  r.start();
  recorder.value = r;
}

// The recording outlives the button: the answer side plays it back.
onBeforeUnmount(() => recorder.value?.stop());
</script>

<template>
  <div v-if="supported" class="flex flex-1 gap-2 text-sm">
    <button type="button" class="btn-ghost flex-1" :class="{ 'text-red-600': recorder }" data-testid="record" @click="toggle">{{ recorder ? '■ Stop' : '🎤 Record (optional)' }}</button>
  </div>
</template>
