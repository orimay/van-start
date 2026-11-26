import type { NuxtApp } from '#app';
import { describe, expect, it } from 'vitest';
import prerenderedAt from './prerendered-at.server';

const PRERENDERED_MS = 1795691530846;

describe('a prerendered page', () => {
  it('carries a stamp too short for a leak scanner to read as a card number', async () => {
    const payload = { prerenderedAt: PRERENDERED_MS };
    await prerenderedAt({ payload } as unknown as NuxtApp);
    expect(String(payload.prerenderedAt)).not.toMatch(/\d{12}/);
  });

  it('still reads as prerendered', async () => {
    const payload = { prerenderedAt: PRERENDERED_MS };
    await prerenderedAt({ payload } as unknown as NuxtApp);
    expect(payload.prerenderedAt).toBeTruthy();
  });
});
