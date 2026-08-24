import { describe, expect, it } from 'vitest';

import {
  DEVELOPMENT_HISTORICAL_DATASET,
  DEVELOPMENT_HISTORICAL_SCENARIO,
  computeCanonicalDatasetChecksum,
  evaluatePublicationGate,
  validateHistoricalDataset,
  validateHistoricalScenario,
  verifyDatasetIdentity,
  type HistoricalDataset,
  type HistoricalReplayScenario,
} from '../src/index.js';

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

function cloneDataset(): Mutable<HistoricalDataset> {
  return structuredClone(DEVELOPMENT_HISTORICAL_DATASET) as Mutable<HistoricalDataset>;
}

function cloneScenario(): Mutable<HistoricalReplayScenario> {
  return structuredClone(DEVELOPMENT_HISTORICAL_SCENARIO) as Mutable<HistoricalReplayScenario>;
}

function recertify(dataset: Mutable<HistoricalDataset>): HistoricalDataset {
  dataset.manifest.canonicalChecksum = computeCanonicalDatasetChecksum(dataset);
  return dataset;
}

function publishablePair(): readonly [
  Mutable<HistoricalDataset>,
  Mutable<HistoricalReplayScenario>,
] {
  const dataset = cloneDataset();
  dataset.manifest.publicationStatus = 'published';
  dataset.manifest.provenance.license.redistributionStatus = 'verified';
  recertify(dataset);
  const scenario = cloneScenario();
  scenario.dataset.canonicalChecksum = dataset.manifest.canonicalChecksum;
  scenario.publicationStatus = 'published';
  scenario.editorial = {
    status: 'published',
    humanReviewer: 'editorial-review-record-001',
    reviewedAt: '2026-08-24T00:00:00.000Z',
  };
  return [dataset, scenario];
}

function codes(dataset: HistoricalDataset): readonly string[] {
  return validateHistoricalDataset(dataset).issues.map(({ code }) => code);
}

const unchanged = (): void => undefined;

