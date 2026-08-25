import { computeCanonicalDatasetChecksum } from './canonical.js';
import {
  deriveExchangeLocalTimestamp,
  isValidHttpsUrl,
  isValidIanaTimezone,
  isValidUtcTimestamp,
} from './time.js';
import {
  HISTORICAL_APPLICATION_SCHEMA_VERSION,
  PAPER_EXECUTION_COST_MODEL_VERSION,
  PAPER_EXECUTION_POLICY_VERSION,
  PAPER_EXECUTION_SCENARIO_SCHEMA_VERSION,
} from './types.js';
import type {
  CorporateAction,
  HistoricalCandle,
  HistoricalDataset,
  HistoricalDatasetManifest,
  HistoricalReplayScenario,
  HistoricalSourceManifest,
  HistoricalValidationIssue,
  HistoricalValidationReport,
  Sha256Checksum,
} from './types.js';

const CHECKSUM = /^sha256:[a-f0-9]{64}$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const HEBREW = /[\u0590-\u05ff]/;
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const PAPER_EXECUTION_DIRECTIONS = new Set(['long', 'short']);
const PAPER_EXECUTION_ORDER_TYPES = new Set(['market', 'limit', 'stop']);
const NO_TRADE_DISPOSITIONS = new Set(['wait', 'reject', 'no-trade', 'insufficient-evidence']);
const PAPER_EXECUTION_MODES = new Set(['aligned', 'hypothetical-mechanics']);
const PUBLICATION_STATUSES = new Set(['development-only', 'internal', 'publishable', 'published']);

function add(
  issues: HistoricalValidationIssue[],
  code: string,
  path: string,
  message: string,
  severity: 'error' | 'warning' = 'error',
): void {
  issues.push({ code, path, message, severity });
}

function requireText(
  issues: HistoricalValidationIssue[],
  value: unknown,
  path: string,
  code = 'required-field',
): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    add(issues, code, path, 'A non-empty string is required.');
    return false;
  }
  return true;
}

function validateChecksum(
  value: unknown,
  path: string,
  issues: HistoricalValidationIssue[],
): value is Sha256Checksum {
  if (typeof value !== 'string' || !CHECKSUM.test(value)) {
    add(
      issues,
      'invalid-checksum',
      path,
      'Expected a lowercase sha256:<64 hex characters> checksum.',
    );
    return false;
  }
  return true;
}

function validateTimestamp(
  value: unknown,
  path: string,
  issues: HistoricalValidationIssue[],
): value is string {
  if (typeof value !== 'string' || !isValidUtcTimestamp(value)) {
    add(
      issues,
      'invalid-utc-timestamp',
      path,
      'Expected a valid RFC 3339 UTC timestamp ending in Z.',
    );
    return false;
  }
  return true;
}

function isUniquePermittedStringArray(value: unknown, permitted: ReadonlySet<string>): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every((item) => typeof item === 'string' && permitted.has(item))
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidApplicationDecision(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.kind === 'trade') {
    return (
      PAPER_EXECUTION_DIRECTIONS.has(String(value.direction)) && value.disposition === undefined
    );
  }
  if (value.kind === 'no-trade') {
    return NO_TRADE_DISPOSITIONS.has(String(value.disposition)) && value.direction === undefined;
  }
  return false;
}

function validateApplicationConfiguration(
  scenario: HistoricalReplayScenario,
  issues: HistoricalValidationIssue[],
): void {
  const application = scenario.application as unknown;
  if (!isRecord(application)) {
    add(
      issues,
      'missing-historical-application',
      'scenario.application',
      'Historical scenarios require an explicit application conclusion.',
    );
    return;
  }
  if (application.schemaVersion !== HISTORICAL_APPLICATION_SCHEMA_VERSION)
    add(
      issues,
      'unsupported-historical-application-schema',
      'scenario.application.schemaVersion',
      `Only historical application schema ${HISTORICAL_APPLICATION_SCHEMA_VERSION} is supported.`,
    );
  if (!isValidApplicationDecision(application.expectedDecision))
    add(
      issues,
      'invalid-historical-application-decision',
      'scenario.application.expectedDecision',
      'Expected application must be a directed trade or a recognized no-trade disposition.',
    );
}

