import { beforeEach, describe, expect, it } from 'vitest';
import { announceUpdate } from './announce-update';
import { toast } from './copy';

beforeEach(() => {
  localStorage.clear();
  toast.value = undefined;
});

describe('a start', () => {
  it('says nothing on the first visit', () => {
    announceUpdate('2026-11-20 10:00');
    expect(toast.value).toBeUndefined();
  });

  it('says nothing when the version stayed', () => {
    announceUpdate('2026-11-20 10:00');
    announceUpdate('2026-11-20 10:00');
    expect(toast.value).toBeUndefined();
  });

  it('tells about a new version', () => {
    announceUpdate('2026-11-20 10:00');
    announceUpdate('2026-11-20 12:00');
    expect(toast.value).toBe('Updated to 2026-11-20 12:00 UTC');
  });
});
