import { createChartSpec } from '@chartpath/chart-engine';
import {
  canonicalSerialize,
  sha256Hex,
  type HistoricalApplicationDecision,
  type Sha256Checksum,
} from '@chartpath/historical-data';

import { WORKFLOW_STEP_IDS, type ExactSourceReference, type WorkflowStepId } from '../types.js';
import {
  SCENARIO_AUTHORING_SCHEMA_VERSION,
  SCENARIO_COMPILER_CONTRACT_V1,
  SCENARIO_COMPILER_VERSION,
  type ScenarioAuthoringManifestV1,
  type ScenarioDoctrineSourceV1,
  type ScenarioExpectedExecutionV1,
  type ScenarioExecutionSnapshotV1,
} from './types.js';
import { buildGeneratedScenarioDataset } from './compiler.js';

type CandidateInput = Omit<
  ScenarioAuthoringManifestV1,
  | 'schemaVersion'
  | 'compilerVersion'
  | 'compilerContractChecksum'
  | 'chartSpecChecksum'
  | 'generatedDatasetChecksum'
  | 'materialArtifactChecksum'
  | 'publication'
  | 'licensing'
> & { readonly publicationBlockers?: readonly string[] };

const generatedDataBlocker =
  'INTERNAL בלבד: נתוני ChartPath סינתטיים, ללא הרשאת הפצה לפרסום וללא קרדיט לימודי.';
const workflowReviewBlocker =
  'נדרש אישור אנושי מפורש לניסוח, לרובריקת 11 השלבים ולהתאמה למקור; לא בוצע אישור כזה.';

const prompts: Readonly<Record<WorkflowStepId, string>> = Object.freeze({
  context: 'מהו ההקשר לפני נקודת ההחלטה, ומה אינו ידוע עדיין?',
  structure: 'איזה מבנה מחיר נתמך בראיות הגלויות בלבד?',
  level: 'איזו רמה רלוונטית להחלטה ומדוע?',
  setup: 'האם תנאי התרחיש שהוגדר מראש קיים?',
  confirmation: 'איזה אישור נדרש, והאם הוא כבר הופיע?',
  entry: 'מהו תנאי הכניסה, אם קיימת עסקה קוהרנטית?',
  invalidation: 'היכן הראיה המבנית נחשבת מבוטלת?',
  'position-size': 'האם ניתן לחשב גודל פוזיציה בלי לחרוג מתקציב הסיכון?',
  target: 'מהו היעד התכנוני, ואיזו רמה עלולה להגביל אותו?',
  management: 'בחרו החלטה מפורשת: עסקה, המתנה או אי־עסקה.',
  review: 'אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?',
});

type ReviewedReference = ExactSourceReference & { readonly reviewedContentId: string };

function source(
  reference: ReviewedReference,
  chapter: string,
  figure: string,
  concept: string,
  rationaleHe: string,
): ScenarioDoctrineSourceV1 {
  const { reviewedContentId, ...exactReference } = reference;
  return {
    ...exactReference,
    pdfDocumentId: 'ta-he-v2.pdf',
    reviewedContentIds: [reviewedContentId],
    chapter,
    figure,
    concept,
    rationaleHe,
  };
}

