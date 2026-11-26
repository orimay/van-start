import { describe, expect, it } from 'vitest';
import { withUuids } from './course-ids';

describe('a course read from the served files', () => {
  it('carries the UUIDs its cards and groups had before ids were spelled in letters', () => {
    const served = { id: 'dfnijojf-lcbj-eeii-ilfa-oabkafdmmcpg', name: 'Course', children: [{ id: 'gfgchfkn-ffam-ehdo-lmfm-jcifdncofpkk', name: 'A', cards: [{ id: 'giheebbe-hjgi-ejfm-jhjj-dfnfnbmnhaai', f: 'f', b: 'b' }] }] };
    expect(withUuids(served)).toEqual({ id: '35d89e95-b219-4488-8b50-e01a053cc2f6', name: 'Course', children: [{ id: '656275ad-550c-473e-bc5c-92853d2e5faa', name: 'A', cards: [{ id: '68744114-7968-495c-9799-35d5d1cd7008', f: 'f', b: 'b' }] }] });
  });

  it('keeps an id that is no letter-spelled UUID', () => {
    expect(withUuids({ id: 'root', name: 'Course', cards: [{ id: 'huis', f: 'f', b: 'b' }] })).toEqual({ id: 'root', name: 'Course', cards: [{ id: 'huis', f: 'f', b: 'b' }] });
  });
});
