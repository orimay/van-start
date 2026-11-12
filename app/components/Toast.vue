<script setup lang="ts">
import { toast } from '@/utils/copy';
</script>

<template>
  <div v-if="toast" class="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center" role="status">
    <span class="rounded-full bg-stone-800 px-4 py-2 text-sm text-white shadow-lg dark:bg-stone-200 dark:text-stone-900" data-testid="toast">{{ toast }}</span>
  </div>
</template>
