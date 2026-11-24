<script lang="ts">
import type { Language } from '@/composables/useStore';

const KIND: Record<Language, { suffix: string; prefix: string }> = {
  ru: { suffix: 'суффикс', prefix: 'приставка' },
  en: { suffix: 'suffix', prefix: 'prefix' },
  es: { suffix: 'sufijo', prefix: 'prefijo' },
  pt: { suffix: 'sufixo', prefix: 'prefixo' },
  tr: { suffix: 'sonek', prefix: 'önek' },
  ro: { suffix: 'sufix', prefix: 'prefix' },
};
</script>

<script setup lang="ts">
import type { StudyCard } from '@/utils/deck';

/** An affix's meaning alone reads as a word of its own, so it says which part of a word it is. */
const props = defineProps<{ card: StudyCard; text: string }>();
const { settings } = useStore();
const kind = computed(() => props.card.affix && props.text !== props.card.affix.dutch ? KIND[settings.value.language][props.card.affix.dutch.endsWith('-') ? 'prefix' : 'suffix'] : undefined);
</script>

<template>
  <span v-if="kind" class="font-normal text-stone-500" data-testid="affix-kind"> ({{ kind }})</span>
</template>
