import { computeCanonicalDatasetChecksum } from './canonical.js';
import { sha256Hex } from './sha256.js';
import { deriveExchangeLocalTimestamp, isValidUtcTimestamp } from './time.js';
import type {
  HistoricalCandle,
  HistoricalDataset,
  HistoricalImportResult,
  HistoricalSourceManifest,
  HistoricalValidationIssue,
  RecordedMissingInterval,
  SessionClassification,
  Sha256Checksum,
} from './types.js';
import { validateHistoricalDataset, validateHistoricalSourceManifest } from './validation.js';

const REQUIRED_HEADERS = [
  'timestamp',
  'open',
  'high',
  'low',
  'close',
  'volume',
  'session',
] as const;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

function issue(
  issues: HistoricalValidationIssue[],
  code: string,
  path: string,
  message: string,
  severity: 'error' | 'warning' = 'error',
): void {
  issues.push({ code, path, message, severity });
}

function parseCsv(raw: string): {
  readonly rows: readonly (readonly string[])[];
  readonly error?: string;
} {
  const source = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? '';
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
      } else field += character;
      continue;
    }
    if (character === '"') {
      if (field.length > 0) return { rows, error: 'A quote may only begin an empty field.' };
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      if (!(row.length === 1 && row[0] === '' && index === source.length - 1)) rows.push(row);
      row = [];
      field = '';
    } else field += character;
  }
  if (quoted) return { rows, error: 'Unterminated quoted field.' };
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return { rows };
}

function decimalValue(
  raw: string,
  precision: number,
  path: string,
  issues: HistoricalValidationIssue[],
): number | undefined {
  if (!DECIMAL.test(raw)) {
    issue(
      issues,
      'invalid-decimal',
      path,
      'Expected a nonnegative base-10 decimal without grouping or exponent notation.',
    );
    return undefined;
  }
  const fractional = raw.split('.')[1]?.length ?? 0;
  if (fractional > precision) {
    issue(
      issues,
      'precision-loss-refused',
      path,
      `Value exceeds declared precision ${precision}; importer never rounds.`,
    );
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER) {
    issue(issues, 'invalid-decimal', path, 'Decimal is outside the supported finite safe range.');
    return undefined;
  }
  return value;
}

function detectMissingIntervals(
  candles: readonly HistoricalCandle[],
  interval: number,
  issues: HistoricalValidationIssue[],
): readonly RecordedMissingInterval[] {
  const missing: RecordedMissingInterval[] = [];
  for (let index = 1; index < candles.length; index += 1) {
    const after = candles[index - 1];
    const before = candles[index];
    if (!after || !before) continue;
    const delta = Date.parse(before.timestampUtc) - Date.parse(after.timestampUtc);
    if (delta > interval && delta % interval === 0) {
      const missingCandleCount = delta / interval - 1;
      missing.push({
        afterCandleIndex: index - 1,
        beforeCandleIndex: index,
        firstMissingTimestampUtc: new Date(Date.parse(after.timestampUtc) + interval).toISOString(),
        lastMissingTimestampUtc: new Date(Date.parse(before.timestampUtc) - interval).toISOString(),
        missingCandleCount,
        reason: 'source-omission',
      });
      issue(
        issues,
        'recorded-missing-interval',
        `rows[${index + 1}]`,
        `Recorded ${missingCandleCount} missing interval(s) without creating candles.`,
        'warning',
      );
    } else if (delta > 0 && delta !== interval) {
      issue(
        issues,
        'unexpected-interval-irregularity',
        `rows[${index + 1}]`,
        'Timestamp delta is not a whole multiple of the declared interval.',
      );
    }
  }
  return missing;
}