describe('historical manifest and dataset validation', () => {
  it('accepts the complete generated fixture while truthfully marking it non-publishable', () => {
    expect(validateHistoricalDataset(DEVELOPMENT_HISTORICAL_DATASET)).toMatchObject({
      valid: true,
      publishable: false,
      counts: { candles: 96, corporateActions: 0, missingIntervals: 1 },
      issues: [],
    });
  });

  it('detects missing provenance and missing license status without throwing', () => {
    const noProvenance = cloneDataset();
    noProvenance.manifest.provenance = undefined as unknown as Mutable<
      HistoricalDataset['manifest']['provenance']
    >;
    expect(codes(noProvenance)).toContain('missing-provenance');

    const noLicense = cloneDataset();
    noLicense.manifest.provenance.license = undefined as unknown as Mutable<
      HistoricalDataset['manifest']['provenance']['license']
    >;
    expect(codes(noLicense)).toContain('missing-license-status');
  });

  it.each([
    ['sourceUrl', 'http://example.test/data', 'invalid-source-url'],
    ['termsUrl', 'not a URL', 'invalid-terms-url'],
  ] as const)('rejects invalid provenance %s', (field, value, expected) => {
    const dataset = cloneDataset();
    dataset.manifest.provenance[field] = value;
    expect(codes(recertify(dataset))).toContain(expected);
  });

  it('validates timezone, exchange-local derivation, session, currency, and MIC', () => {
    const timezone = cloneDataset();
    timezone.manifest.exchangeTimezone = 'Unknown/Zone';
    expect(codes(recertify(timezone))).toContain('invalid-timezone');

    const local = cloneDataset();
    const first = local.candles[0];
    if (first) first.exchangeLocalTimestamp = '2025-01-05T08:00:00';
    expect(codes(recertify(local))).toContain('invalid-local-timestamp');

    const session = cloneDataset();
    const candle = session.candles[0];
    if (candle) candle.session = 'regular';
    expect(codes(recertify(session))).toContain('invalid-session');

    const identity = cloneDataset();
    identity.manifest.currency = 'xx';
    identity.manifest.mic = 'BAD';
    expect(codes(recertify(identity))).toEqual(
      expect.arrayContaining(['invalid-currency', 'invalid-mic']),
    );

    const boundary = cloneDataset();
    boundary.manifest.sessionPolicy.includedSessions = ['continuous', 'regular'];
    boundary.manifest.sessionPolicy.regularSessionOpen = '10:00';
    const firstBoundaryCandle = boundary.candles[0];
    if (firstBoundaryCandle) firstBoundaryCandle.session = 'regular';
    expect(codes(recertify(boundary))).toContain('invalid-session-boundary');
  });

  it('detects count, range, sequential-index, checksum, and post-checksum modification errors', () => {
    const count = cloneDataset();
    count.manifest.candleCount += 1;
    expect(codes(recertify(count))).toContain('candle-count-mismatch');

    const range = cloneDataset();
    range.manifest.endTimestampUtc = range.candles[0]?.timestampUtc ?? '';
    expect(codes(recertify(range))).toContain('range-mismatch');

    const index = cloneDataset();
    const candle = index.candles[5];
    if (candle) candle.index = 99;
    expect(codes(recertify(index))).toContain('unstable-candle-index');

    const checksum = cloneDataset();
    checksum.manifest.canonicalChecksum = `sha256:${'a'.repeat(64)}`;
    expect(codes(checksum)).toContain('canonical-checksum-mismatch');
    expect(verifyDatasetIdentity(DEVELOPMENT_HISTORICAL_SCENARIO.dataset, checksum)).toEqual({
      ok: false,
      reason: 'checksum-mismatch',
    });

    const modified = cloneDataset();
    const modifiedCandle = modified.candles[2];
    if (modifiedCandle) modifiedCandle.close += 0.01;
    expect(verifyDatasetIdentity(DEVELOPMENT_HISTORICAL_SCENARIO.dataset, modified)).toEqual({
      ok: false,
      reason: 'modified',
    });
  });

  it('rejects duplicate and non-monotonic timestamps', () => {
    const duplicate = cloneDataset();
    const second = duplicate.candles[1];
    const first = duplicate.candles[0];
    if (first && second) {
      second.timestampUtc = first.timestampUtc;
      second.exchangeLocalTimestamp = first.exchangeLocalTimestamp;
    }
    expect(codes(recertify(duplicate))).toContain('duplicate-timestamp');

    const reversed = cloneDataset();
    const reversedSecond = reversed.candles[1];
    if (reversedSecond) reversedSecond.timestampUtc = '2025-01-05T06:00:00.000Z';
    expect(codes(recertify(reversed))).toContain('non-monotonic-timestamp');
  });

  it.each([
    ['high below open', { high: 99 }, 'invalid-ohlc'],
    ['low above close', { low: 102 }, 'invalid-ohlc'],
    ['negative price', { open: -1 }, 'invalid-price'],
    ['excess precision', { close: 100.001 }, 'price-precision'],
  ] as const)('rejects %s', (_label, patch, expected) => {
    const dataset = cloneDataset();
    const candle = dataset.candles[0];
    if (candle) Object.assign(candle, patch);
    expect(codes(recertify(dataset))).toContain(expected);
  });

  it('accepts zero volume and rejects negative/non-finite volume', () => {
    const zero = cloneDataset();
    const zeroCandle = zero.candles[0];
    if (zeroCandle) zeroCandle.volume = 0;
    expect(validateHistoricalDataset(recertify(zero)).valid).toBe(true);

    for (const value of [-1, Number.NaN]) {
      const dataset = cloneDataset();
      const candle = dataset.candles[0];
      if (candle) candle.volume = value;
      const report = validateHistoricalDataset(dataset);
      expect(report.issues.map(({ code }) => code)).toContain('invalid-volume');
      if (Number.isNaN(value))
        expect(report.issues.map(({ code }) => code)).toContain('canonicalization-failed');
    }
  });

  it('requires every gap to be recorded and obeys reject policy without inventing candles', () => {
    const unrecorded = cloneDataset();
    unrecorded.missingIntervals = [];
    expect(codes(recertify(unrecorded))).toContain('unrecorded-missing-interval');

    const rejected = cloneDataset();
    rejected.manifest.missingIntervalPolicy.behavior = 'reject';
    expect(codes(recertify(rejected))).toContain('missing-interval-rejected');

    const badGap = cloneDataset();
    const gap = badGap.missingIntervals[0];
    if (gap) gap.missingCandleCount = 2;
    expect(codes(recertify(badGap))).toContain('invalid-recorded-gap');

    const declared = cloneDataset();
    const after = declared.candles[41];
    const before = declared.candles[42];
    declared.missingIntervals = [];
    if (after && before)
      declared.manifest.missingIntervalPolicy.declaredIrregularities = [
        {
          afterTimestampUtc: after.timestampUtc,
          beforeTimestampUtc: before.timestampUtc,
          reason: 'scheduled-closure',
          note: 'Explicit fixture-only closure declaration.',
        },
      ];
    expect(validateHistoricalDataset(recertify(declared)).valid).toBe(true);
  });

  it('rejects contradictory adjustment modes and invalid candle metadata', () => {
    const policy = cloneDataset();
    policy.manifest.adjustment.mode = 'split-adjusted';
    expect(codes(recertify(policy))).toContain('invalid-adjustment-mode');

    const metadata = cloneDataset();
    const candle = metadata.candles[0];
    if (candle)
      candle.adjustment = {
        mode: 'split-adjusted',
        cumulativePriceFactor: 0,
        actionIds: ['missing'],
      };
    expect(codes(recertify(metadata))).toEqual(
      expect.arrayContaining(['invalid-adjustment-metadata', 'unknown-adjustment-action']),
    );
  });

  it('validates explicit corporate actions and never infers them from price movement', () => {
    const dataset = cloneDataset();
    dataset.corporateActions.push({
      id: 'split-1',
      kind: 'split',
      effectiveAtUtc: dataset.candles[20]?.timestampUtc ?? '',
      announcedAtUtc: dataset.candles[10]?.timestampUtc ?? '',
      knownFromCandleIndex: 10,
      sourceUrl: 'https://example.test/action/split-1',
      numerator: 2,
      denominator: 1,
    });
    dataset.corporateActions.push(
      {
        id: 'reverse-1',
        kind: 'reverse-split',
        effectiveAtUtc: dataset.candles[30]?.timestampUtc ?? '',
        announcedAtUtc: dataset.candles[25]?.timestampUtc ?? '',
        knownFromCandleIndex: 25,
        sourceUrl: 'https://example.test/action/reverse-1',
        numerator: 1,
        denominator: 5,
      },
      {
        id: 'dividend-1',
        kind: 'cash-dividend',
        effectiveAtUtc: dataset.candles[40]?.timestampUtc ?? '',
        announcedAtUtc: dataset.candles[35]?.timestampUtc ?? '',
        knownFromCandleIndex: 35,
        sourceUrl: 'https://example.test/action/dividend-1',
        amount: 0.25,
        currency: 'XXX',
      },
      {
        id: 'symbol-1',
        kind: 'symbol-change',
        effectiveAtUtc: dataset.candles[50]?.timestampUtc ?? '',
        announcedAtUtc: dataset.candles[45]?.timestampUtc ?? '',
        knownFromCandleIndex: 45,
        sourceUrl: 'https://example.test/action/symbol-1',
        previousSymbol: 'DEV-OLD',
        nextSymbol: 'DEV-BLIND-001',
      },
      {
        id: 'other-1',
        kind: 'other',
        effectiveAtUtc: dataset.candles[60]?.timestampUtc ?? '',
        announcedAtUtc: dataset.candles[55]?.timestampUtc ?? '',
        knownFromCandleIndex: 55,
        sourceUrl: 'https://example.test/action/other-1',
        description: 'Generated fixture metadata event.',
        priceAffecting: false,
      },
    );
    expect(validateHistoricalDataset(recertify(dataset)).valid).toBe(true);

    const invalid = cloneDataset();
    invalid.corporateActions.push({
      id: 'split-bad',
      kind: 'reverse-split',
      effectiveAtUtc: invalid.candles[10]?.timestampUtc ?? '',
      announcedAtUtc: invalid.candles[20]?.timestampUtc ?? '',
      knownFromCandleIndex: 200,
      sourceUrl: 'http://unsafe.test/action',
      numerator: 0,
      denominator: 1,
    });
    expect(codes(recertify(invalid))).toContain('invalid-corporate-action');
  });
});

