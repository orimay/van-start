/** Nuxt stamps prerendered pages in milliseconds, 13 digits a leak scanner reads as a card number; the client only checks it is set. */
export default defineNuxtPlugin((nuxtApp) => {
  const at = nuxtApp.payload.prerenderedAt;
  if (at) nuxtApp.payload.prerenderedAt = Math.floor(at / 1000);
});
