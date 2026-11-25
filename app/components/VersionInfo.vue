<script setup lang="ts">
import { checkForUpdate } from '@/utils/check-for-update';
const version = useRuntimeConfig().public.version as string;
const pwa = useNuxtApp().$pwa;
onMounted(checkForUpdate);
</script>

<template>
  <div class="flex items-center justify-between gap-2 text-sm text-stone-500 dark:text-stone-400">
    <span>Version <span data-testid="version">{{ version }}</span> UTC</span>
    <button v-if="pwa?.needRefresh" class="btn-primary" data-testid="update" @click="pwa.updateServiceWorker(true)">Update</button>
  </div>
</template>
