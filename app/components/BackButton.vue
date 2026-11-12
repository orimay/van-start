<script setup lang="ts">
import { inject, type Ref } from 'vue';

const session = inject<{ canBack: Ref<boolean>; back: () => void }>('session');
</script>

<template>
  <button type="button" class="btn-ghost w-14 shrink-0 flex items-center justify-center" :disabled="!session?.canBack.value" aria-label="Back" data-testid="previous" @click="session?.back()">‹</button>
</template>
