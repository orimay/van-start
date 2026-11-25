<script setup lang="ts">
import type { LetterKind } from '@/utils/answer';

const props = defineProps<{ letters: { char: string; kind: LetterKind }[]; reveal?: boolean }>();

const STYLE: Record<LetterKind, string> = {
  ok: 'text-green-700 dark:text-green-600',
  extra: 'rounded bg-red-200 text-red-800 line-through dark:bg-red-900 dark:text-red-100',
  missing: 'text-red-600 dark:text-red-400',
};
const REVEALED = 'text-green-700 underline decoration-2 underline-offset-4 dark:text-green-600';

/** A missing letter is a gap until the answer shows; a space typed in error is drawn, or its strike reads as a hyphen. */
const shown = ({ char, kind }: { char: string; kind: LetterKind }) => (kind === 'missing' ? (props.reveal ? char : '_') : kind !== 'ok' && char === ' ' ? '␣' : char);
const styleOf = (kind: LetterKind) => (kind === 'missing' && props.reveal ? REVEALED : STYLE[kind]);
</script>

<template>
  <span v-for="(l, i) in letters" :key="i" :class="styleOf(l.kind)" :data-kind="l.kind">{{ shown(l) }}</span>
</template>