function validatePaperExecutionConfiguration(
  scenario: HistoricalReplayScenario,
  datasetLastCandleIndex: number,
  issues: HistoricalValidationIssue[],
): void {
  const configuration = scenario.paperExecution;
  if (configuration === undefined) return;

  if (configuration.enabled !== true)
    add(
      issues,
      'invalid-paper-execution-enabled',
      'scenario.paperExecution.enabled',
      'A present paper-execution configuration must be explicitly enabled.',
    );
  if (configuration.schemaVersion !== PAPER_EXECUTION_SCENARIO_SCHEMA_VERSION)
    add(
      issues,
      'unsupported-paper-execution-schema',
      'scenario.paperExecution.schemaVersion',
      `Only paper-execution scenario schema ${PAPER_EXECUTION_SCENARIO_SCHEMA_VERSION} is supported.`,
    );
  if (!PAPER_EXECUTION_MODES.has(configuration.mode))
    add(
      issues,
      'invalid-paper-execution-mode',
      'scenario.paperExecution.mode',
      'Paper execution must explicitly be aligned or hypothetical mechanics.',
    );
  if (configuration.executionPolicyVersion !== PAPER_EXECUTION_POLICY_VERSION)
    add(
      issues,
      'unsupported-paper-execution-policy',
      'scenario.paperExecution.executionPolicyVersion',
      `Paper execution must pin ${PAPER_EXECUTION_POLICY_VERSION}.`,
    );
  if (configuration.costModelVersion !== PAPER_EXECUTION_COST_MODEL_VERSION)
    add(
      issues,
      'unsupported-paper-cost-model',
      'scenario.paperExecution.costModelVersion',
      `Paper execution must pin ${PAPER_EXECUTION_COST_MODEL_VERSION}.`,
    );
  if (!isUniquePermittedStringArray(configuration.permittedDirections, PAPER_EXECUTION_DIRECTIONS))
    add(
      issues,
      'invalid-paper-execution-directions',
      'scenario.paperExecution.permittedDirections',
      'Paper execution requires a non-empty, unique list containing only long or short.',
    );
  if (
    !isUniquePermittedStringArray(
      configuration.permittedEntryOrderTypes,
      PAPER_EXECUTION_ORDER_TYPES,
    )
  )
    add(
      issues,
      'invalid-paper-execution-order-types',
      'scenario.paperExecution.permittedEntryOrderTypes',
      'Paper execution requires a non-empty, unique list containing only market, limit, or stop.',
    );

  const boundary = configuration.executionBoundary;
  if (
    !boundary ||
    !Number.isInteger(boundary.afterDecisionCandleIndex) ||
    boundary.afterDecisionCandleIndex !== scenario.decisionCandleIndex ||
    !Number.isInteger(boundary.lastCandleIndex) ||
    boundary.lastCandleIndex <= boundary.afterDecisionCandleIndex ||
    boundary.lastCandleIndex > datasetLastCandleIndex
  )
    add(
      issues,
      'invalid-paper-execution-boundary',
      'scenario.paperExecution.executionBoundary',
      'Paper execution must begin after the pinned decision candle and end at a later dataset candle.',
    );
  const expected = scenario.application?.expectedDecision;
  const permittedDirections = Array.isArray(configuration.permittedDirections)
    ? configuration.permittedDirections
    : [];
  if (configuration.mode === 'aligned') {
    if (
      expected?.kind !== 'trade' ||
      permittedDirections.length !== 1 ||
      permittedDirections[0] !== expected.direction
    )
      add(
        issues,
        'paper-execution-application-mode-mismatch',
        'scenario.paperExecution.mode',
        'Aligned paper execution requires one direction matching the canonical trade conclusion.',
      );
  } else if (configuration.mode === 'hypothetical-mechanics' && expected?.kind !== 'no-trade') {
    add(
      issues,
      'paper-execution-application-mode-mismatch',
      'scenario.paperExecution.mode',
      'Hypothetical mechanics are permitted only after a canonical no-trade conclusion.',
    );
  }
  if (!HEBREW.test(configuration.learnerDisclosureHebrew))
    add(
      issues,
      'missing-paper-execution-hebrew-disclosure',
      'scenario.paperExecution.learnerDisclosureHebrew',
      'Paper execution requires a Hebrew learner disclosure describing the simulation assumptions.',
    );
  if (!PUBLICATION_STATUSES.has(configuration.publicationStatus))
    add(
      issues,
      'invalid-paper-execution-publication-status',
      'scenario.paperExecution.publicationStatus',
      'Paper-execution publication status is not recognized.',
    );
}

