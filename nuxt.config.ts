import tailwindcss from '@tailwindcss/vite';
import { defineNuxtConfig } from 'nuxt/config';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { manifestInSeconds, revisionInLetters, stampInSeconds } from './app/utils/build-digits';

const themeColor = '#ea580c';
const baseURL = process.env.NUXT_APP_BASE_URL ?? '/';

export default defineNuxtConfig({
  modules: ['@vueuse/nuxt', '@vite-pwa/nuxt'],
  ssr: false,
  css: ['@/assets/main.css'],
  vite: { plugins: [tailwindcss()] },
  app: {
    baseURL,
    head: {
      htmlAttrs: { lang: 'en', translate: 'no' },
      title: 'Van start',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
      link: [
        { rel: 'icon', href: `${baseURL}favicon.png`, type: 'image/png' },
        { rel: 'apple-touch-icon', href: `${baseURL}apple-touch-icon-180x180.png`, sizes: '180x180' },
      ],
      meta: [
        { name: 'theme-color', content: themeColor },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Van start' },
      ],
    },
  },
  runtimeConfig: { public: { version: new Date().toISOString().slice(0, 16).replace('T', ' '), audioBase: process.env.NUXT_PUBLIC_AUDIO_BASE ?? `${baseURL}audio/` } },
  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Van start',
      short_name: 'Van start',
      description: 'Van start flashcards, A0 > A2',
      lang: 'en',
      theme_color: themeColor,
      background_color: '#ffffff',
      display: 'standalone',
      start_url: baseURL,
      scope: baseURL,
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png}'],
      globIgnores: ['**/img/**'],
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      navigateFallback: baseURL,
      cleanupOutdatedCaches: true,
      manifestTransforms: [async entries => ({ manifest: entries.map(e => ({ ...e, revision: e.revision && revisionInLetters(e.revision) })), warnings: [] })],
      runtimeCaching: [{
        // The database engine is 21 MB, over the precache limit; its name is hashed, so a cached copy never goes stale.
        urlPattern: /\.wasm$/,
        handler: 'CacheFirst',
        options: { cacheName: 'wasm', expiration: { maxEntries: 2 } },
      }, {
        // Deck and translations change on every deploy; precaching them made each update a 5 MB install.
        urlPattern: /\.json$/,
        handler: 'NetworkFirst',
        options: { cacheName: 'data', networkTimeoutSeconds: 4 },
      }, {
        urlPattern: /\/img\/.+\.jpg$/,
        handler: 'CacheFirst',
        options: { cacheName: 'img', expiration: { maxEntries: 2000 } },
      }, {
        urlPattern: /\.mp3$/,
        handler: 'CacheFirst',
        options: { cacheName: 'audio', expiration: { maxEntries: 10000 }, rangeRequests: true },
      }],
    },
  },
  nitro: {
    hooks: {
      'prerender:generate'(route) {
        if (typeof route.contents === 'string' && route.fileName?.endsWith('.html')) route.contents = stampInSeconds(route.contents);
      },
    },
  },
  hooks: {
    async 'nitro:build:public-assets'(nitro) {
      const builds = join(nitro.options.output.publicDir, '_nuxt/builds');
      const files = (await readdir(builds, { recursive: true }).catch(() => [])).filter(f => f.endsWith('.json')).map(f => join(builds, f));
      await Promise.all(files.map(async f => writeFile(f, manifestInSeconds(await readFile(f, 'utf8')))));
    },
  },
  compatibilityDate: '2026-11-01',
});
