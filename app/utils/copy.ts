import { shallowRef } from 'vue';

/** A short note shown over the page, cleared after a moment. */
export const toast = shallowRef<string>();
let timer: ReturnType<typeof setTimeout> | undefined;

export function showToast(text: string, ms = 1500) {
  toast.value = text;
  clearTimeout(timer);
  timer = setTimeout(() => (toast.value = undefined), ms);
}

/** Copies one text of a card, e.g. to look it up elsewhere. */
export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
  showToast('Copied');
}
