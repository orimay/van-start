const KEY = 'update-reload';

/** Marks the coming reload of this page as an app update, so a lesson interrupted on it goes on without asking. */
export function markUpdateReload() {
  try {
    sessionStorage.setItem(KEY, location.pathname + location.search);
  } catch {}
}

/** Whether this load of the page at `href` is an app update's reload; the mark is used up either way. */
export function takeUpdateReload(href: string): boolean {
  try {
    const marked = sessionStorage.getItem(KEY) === href;
    sessionStorage.removeItem(KEY);
    return marked;
  } catch {
    return false;
  }
}
