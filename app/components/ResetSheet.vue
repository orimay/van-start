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
watch(() => props.request, () => (sure.value = false));

function confirm() {
  if (!sure.value) return void (sure.value = true);
  props.request!.reset();
  emit('close');
}
</script>

<template>
  <Transition name="sheet" :duration="200">
    <div v-if="request" class="contents">
      <div class="fixed inset-0 z-40 bg-black/60" @click="emit('close')" />
      <div class="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-md flex-col gap-3 rounded-t-2xl bg-white px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] dark:bg-stone-900" role="dialog" data-testid="reset-sheet">
        <p class="text-center font-semibold" data-testid="reset-title">{{ request.title }}</p>
        <p class="text-sm text-stone-600 dark:text-stone-400" data-testid="reset-what">
          <template v-if="sure">Sure? {{ request.count }} words lose this progress, and it cannot be undone. Right and wrong answer counts stay.</template>
          <template v-else>Reset {{ request.what }} for {{ request.count }} words?</template>
        </p>
        <button class="btn bg-red-600 text-white" data-testid="reset-confirm" @click="confirm">{{ sure ? `Yes, reset ${request.count} words` : 'Reset progress' }}</button>
        <button class="btn-ghost" data-testid="reset-cancel" @click="emit('close')">Cancel</button>
      </div>
    </div>
  </Transition>
</template>
