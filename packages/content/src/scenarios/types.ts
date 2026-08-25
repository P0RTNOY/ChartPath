import type {
  ChartSpec,
  EntryOrderType,
  PaperExecutionStatus,
  TradeDirection,
  TradePlanInput,
} from '@chartpath/domain';
import type {
  HistoricalApplicationDecision,
  HistoricalDataset,
  HistoricalReplayScenario,
  Sha256Checksum,
} from '@chartpath/historical-data';

import type { ContentExercise, ExactSourceReference, WorkflowStepId } from '../types.js';

export const SCENARIO_AUTHORING_SCHEMA_VERSION = 1 as const;
export const SCENARIO_COMPILER_VERSION = 'scenario-compiler-v1' as const;
export const SCENARIO_COMPILER_CONTRACT_V1 = Object.freeze({
  graderId: 'deterministic-capstone-v1',
  neutralExercisePromptHe:
    'נתחו את הגרף הסינתטי העיוור באמצעות 11 שלבי התהליך ועל סמך הנרות הגלויים בלבד.',
  neutralExplanationHe:
    'ההערכה בודקת תהליך קבוע מראש; תוצאת המחיר העתידית אינה משנה את איכות ההחלטה.',
  neutralSourceSectionHe: 'פרטי המקור ייחשפו לאחר סיום התרחיש.',
  blindTitleHe: 'תרחיש היסטורי עיוור — נכס סינתטי',
  correctEvidenceSuffixHe: 'יש לנמק באמצעות הכלל שנקבע מראש ובלי תוצאה עתידית.',
  latestCloseDistractorHe:
    'הסגירה האחרונה לבדה מכריעה את השלב, גם בלי לקשור אותה למבנה, לרמה או לכלל אישור.',
  futureDistractorHe: 'יש להשלים את הנימוק באמצעות נרות שטרם נחשפו בנקודת ההחלטה.',
  managementCorrectSuffixHe: 'ההחלטה נשענת על שילוב הקשר, אישור, ביטול ותגמול־סיכון שנקבע מראש.',
  managementLatestCloseDistractorHe:
    'הסגירה האחרונה וטווח המחיר מספיקים לבדם להחלטה; אישור וביטול הם שיקולים משניים.',
  managementFutureDistractorHe:
    'עדיף להמתין לתוצאה העתידית ואז לבחור את ההחלטה שנראית מוצלחת בדיעבד.',
  decisionLabelsHe: Object.freeze({
    trade: 'עסקה לפי התכנית',
    wait: 'המתנה',
    'no-trade': 'אי־עסקה',
    'insufficient-evidence': 'אין די ראיות',
  }),
  paperDisclosureHe:
    'סימולציית ביצוע לימודית בלבד; מילויים ועלויות נקבעים במדיניות דטרמיניסטית ואינם תחזית.',
});

export type ScenarioDifficulty = 'guided' | 'independent' | 'blind';
export type ScenarioRetirement =
  | { readonly status: 'active' }
  | {
      readonly status: 'retired';
      readonly retiredAt: string;
      readonly replacementScenarioId?: string;
      readonly replacementScenarioVersion?: string;
    };

export interface ScenarioDoctrineSourceV1 extends ExactSourceReference {
  readonly pdfDocumentId: string;
  readonly reviewedContentIds: readonly string[];
  readonly chapter: string;
  readonly figure: string;
  readonly concept: string;
  readonly rationaleHe: string;
}

export interface ScenarioReviewRecordV1 {
  readonly reviewerRecordId: string;
  readonly reviewedAt: string;
  readonly decision: 'approved' | 'changes-requested';
  readonly materialArtifactChecksum: Sha256Checksum;
  readonly scope:
    | 'source'
    | 'rubric'
    | 'execution'
    | 'accessibility'
    | 'hebrew'
    | 'financial-safety'
    | 'publication';
  readonly note: string;
}

export interface ScenarioPublicationLedgerV1 {
  readonly status:
    'draft' | 'auto-validated' | 'human-review-required' | 'approved' | 'published' | 'retired';
  readonly records: readonly ScenarioReviewRecordV1[];
  readonly blockers: readonly string[];
}

export interface ScenarioExpectedExecutionV1 {
  readonly direction: TradeDirection;
  readonly entryOrderType: EntryOrderType;
  readonly plan: TradePlanInput;
  readonly expectedStatus: PaperExecutionStatus;
  readonly requiredEvidence: readonly (
    | 'market-entry'
    | 'limit-entry'
    | 'stop-entry'
    | 'opening-gap'
    | 'protective-stop'
    | 'target'
    | 'unfilled-order'
    | 'ambiguity'
  )[];
  readonly expectedSnapshot: ScenarioExecutionSnapshotV1;
}

export interface ScenarioExecutionEventFactV1 {
  readonly sequence: number;
  readonly type: string;
  readonly candleIndex?: number;
  readonly fill?: {
    readonly referencePrice: number;
    readonly price: number;
    readonly commission: number;
    readonly gap: boolean;
    readonly priceCappedByLimit: boolean;
  };
}

export interface ScenarioExecutionSnapshotV1 {
  readonly schemaVersion: 1;
  readonly terminalStatus: PaperExecutionStatus;
  readonly workingOrderStatus?: string;
  readonly positionStatus?: string;
  readonly events: readonly ScenarioExecutionEventFactV1[];
  readonly debrief?: {
    readonly outcome: 'protective-stop' | 'target' | 'ambiguous';
    readonly outcomeDeterminate: boolean;
    readonly totalCommissions: number;
    readonly modeledSpreadAndSlippage: number;
    readonly netSimulatedOutcome?: number;
    readonly riskMultiple?: number;
    readonly ambiguityReason?: string;
  };
  readonly checksum: Sha256Checksum;
}

