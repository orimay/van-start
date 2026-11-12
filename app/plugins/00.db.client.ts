import { useDb } from '@/db/connect';
import { migrate } from '@/db/migrations';
import { loadSessions } from '@/db/sessions';
import { loadTypical } from '@/db/shows';
import { showMigrationProgress } from '@/utils/migration-screen';

/** The app mounts only once the database is migrated and the deck loaded; `app/spa-loading-template.html` shows meanwhile, a progress bar over it while a migration runs. */
export default defineNuxtPlugin({
  name: 'db',
  parallel: false,
  async setup() {
    const screen = showMigrationProgress();
    try {
      await migrate(await useDb(), screen.step);
      // The deck loads before mount too, so the loading screen stays up until a page can show it.
      await Promise.all([loadSessions(), loadTypical(), useStore().ready]);
      screen.close();
    } catch (error) {
      screen.fail(error);
      // Nothing may run on half-migrated data; the next start retries the step.
      await new Promise(() => undefined);
    }
  },
});
