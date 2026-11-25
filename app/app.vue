<template>
  <NuxtPwaManifest />
  <main class="mx-auto flex min-h-dvh max-w-xl flex-col pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
    <NuxtPage />
    <Toast />
    <CardSheet />
    <LeaveSheet />
  </main>
</template>
