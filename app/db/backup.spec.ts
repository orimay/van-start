import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb, useDb } from './connect';
import { exportLog, importLog, type ShowRow } from './backup';
import { migrate } from './migrations';

beforeEach(async () => {
  await resetDb();
});

const row = (n: number, ms = 1000): ShowRow => ({ word: `w${n}`, game: 'recall', session: 's', t: n, answer: 'plus', ms, rung: 0, source: 'new', at: `2026-01-0${n}T00:00:00Z` });

describe('the backup log', () => {
  it('carries the schema version', async () => {
    await migrate(await resetDb());
    expect((await exportLog()).schema_version).toBe(2);
  });

  it('round-trips the show log', async () => {
    await importLog({ shows: [row(1), row(2)] });
    expect((await exportLog()).shows.map(s => s.word)).toEqual(['w1', 'w2']);
  });

  it('lists shows in time order, whatever their fractional seconds', async () => {
    await importLog({ shows: [{ ...row(1), at: '2026-01-01T00:00:01Z' }, { ...row(2), at: '2026-01-01T00:00:01.5Z' }] });
    expect((await exportLog()).shows.map(s => s.word)).toEqual(['w1', 'w2']);
  });

  it('is kept when a backup has none', async () => {
    await importLog({ shows: [row(1)] });
    await importLog({});
    expect((await exportLog()).shows).toHaveLength(1);
  });
});

describe('typical answer time', () => {
  it('is the median of the timed pluses in a game', async () => {
    await importLog({ shows: [row(1, 100), row(2, 300), row(3, 5000)] });
    const [ms] = await (await useDb()).query('SELECT VALUE ms FROM stats:recall').collect<[number[]]>();
    expect(ms).toEqual([300]);
  });
});