function validateManifest(
  manifest: HistoricalDatasetManifest,
  issues: HistoricalValidationIssue[],
): void {
  if (
    !requireText(issues, manifest.datasetId, 'manifest.datasetId') ||
    !IDENTIFIER.test(manifest.datasetId)
  )
    add(
      issues,
      'invalid-dataset-id',
      'manifest.datasetId',
      'Dataset ID must be a stable identifier.',
    );
  if (manifest.schemaVersion !== 1)
    add(
      issues,
      'unsupported-schema-version',
      'manifest.schemaVersion',
      'Only schema version 1 is supported.',
    );
  if (
    !requireText(issues, manifest.datasetVersion, 'manifest.datasetVersion') ||
    !VERSION.test(manifest.datasetVersion)
  )
    add(
      issues,
      'invalid-dataset-version',
      'manifest.datasetVersion',
      'Dataset version is invalid.',
    );

  const provenance = manifest.provenance;
  if (!provenance || typeof provenance !== 'object') {
    add(
      issues,
      'missing-provenance',
      'manifest.provenance',
      'Complete market-data provenance is required.',
    );
  } else {
    requireText(
      issues,
      provenance.providerId,
      'manifest.provenance.providerId',
      'missing-provenance',
    );
    requireText(
      issues,
      provenance.providerName,
      'manifest.provenance.providerName',
      'missing-provenance',
    );
    requireText(
      issues,
      provenance.datasetOrEndpointId,
      'manifest.provenance.datasetOrEndpointId',
      'missing-provenance',
    );
    if (!isValidHttpsUrl(provenance.sourceUrl))
      add(
        issues,
        'invalid-source-url',
        'manifest.provenance.sourceUrl',
        'An HTTPS official source URL is required.',
      );
    if (!isValidHttpsUrl(provenance.termsUrl))
      add(
        issues,
        'invalid-terms-url',
        'manifest.provenance.termsUrl',
        'An HTTPS terms/license URL is required.',
      );
    validateTimestamp(provenance.retrievedAt, 'manifest.provenance.retrievedAt', issues);
    if (!Array.isArray(provenance.knownLimitations) || provenance.knownLimitations.length === 0)
      add(
        issues,
        'missing-limitations',
        'manifest.provenance.knownLimitations',
        'Known limitations must be recorded.',
      );
    const license = provenance.license;
    if (!license || typeof license !== 'object') {
      add(
        issues,
        'missing-license-status',
        'manifest.provenance.license',
        'A license/status record is required.',
      );
    } else {
      requireText(
        issues,
        license.licenseName,
        'manifest.provenance.license.licenseName',
        'missing-license-status',
      );
      if (
        !['verified', 'commercial-agreement-required', 'unclear', 'blocked'].includes(
          license.permittedUseStatus,
        )
      )
        add(
          issues,
          'missing-license-status',
          'manifest.provenance.license.permittedUseStatus',
          'A recognized permitted-use status is required.',
        );
      if (!['verified', 'prohibited', 'unclear'].includes(license.redistributionStatus))
        add(
          issues,
          'missing-license-status',
          'manifest.provenance.license.redistributionStatus',
          'A recognized redistribution decision is required.',
        );
      requireText(
        issues,
        license.attributionRequirements,
        'manifest.provenance.license.attributionRequirements',
      );
      validateTimestamp(
        license.evidenceReviewedAt,
        'manifest.provenance.license.evidenceReviewedAt',
        issues,
      );
      requireText(issues, license.evidenceNotes, 'manifest.provenance.license.evidenceNotes');
    }
  }

  validateChecksum(manifest.rawChecksum, 'manifest.rawChecksum', issues);
  validateChecksum(manifest.canonicalChecksum, 'manifest.canonicalChecksum', issues);
  for (const [path, value] of [
    ['manifest.symbol', manifest.symbol],
    ['manifest.displaySymbol', manifest.displaySymbol],
    ['manifest.exchange', manifest.exchange],
    ['manifest.currency', manifest.currency],
    ['manifest.volumeUnit', manifest.volumeUnit],
  ] as const)
    requireText(issues, value, path);
  if (manifest.mic !== undefined && !/^[A-Z0-9]{4}$/.test(manifest.mic))
    add(
      issues,
      'invalid-mic',
      'manifest.mic',
      'MIC must contain exactly four uppercase letters/digits.',
    );
  if (!/^[A-Z]{3}$/.test(manifest.currency))
    add(
      issues,
      'invalid-currency',
      'manifest.currency',
      'Currency must be an uppercase ISO-style code.',
    );
  if (!isValidIanaTimezone(manifest.exchangeTimezone))
    add(
      issues,
      'invalid-timezone',
      'manifest.exchangeTimezone',
      'A canonical IANA exchange timezone is required.',
    );

  const intervalMultiplier = { minute: 60_000, hour: 3_600_000, day: 86_400_000 }[
    manifest.interval?.unit
  ];
  if (
    !manifest.interval ||
    !Number.isInteger(manifest.interval.value) ||
    manifest.interval.value <= 0 ||
    !Number.isSafeInteger(manifest.interval.milliseconds) ||
    manifest.interval.milliseconds !== intervalMultiplier * manifest.interval.value
  )
    add(
      issues,
      'invalid-interval',
      'manifest.interval',
      'Interval value and milliseconds must be positive and consistent.',
    );
  validateTimestamp(manifest.startTimestampUtc, 'manifest.startTimestampUtc', issues);
  validateTimestamp(manifest.endTimestampUtc, 'manifest.endTimestampUtc', issues);
  if (!Number.isSafeInteger(manifest.candleCount) || manifest.candleCount <= 0)
    add(
      issues,
      'invalid-candle-count',
      'manifest.candleCount',
      'Candle count must be a positive safe integer.',
    );
  if (
    !Number.isInteger(manifest.pricePrecision) ||
    manifest.pricePrecision < 0 ||
    manifest.pricePrecision > 12
  )
    add(
      issues,
      'invalid-price-precision',
      'manifest.pricePrecision',
      'Price precision must be an integer from 0 to 12.',
    );

  const adjustment = manifest.adjustment;
  if (!adjustment || adjustment.corporateActionPolicy !== 'explicit-actions-only')
    add(
      issues,
      'invalid-adjustment-mode',
      'manifest.adjustment',
      'Adjustment policy must use explicit corporate actions.',
    );
  else if (
    (adjustment.mode === 'raw' &&
      (adjustment.splitPolicy !== 'unadjusted' || adjustment.dividendPolicy !== 'unadjusted')) ||
    (adjustment.mode === 'split-adjusted' &&
      (adjustment.splitPolicy !== 'adjusted' || adjustment.dividendPolicy !== 'unadjusted')) ||
    (adjustment.mode === 'total-return-adjusted' &&
      (adjustment.splitPolicy !== 'adjusted' || adjustment.dividendPolicy !== 'adjusted')) ||
    !['raw', 'split-adjusted', 'total-return-adjusted'].includes(adjustment.mode)
  )
    add(
      issues,
      'invalid-adjustment-mode',
      'manifest.adjustment',
      'Adjustment mode conflicts with split/dividend policy.',
    );

  const session = manifest.sessionPolicy;
  if (!session || !requireText(issues, session.calendarId, 'manifest.sessionPolicy.calendarId'))
    add(
      issues,
      'invalid-session-policy',
      'manifest.sessionPolicy',
      'A trading-session calendar is required.',
    );
  else {
    if (!CLOCK.test(session.regularSessionOpen) || !CLOCK.test(session.regularSessionClose))
      add(
        issues,
        'invalid-session-policy',
        'manifest.sessionPolicy',
        'Session open/close must use HH:mm.',
      );
    if (!Array.isArray(session.includedSessions) || session.includedSessions.length === 0)
      add(
        issues,
        'invalid-session-policy',
        'manifest.sessionPolicy.includedSessions',
        'At least one session classification is required.',
      );
  }
  if (
    !manifest.missingIntervalPolicy ||
    manifest.missingIntervalPolicy.fillPolicy !== 'never-invent-candles' ||
    !['record-and-preserve', 'reject'].includes(manifest.missingIntervalPolicy.behavior)
  )
    add(
      issues,
      'invalid-missing-interval-policy',
      'manifest.missingIntervalPolicy',
      'Missing intervals must be recorded or rejected and never filled.',
    );
  for (const [index, irregularity] of (
    manifest.missingIntervalPolicy?.declaredIrregularities ?? []
  ).entries()) {
    validateTimestamp(
      irregularity.afterTimestampUtc,
      `manifest.missingIntervalPolicy.declaredIrregularities[${index}].afterTimestampUtc`,
      issues,
    );
    validateTimestamp(
      irregularity.beforeTimestampUtc,
      `manifest.missingIntervalPolicy.declaredIrregularities[${index}].beforeTimestampUtc`,
      issues,
    );
    requireText(
      issues,
      irregularity.note,
      `manifest.missingIntervalPolicy.declaredIrregularities[${index}].note`,
    );
    if (Date.parse(irregularity.afterTimestampUtc) >= Date.parse(irregularity.beforeTimestampUtc))
      add(
        issues,
        'invalid-declared-irregularity',
        `manifest.missingIntervalPolicy.declaredIrregularities[${index}]`,
        'Declared irregularity timestamps must be ordered.',
      );
  }
  if (
    !['development-only', 'internal', 'publishable', 'published'].includes(
      manifest.publicationStatus,
    )
  )
    add(
      issues,
      'invalid-publication-status',
      'manifest.publicationStatus',
      'Dataset publication status is not recognized.',
    );
}

