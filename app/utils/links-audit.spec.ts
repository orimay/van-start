import { describe, expect, it } from 'vitest';
import { audit, reviewed } from '../../scripts/audit-links';

describe('the deck', () => {
  const { unresolved, unlinked } = audit();

  it('links every origin part that names a card', () => {
    expect(unresolved).toEqual([]);
  });

  it('links each word to its parts, unless reviewed as a false split', () => {
    expect(unlinked.filter(hit => !reviewed.includes(hit))).toEqual([]);
  });

  it('keeps no reviewed hit the audit no longer finds', () => {
    expect(reviewed.filter(hit => !unlinked.includes(hit))).toEqual([]);
  });
});
