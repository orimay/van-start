import { afterEach, describe, expect, it, vi } from 'vitest';
import { showMigrationProgress } from './migration-screen';

const screenText = () => document.querySelector('[data-testid="migration"]')?.textContent ?? null;

afterEach(() => document.querySelector('[data-testid="migration"]')?.remove());

describe('the migration screen', () => {
  it('stays hidden when no step runs', () => {
    showMigrationProgress().step(0, 0);
    expect(screenText()).toBeNull();
  });

  it('counts the steps', () => {
    const screen = showMigrationProgress();
    screen.step(1, 3);
    expect(screenText()).toContain('step 2 of 3');
  });

  it('is gone once done', () => {
    const screen = showMigrationProgress();
    screen.step(0, 1);
    screen.close();
    expect(screenText()).toBeNull();
  });

  it('offers a reload when a step fails', () => {
    showMigrationProgress().fail(new Error('boom'));
    expect(screenText()).toContain('boom');
    expect(screenText()).toContain('Reload');
  });

  it('installs a waiting app update on reload', async () => {
    const postMessage = vi.fn();
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration: async () => ({ waiting: { postMessage } }) } });
    showMigrationProgress().fail(new Error('boom'));
    (document.querySelector('[data-testid="migration"] button') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' }));
    vi.unstubAllGlobals();
  });

  it('names the cause of a failure', () => {
    showMigrationProgress().fail(new Error('connection', { cause: new Error('quota exceeded') }));
    expect(screenText()).toContain('quota exceeded');
  });
});