export function validateHistoricalSourceManifest(
  source: HistoricalSourceManifest,
): readonly HistoricalValidationIssue[] {
  const issues: HistoricalValidationIssue[] = [];
  const placeholderChecksum = `sha256:${'0'.repeat(64)}` as Sha256Checksum;
  validateManifest(
    {
      ...source,
      rawChecksum: source.expectedRawChecksum ?? placeholderChecksum,
      canonicalChecksum: placeholderChecksum,
      startTimestampUtc: source.expectedStartTimestampUtc ?? '1970-01-01T00:00:00.000Z',
      endTimestampUtc: source.expectedEndTimestampUtc ?? '1970-01-01T00:00:00.000Z',
      candleCount: source.expectedCandleCount ?? 1,
    },
    issues,
  );
  if (source.expectedRawChecksum !== undefined)
    validateChecksum(source.expectedRawChecksum, 'source.expectedRawChecksum', issues);
  if (source.expectedStartTimestampUtc !== undefined)
    validateTimestamp(source.expectedStartTimestampUtc, 'source.expectedStartTimestampUtc', issues);
  if (source.expectedEndTimestampUtc !== undefined)
    validateTimestamp(source.expectedEndTimestampUtc, 'source.expectedEndTimestampUtc', issues);
  if (
    source.expectedCandleCount !== undefined &&
    (!Number.isSafeInteger(source.expectedCandleCount) || source.expectedCandleCount <= 0)
  )
    add(
      issues,
      'invalid-expected-count',
      'source.expectedCandleCount',
      'Expected candle count must be a positive safe integer.',
    );
  return issues;
}

function decimalPlaces(value: number): number {
  const text = value.toString().toLowerCase();
  if (text.includes('e-')) return Number(text.split('e-')[1]);
  return text.includes('.') ? (text.split('.')[1]?.length ?? 0) : 0;
}

function validateCandle(
  candle: HistoricalCandle,
  index: number,
  dataset: HistoricalDataset,
  issues: HistoricalValidationIssue[],
): void {
  const path = `candles[${index}]`;
  if (candle.index !== index)
    add(
      issues,
      'unstable-candle-index',
      `${path}.index`,
      `Expected stable sequential index ${index}.`,
    );
  if (!validateTimestamp(candle.timestampUtc, `${path}.timestampUtc`, issues)) return;
  if (isValidIanaTimezone(dataset.manifest.exchangeTimezone)) {
    let expected = '';
    try {
      expected = deriveExchangeLocalTimestamp(
        candle.timestampUtc,
        dataset.manifest.exchangeTimezone,
      );
    } catch {
      expected = '';
    }
    if (candle.exchangeLocalTimestamp !== expected)
      add(
        issues,
        'invalid-local-timestamp',
        `${path}.exchangeLocalTimestamp`,
        'Exchange-local timestamp does not match the UTC timestamp and timezone.',
      );
  }
  const prices = [candle.open, candle.high, candle.low, candle.close];
  if (prices.some((price) => !Number.isFinite(price) || price < 0))
    add(issues, 'invalid-price', path, 'OHLC prices must be finite and nonnegative.');
  else if (
    candle.high < Math.max(candle.open, candle.close, candle.low) ||
    candle.low > Math.min(candle.open, candle.close, candle.high)
  )
    add(issues, 'invalid-ohlc', path, 'High must cover OHLC and low must be no greater than OHLC.');
  if (prices.some((price) => decimalPlaces(price) > dataset.manifest.pricePrecision))
    add(issues, 'price-precision', path, 'A price exceeds the declared precision.');
  if (!Number.isFinite(candle.volume) || candle.volume < 0)
    add(issues, 'invalid-volume', `${path}.volume`, 'Volume must be finite and nonnegative.');
  if (!dataset.manifest.sessionPolicy.includedSessions.includes(candle.session))
    add(
      issues,
      'invalid-session',
      `${path}.session`,
      'Candle session is not included by the manifest policy.',
    );
  const localClock = candle.exchangeLocalTimestamp.slice(11, 16);
  const { regularSessionOpen: open, regularSessionClose: close } = dataset.manifest.sessionPolicy;
  if (candle.session === 'regular' && (localClock < open || localClock >= close))
    add(
      issues,
      'invalid-session-boundary',
      `${path}.session`,
      'Regular candle falls outside the declared exchange-local regular session.',
    );
  if (candle.session === 'pre-market' && localClock >= open)
    add(
      issues,
      'invalid-session-boundary',
      `${path}.session`,
      'Pre-market candle must precede the regular-session open.',
    );
  if (candle.session === 'after-hours' && localClock < close)
    add(
      issues,
      'invalid-session-boundary',
      `${path}.session`,
      'After-hours candle must not precede the regular-session close.',
    );
  const metadata = candle.adjustment;
  if (dataset.manifest.adjustment.mode === 'raw') {
    if (
      metadata &&
      (metadata.mode !== 'raw' ||
        metadata.cumulativePriceFactor !== 1 ||
        metadata.actionIds.length > 0)
    )
      add(
        issues,
        'invalid-adjustment-metadata',
        `${path}.adjustment`,
        'Raw candles cannot carry adjusted factors/actions.',
      );
  } else if (
    !metadata ||
    metadata.mode !== dataset.manifest.adjustment.mode ||
    !Number.isFinite(metadata.cumulativePriceFactor) ||
    metadata.cumulativePriceFactor <= 0
  )
    add(
      issues,
      'invalid-adjustment-metadata',
      `${path}.adjustment`,
      'Adjusted candles require a matching positive adjustment factor.',
    );
}

