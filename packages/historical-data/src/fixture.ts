import { canonicalSerialize } from './canonical.js';
import { importHistoricalCsv } from './importer.js';
import { sha256Hex } from './sha256.js';
import type {
  HistoricalDataset,
  HistoricalReplayScenario,
  HistoricalSourceManifest,
  Sha256Checksum,
} from './types.js';

const START = Date.parse('2025-01-05T07:00:00.000Z');
const INTERVAL = 3_600_000;
const OMITTED_ORDINAL = 42;
const CANDLE_COUNT = 96;

function price(valueInCents: number): string {
  return (valueInCents / 100).toFixed(2);
}

function generatedRows(): readonly string[] {
  const rows = ['timestamp,open,high,low,close,volume,session'];
  for (let index = 0; index < CANDLE_COUNT; index += 1) {
    const ordinal = index >= OMITTED_ORDINAL ? index + 1 : index;
    const open = 10_000 + ordinal * 11 + ((ordinal % 9) - 4) * 7;
    const close = open + ((ordinal % 5) - 2) * 4;
    const high = Math.max(open, close) + 13 + (ordinal % 4);
    const low = Math.min(open, close) - 11 - (ordinal % 3);
    rows.push(
      [
        new Date(START + ordinal * INTERVAL).toISOString(),
        price(open),
        price(high),
        price(low),
        price(close),
        String(1_000 + (ordinal % 17) * 37),
        'continuous',
      ].join(','),
    );
  }
  return rows;
}

export const DEVELOPMENT_FIXTURE_RAW_CSV = `${generatedRows().join('\n')}\n`;

export const DEVELOPMENT_FIXTURE_SOURCE_MANIFEST: HistoricalSourceManifest = {
  datasetId: 'chartpath-generated-hourly-fixture',
  schemaVersion: 1,
  datasetVersion: '1.0.0-dev',
  provenance: {
    providerId: 'chartpath-generated',
    providerName: 'ChartPath deterministic fixture generator',
    origin: 'chartpath-generated',
    sourceUrl: 'https://github.com/P0RTNOY/ChartPath',
    datasetOrEndpointId: 'generated-hourly-fixture-v1',
    retrievedAt: '2026-08-24T00:00:00.000Z',
    termsUrl: 'https://github.com/P0RTNOY/ChartPath',
    license: {
      licenseName: 'ChartPath development fixture — redistribution not reviewed',
      permittedUseStatus: 'verified',
      redistributionStatus: 'prohibited',
      attributionRequirements: 'Label as ChartPath-generated, synthetic, and development-only.',
      evidenceReviewedAt: '2026-08-24T00:00:00.000Z',
      evidenceNotes:
        'Generated locally from integer formulas. No real symbol, issuer, market, or prices are represented.',
    },
    knownLimitations: [
      'Synthetic integer-formula candles are not observations from a market.',
      'The fixture is non-publishable and exists only to validate frozen replay infrastructure.',
    ],
  },
  symbol: 'DEV-BLIND-001',
  displaySymbol: 'Generated fixture 001',
  exchange: 'ChartPath synthetic continuous session',
  currency: 'XXX',
  exchangeTimezone: 'Asia/Jerusalem',
  interval: { unit: 'hour', value: 1, milliseconds: INTERVAL },
  pricePrecision: 2,
  volumeUnit: 'generated units',
  adjustment: {
    mode: 'raw',
    splitPolicy: 'unadjusted',
    dividendPolicy: 'unadjusted',
    corporateActionPolicy: 'explicit-actions-only',
  },
  sessionPolicy: {
    calendarId: 'chartpath-continuous-fixture-v1',
    includedSessions: ['continuous'],
    regularSessionOpen: '00:00',
    regularSessionClose: '23:59',
    timestampConvention: 'start',
  },
  missingIntervalPolicy: {
    behavior: 'record-and-preserve',
    fillPolicy: 'never-invent-candles',
    declaredIrregularities: [],
  },
  publicationStatus: 'development-only',
  anonymizedLearnerIdentity: 'fixture-only-no-learner',
  expectedRawChecksum: `sha256:${sha256Hex(DEVELOPMENT_FIXTURE_RAW_CSV)}`,
  expectedStartTimestampUtc: new Date(START).toISOString(),
  expectedEndTimestampUtc: new Date(START + CANDLE_COUNT * INTERVAL).toISOString(),
  expectedCandleCount: CANDLE_COUNT,
  corporateActions: [],
};