describe('scenario schema and publication gate', () => {
  it('accepts the development scenario structurally while blocking publication', () => {
    const report = validateHistoricalScenario(
      DEVELOPMENT_HISTORICAL_SCENARIO,
      DEVELOPMENT_HISTORICAL_DATASET,
    );
    expect(report.valid).toBe(true);
    expect(report.publishable).toBe(false);
    expect(
      evaluatePublicationGate(DEVELOPMENT_HISTORICAL_DATASET, DEVELOPMENT_HISTORICAL_SCENARIO).map(
        ({ code }) => code,
      ),
    ).toEqual(
      expect.arrayContaining([
        'scenario-not-published',
        'dataset-not-published',
        'redistribution-not-verified',
        'human-editorial-review-required',
      ]),
    );
  });

  it.each([
    [
      'version',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.dataset.datasetVersion = 'wrong';
      },
      'dataset-version-mismatch',
    ],
    [
      'checksum',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.dataset.canonicalChecksum = `sha256:${'f'.repeat(64)}`;
      },
      'dataset-checksum-mismatch',
    ],
    [
      'decision',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.decisionCandleIndex = 999;
      },
      'invalid-decision-cutoff',
    ],
    [
      'initial range',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.initialVisibleRange.endCandleIndex = 90;
      },
      'invalid-initial-range',
    ],
    [
      'replay boundary',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.permittedReplayBoundaryIndex = 90;
      },
      'invalid-replay-boundary',
    ],
    [
      'knowledge cutoff',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.knowledgeCutoffIndex = 90;
      },
      'invalid-knowledge-cutoff',
    ],
    [
      'annotation cutoff',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.annotations[0]!.visibleFromCandleIndex = 999;
      },
      'invalid-annotation-cutoff',
    ],
    [
      'educational refs',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.educationalSourceReferences = [];
      },
      'missing-educational-source',
    ],
    [
      'Hebrew disclosure',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.hebrewDisclosure = 'development only';
      },
      'missing-hebrew-disclosure',
    ],
    [
      'rubric',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.deterministicRubric.graderId = '';
      },
      'missing-deterministic-rubric',
    ],
    [
      'editorial state',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.editorial.status = 'unknown' as HistoricalReplayScenario['editorial']['status'];
      },
      'invalid-editorial-status',
    ],
    [
      'future-leak state',
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.futureLeakValidation.validatorVersion = '';
      },
      'invalid-future-leak-state',
    ],
  ] as const)('rejects scenario %s mismatch', (_label, mutate, expected) => {
    const scenario = cloneScenario();
    mutate(scenario);
    expect(
      validateHistoricalScenario(scenario, DEVELOPMENT_HISTORICAL_DATASET).issues.map(
        ({ code }) => code,
      ),
    ).toContain(expected);
  });

  it('permits publication only with verified redistribution and human-reviewed published state', () => {
    const [dataset, scenario] = publishablePair();
    expect(evaluatePublicationGate(dataset, scenario)).toEqual([]);
    expect(validateHistoricalScenario(scenario, dataset).publishable).toBe(true);
  });

  it.each([
    [
      'dataset status',
      (dataset: Mutable<HistoricalDataset>): void => {
        dataset.manifest.publicationStatus = 'internal';
      },
      unchanged,
      'dataset-not-published',
    ],
    [
      'redistribution',
      (dataset: Mutable<HistoricalDataset>): void => {
        dataset.manifest.provenance.license.redistributionStatus = 'unclear';
      },
      unchanged,
      'redistribution-not-verified',
    ],
    [
      'editorial review',
      unchanged,
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.editorial = { status: 'internal' };
      },
      'human-editorial-review-required',
    ],
    [
      'educational source',
      unchanged,
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.educationalSourceReferences = [];
      },
      'publication-educational-source-required',
    ],
    [
      'market source',
      unchanged,
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.marketDataProvenance.termsUrl = '';
      },
      'publication-market-source-required',
    ],
    [
      'dataset pin',
      unchanged,
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.dataset.datasetVersion = 'wrong';
      },
      'publication-dataset-pin-required',
    ],
    [
      'cutoff',
      unchanged,
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.knowledgeCutoffIndex = Number.NaN;
      },
      'publication-cutoff-required',
    ],
    [
      'Hebrew disclosure',
      unchanged,
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.hebrewDisclosure = 'historical only';
      },
      'publication-hebrew-disclosure-required',
    ],
    [
      'deterministic rubric',
      unchanged,
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.deterministicRubric.rubricId = '';
      },
      'publication-rubric-required',
    ],
    [
      'future leak review',
      unchanged,
      (scenario: Mutable<HistoricalReplayScenario>): void => {
        scenario.futureLeakValidation.status = 'not-run';
      },
      'future-leak-validation-required',
    ],
  ] as const)(
    'blocks publication when %s is incomplete',
    (_label, mutateDataset, mutateScenario, expected) => {
      const [dataset, scenario] = publishablePair();
      mutateDataset(dataset);
      if (computeCanonicalDatasetChecksum(dataset) !== dataset.manifest.canonicalChecksum) {
        recertify(dataset);
        scenario.dataset.canonicalChecksum = dataset.manifest.canonicalChecksum;
      }
      mutateScenario(scenario);
      expect(evaluatePublicationGate(dataset, scenario).map(({ code }) => code)).toContain(
        expected,
      );
    },
  );

  it('reports safe restore outcomes for missing and incompatible datasets', () => {
    expect(verifyDatasetIdentity(DEVELOPMENT_HISTORICAL_SCENARIO.dataset, undefined)).toEqual({
      ok: false,
      reason: 'missing',
    });
    const incompatible = cloneDataset();
    incompatible.manifest.datasetVersion = '2.0.0';
    expect(verifyDatasetIdentity(DEVELOPMENT_HISTORICAL_SCENARIO.dataset, incompatible)).toEqual({
      ok: false,
      reason: 'identity-mismatch',
    });
    expect(
      verifyDatasetIdentity(
        DEVELOPMENT_HISTORICAL_SCENARIO.dataset,
        DEVELOPMENT_HISTORICAL_DATASET,
      ),
    ).toEqual({ ok: true });
  });
});