function validateCorporateAction(
  action: CorporateAction,
  index: number,
  dataset: HistoricalDataset,
  issues: HistoricalValidationIssue[],
): void {
  const path = `corporateActions[${index}]`;
  requireText(issues, action.id, `${path}.id`);
  validateTimestamp(action.effectiveAtUtc, `${path}.effectiveAtUtc`, issues);
  validateTimestamp(action.announcedAtUtc, `${path}.announcedAtUtc`, issues);
  if (Date.parse(action.announcedAtUtc) > Date.parse(action.effectiveAtUtc))
    add(
      issues,
      'invalid-corporate-action',
      path,
      'Announcement cannot occur after the effective timestamp.',
    );
  if (
    !Number.isInteger(action.knownFromCandleIndex) ||
    action.knownFromCandleIndex < 0 ||
    action.knownFromCandleIndex >= dataset.candles.length
  )
    add(
      issues,
      'invalid-corporate-action',
      `${path}.knownFromCandleIndex`,
      'Knowledge index must reference a dataset candle.',
    );
  if (!isValidHttpsUrl(action.sourceUrl))
    add(
      issues,
      'invalid-corporate-action',
      `${path}.sourceUrl`,
      'Corporate-action source must be an HTTPS URL.',
    );
  if (action.kind === 'split' || action.kind === 'reverse-split') {
    if (
      !Number.isFinite(action.numerator) ||
      action.numerator <= 0 ||
      !Number.isFinite(action.denominator) ||
      action.denominator <= 0
    )
      add(
        issues,
        'invalid-corporate-action',
        path,
        'Split numerator and denominator must be positive.',
      );
  } else if (action.kind === 'cash-dividend') {
    if (
      !Number.isFinite(action.amount) ||
      action.amount < 0 ||
      action.currency !== dataset.manifest.currency
    )
      add(
        issues,
        'invalid-corporate-action',
        path,
        'Dividend must be nonnegative and use dataset currency.',
      );
  } else if (action.kind === 'symbol-change') {
    if (!action.previousSymbol || !action.nextSymbol || action.previousSymbol === action.nextSymbol)
      add(
        issues,
        'invalid-corporate-action',
        path,
        'Symbol change must name distinct old and new symbols.',
      );
  } else if (action.kind === 'other' && !action.description.trim())
    add(issues, 'invalid-corporate-action', path, 'Other action requires a description.');
}

