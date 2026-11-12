import { clear, set } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDb } from '../connect';
import { forgetWritten, load } from '../kv';
import { loadSessions, sessions } from '../sessions';
import { flushShows, forgetTypical, loadTypical, logShow, recallMs } from '../shows';
import { migrate, versionOf } from '.';

beforeEach(async () => {
  await resetDb();
  forgetWritten();
  await clear();
  localStorage.clear();
});

describe('migrating', () => {
  it('runs every step from an empty database, in order', async () => {
    const db = await resetDb();
    const ran: number[] = [];
    await migrate(db, undefined, [3, 1, 2].map(version => step(version, ran)));
    expect(ran).toEqual([1, 2, 3]);
    expect(await versionOf(db)).toBe(3);
  });

  it('runs only the steps above the stored version', async () => {
    const db = await resetDb();
    await migrate(db, undefined, [step(1, [])]);
    const ran: number[] = [];
    await migrate(db, undefined, [1, 2, 3].map(version => step(version, ran)));
    expect(ran).toEqual([2, 3]);
  });

  it('loads no step on an up-to-date database', async () => {
    const db = await resetDb();
    await migrate(db, undefined, [step(1, [])]);
    const load = vi.fn();
    await migrate(db, undefined, [{ version: 1, load }]);
    expect(load).not.toHaveBeenCalled();
  });

  it('stops at a failed step, keeping the version before it', async () => {
    const db = await resetDb();
    const failing = { version: 2, load: async () => ({ run: () => Promise.reject(new Error('boom')) }) };
    const ran: number[] = [];
    await expect(migrate(db, undefined, [step(1, ran), failing, step(3, ran)])).rejects.toThrow('boom');
    expect(ran).toEqual([1]);
    expect(await versionOf(db)).toBe(1);
  });

  it('reports progress step by step', async () => {
    const db = await resetDb();
    const seen: string[] = [];
    await migrate(db, (done, total) => seen.push(`${done}/${total}`), [step(1, []), step(2, [])]);
    expect(seen).toEqual(['0/2', '1/2', '2/2']);
  });
});

describe('step 1', () => {
  it('copies the old store and sessions in, keeping the old ones', async () => {
    await set('progress', { a: { due: '2026-01-01T00:00:00.000Z' } });
    await set('settings', { language: 'ru' });
    localStorage.setItem('learn-resume:0', '{"at":3}');
    localStorage.setItem('other', 'x');
    await migrate(await resetDb());
    await loadSessions();
    expect(await load('progress')).toEqual({ a: { due: '2026-01-01T00:00:00.000Z' } });
    expect(await load('settings')).toEqual({ language: 'ru' });
    expect(sessions.keys()).toEqual(['learn-resume:0']);
    expect(localStorage.getItem('learn-resume:0')).toBe('{"at":3}');
  });

  it('just sets the version for a new learner', async () => {
    const db = await resetDb();
    await migrate(db);
    expect(await versionOf(db)).toBe(2);
    expect(await load('progress')).toBeUndefined();
  });
});

describe('step 2', () => {
  it('fills in recall times from answers logged before them', async () => {
    const db = await resetDb();
    await migrate(db, undefined, [step(1, [])]);
    for (const ms of [1000, 3000, 2000]) void logShow({ word: 'w', game: 'recall', session: 's', t: 0, answer: 'plus', ms, rung: 0, source: 'new' });
    await flushShows();
    await db.query('DELETE recall').collect();
    await migrate(db);
    forgetTypical();
    await loadTypical();
    expect(recallMs('w', 'recall')).toBe(2000);
  });
});

// declarative helpers

function step(version: number, ran: number[]) {
  return { version, load: async () => ({ run: async () => void ran.push(version) }) };
}
