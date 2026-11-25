<script setup lang="ts">
import { shallowRef, watch } from 'vue';

/** What a reset would undo: a title, what it touches, how many words, and the reset itself. */
export interface ResetRequest {
  title: string;
  what: string;
  count: number;
  reset: () => void;
}

const props = defineProps<{ request: ResetRequest | undefined }>();
const emit = defineEmits<{ close: [] }>();
/** Asked once, then once more before anything goes. */
const sure = shallowRef(false);
/** The last request, kept on screen while the sheet slides away. */
const shown = shallowRef(props.request);
watch(
  () => props.request,
  request => {
    sure.value = false;
    if (request) shown.value = request;
  },
);

function confirm() {
  if (!sure.value) return void (sure.value = true);
  props.request!.reset();
  emit('close');
}
</script>

<template>
  <BottomSheet :open="!!request" testid="reset-sheet" @close="emit('close')">
    <template #title><span data-testid="reset-title">{{ shown?.title }}</span></template>
    <p v-if="shown" class="text-stone-600 dark:text-stone-400" data-testid="reset-what">
      <template v-if="sure">Sure? {{ shown.count }} words lose this progress, and it cannot be undone. Right and wrong answer counts stay.</template>
      <template v-else>Reset {{ shown.what }} for {{ shown.count }} words?</template>
    </p>
    <template #footer>
      <button type="button" class="btn bg-red-600 text-white" data-testid="reset-confirm" @click="confirm">{{ sure ? `Yes, reset ${shown?.count} words` : 'Reset progress' }}</button>
      <button type="button" class="btn-ghost" data-testid="reset-cancel" @click="emit('close')">Cancel</button>
    </template>
  </BottomSheet>
</template>
