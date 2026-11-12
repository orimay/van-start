import { mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VersionInfo from './VersionInfo.vue';

let pwa: { needRefresh: boolean; updateServiceWorker: (reload?: boolean) => Promise<void> };
beforeEach(() => {
  pwa = useNuxtApp().$pwa!;
  vi.spyOn(pwa, 'updateServiceWorker').mockResolvedValue();
});

describe('version info', () => {
  it('shows the build version', async () => {
    const w = await mountSuspended(VersionInfo);
    expect(w.get('[data-testid="version"]').text()).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  });

  it('offers no update while the app is current', async () => {
    pwa.needRefresh = false;
    const w = await mountSuspended(VersionInfo);
    expect(w.find('[data-testid="update"]').exists()).toBe(false);
  });

  it('installs a waiting update on request', async () => {
    pwa.needRefresh = true;
    const w = await mountSuspended(VersionInfo);
    await w.get('[data-testid="update"]').trigger('click');
    expect(pwa.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('checks for a new version when shown', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { getRegistration: () => Promise.resolve({ update }) } });
    await mountSuspended(VersionInfo);
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    vi.unstubAllGlobals();
  });
});
