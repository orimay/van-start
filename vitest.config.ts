import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: { include: ['app/**/*.spec.ts'], setupFiles: ['fake-indexeddb/auto', './tests/surreal-setup.ts'], testTimeout: 30000, hookTimeout: 60000, environment: 'nuxt', environmentOptions: { nuxt: { domEnvironment: 'happy-dom' } } },
});
