<template>
  <NuxtPwaManifest />
  <main class="mx-auto flex min-h-dvh max-w-xl flex-col px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
    <NuxtPage />
    <Toast />
    <CardSheet />
  </main>
</template>
