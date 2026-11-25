/** A plain-DOM screen: the Vue app is not mounted while data migrates. Shows only when a step runs. */
export function showMigrationProgress() {
  let root: HTMLElement | undefined;
  let bar: HTMLElement | undefined;
  let label: HTMLElement | undefined;
  const ensure = () => {
    if (root) return;
    root = document.createElement('div');
    root.dataset.testid = 'migration';
    root.className = 'fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-stone-50 p-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100 text-center';
    label = document.createElement('p');
    const track = document.createElement('div');
    track.className = 'h-2 w-64 overflow-hidden rounded bg-stone-200 dark:bg-stone-800';
    bar = document.createElement('div');
    bar.className = 'h-full bg-orange-600 transition-[width]';
    bar.style.width = '0%';
    track.append(bar);
    root.append(label, track);
    document.body.append(root);
  };
  return {
    step(done: number, total: number) {
      if (!total) return;
      ensure();
      label!.textContent = `Updating your data: step ${Math.min(done + 1, total)} of ${total}`;
      bar!.style.width = `${(done / total) * 100}%`;
    },
    fail(error: unknown) {
      ensure();
      console.error(error);
      label!.textContent = `Could not update your data (${describe(error)}). Reload to try again; nothing was lost.`;
      const retry = document.createElement('button');
      retry.textContent = 'Reload';
      retry.className = 'rounded bg-orange-700 px-4 py-2 text-white';
      retry.onclick = () => void installWaitingUpdate().finally(() => location.reload());
      root!.append(retry);
    },
    close: () => root?.remove(),
  };
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause === undefined ? error.message : `${error.message}: ${describe(error.cause)}`;
}

/** The app never mounts here, so a waiting service worker would wait forever; take it now. */
async function installWaitingUpdate() {
  const waiting = (await navigator.serviceWorker?.getRegistration().catch(() => undefined))?.waiting;
  if (!waiting) return;
  waiting.postMessage({ type: 'SKIP_WAITING' });
  await new Promise(resolve => setTimeout(resolve, 500));
}
