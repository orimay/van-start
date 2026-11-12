import { showToast } from './copy';

const KEY = 'seen-version';

/** Says once that the app updated, when this start runs another version than the last one. */
export function announceUpdate(version: string) {
  let seen: string | null = null;
  try {
    seen = localStorage.getItem(KEY);
    localStorage.setItem(KEY, version);
  } catch {
    return;
  }
  if (seen && seen !== version) showToast(`Updated to ${version} UTC`, 3000);
}
