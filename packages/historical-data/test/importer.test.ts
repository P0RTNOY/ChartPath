import { describe, expect, it } from 'vitest';

import {
  DEVELOPMENT_FIXTURE_RAW_CSV,
  DEVELOPMENT_FIXTURE_SOURCE_MANIFEST,
  importHistoricalCsv,
  sha256Hex,
} from '../src/index.js';

describe('deterministic raw CSV importer', () => {
  it('validates the source manifest before reading raw rows', () => {
    const incomplete = {
      ...DEVELOPMENT_FIXTURE_SOURCE_MANIFEST,
      provenance:
        undefined as unknown as (typeof DEVELOPMENT_FIXTURE_SOURCE_MANIFEST)['provenance'],
    };
    const result = importHistoricalCsv(DEVELOPMENT_FIXTURE_RAW_CSV, incomplete);
    expect(result.ok).toBe(false);
    expect(result.report.rowsRead).toBe(0);
    expect(result.report.issues.map(({ code }) => code)).toContain('missing-provenance');
  });

  it('produces the checksum-pinned canonical development fixture and auditable gap report', () => {
    const result = importHistoricalCsv(
      DEVELOPMENT_FIXTURE_RAW_CSV,
      DEVELOPMENT_FIXTURE_SOURCE_MANIFEST,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report).toMatchObject({
      valid: true,
      rowsRead: 96,
      rowsAccepted: 96,
      recordedMissingIntervals: 1,
    });
    expect(result.dataset.candles).toHaveLength(96);
    expect(result.dataset.missingIntervals).toEqual([
      expect.objectContaining({
        afterCandleIndex: 41,
        beforeCandleIndex: 42,
        missingCandleCount: 1,
        reason: 'source-omission',
      }),
    ]);
    expect(result.dataset.candles[42]?.index).toBe(42);
  });

  it('checks raw text bytes exactly and does not normalize line endings before hashing', () => {
    const changed = DEVELOPMENT_FIXTURE_RAW_CSV.replaceAll('\n', '\r\n');
    const result = importHistoricalCsv(changed, DEVELOPMENT_FIXTURE_SOURCE_MANIFEST);
    expect(result.ok).toBe(false);
    expect(result.report.rawChecksum).toBe(`sha256:${sha256Hex(changed)}`);
    expect(result.report.issues.map(({ code }) => code)).toContain('raw-checksum-mismatch');
  });

  it('accepts BOM and quoted fields when the exact source checksum is supplied', () => {
    const raw =
      '\ufefftimestamp,open,high,low,close,volume,session\r\n"2025-01-05T07:00:00.000Z","100.00",101.00,99.00,100.50,0,continuous\r\n';
    const source = {
      ...DEVELOPMENT_FIXTURE_SOURCE_MANIFEST,
      expectedRawChecksum: `sha256:${sha256Hex(raw)}` as const,
      expectedCandleCount: 1,
      expectedStartTimestampUtc: '2025-01-05T07:00:00.000Z',
      expectedEndTimestampUtc: '2025-01-05T07:00:00.000Z',
    };
    const result = importHistoricalCsv(raw, source);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.dataset.candles[0]?.volume).toBe(0);
  });

  it.each([
    ['duplicate header', 'timestamp,open,high,low,close,volume,volume\n', 'duplicate-csv-header'],
    ['missing header', 'timestamp,open,high,low,close,volume\n', 'invalid-csv-header'],
    [
      'malformed quote',
      'timestamp,open,high,low,close,volume,session\n"2025-01-05T07:00:00.000Z,100,101,99,100,1,continuous\n',
      'malformed-csv',
    ],
    [
      'locale timestamp',
      'timestamp,open,high,low,close,volume,session\n05/01/2025 09:00,100,101,99,100,1,continuous\n',
      'invalid-utc-timestamp',
    ],
    [
      'precision loss',
      'timestamp,open,high,low,close,volume,session\n2025-01-05T07:00:00.000Z,100.001,101,99,100,1,continuous\n',
      'precision-loss-refused',
    ],
    [
      'negative volume',
      'timestamp,open,high,low,close,volume,session\n2025-01-05T07:00:00.000Z,100,101,99,100,-1,continuous\n',
      'invalid-decimal',
    ],
  ])('rejects %s deterministically', (_label, body, expectedCode) => {
    const source = {
      ...DEVELOPMENT_FIXTURE_SOURCE_MANIFEST,
      expectedRawChecksum: `sha256:${sha256Hex(body)}` as const,
      expectedCandleCount: undefined,
      expectedStartTimestampUtc: undefined,
      expectedEndTimestampUtc: undefined,
    };
    const result = importHistoricalCsv(body, source);
    expect(result.ok).toBe(false);
    expect(result.report.issues.map(({ code }) => code)).toContain(expectedCode);
  });

  it('rejects duplicate and non-monotonic candle timestamps through canonical validation', () => {
    const header = 'timestamp,open,high,low,close,volume,session';
    const row = (timestamp: string) => `${timestamp},100,101,99,100,1,continuous`;
    for (const [timestamps, expected] of [
      [['2025-01-05T07:00:00.000Z', '2025-01-05T07:00:00.000Z'], 'duplicate-timestamp'],
      [['2025-01-05T08:00:00.000Z', '2025-01-05T07:00:00.000Z'], 'non-monotonic-timestamp'],
    ] as const) {
      const raw = `${header}\n${timestamps.map(row).join('\n')}\n`;
      const source = {
        ...DEVELOPMENT_FIXTURE_SOURCE_MANIFEST,
        expectedRawChecksum: `sha256:${sha256Hex(raw)}` as const,
        expectedCandleCount: undefined,
        expectedStartTimestampUtc: undefined,
        expectedEndTimestampUtc: undefined,
      };
      const result = importHistoricalCsv(raw, source);
      expect(result.ok).toBe(false);
      expect(result.report.issues.map(({ code }) => code)).toContain(expected);
    }
  });

  it('refuses adjusted CSV input without an explicit supported adjustment profile', () => {
    const source = structuredClone(DEVELOPMENT_FIXTURE_SOURCE_MANIFEST);
    Object.assign(source.adjustment, {
      mode: 'split-adjusted',
      splitPolicy: 'adjusted',
    });
    const result = importHistoricalCsv(DEVELOPMENT_FIXTURE_RAW_CSV, source);
    expect(result.ok).toBe(false);
    expect(result.report.issues.map(({ code }) => code)).toContain('unsupported-import-adjustment');
  });
});
