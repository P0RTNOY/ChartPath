import { describe, expect, it } from 'vitest';

import {
  canonicalSerialize,
  deriveExchangeLocalTimestamp,
  isValidIanaTimezone,
  sha256Hex,
} from '../src/index.js';

describe('canonical serialization and pure SHA-256', () => {
  it.each([
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
  ])('matches the standard digest for %j', (input, expected) => {
    expect(sha256Hex(input)).toBe(expected);
  });

  it('is deterministic for Hebrew and supplementary Unicode text', () => {
    const value = 'נתונים היסטוריים 📈';
    expect(sha256Hex(value)).toBe(sha256Hex(value));
    expect(sha256Hex(value)).toHaveLength(64);
    expect(sha256Hex(value)).not.toBe(sha256Hex(`${value}!`));
  });

  it('sorts object keys while preserving array order', () => {
    expect(canonicalSerialize({ z: 1, a: { d: 4, b: 2 }, list: [3, 1] })).toBe(
      canonicalSerialize({ list: [3, 1], a: { b: 2, d: 4 }, z: 1 }),
    );
    expect(canonicalSerialize([1, 2])).not.toBe(canonicalSerialize([2, 1]));
  });

  it.each([
    { key: undefined },
    { key: Number.NaN },
    { key: Number.POSITIVE_INFINITY },
    { key: -0 },
  ])('rejects non-canonical JSON values %#', (value) => {
    expect(() => canonicalSerialize(value)).toThrow(TypeError);
  });

  it('rejects cycles and sparse arrays', () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => canonicalSerialize(cyclic)).toThrow(/circular/);
    expect(() => canonicalSerialize(new Array(2))).toThrow(/sparse/);
  });
});

describe('exchange-local derivation', () => {
  it('accepts canonical IANA zones and rejects aliases/unknown zones', () => {
    expect(isValidIanaTimezone('Asia/Jerusalem')).toBe(true);
    expect(isValidIanaTimezone('UTC')).toBe(true);
    expect(isValidIanaTimezone('Not/A_Zone')).toBe(false);
  });

  it('derives deterministic local wall time across daylight-saving changes', () => {
    expect(deriveExchangeLocalTimestamp('2025-01-05T07:00:00.000Z', 'Asia/Jerusalem')).toBe(
      '2025-01-05T09:00:00',
    );
    expect(deriveExchangeLocalTimestamp('2025-07-05T07:00:00.000Z', 'Asia/Jerusalem')).toBe(
      '2025-07-05T10:00:00',
    );
  });
});
