<script setup lang="ts">
import { letterCount, splitAffix } from '@/utils/deck';

/** An affix's example word, or its transcription (`size` letters of it the affix): the affix bright, the rest grey. */
const props = defineProps<{ word: string; affix: string; size?: number }>();
const parts = computed(() => splitAffix(props.word, props.size ?? letterCount(props.affix), props.affix.endsWith('-')));
</script>

<template>
  <span><span class="text-stone-400 dark:text-stone-500">{{ parts[0] }}</span><span data-testid="affix-part">{{ parts[1] }}</span><span class="text-stone-400 dark:text-stone-500">{{ parts[2] }}</span></span>
</template>
