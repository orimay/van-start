<script setup lang="ts">
import type { LetterKind } from '@/utils/answer';

defineProps<{ letters: { char: string; kind: LetterKind }[] }>();

const STYLE: Record<LetterKind, string> = {
  ok: 'text-green-700 dark:text-green-600',
  extra: 'rounded bg-red-200 text-red-800 line-through dark:bg-red-900 dark:text-red-100',
  missing: 'text-red-600 dark:text-red-400',
  wrong: 'rounded bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-100',
};

/** A missing letter is a gap, as the answer may still be hidden; a space typed in error is drawn, or its strike reads as a hyphen. */
const shown = ({ char, kind }: { char: string; kind: LetterKind }) => (kind === 'missing' ? '_' : kind !== 'ok' && char === ' ' ? '␣' : char);
</script>

<template>
  <span v-for="(l, i) in letters" :key="i" :class="STYLE[l.kind]" :data-kind="l.kind">{{ shown(l) }}</span>
</template>
