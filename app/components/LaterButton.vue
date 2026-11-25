<script setup lang="ts">
import { inject, type Ref } from 'vue';
const session = inject<{ canPutOff: Ref<boolean>; putOff: () => void }>('session');
</script>
<template>
  <button v-if="session?.canPutOff.value" type="button" class="btn-ghost w-12 min-[360px]:w-14 shrink-0 flex items-center justify-center" aria-label="Later" title="Later" data-testid="later" @click="session.putOff()">
    <LaterIcon />
  </button>
</template>
