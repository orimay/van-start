<script setup lang="ts">
import type { LetterKind } from '@/utils/answer';

defineProps<{ letters: { char: string; kind: LetterKind }[] }>();

const STYLE: Record<LetterKind, string> = {
  ok: 'text-green-600',
  extra: 'rounded bg-red-200 text-red-800 line-through dark:bg-red-900 dark:text-red-100',
  missing: 'text-red-600',
  wrong: 'rounded bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-100',
};
</script>

<template>
  <!-- A missing letter shows as a gap: the answer may still be hidden. -->
  <span v-for="(l, i) in letters" :key="i" :class="STYLE[l.kind]" :data-kind="l.kind">{{ l.kind === 'missing' ? '_' : l.char }}</span>
</template>
