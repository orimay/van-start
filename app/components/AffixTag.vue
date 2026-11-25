<script lang="ts">
import type { Language } from '@/composables/useStore';

/** Prefix or suffix alike: naming which would hint where the part goes. */
const AFFIX: Record<Language, string> = { ru: 'аффикс', en: 'affix', es: 'afijo', pt: 'afixo', tr: 'ek', ro: 'afix' };
</script>

<script setup lang="ts">
import type { StudyCard } from '@/utils/deck';

/** An affix's meaning alone reads as a word of its own, so it says it is part of a word. */
const props = defineProps<{ card: StudyCard; text: string }>();
const { settings } = useStore();
const kind = computed(() => props.card.affix && props.text !== props.card.affix.dutch ? AFFIX[settings.value.language] : undefined);
</script>

<template>
  <span v-if="kind" class="font-normal text-stone-500 dark:text-stone-400" data-testid="affix-kind"> ({{ kind }})</span>
</template>
