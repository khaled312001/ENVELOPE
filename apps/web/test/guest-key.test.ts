import { afterEach, describe, expect, it, vi } from 'vitest';

import { guestKey } from '../src/api/guest-key.js';

// The API's `GUEST_KEY`, restated: a web test does not import the server.
const GUEST_KEY = /^guest-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('guestKey', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('has the shape the API accepts, as a version 4 UUID', () => {
    for (let i = 0; i < 50; i++) {
      const key = guestKey();
      expect(key).toMatch(GUEST_KEY);
      expect(key[20]).toBe('4');
      expect('89ab').toContain(key[25]);
    }
  });

  it('works where randomUUID does not exist — a page served over plain HTTP', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: <T extends Uint8Array>(b: T): T => real.getRandomValues(b) });
    expect('randomUUID' in globalThis.crypto).toBe(false);
    expect(guestKey()).toMatch(GUEST_KEY);
  });

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 200 }, () => guestKey()));
    expect(seen.size).toBe(200);
  });

  it('lays sixteen given bytes out in order', () => {
    const fixed = (b: Uint8Array) => {
      b.set([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);
      return b;
    };
    expect(guestKey(fixed)).toBe('guest-00112233-4455-4677-8899-aabbccddeeff');
  });
});