export function validateHistoricalDataset(dataset: HistoricalDataset): HistoricalValidationReport {
  const issues: HistoricalValidationIssue[] = [];
  validateManifest(dataset.manifest, issues);
  if (!Array.isArray(dataset.candles) || dataset.candles.length === 0)
    add(issues, 'missing-candles', 'candles', 'At least one canonical candle is required.');
  else {
    const seen = new Set<string>();
    for (const [index, candle] of dataset.candles.entries()) {
      validateCandle(candle, index, dataset, issues);
      if (seen.has(candle.timestampUtc))
        add(
          issues,
          'duplicate-timestamp',
          `candles[${index}].timestampUtc`,
          'Duplicate candle timestamp.',
        );
      seen.add(candle.timestampUtc);
      const previous = dataset.candles[index - 1];
      if (previous) {
        const delta = Date.parse(candle.timestampUtc) - Date.parse(previous.timestampUtc);
        if (delta <= 0 && candle.timestampUtc !== previous.timestampUtc)
          add(
            issues,
            'non-monotonic-timestamp',
            `candles[${index}].timestampUtc`,
            'Candle timestamps must increase strictly.',
          );
        if (delta > 0 && delta !== dataset.manifest.interval.milliseconds) {
          const declared = dataset.manifest.missingIntervalPolicy.declaredIrregularities.some(
            (item) =>
              item.afterTimestampUtc === previous.timestampUtc &&
              item.beforeTimestampUtc === candle.timestampUtc,
          );
          const recorded = dataset.missingIntervals.some(
            (item) => item.afterCandleIndex === index - 1 && item.beforeCandleIndex === index,
          );
          if (!declared && delta % dataset.manifest.interval.milliseconds !== 0)
            add(
              issues,
              'unexpected-interval-irregularity',
              `candles[${index}].timestampUtc`,
              'Irregular interval is not declared.',
            );
          if (!declared && !recorded)
            add(
              issues,
              'unrecorded-missing-interval',
              `candles[${index}].timestampUtc`,
              'Every interval gap must be recorded; candles may not be invented.',
            );
          if (dataset.manifest.missingIntervalPolicy.behavior === 'reject')
            add(
              issues,
              'missing-interval-rejected',
              `candles[${index}].timestampUtc`,
              'Manifest policy rejects missing intervals.',
            );
        }
      }
    }
    if (dataset.manifest.candleCount !== dataset.candles.length)
      add(
        issues,
        'candle-count-mismatch',
        'manifest.candleCount',
        'Manifest candle count does not match canonical candles.',
      );
    if (dataset.manifest.startTimestampUtc !== dataset.candles[0]?.timestampUtc)
      add(
        issues,
        'range-mismatch',
        'manifest.startTimestampUtc',
        'Manifest start does not match the first candle.',
      );
    if (dataset.manifest.endTimestampUtc !== dataset.candles.at(-1)?.timestampUtc)
      add(
        issues,
        'range-mismatch',
        'manifest.endTimestampUtc',
        'Manifest end does not match the last candle.',
      );
  }

  const actionIds = new Set<string>();
  for (const [index, action] of dataset.corporateActions.entries()) {
    validateCorporateAction(action, index, dataset, issues);
    if (actionIds.has(action.id))
      add(
        issues,
        'duplicate-corporate-action',
        `corporateActions[${index}].id`,
        'Corporate-action IDs must be unique.',
      );
    actionIds.add(action.id);
  }
  for (const [index, candle] of dataset.candles.entries())
    for (const actionId of candle.adjustment?.actionIds ?? [])
      if (!actionIds.has(actionId))
        add(
          issues,
          'unknown-adjustment-action',
          `candles[${index}].adjustment.actionIds`,
          `Unknown corporate action: ${actionId}.`,
        );

  for (const [index, gap] of dataset.missingIntervals.entries()) {
    const path = `missingIntervals[${index}]`;
    const before = dataset.candles[gap.beforeCandleIndex];
    const after = dataset.candles[gap.afterCandleIndex];
    if (!after || !before || gap.beforeCandleIndex !== gap.afterCandleIndex + 1)
      add(issues, 'invalid-recorded-gap', path, 'Gap must reference adjacent retained candles.');
    else {
      const interval = dataset.manifest.interval.milliseconds;
      const expectedCount =
        (Date.parse(before.timestampUtc) - Date.parse(after.timestampUtc)) / interval - 1;
      if (
        !Number.isInteger(expectedCount) ||
        expectedCount !== gap.missingCandleCount ||
        expectedCount < 1
      )
        add(
          issues,
          'invalid-recorded-gap',
          path,
          'Gap count must exactly match the surrounding timestamps.',
        );
      if (
        gap.firstMissingTimestampUtc !==
        new Date(Date.parse(after.timestampUtc) + interval).toISOString()
      )
        add(
          issues,
          'invalid-recorded-gap',
          `${path}.firstMissingTimestampUtc`,
          'First missing timestamp is inconsistent.',
        );
      if (
        gap.lastMissingTimestampUtc !==
        new Date(Date.parse(before.timestampUtc) - interval).toISOString()
      )
        add(
          issues,
          'invalid-recorded-gap',
          `${path}.lastMissingTimestampUtc`,
          'Last missing timestamp is inconsistent.',
        );
    }
  }

  if (validateChecksum(dataset.manifest.canonicalChecksum, 'manifest.canonicalChecksum', [])) {
    try {
      const actual = computeCanonicalDatasetChecksum(dataset);
      if (actual !== dataset.manifest.canonicalChecksum)
        add(
          issues,
          'canonical-checksum-mismatch',
          'manifest.canonicalChecksum',
          `Expected ${dataset.manifest.canonicalChecksum}; computed ${actual}.`,
        );
    } catch (error) {
      add(
        issues,
        'canonicalization-failed',
        'dataset',
        error instanceof Error ? error.message : 'Dataset cannot be represented canonically.',
      );
    }
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  const rightsVerified =
    dataset.manifest.provenance?.license?.permittedUseStatus === 'verified' &&
    dataset.manifest.provenance?.license?.redistributionStatus === 'verified';
  return {
    valid: errors.length === 0,
    publishable:
      errors.length === 0 &&
      rightsVerified &&
      ['publishable', 'published'].includes(dataset.manifest.publicationStatus),
    issues,
    counts: {
      candles: dataset.candles.length,
      corporateActions: dataset.corporateActions.length,
      missingIntervals: dataset.missingIntervals.length,
    },
  };
}

export function validateHistoricalScenario(
  scenario: HistoricalReplayScenario,
  dataset: HistoricalDataset,
): HistoricalValidationReport {
  const datasetReport = validateHistoricalDataset(dataset);
  const issues = [...datasetReport.issues];
  if (!scenario.scenarioId || !IDENTIFIER.test(scenario.scenarioId))
    add(issues, 'invalid-scenario-id', 'scenario.scenarioId', 'Stable scenario ID is required.');
  if (scenario.schemaVersion !== 1)
    add(
      issues,
      'unsupported-scenario-schema',
      'scenario.schemaVersion',
      'Only scenario schema 1 is supported.',
    );
  if (!VERSION.test(scenario.scenarioVersion))
    add(
      issues,
      'invalid-scenario-version',
      'scenario.scenarioVersion',
      'Scenario version is invalid.',
    );
  if (
    scenario.dataset.datasetId !== dataset.manifest.datasetId ||
    scenario.dataset.datasetVersion !== dataset.manifest.datasetVersion
  )
    add(
      issues,
      'dataset-version-mismatch',
      'scenario.dataset',
      'Scenario dataset ID/version does not match the loaded dataset.',
    );
  if (scenario.dataset.canonicalChecksum !== dataset.manifest.canonicalChecksum)
    add(
      issues,
      'dataset-checksum-mismatch',
      'scenario.dataset.canonicalChecksum',
      'Scenario checksum does not match the loaded dataset.',
    );
  const last = dataset.candles.length - 1;
  if (
    !Number.isInteger(scenario.decisionCandleIndex) ||
    scenario.decisionCandleIndex < 0 ||
    scenario.decisionCandleIndex > last
  )
    add(
      issues,
      'invalid-decision-cutoff',
      'scenario.decisionCandleIndex',
      'Decision candle must reference the dataset.',
    );
  if (
    !Number.isInteger(scenario.initialVisibleRange.startCandleIndex) ||
    !Number.isInteger(scenario.initialVisibleRange.endCandleIndex) ||
    scenario.initialVisibleRange.startCandleIndex < 0 ||
    scenario.initialVisibleRange.startCandleIndex > scenario.initialVisibleRange.endCandleIndex ||
    scenario.initialVisibleRange.endCandleIndex > scenario.decisionCandleIndex
  )
    add(
      issues,
      'invalid-initial-range',
      'scenario.initialVisibleRange',
      'Initial visible range must be ordered and end by the decision cutoff.',
    );
  if (
    !Number.isInteger(scenario.permittedReplayBoundaryIndex) ||
    scenario.permittedReplayBoundaryIndex < scenario.initialVisibleRange.endCandleIndex ||
    scenario.permittedReplayBoundaryIndex > scenario.decisionCandleIndex
  )
    add(
      issues,
      'invalid-replay-boundary',
      'scenario.permittedReplayBoundaryIndex',
      'Replay boundary must fall between initial and decision cutoffs.',
    );
  if (
    !Number.isInteger(scenario.knowledgeCutoffIndex) ||
    scenario.knowledgeCutoffIndex < 0 ||
    scenario.knowledgeCutoffIndex > scenario.permittedReplayBoundaryIndex
  )
    add(
      issues,
      'invalid-knowledge-cutoff',
      'scenario.knowledgeCutoffIndex',
      'Knowledge cutoff cannot exceed replay permission.',
    );
  if (!scenario.educationalContentId)
    add(
      issues,
      'missing-educational-content',
      'scenario.educationalContentId',
      'Educational content ID is required.',
    );
  if (scenario.educationalSourceReferences.length === 0)
    add(
      issues,
      'missing-educational-source',
      'scenario.educationalSourceReferences',
      'At least one exact educational reference is required.',
    );
  for (const [index, reference] of scenario.educationalSourceReferences.entries()) {
    if (
      !reference.sourceId ||
      reference.pageStart < 1 ||
      reference.pageEnd < reference.pageStart ||
      !reference.section
    )
      add(
        issues,
        'invalid-educational-source',
        `scenario.educationalSourceReferences[${index}]`,
        'Educational reference requires source, ordered pages, and section.',
      );
  }
  if (
    scenario.marketDataProvenance.providerId !== dataset.manifest.provenance.providerId ||
    scenario.marketDataProvenance.sourceUrl !== dataset.manifest.provenance.sourceUrl ||
    scenario.marketDataProvenance.termsUrl !== dataset.manifest.provenance.termsUrl
  )
    add(
      issues,
      'market-provenance-mismatch',
      'scenario.marketDataProvenance',
      'Scenario provenance must match its dataset.',
    );
  if (!HEBREW.test(scenario.hebrewDisclosure))
    add(
      issues,
      'missing-hebrew-disclosure',
      'scenario.hebrewDisclosure',
      'A Hebrew historical/educational disclosure is required.',
    );
  if (!HEBREW.test(scenario.blindTitleHebrew) || !HEBREW.test(scenario.revealedTitleHebrew))
    add(
      issues,
      'missing-hebrew-title',
      'scenario',
      'Blind and revealed titles must contain Hebrew.',
    );
  if (
    !['development-only', 'internal', 'publishable', 'published'].includes(
      scenario.publicationStatus,
    )
  )
    add(
      issues,
      'invalid-publication-status',
      'scenario.publicationStatus',
      'Scenario publication status is not recognized.',
    );
  if (!['draft', 'internal', 'reviewed', 'published'].includes(scenario.editorial.status))
    add(
      issues,
      'invalid-editorial-status',
      'scenario.editorial.status',
      'Scenario editorial status is not recognized.',
    );
  if (
    !scenario.deterministicRubric.rubricId ||
    !scenario.deterministicRubric.rubricVersion ||
    !scenario.deterministicRubric.graderId
  )
    add(
      issues,
      'missing-deterministic-rubric',
      'scenario.deterministicRubric',
      'A versioned deterministic rubric and grader are required.',
    );
  validateChecksum(
    scenario.deterministicRubric.checksum,
    'scenario.deterministicRubric.checksum',
    issues,
  );
  if (!scenario.futureLeakValidation.validatorVersion)
    add(
      issues,
      'invalid-future-leak-state',
      'scenario.futureLeakValidation.validatorVersion',
      'Future-leak validator version is required.',
    );
  if (!['not-run', 'passed', 'failed'].includes(scenario.futureLeakValidation.status))
    add(
      issues,
      'invalid-future-leak-state',
      'scenario.futureLeakValidation.status',
      'Future-leak validation status is not recognized.',
    );
  if (
    scenario.futureLeakValidation.validatedAt !== undefined &&
    !isValidUtcTimestamp(scenario.futureLeakValidation.validatedAt)
  )
    add(
      issues,
      'invalid-future-leak-state',
      'scenario.futureLeakValidation.validatedAt',
      'Future-leak validation timestamp must be UTC.',
    );
  validateApplicationConfiguration(scenario, issues);
  validatePaperExecutionConfiguration(scenario, last, issues);
  const annotationIds = new Set<string>();
  for (const [index, annotation] of scenario.annotations.entries()) {
    if (!annotation.id || annotationIds.has(annotation.id))
      add(
        issues,
        'invalid-scenario-annotation',
        `scenario.annotations[${index}].id`,
        'Annotation IDs must be non-empty and unique.',
      );
    annotationIds.add(annotation.id);
    if (
      !Number.isInteger(annotation.visibleFromCandleIndex) ||
      annotation.visibleFromCandleIndex < 0 ||
      annotation.visibleFromCandleIndex > last
    )
      add(
        issues,
        'invalid-annotation-cutoff',
        `scenario.annotations[${index}].visibleFromCandleIndex`,
        'Annotation visibility cutoff must reference a dataset candle.',
      );
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  const publicationIssues = evaluatePublicationGate(dataset, scenario);
  return {
    valid: errors.length === 0,
    publishable: errors.length === 0 && publicationIssues.length === 0,
    issues,
    counts: datasetReport.counts,
  };
}

export function evaluatePublicationGate(
  dataset: HistoricalDataset,
  scenario: HistoricalReplayScenario,
): readonly HistoricalValidationIssue[] {
  const issues: HistoricalValidationIssue[] = [];
  if (!validateHistoricalDataset(dataset).valid)
    add(
      issues,
      'dataset-validation-required',
      'dataset',
      'Canonical dataset validation must pass before publication.',
    );
  if (scenario.publicationStatus !== 'published')
    add(
      issues,
      'scenario-not-published',
      'scenario.publicationStatus',
      'Publication gate requires published scenario status.',
    );
  if (dataset.manifest.publicationStatus !== 'published')
    add(
      issues,
      'dataset-not-published',
      'manifest.publicationStatus',
      'Publication gate rejects development/internal/unpublished datasets.',
    );
  if (
    dataset.manifest.provenance.license.permittedUseStatus !== 'verified' ||
    dataset.manifest.provenance.license.redistributionStatus !== 'verified'
  )
    add(
      issues,
      'redistribution-not-verified',
      'manifest.provenance.license',
      'Verified use and redistribution rights are mandatory.',
    );
  if (
    scenario.dataset.datasetId !== dataset.manifest.datasetId ||
    scenario.dataset.datasetVersion !== dataset.manifest.datasetVersion ||
    scenario.dataset.canonicalChecksum !== dataset.manifest.canonicalChecksum
  )
    add(
      issues,
      'publication-dataset-pin-required',
      'scenario.dataset',
      'Publication requires an exact dataset ID, version, and checksum pin.',
    );
  if (scenario.educationalSourceReferences.length === 0)
    add(
      issues,
      'publication-educational-source-required',
      'scenario.educationalSourceReferences',
      'Publication requires a verified educational source.',
    );
  if (
    !scenario.marketDataProvenance.providerId ||
    !isValidHttpsUrl(scenario.marketDataProvenance.sourceUrl) ||
    !isValidHttpsUrl(scenario.marketDataProvenance.termsUrl)
  )
    add(
      issues,
      'publication-market-source-required',
      'scenario.marketDataProvenance',
      'Publication requires market-data source and HTTPS terms evidence.',
    );
  if (
    !Number.isInteger(scenario.decisionCandleIndex) ||
    !Number.isInteger(scenario.knowledgeCutoffIndex) ||
    scenario.decisionCandleIndex < 0 ||
    scenario.knowledgeCutoffIndex < 0
  )
    add(
      issues,
      'publication-cutoff-required',
      'scenario',
      'Publication requires deterministic decision and knowledge cutoffs.',
    );
  if (!HEBREW.test(scenario.hebrewDisclosure))
    add(
      issues,
      'publication-hebrew-disclosure-required',
      'scenario.hebrewDisclosure',
      'Publication requires a Hebrew historical-data disclosure.',
    );
  if (
    !scenario.deterministicRubric.rubricId ||
    !scenario.deterministicRubric.rubricVersion ||
    !scenario.deterministicRubric.graderId ||
    !CHECKSUM.test(scenario.deterministicRubric.checksum)
  )
    add(
      issues,
      'publication-rubric-required',
      'scenario.deterministicRubric',
      'Publication requires a versioned deterministic rubric.',
    );
  if (
    !['reviewed', 'published'].includes(scenario.editorial.status) ||
    !scenario.editorial.humanReviewer ||
    !scenario.editorial.reviewedAt
  )
    add(
      issues,
      'human-editorial-review-required',
      'scenario.editorial',
      'Reviewed/published human editorial evidence is mandatory.',
    );
  else validateTimestamp(scenario.editorial.reviewedAt, 'scenario.editorial.reviewedAt', issues);
  if (scenario.futureLeakValidation.status !== 'passed')
    add(
      issues,
      'future-leak-validation-required',
      'scenario.futureLeakValidation.status',
      'A passing future-leak validation is mandatory.',
    );
  if (!scenario.futureLeakValidation.validatedAt)
    add(
      issues,
      'future-leak-validation-required',
      'scenario.futureLeakValidation.validatedAt',
      'Future-leak validation timestamp is required.',
    );
  if (scenario.paperExecution !== undefined) {
    const configurationIssues: HistoricalValidationIssue[] = [];
    validatePaperExecutionConfiguration(scenario, dataset.candles.length - 1, configurationIssues);
    if (configurationIssues.some((item) => item.severity === 'error'))
      add(
        issues,
        'publication-paper-execution-configuration-required',
        'scenario.paperExecution',
        'Publication requires a complete and supported paper-execution configuration.',
      );
    if (scenario.paperExecution.publicationStatus !== 'published')
      add(
        issues,
        'paper-execution-not-published',
        'scenario.paperExecution.publicationStatus',
        'Paper execution must be independently published before the scenario can grant course credit.',
      );
  }
  return issues;
}

export function verifyDatasetIdentity(
  expected: HistoricalReplayScenario['dataset'],
  dataset: HistoricalDataset | undefined,
):
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: 'missing' | 'identity-mismatch' | 'checksum-mismatch' | 'modified';
    } {
  if (!dataset) return { ok: false, reason: 'missing' };
  if (
    dataset.manifest.datasetId !== expected.datasetId ||
    dataset.manifest.datasetVersion !== expected.datasetVersion
  )
    return { ok: false, reason: 'identity-mismatch' };
  if (dataset.manifest.canonicalChecksum !== expected.canonicalChecksum)
    return { ok: false, reason: 'checksum-mismatch' };
  if (computeCanonicalDatasetChecksum(dataset) !== dataset.manifest.canonicalChecksum)
    return { ok: false, reason: 'modified' };
  return { ok: true };
}