export function importHistoricalCsv(
  rawText: string,
  source: HistoricalSourceManifest,
): HistoricalImportResult {
  const issues: HistoricalValidationIssue[] = [];
  const rawChecksum = `sha256:${sha256Hex(rawText)}` as Sha256Checksum;
  issues.push(...validateHistoricalSourceManifest(source));
  if (issues.some((item) => item.severity === 'error'))
    return {
      ok: false,
      report: {
        valid: false,
        rawChecksum,
        rowsRead: 0,
        rowsAccepted: 0,
        recordedMissingIntervals: 0,
        issues,
      },
    };
  if (source.expectedRawChecksum && source.expectedRawChecksum !== rawChecksum)
    issue(
      issues,
      'raw-checksum-mismatch',
      'source.expectedRawChecksum',
      `Expected ${source.expectedRawChecksum}; computed ${rawChecksum}.`,
    );
  if (source.adjustment.mode !== 'raw')
    issue(
      issues,
      'unsupported-import-adjustment',
      'source.adjustment.mode',
      'CSV importer accepts raw OHLCV only; adjusted data requires an explicit supported import profile.',
    );

  const parsed = parseCsv(rawText);
  if (parsed.error) issue(issues, 'malformed-csv', 'rawText', parsed.error);
  const header = parsed.rows[0] ?? [];
  if (new Set(header).size !== header.length)
    issue(issues, 'duplicate-csv-header', 'rows[0]', 'CSV header names must be unique.');
  if (
    header.length !== REQUIRED_HEADERS.length ||
    REQUIRED_HEADERS.some((name, index) => header[index] !== name)
  )
    issue(
      issues,
      'invalid-csv-header',
      'rows[0]',
      `Expected exact header order: ${REQUIRED_HEADERS.join(',')}.`,
    );

  const candles: HistoricalCandle[] = [];
  for (let rowIndex = 1; rowIndex < parsed.rows.length; rowIndex += 1) {
    const row = parsed.rows[rowIndex] ?? [];
    const path = `rows[${rowIndex}]`;
    if (row.length === 1 && row[0] === '') {
      issue(issues, 'blank-csv-row', path, 'Interior blank rows are not allowed.');
      continue;
    }
    if (row.length !== REQUIRED_HEADERS.length) {
      issue(issues, 'invalid-csv-row', path, `Expected ${REQUIRED_HEADERS.length} columns.`);
      continue;
    }
    const timestamp = row[0] ?? '';
    if (!isValidUtcTimestamp(timestamp)) {
      issue(
        issues,
        'invalid-utc-timestamp',
        `${path}.timestamp`,
        'CSV timestamps must be strict RFC 3339 UTC values.',
      );
      continue;
    }
    const open = decimalValue(row[1] ?? '', source.pricePrecision, `${path}.open`, issues);
    const high = decimalValue(row[2] ?? '', source.pricePrecision, `${path}.high`, issues);
    const low = decimalValue(row[3] ?? '', source.pricePrecision, `${path}.low`, issues);
    const close = decimalValue(row[4] ?? '', source.pricePrecision, `${path}.close`, issues);
    const volume = decimalValue(row[5] ?? '', 0, `${path}.volume`, issues);
    const session = row[6] as SessionClassification;
    if (!['pre-market', 'regular', 'after-hours', 'continuous'].includes(session)) {
      issue(issues, 'invalid-session', `${path}.session`, 'Unknown session classification.');
      continue;
    }
    if (
      open === undefined ||
      high === undefined ||
      low === undefined ||
      close === undefined ||
      volume === undefined
    )
      continue;
    candles.push({
      index: candles.length,
      timestampUtc: timestamp,
      exchangeLocalTimestamp: deriveExchangeLocalTimestamp(timestamp, source.exchangeTimezone),
      open,
      high,
      low,
      close,
      volume,
      session,
    });
  }

  const missingIntervals = detectMissingIntervals(candles, source.interval.milliseconds, issues);
  if (missingIntervals.length > 0 && source.missingIntervalPolicy.behavior === 'reject')
    issue(
      issues,
      'missing-interval-rejected',
      'source.missingIntervalPolicy',
      'Source policy rejects detected gaps.',
    );
  if (candles.length === 0)
    issue(issues, 'missing-candles', 'rows', 'CSV did not contain any valid candle rows.');

  const startTimestampUtc = candles[0]?.timestampUtc ?? '';
  const endTimestampUtc = candles.at(-1)?.timestampUtc ?? '';
  if (source.expectedCandleCount !== undefined && source.expectedCandleCount !== candles.length)
    issue(
      issues,
      'expected-count-mismatch',
      'source.expectedCandleCount',
      `Expected ${source.expectedCandleCount}; imported ${candles.length}.`,
    );
  if (source.expectedStartTimestampUtc && source.expectedStartTimestampUtc !== startTimestampUtc)
    issue(
      issues,
      'expected-range-mismatch',
      'source.expectedStartTimestampUtc',
      'Imported start timestamp differs from expectation.',
    );
  if (source.expectedEndTimestampUtc && source.expectedEndTimestampUtc !== endTimestampUtc)
    issue(
      issues,
      'expected-range-mismatch',
      'source.expectedEndTimestampUtc',
      'Imported end timestamp differs from expectation.',
    );

  if (issues.some((item) => item.severity === 'error'))
    return {
      ok: false,
      report: {
        valid: false,
        rawChecksum,
        rowsRead: Math.max(0, parsed.rows.length - 1),
        rowsAccepted: candles.length,
        recordedMissingIntervals: missingIntervals.length,
        issues,
      },
    };

  const sourceOnlyKeys = new Set([
    'expectedRawChecksum',
    'expectedStartTimestampUtc',
    'expectedEndTimestampUtc',
    'expectedCandleCount',
    'corporateActions',
  ]);
  const manifestSource = Object.fromEntries(
    Object.entries(source).filter(([key]) => !sourceOnlyKeys.has(key)),
  ) as Omit<
    HistoricalSourceManifest,
    | 'expectedRawChecksum'
    | 'expectedStartTimestampUtc'
    | 'expectedEndTimestampUtc'
    | 'expectedCandleCount'
    | 'corporateActions'
  >;
  let dataset: HistoricalDataset = {
    manifest: {
      ...manifestSource,
      rawChecksum,
      canonicalChecksum: `sha256:${'0'.repeat(64)}`,
      startTimestampUtc,
      endTimestampUtc,
      candleCount: candles.length,
    },
    candles,
    corporateActions: source.corporateActions,
    missingIntervals,
  };
  dataset = {
    ...dataset,
    manifest: { ...dataset.manifest, canonicalChecksum: computeCanonicalDatasetChecksum(dataset) },
  };
  const validation = validateHistoricalDataset(dataset);
  const combinedIssues = [...issues, ...validation.issues];
  const report = {
    valid: validation.valid,
    rawChecksum,
    canonicalChecksum: dataset.manifest.canonicalChecksum,
    rowsRead: Math.max(0, parsed.rows.length - 1),
    rowsAccepted: candles.length,
    recordedMissingIntervals: missingIntervals.length,
    issues: combinedIssues,
  } as const;
  return validation.valid ? { ok: true, dataset, report } : { ok: false, report };
}