function checksum(value: unknown): Sha256Checksum {
  return `sha256:${sha256Hex(canonicalSerialize(value))}`;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

const executionSnapshots: Readonly<Record<string, ScenarioExecutionSnapshotV1>> = {
  'internal-long-range-breakout': {
    schemaVersion: 1,
    terminalStatus: 'closed',
    workingOrderStatus: 'filled',
    positionStatus: 'closed-target',
    events: [
      { sequence: 0, type: 'session-created' },
      { sequence: 1, type: 'order-submitted', candleIndex: 63 },
      { sequence: 2, type: 'order-working', candleIndex: 63 },
      {
        sequence: 3,
        type: 'order-filled',
        candleIndex: 64,
        fill: {
          referencePrice: 106.1544,
          price: 106.27,
          commission: 1,
          gap: false,
          priceCappedByLimit: false,
        },
      },
      {
        sequence: 4,
        type: 'position-opened',
        candleIndex: 64,
        fill: {
          referencePrice: 106.1544,
          price: 106.27,
          commission: 1,
          gap: false,
          priceCappedByLimit: false,
        },
      },
      {
        sequence: 5,
        type: 'position-closed-target',
        candleIndex: 81,
        fill: {
          referencePrice: 112,
          price: 112,
          commission: 1,
          gap: false,
          priceCappedByLimit: true,
        },
      },
    ],
    debrief: {
      outcome: 'target',
      outcomeDeterminate: true,
      totalCommissions: 2,
      modeledSpreadAndSlippage: 1.06,
      netSimulatedOutcome: 55.3,
      riskMultiple: 1.5533707865168538,
    },
    checksum: 'sha256:aa8e83bb9018bafafebf928a10bcbafd114f6ab75d48a596b0d4a6e3b39ac1ad',
  },
  'internal-long-inverse-hs': {
    schemaVersion: 1,
    terminalStatus: 'closed',
    workingOrderStatus: 'filled',
    positionStatus: 'closed-stop',
    events: [
      { sequence: 0, type: 'session-created' },
      { sequence: 1, type: 'order-submitted', candleIndex: 63 },
      { sequence: 2, type: 'order-working', candleIndex: 63 },
      {
        sequence: 3,
        type: 'order-filled',
        candleIndex: 64,
        fill: {
          referencePrice: 105.0471,
          price: 105.16,
          commission: 1,
          gap: false,
          priceCappedByLimit: false,
        },
      },
      {
        sequence: 4,
        type: 'position-opened',
        candleIndex: 64,
        fill: {
          referencePrice: 105.0471,
          price: 105.16,
          commission: 1,
          gap: false,
          priceCappedByLimit: false,
        },
      },
      {
        sequence: 5,
        type: 'position-closed-stop',
        candleIndex: 64,
        fill: {
          referencePrice: 104.9,
          price: 104.79,
          commission: 1,
          gap: false,
          priceCappedByLimit: false,
        },
      },
    ],
    debrief: {
      outcome: 'protective-stop',
      outcomeDeterminate: true,
      totalCommissions: 2,
      modeledSpreadAndSlippage: 2.1,
      netSimulatedOutcome: -5.7,
      riskMultiple: -1.017857142857143,
    },
    checksum: 'sha256:415c7bde881db297a1974e48924e5cec7fc1d32fbaf200744b863931885ca445',
  },
  'internal-long-triangle': {
    schemaVersion: 1,
    terminalStatus: 'ambiguous',
    workingOrderStatus: 'filled',
    positionStatus: 'ambiguous',
    events: [
      { sequence: 0, type: 'session-created' },
      { sequence: 1, type: 'order-submitted', candleIndex: 63 },
      { sequence: 2, type: 'order-working', candleIndex: 63 },
      {
        sequence: 3,
        type: 'order-filled',
        candleIndex: 64,
        fill: {
          referencePrice: 114,
          price: 114.12,
          commission: 1,
          gap: false,
          priceCappedByLimit: false,
        },
      },
      {
        sequence: 4,
        type: 'position-opened',
        candleIndex: 64,
        fill: {
          referencePrice: 114,
          price: 114.12,
          commission: 1,
          gap: false,
          priceCappedByLimit: false,
        },
      },
      { sequence: 5, type: 'execution-ambiguous', candleIndex: 64 },
    ],
    debrief: {
      outcome: 'ambiguous',
      outcomeDeterminate: false,
      totalCommissions: 1,
      modeledSpreadAndSlippage: 1.14,
      ambiguityReason: 'entry-exit-sequence-unknown',
    },
    checksum: 'sha256:625729c925d5ebea047e1b2417ebe04ec9c546c22569320c85166ec4fcd07eb4',
  },
  'internal-short-double-top': {
    schemaVersion: 1,
    terminalStatus: 'closed',
    workingOrderStatus: 'filled',
    positionStatus: 'closed-target',
    events: [
      { sequence: 0, type: 'session-created' },
      { sequence: 1, type: 'order-submitted', candleIndex: 63 },
      { sequence: 2, type: 'order-working', candleIndex: 63 },
      {
        sequence: 3,
        type: 'order-filled',
        candleIndex: 64,
        fill: {
          referencePrice: 94.9734,
          price: 94.87,
          commission: 1,
          gap: false,
          priceCappedByLimit: false,
        },
      },
      {
        sequence: 4,
        type: 'position-opened',
        candleIndex: 64,
        fill: {
          referencePrice: 94.9734,
          price: 94.87,
          commission: 1,
          gap: false,
          priceCappedByLimit: false,
        },
      },
      {
        sequence: 5,
        type: 'position-closed-target',
        candleIndex: 83,
        fill: {
          referencePrice: 88,
          price: 88,
          commission: 1,
          gap: false,
          priceCappedByLimit: true,
        },
      },
    ],
    debrief: {
      outcome: 'target',
      outcomeDeterminate: true,
      totalCommissions: 2,
      modeledSpreadAndSlippage: 0.95,
      netSimulatedOutcome: 66.7,
      riskMultiple: 2.7336065573770494,
    },
    checksum: 'sha256:164e047cea1f13ee8d4e374708c36bb36f652d85c67eff34ecdb34aec80e4682',
  },
  'internal-short-head-shoulders-gap': {
    schemaVersion: 1,
    terminalStatus: 'closed',
    workingOrderStatus: 'filled',
    positionStatus: 'closed-target',
    events: [
      { sequence: 0, type: 'session-created' },
      { sequence: 1, type: 'order-submitted', candleIndex: 63 },
      { sequence: 2, type: 'order-working', candleIndex: 63 },
      {
        sequence: 3,
        type: 'order-filled',
        candleIndex: 64,
        fill: {
          referencePrice: 87.3726,
          price: 87.28,
          commission: 1,
          gap: true,
          priceCappedByLimit: false,
        },
      },
      {
        sequence: 4,
        type: 'position-opened',
        candleIndex: 64,
        fill: {
          referencePrice: 87.3726,
          price: 87.28,
          commission: 1,
          gap: true,
          priceCappedByLimit: false,
        },
      },
      {
        sequence: 5,
        type: 'position-closed-target',
        candleIndex: 77,
        fill: {
          referencePrice: 82,
          price: 82,
          commission: 1,
          gap: false,
          priceCappedByLimit: true,
        },
      },
    ],
    debrief: {
      outcome: 'target',
      outcomeDeterminate: true,
      totalCommissions: 2,
      modeledSpreadAndSlippage: 0.87,
      netSimulatedOutcome: 50.8,
      riskMultiple: 0.6874154262516914,
    },
    checksum: 'sha256:98ef462e39ba8a924a01fc135d0457e6a837aa006f8dc77137171782a097ccba',
  },
  'internal-short-rising-wedge': {
    schemaVersion: 1,
    terminalStatus: 'completed',
    workingOrderStatus: 'expired',
    events: [
      { sequence: 0, type: 'session-created' },
      { sequence: 1, type: 'order-submitted', candleIndex: 63 },
      { sequence: 2, type: 'order-working', candleIndex: 63 },
      { sequence: 3, type: 'order-expired', candleIndex: 95 },
    ],
    checksum: 'sha256:22ea187cac74c9d6366d0500740c377f2f34b003d2e64e63c118b01392528b20',
  },
};

function plan(
  id: string,
  direction: 'long' | 'short',
  entryIntent: ScenarioExpectedExecutionV1['plan']['entryIntent'],
  protectiveStopPrice: number,
  targetPrice: number,
  expectedStatus: ScenarioExpectedExecutionV1['expectedStatus'],
  requiredEvidence: ScenarioExpectedExecutionV1['requiredEvidence'],
): ScenarioExpectedExecutionV1 {
  return {
    direction,
    entryOrderType: entryIntent.type,
    plan: {
      planId: `${id}-plan-v1`,
      direction,
      entryIntent,
      protectiveStopPrice,
      targetPrice,
      fictionalAccountValue: 100_000,
      intendedRiskAmount: 1_000,
      quantity: 10,
      authoredAtCandleIndex: 63,
      processEvidence: {
        analysisDecision: direction,
        entryMatchesAnalysis: true,
        invalidationMatchesAnalysis: true,
        targetMatchesAnalysis: true,
        requiredReasoningBypassed: false,
      },
    },
    expectedStatus,
    requiredEvidence,
    expectedSnapshot: executionSnapshots[id]!,
  };
}

function candidate(input: CandidateInput): ScenarioAuthoringManifestV1 {
  const { publicationBlockers = [], ...candidateInput } = input;
  const chartSpecChecksum = checksum(input.chartSpec);
  const compilerContractChecksum = checksum(SCENARIO_COMPILER_CONTRACT_V1);
  const licensing = {
    owner: 'ChartPath' as const,
    generatedDataOnly: true as const,
    redistributionStatus: 'prohibited' as const,
    publicationStatus: 'internal' as const,
  };
  const {
    reviewStates: _reviewStates,
    reviewFingerprint: _reviewFingerprint,
    retirement: _retirement,
    ...semanticInput
  } = candidateInput;
  void _reviewStates;
  void _reviewFingerprint;
  void _retirement;
  const generatedDatasetChecksum = buildGeneratedScenarioDataset({
    datasetId: candidateInput.datasetId,
    datasetVersion: candidateInput.datasetVersion,
    chartSpec: candidateInput.chartSpec,
    scenarioId: candidateInput.scenarioId,
  }).manifest.canonicalChecksum;
  const material = {
    ...semanticInput,
    compilerVersion: SCENARIO_COMPILER_VERSION,
    compilerContractChecksum,
    chartSpecChecksum,
    generatedDatasetChecksum,
    licensing,
  };
  const materialArtifactChecksum = checksum(material);
  return deepFreeze({
    ...candidateInput,
    schemaVersion: SCENARIO_AUTHORING_SCHEMA_VERSION,
    compilerVersion: SCENARIO_COMPILER_VERSION,
    compilerContractChecksum,
    chartSpecChecksum,
    generatedDatasetChecksum,
    licensing,
    materialArtifactChecksum,
    publication: {
      status: 'human-review-required' as const,
      records: [],
      blockers: [generatedDataBlocker, workflowReviewBlocker, ...publicationBlockers],
    },
    reviewFingerprint: materialArtifactChecksum,
  }) as ScenarioAuthoringManifestV1;
}

function spec(
  id: string,
  seed: number,
  scenario: 'breakout' | 'reversal' | 'continuation' | 'ambiguous',
  direction: 'up' | 'down',
  regime: 'uptrend' | 'downtrend' | 'range',
  pattern: string,
  extra: Readonly<Record<string, string | number>> = {},
) {
  return createChartSpec({
    id: `${id}-chart-v1`,
    seed,
    scenario,
    candleCount: 96,
    timeframe: '1h',
    basePrice: 100,
    baseVolume: 100_000,
    volatility: 0.012,
    noise: 0.2,
    decisionCandleIndex: 63,
    parameters: { direction, regime, pattern, eventIndex: 60, ...extra },
  });
}

function base(
  id: string,
  titleHe: string,
  difficulty: 'guided' | 'independent' | 'blind',
  chartSpec: ReturnType<typeof spec>,
  doctrine: ScenarioDoctrineSourceV1,
  application: HistoricalApplicationDecision,
  expectedExecution?: ScenarioExpectedExecutionV1,
): CandidateInput {
  const previewDataset = buildGeneratedScenarioDataset({
    datasetId: `${id}-dataset`,
    datasetVersion: '1.0.0',
    chartSpec,
    scenarioId: id,
  });
  const visibleCandles = previewDataset.candles.slice(16, 64);
  const decisionCandle = previewDataset.candles[63]!;
  const blindEvidenceSummaryHe = `בחלון הגלוי 16–63: טווח המחיר ${Math.min(
    ...visibleCandles.map((candle) => candle.low),
  )}–${Math.max(...visibleCandles.map((candle) => candle.high))}, סגירת נר ההחלטה ${
    decisionCandle.close
  } ומחזור ${decisionCandle.volume}.`;
  const rubricMaterial = {
    rubricId: `${id}-process-rubric`,
    rubricVersion: '1.0.0',
    criteria: WORKFLOW_STEP_IDS.map((step) => ({
      workflowStepId: step,
      criterionHe: `${titleHe}: נימוק מתועד ועקבי בשלב ${step}`,
      expectedEvidenceHe: `${titleHe} — ${doctrine.concept}: ${prompts[step]}`,
    })),
    expectedDecision: application,
    requiredRationaleReasonIds: [`reason-${sha256Hex(id).slice(0, 12)}-a`],
    scoring: {
      executionStatusAffectsScore: false as const,
      profitAndLossAffectsScore: false as const,
    },
  };
  return {
    scenarioId: id,
    scenarioVersion: '1.0.0',
    datasetId: `${id}-dataset`,
    datasetVersion: '1.0.0',
    titleHe,
    difficulty,
    source: doctrine,
    chartSpec,
    decisionCandleIndex: 63,
    initialVisibleRange: { startCandleIndex: 16, endCandleIndex: 63 },
    permittedReplayBoundaryIndex: 63,
    knowledgeCutoffIndex: 63,
    promptHe: `נתחו את ${titleHe} באמצעות 11 שלבי התהליך. אין להשתמש בנרות שמעבר לנקודת ההחלטה.`,
    blindEvidenceSummaryHe,
    hintsHe: [
      'הפרידו בין תיאור המבנה לבין החלטת היישום.',
      'בדקו אישור, ביטול ויחס תגמול־סיכון לפני החלטה.',
    ],
    accessibility: {
      chartDescriptionHe:
        'גרף נרות סינתטי עיוור; תיאור המבנה והתוצאה אינם נחשפים לפני סיום הניתוח.',
      interactionInstructionsHe:
        'עברו לפי סדר 11 השלבים והסתמכו רק על הנרות שמספרם אינו גבוה מנקודת ההחלטה.',
      preservesBlindness: true,
    },
    financialSafetyDisclosureHe:
      'התרחיש לימודי וסינתטי בלבד; הוא אינו המלצה אישית ואינו הוראת קנייה או מכירה.',
    prerequisites: {
      exerciseIds: doctrine.reviewedContentIds,
      conceptIds: [doctrine.concept, 'workflow.eleven-step', 'risk.invalidation-execution'],
    },
    replayPolicy: { blind: true, reveal: 'after-finalization' },
    guidedAnalysis: {
      enabled: difficulty === 'guided',
      availableHintCount: 2,
      preservesDecisionCutoff: true,
    },
    workflowPromptsHe: prompts,
    processRubric: { ...rubricMaterial, checksum: checksum(rubricMaterial) },
    application,
    ...(expectedExecution
      ? {
          planConstraints: {
            permittedDirections: [expectedExecution.direction],
            permittedEntryOrderTypes: [expectedExecution.entryOrderType],
          },
          expectedExecution,
        }
      : {}),
    retirement: { status: 'active' },
    reviewStates: {
      source: 'pending',
      accessibility: 'pending',
      hebrew: 'pending',
      'financial-safety': 'pending',
    },
    reviewFingerprint: checksum({ id, version: '1.0.0', doctrine, chartSpec, application }),
  };
}

const refs = {
  capstoneA: {
    reviewedContentId: 'u10-capstone-e01',
    sourceId: 'ta-he-v2',
    pageStart: 72,
    pageEnd: 73,
    bookPageStart: 59,
    bookPageEnd: 60,
    section: 'פרק 19; מקרה א׳ ואיור 19.1 — גודל ו־R לאחר שינוי החלקה',
  },
  inverse: {
    reviewedContentId: 'u05-reversal-e02',
    sourceId: 'ta-he-v2',
    pageStart: 39,
    pageEnd: 39,
    bookPageStart: 26,
    bookPageEnd: 26,
    section: 'פרק 8 — ראש וכתפיים הפוך; איור 8.2',
  },
  triangle: {
    reviewedContentId: 'u05-continuation-e01',
    sourceId: 'ta-he-v2',
    pageStart: 44,
    pageEnd: 46,
    bookPageStart: 31,
    bookPageEnd: 33,
    section: 'פרק 10 — סיווג משולשים והטיה; איורים 10.1–10.2',
  },
  doubleTop: {
    reviewedContentId: 'u05-reversal-e04',
    sourceId: 'ta-he-v2',
    pageStart: 41,
    pageEnd: 41,
    bookPageStart: 28,
    bookPageEnd: 28,
    section: 'פרק 9 — פסגה כפולה; איור 9.1',
  },
  headShoulders: {
    reviewedContentId: 'u05-reversal-e01',
    sourceId: 'ta-he-v2',
    pageStart: 38,
    pageEnd: 39,
    bookPageStart: 25,
    bookPageEnd: 26,
    section: 'פרק 8 — ראש וכתפיים ומגמה קודמת; איורים 8.1–8.2',
  },
  wedge: {
    reviewedContentId: 'u05-continuation-e04',
    sourceId: 'ta-he-v2',
    pageStart: 47,
    pageEnd: 49,
    bookPageStart: 34,
    bookPageEnd: 36,
    section: 'פרק 11 — טריזים, תבניות מתרחבות ויהלום; איורים 11.1–11.2',
  },
  capstoneC: {
    reviewedContentId: 'u10-capstone-e03',
    sourceId: 'ta-he-v2',
    pageStart: 74,
    pageEnd: 75,
    bookPageStart: 61,
    bookPageEnd: 62,
    section: 'פרק 19 — מקרה ג׳: תבנית ברורה ללא יחס מתאים',
  },
  capstoneD: {
    reviewedContentId: 'u10-capstone-e04',
    sourceId: 'ta-he-v2',
    pageStart: 75,
    pageEnd: 75,
    bookPageStart: 62,
    bookPageEnd: 62,
    section: 'פרק 19 — מקרה ד׳: יעד 1.5R מול התנגדות וביטול',
  },
  gaps: {
    reviewedContentId: 'u06-breakouts-e02',
    sourceId: 'ta-he-v2',
    pageStart: 53,
    pageEnd: 54,
    bookPageStart: 40,
    bookPageEnd: 41,
    section: 'פרק 13 — פער המשך לעומת מיצוי',
  },
} satisfies Record<string, ReviewedReference>;

export const scenarioAuthoringManifests: readonly ScenarioAuthoringManifestV1[] = Object.freeze([
  candidate(
    base(
      'internal-long-range-breakout',
      'מועמד פריצה מטווח לניתוח לונג',
      'guided',
      spec('internal-long-range-breakout', 51001, 'breakout', 'up', 'range', 'rectangle'),
      source(
        refs.capstoneA,
        '19',
        '19.1',
        'פריצה, תכנון סיכון ויעד',
        'המקרה מדגים מעבר מתנאי פריצה לתכנית סיכון שאינה מבטיחה תוצאה.',
      ),
      { kind: 'trade', direction: 'long' },
      plan(
        'internal-long-range-breakout',
        'long',
        { type: 'market', estimatedEntryPrice: 106.14 },
        103,
        112,
        'closed',
        ['market-entry', 'target'],
      ),
    ),
  ),
  candidate(
    base(
      'internal-long-inverse-hs',
      'מועמד ראש־וכתפיים הפוך לניתוח לונג',
      'independent',
      spec(
        'internal-long-inverse-hs',
        51002,
        'reversal',
        'up',
        'downtrend',
        'inverse-head-and-shoulders',
      ),
      source(
        refs.inverse,
        '8',
        '8.2',
        'ראש־וכתפיים הפוך, אישור וביטול',
        'המקור קושר מבנה, קו צוואר, אישור וביטול; תכנית מלאה עדיין דורשת ביקורת.',
      ),
      { kind: 'trade', direction: 'long' },
      plan(
        'internal-long-inverse-hs',
        'long',
        { type: 'market', estimatedEntryPrice: 105.04 },
        104.9,
        112,
        'closed',
        ['market-entry', 'protective-stop'],
      ),
    ),
  ),
  candidate(
    base(
      'internal-long-triangle',
      'מועמד משולש עולה לניתוח לונג',
      'blind',
      spec('internal-long-triangle', 51003, 'continuation', 'up', 'uptrend', 'ascending-triangle'),
      source(
        refs.triangle,
        '10',
        '10.1–10.2',
        'הטיית משולש, אישור, יעד ורמות ביניים',
        'הטיה אינה אישור; התרחיש דורש טריגר וסיכון מוגדרים.',
      ),
      { kind: 'trade', direction: 'long' },
      plan(
        'internal-long-triangle',
        'long',
        { type: 'stop', triggerPrice: 114 },
        113.5,
        114.8,
        'ambiguous',
        ['stop-entry', 'ambiguity'],
      ),
    ),
  ),
  candidate(
    base(
      'internal-short-double-top',
      'מועמד פסגה כפולה לניתוח שורט',
      'guided',
      spec('internal-short-double-top', 52001, 'reversal', 'down', 'uptrend', 'double-top'),
      source(
        refs.doubleTop,
        '9',
        '9.1',
        'פסגה כפולה, שפל ביניים ואישור',
        'סגירה מתחת לשפל הביניים היא תנאי אישור ולא הוראת מסחר.',
      ),
      { kind: 'trade', direction: 'short' },
      plan(
        'internal-short-double-top',
        'short',
        { type: 'market', estimatedEntryPrice: 94.96 },
        97,
        88,
        'closed',
        ['market-entry', 'target'],
      ),
    ),
  ),
  candidate(
    base(
      'internal-short-head-shoulders-gap',
      'מועמד ראש־וכתפיים עם פער לניתוח שורט',
      'independent',
      spec(
        'internal-short-head-shoulders-gap',
        52002,
        'reversal',
        'down',
        'uptrend',
        'head-and-shoulders',
        { gapKind: 'exhaustion', gapIndex: 64, gapSize: 0.08 },
      ),
      source(
        refs.headShoulders,
        '8',
        '8.1',
        'ראש־וכתפיים, קו צוואר ואישור',
        'המבנה החיובי נפרד מתרגיל הדומה־לכאורה הקיים; נדרשת ביקורת מקור חדשה.',
      ),
      { kind: 'trade', direction: 'short' },
      plan(
        'internal-short-head-shoulders-gap',
        'short',
        { type: 'stop', triggerPrice: 90 },
        97,
        82,
        'closed',
        ['stop-entry', 'opening-gap', 'target'],
      ),
    ),
  ),
  candidate(
    base(
      'internal-short-rising-wedge',
      'מועמד טריז עולה לניתוח שורט',
      'blind',
      spec('internal-short-rising-wedge', 52003, 'continuation', 'down', 'downtrend', 'wedge'),
      source(
        refs.wedge,
        '11',
        '11.1–11.2',
        'טריז עולה מול ערוץ ודפוס כפוי',
        'הסיווג אינו מחליף אישור; פקודה שאינה מתמלאת נשארת תוצאה לגיטימית.',
      ),
      { kind: 'trade', direction: 'short' },
      plan(
        'internal-short-rising-wedge',
        'short',
        { type: 'limit', limitPrice: 100 },
        102,
        90,
        'completed',
        ['limit-entry', 'unfilled-order'],
      ),
    ),
  ),
  candidate(
    base(
      'internal-no-trade-capstone-c',
      'מועמד אי־עסקה — מקרה ג׳',
      'guided',
      spec(
        'internal-no-trade-capstone-c',
        53001,
        'ambiguous',
        'down',
        'uptrend',
        'head-and-shoulders',
      ),
      source(
        refs.capstoneC,
        '19',
        'מקרה ג׳',
        'תבנית ברורה ללא יחס מתאים',
        'זהו המקור היחיד בקטלוג בעל רובריקת 11 שלבים מלאה והחלטת אי־עסקה מפורשת.',
      ),
      { kind: 'no-trade', disposition: 'no-trade' },
    ),
  ),
  candidate(
    base(
      'internal-no-trade-capstone-d',
      'מועמד אי־עסקה — מקרה ד׳',
      'independent',
      spec('internal-no-trade-capstone-d', 53002, 'ambiguous', 'up', 'range', 'rectangle'),
      source(
        refs.capstoneD,
        '19',
        'מקרה ד׳',
        'יעד מעשי מול התנגדות וללא ביטול מבני',
        'המקור תומך באי־עסקה אטומית; הרחבתו ל־11 שלבים דורשת ביקורת אנושית.',
      ),
      { kind: 'no-trade', disposition: 'no-trade' },
    ),
  ),
  candidate({
    ...base(
      'internal-no-trade-gap-uncertainty',
      'מועמד אי־עסקה — פער ללא ראיות המשך',
      'blind',
      spec('internal-no-trade-gap-uncertainty', 53003, 'ambiguous', 'up', 'uptrend', 'flag', {
        gapKind: 'exhaustion',
        gapIndex: 63,
        gapSize: 0.07,
      }),
      source(
        refs.gaps,
        '13',
        'ללא איור מוגדר',
        'אי־אפשר לסווג פער לפני תגובת המחיר',
        'המקור תומך בהמתנה או בראיות לא מספיקות, לא ברובריקת אי־עסקה מלאה.',
      ),
      { kind: 'no-trade', disposition: 'no-trade' },
    ),
    publicationBlockers: [
      'חסם מקור מדויק: אין בקטלוג רובריקה שלישית, שנבדקה אנושית, להחלטת אי־עסקה מילולית מלאה; המקור הקיים מאשר רק המתנה/ראיות לא מספיקות.',
    ],
  }),
]);