export interface ScenarioAuthoringManifestV1 {
  readonly schemaVersion: typeof SCENARIO_AUTHORING_SCHEMA_VERSION;
  readonly compilerVersion: typeof SCENARIO_COMPILER_VERSION;
  readonly compilerContractChecksum: Sha256Checksum;
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly titleHe: string;
  readonly difficulty: ScenarioDifficulty;
  readonly prerequisites: {
    readonly exerciseIds: readonly string[];
    readonly conceptIds: readonly string[];
  };
  readonly source: ScenarioDoctrineSourceV1;
  readonly chartSpec: ChartSpec;
  readonly chartSpecChecksum: Sha256Checksum;
  /** Pins the canonical generated candle artifact, not merely the generator inputs. */
  readonly generatedDatasetChecksum: Sha256Checksum;
  readonly decisionCandleIndex: number;
  readonly initialVisibleRange: {
    readonly startCandleIndex: number;
    readonly endCandleIndex: number;
  };
  readonly permittedReplayBoundaryIndex: number;
  readonly knowledgeCutoffIndex: number;
  readonly promptHe: string;
  readonly blindEvidenceSummaryHe: string;
  readonly hintsHe: readonly string[];
  readonly accessibility: {
    readonly chartDescriptionHe: string;
    readonly interactionInstructionsHe: string;
    readonly preservesBlindness: true;
  };
  readonly financialSafetyDisclosureHe: string;
  readonly replayPolicy: { readonly blind: true; readonly reveal: 'after-finalization' };
  readonly guidedAnalysis: {
    readonly enabled: boolean;
    readonly availableHintCount: number;
    readonly preservesDecisionCutoff: true;
  };
  readonly workflowPromptsHe: Readonly<Record<WorkflowStepId, string>>;
  readonly processRubric: {
    readonly rubricId: string;
    readonly rubricVersion: string;
    readonly checksum: Sha256Checksum;
    readonly criteria: readonly {
      readonly workflowStepId: WorkflowStepId;
      readonly criterionHe: string;
      readonly expectedEvidenceHe: string;
    }[];
    readonly expectedDecision: HistoricalApplicationDecision;
    readonly requiredRationaleReasonIds: readonly string[];
    readonly scoring: {
      readonly executionStatusAffectsScore: false;
      readonly profitAndLossAffectsScore: false;
    };
  };
  readonly application: HistoricalApplicationDecision;
  readonly planConstraints?: {
    readonly permittedDirections: readonly TradeDirection[];
    readonly permittedEntryOrderTypes: readonly EntryOrderType[];
  };
  readonly expectedExecution?: ScenarioExpectedExecutionV1;
  readonly licensing: {
    readonly owner: 'ChartPath';
    readonly generatedDataOnly: true;
    readonly redistributionStatus: 'prohibited';
    readonly publicationStatus: 'internal';
  };
  readonly materialArtifactChecksum: Sha256Checksum;
  readonly publication: ScenarioPublicationLedgerV1;
  readonly reviewStates: Readonly<
    Record<'source' | 'accessibility' | 'hebrew' | 'financial-safety', 'pending' | 'approved'>
  >;
  readonly reviewFingerprint: Sha256Checksum;
  readonly retirement: ScenarioRetirement;
}

export interface CompiledScenarioCandidate {
  readonly manifest: ScenarioAuthoringManifestV1;
  readonly exercise: ScenarioLearnerExerciseProjection;
  /** Private deterministic answer key; never render or serialize into a learner-facing DTO. */
  readonly gradingExercise: ContentExercise;
  readonly dataset: HistoricalDataset;
  readonly scenario: HistoricalReplayScenario;
  readonly execution?: {
    readonly status: PaperExecutionStatus;
    readonly eventTypes: readonly string[];
    readonly evidence: readonly string[];
    readonly snapshot: ScenarioExecutionSnapshotV1;
  };
  readonly structuralIssues: readonly string[];
  readonly publicationBlockers: readonly string[];
}

export interface ScenarioLearnerExerciseProjection {
  readonly exerciseId: string;
  readonly promptHe: string;
  readonly safetyNoteHe: string;
  readonly accessibility: ScenarioAuthoringManifestV1['accessibility'];
  readonly steps: readonly {
    readonly id: WorkflowStepId;
    readonly promptHe: string;
    readonly options: readonly { readonly id: string; readonly labelHe: string }[];
    readonly reasonOptions: readonly { readonly id: string; readonly labelHe: string }[];
  }[];
}

export interface ScenarioLibraryReport {
  readonly valid: boolean;
  readonly publishable: false;
  readonly compilerVersion: typeof SCENARIO_COMPILER_VERSION;
  readonly candidates: readonly {
    readonly scenarioId: string;
    readonly scenarioVersion: string;
    readonly decision: HistoricalApplicationDecision;
    readonly datasetChecksum: Sha256Checksum;
    readonly materialArtifactChecksum: Sha256Checksum;
    readonly valid: boolean;
    readonly structuralIssues: readonly string[];
    readonly publicationBlockers: readonly string[];
    readonly source: ScenarioDoctrineSourceV1;
    readonly provenance: HistoricalDataset['manifest']['provenance'];
    readonly rubric: {
      readonly rubricId: string;
      readonly rubricVersion: string;
      readonly checksum: Sha256Checksum;
    };
    readonly expectedExecution?: ScenarioExpectedExecutionV1;
    readonly actualExecutionStatus?: PaperExecutionStatus;
    readonly executionEvidence: readonly string[];
  }[];
  readonly counts: {
    readonly total: number;
    readonly long: number;
    readonly short: number;
    readonly noTrade: number;
    readonly structuralErrors: number;
    readonly publicationBlockers: number;
  };
  readonly registryIssues: readonly string[];
}