function loadDevelopmentFixture(): HistoricalDataset {
  const result = importHistoricalCsv(
    DEVELOPMENT_FIXTURE_RAW_CSV,
    DEVELOPMENT_FIXTURE_SOURCE_MANIFEST,
  );
  if (!result.ok)
    throw new Error(
      `ChartPath generated historical fixture is invalid: ${result.report.issues
        .map((item) => item.code)
        .join(', ')}`,
    );
  return result.dataset;
}

export const DEVELOPMENT_HISTORICAL_DATASET = loadDevelopmentFixture();

const rubricChecksum = `sha256:${sha256Hex(
  canonicalSerialize({
    rubricId: 'u10-capstone-e03',
    rubricVersion: 'content-v1',
    graderId: 'deterministic-capstone-v1',
  }),
)}` as Sha256Checksum;

export const DEVELOPMENT_HISTORICAL_SCENARIO: HistoricalReplayScenario = {
  scenarioId: 'blind-generated-development-scenario',
  schemaVersion: 1,
  scenarioVersion: '1.0.0-dev',
  dataset: {
    datasetId: DEVELOPMENT_HISTORICAL_DATASET.manifest.datasetId,
    datasetVersion: DEVELOPMENT_HISTORICAL_DATASET.manifest.datasetVersion,
    canonicalChecksum: DEVELOPMENT_HISTORICAL_DATASET.manifest.canonicalChecksum,
  },
  educationalContentId: 'u10-capstone-e03',
  decisionCandleIndex: 72,
  initialVisibleRange: { startCandleIndex: 0, endCandleIndex: 23 },
  permittedReplayBoundaryIndex: 72,
  knowledgeCutoffIndex: 72,
  blindMode: true,
  revealPolicy: 'after-finalization',
  blindTitleHebrew: 'תרחיש היסטורי עיוור לפיתוח',
  revealedTitleHebrew: 'תרחיש נתונים סינתטיים שנוצר ב־ChartPath',
  educationalSourceReferences: [
    {
      sourceId: 'ta-he-v2',
      pageStart: 74,
      pageEnd: 75,
      section: 'פרק 19 — מקרה ג׳: תבנית ברורה ללא יחס מתאים',
    },
  ],
  marketDataProvenance: {
    providerId: DEVELOPMENT_HISTORICAL_DATASET.manifest.provenance.providerId,
    sourceUrl: DEVELOPMENT_HISTORICAL_DATASET.manifest.provenance.sourceUrl,
    termsUrl: DEVELOPMENT_HISTORICAL_DATASET.manifest.provenance.termsUrl,
  },
  publicationStatus: 'development-only',
  editorial: { status: 'internal' },
  annotations: [
    {
      id: 'known-level',
      kind: 'horizontal-level',
      visibleFromCandleIndex: 30,
      payload: { price: 103.5 },
    },
    {
      id: 'future-reference-hidden',
      kind: 'label',
      visibleFromCandleIndex: 80,
      payload: { text: 'future fixture annotation' },
    },
  ],
  hebrewDisclosure:
    'זהו תרחיש עיוור שנוצר ב־ChartPath לצורכי פיתוח בלבד. הוא אינו נתון שוק אמיתי, אינו ניתן לפרסום ואינו המלצה.',
  deterministicRubric: {
    rubricId: 'u10-capstone-e03',
    rubricVersion: 'content-v1',
    graderId: 'deterministic-capstone-v1',
    checksum: rubricChecksum,
  },
  futureLeakValidation: {
    status: 'passed',
    validatedAt: '2026-08-24T00:00:00.000Z',
    validatorVersion: 'historical-knowledge-view-v1',
  },
};
