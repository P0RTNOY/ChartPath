import {
  analysisChartIdentitiesEqual,
  type GuidedAnalysisSession,
  type PaperExecutionSession,
  type PositionManagementSession,
} from '@chartpath/domain';
import { sha256Hex, type Sha256Checksum } from '@chartpath/historical-data';

import {
  RECOVERY_CATEGORIES,
  type RecoveryCategory,
  type RecoveryPayloadCountsV1,
  type RecoveryPayloadV1,
} from '../recovery/types';
import { localDateForTimestamp, replayAttempts } from './projections';
import type {
  PersistenceSnapshot,
  QuarantinedAnalysisSession,
  QuarantinedPaperExecutionSession,
  QuarantinedPositionManagementSession,
} from './types';
import { canonicalStringify, normalizeSettings } from './validation';

export type RecoveryImportConflictCode =
  | 'stable-id-conflict'
  | 'secondary-identity-conflict'
  | 'logical-identity-conflict'
  | 'missing-ancestry'
  | 'ancestry-mismatch';

export interface RecoveryImportConflict {
  readonly category: RecoveryCategory;
  readonly stableId: string;
  readonly code: RecoveryImportConflictCode;
  readonly message: string;
}

export interface RecoveryImportPlan {
  readonly bundleId: string;
  readonly payloadChecksum: Sha256Checksum;
  readonly currentSnapshotChecksum: Sha256Checksum;
  readonly planToken: Sha256Checksum;
  readonly selectedCategories: readonly RecoveryCategory[];
  readonly incoming: RecoveryPayloadCountsV1;
  readonly added: RecoveryPayloadCountsV1;
  readonly unchanged: RecoveryPayloadCountsV1;
  readonly conflicts: readonly RecoveryImportConflict[];
  readonly canApply: boolean;
  readonly hasChanges: boolean;
}

export interface PreviewRecoveryImportOptions {
  readonly selectedCategories?: readonly RecoveryCategory[];
}

export interface ApplyRecoveryImportInput {
  readonly selectedCategories: readonly RecoveryCategory[];
  readonly expectedPlanToken: string;
}

export interface ApplyRecoveryImportResult {
  readonly applied: boolean;
  readonly plan: RecoveryImportPlan;
  readonly snapshot: PersistenceSnapshot;
}

export class RecoveryImportConflictError extends Error {
  public constructor(public readonly conflicts: readonly RecoveryImportConflict[]) {
    super('Recovery import conflicts with immutable local learning data.');
    this.name = 'RecoveryImportConflictError';
  }
}

export class RecoveryImportStalePlanError extends Error {
  public constructor() {
    super('Local learning data changed after the recovery preview. Preview the bundle again.');
    this.name = 'RecoveryImportStalePlanError';
  }
}

interface MutableCounts {
  settings: 0 | 1;
  attempts: number;
  analysisSessions: number;
  paperExecutionSessions: number;
  positionManagementSessions: number;
  quarantineRecords: {
    analysisSessions: number;
    paperExecutionSessions: number;
    positionManagementSessions: number;
    total: number;
  };
}

function emptyCounts(): MutableCounts {
  return {
    settings: 0,
    attempts: 0,
    analysisSessions: 0,
    paperExecutionSessions: 0,
    positionManagementSessions: 0,
    quarantineRecords: {
      analysisSessions: 0,
      paperExecutionSessions: 0,
      positionManagementSessions: 0,
      total: 0,
    },
  };
}

function snapshotHasLearnerRecords(snapshot: PersistenceSnapshot): boolean {
  return (
    snapshot.attempts.length > 0 ||
    snapshot.analysisSessions.length > 0 ||
    snapshot.paperExecutionSessions.length > 0 ||
    snapshot.positionManagementSessions.length > 0 ||
    snapshot.quarantinedAnalysisSessions.length > 0 ||
    snapshot.quarantinedPaperExecutionSessions.length > 0 ||
    snapshot.quarantinedPositionManagementSessions.length > 0
  );
}

export function resolveRecoveryImportSelection(input: {
  readonly current: PersistenceSnapshot;
  readonly payload: RecoveryPayloadV1;
  readonly selectedCategories?: readonly RecoveryCategory[];
}): readonly RecoveryCategory[] {
  const requested =
    input.selectedCategories ??
    input.payload.includedCategories.filter(
      (category) => category !== 'settings' || !snapshotHasLearnerRecords(input.current),
    );
  if (requested.length === 0)
    throw new TypeError('Recovery import must select at least one included category.');
  if (new Set(requested).size !== requested.length)
    throw new TypeError('Recovery import categories must be unique.');
  if (
    requested.some(
      (category) =>
        !(RECOVERY_CATEGORIES as readonly string[]).includes(category) ||
        !input.payload.includedCategories.includes(category),
    )
  )
    throw new TypeError('Recovery import categories must be included in the recovery payload.');
  return Object.freeze(RECOVERY_CATEGORIES.filter((category) => requested.includes(category)));
}

function countsForSelectedData(
  data: RecoveryPayloadV1['data'],
  selectedCategories: readonly RecoveryCategory[],
): RecoveryPayloadCountsV1 {
  const counts = emptyCounts();
  if (selectedCategories.includes('settings') && data.settings) counts.settings = 1;
  if (selectedCategories.includes('attempts')) counts.attempts = data.attempts?.length ?? 0;
  if (selectedCategories.includes('analysis-sessions'))
    counts.analysisSessions = data.analysisSessions?.length ?? 0;
  if (selectedCategories.includes('paper-execution-sessions'))
    counts.paperExecutionSessions = data.paperExecutionSessions?.length ?? 0;
  if (selectedCategories.includes('position-management-sessions'))
    counts.positionManagementSessions = data.positionManagementSessions?.length ?? 0;
  if (selectedCategories.includes('quarantine-records')) {
    counts.quarantineRecords.analysisSessions =
      data.quarantineRecords?.analysisSessions.length ?? 0;
    counts.quarantineRecords.paperExecutionSessions =
      data.quarantineRecords?.paperExecutionSessions.length ?? 0;
    counts.quarantineRecords.positionManagementSessions =
      data.quarantineRecords?.positionManagementSessions.length ?? 0;
    counts.quarantineRecords.total =
      counts.quarantineRecords.analysisSessions +
      counts.quarantineRecords.paperExecutionSessions +
      counts.quarantineRecords.positionManagementSessions;
  }
  return counts;
}

function snapshotChecksum(snapshot: PersistenceSnapshot): Sha256Checksum {
  return `sha256:${sha256Hex(canonicalStringify(snapshot))}`;
}

function countQuarantine(
  counts: MutableCounts,
  kind: keyof Omit<MutableCounts['quarantineRecords'], 'total'>,
): void {
  counts.quarantineRecords[kind] += 1;
  counts.quarantineRecords.total += 1;
}

function mergeByStableId<T>(input: {
  readonly category: RecoveryCategory;
  readonly local: readonly T[];
  readonly incoming: readonly T[];
  readonly stableId: (record: T) => string;
  readonly onAdded: () => void;
  readonly onUnchanged: () => void;
  readonly conflicts: RecoveryImportConflict[];
}): readonly T[] {
  const records = [...input.local];
  const byId = new Map(records.map((record) => [input.stableId(record), record]));
  for (const record of input.incoming) {
    const stableId = input.stableId(record);
    const existing = byId.get(stableId);
    if (existing !== undefined) {
      if (canonicalStringify(existing) === canonicalStringify(record)) input.onUnchanged();
      else
        input.conflicts.push({
          category: input.category,
          stableId,
          code: 'stable-id-conflict',
          message: 'The same stable ID contains different immutable data.',
        });
      continue;
    }
    byId.set(stableId, record);
    records.push(record);
    input.onAdded();
  }
  return records;
}

function analysisIdentity(session: GuidedAnalysisSession): string {
  return canonicalStringify({
    chart: session.chart,
    contentVersionId: session.contentVersionId,
    exerciseId: session.exerciseId,
    exerciseSchemaVersion: session.exerciseSchemaVersion,
  });
}

function duplicateSecondaryIdentity(
  records: readonly { readonly sessionId: string }[],
  identity: (record: (typeof records)[number]) => string,
  category: RecoveryCategory,
  conflicts: RecoveryImportConflict[],
  code: RecoveryImportConflictCode = 'secondary-identity-conflict',
): void {
  const owners = new Map<string, string>();
  for (const record of records) {
    const key = identity(record);
    const owner = owners.get(key);
    if (owner !== undefined && owner !== record.sessionId) {
      conflicts.push({
        category,
        stableId: record.sessionId,
        code,
        message: `Stable identity is already owned by ${owner}.`,
      });
    } else owners.set(key, record.sessionId);
  }
}

function paperMatchesAnalysis(
  paper: PaperExecutionSession,
  analysis: GuidedAnalysisSession,
): boolean {
  return (
    analysis.status === 'finalized' &&
    analysis.chart.kind === 'historical' &&
    analysis.finalizedAt === paper.source.analysisFinalizedAt &&
    analysis.chart.datasetId === paper.source.datasetId &&
    analysis.chart.datasetVersion === paper.source.datasetVersion &&
    analysis.chart.canonicalChecksum === paper.source.canonicalChecksum &&
    analysis.chart.scenarioId === paper.source.scenarioId &&
    analysis.chart.scenarioVersion === paper.source.scenarioVersion &&
    analysis.chart.decisionCandleIndex === paper.source.decisionCandleIndex &&
    analysis.chart.candleCount === paper.source.candleCount &&
    analysis.chart.learningCredit === paper.source.learningCredit
  );
}

function assertCombinedGraph(
  attempts: PersistenceSnapshot['attempts'],
  analysisSessions: readonly GuidedAnalysisSession[],
  paperSessions: readonly PaperExecutionSession[],
  managementSessions: readonly PositionManagementSession[],
  conflicts: RecoveryImportConflict[],
): void {
  duplicateSecondaryIdentity(
    analysisSessions,
    (record) => (record as GuidedAnalysisSession).attemptId,
    'analysis-sessions',
    conflicts,
  );
  duplicateSecondaryIdentity(
    analysisSessions,
    (record) => (record as GuidedAnalysisSession).finalizationIdempotencyKey,
    'analysis-sessions',
    conflicts,
  );
  duplicateSecondaryIdentity(
    analysisSessions.filter(({ status }) => status === 'active'),
    (record) => analysisIdentity(record as GuidedAnalysisSession),
    'analysis-sessions',
    conflicts,
    'logical-identity-conflict',
  );

  for (const session of analysisSessions) {
    if (session.status !== 'finalized') continue;
    const receivesCourseCredit =
      session.chart.kind === 'synthetic' || session.chart.learningCredit === 'course';
    if (!receivesCourseCredit) continue;
    const attempt = attempts.find(({ attempt }) => attempt.id === session.attemptId);
    if (!attempt) {
      conflicts.push({
        category: 'analysis-sessions',
        stableId: session.sessionId,
        code: 'missing-ancestry',
        message: 'Credited finalized analysis has no exact immutable attempt.',
      });
      continue;
    }
    const chartMatches =
      session.chart.kind === 'synthetic'
        ? attempt.generatorVersion === session.chart.generatorVersion &&
          (attempt.analysisChartIdentity === undefined ||
            analysisChartIdentitiesEqual(session.chart, attempt.analysisChartIdentity))
        : attempt.analysisChartIdentity !== undefined &&
          analysisChartIdentitiesEqual(session.chart, attempt.analysisChartIdentity);
    if (
      attempt.attempt.exerciseId !== session.exerciseId ||
      attempt.attempt.contentVersionId !== session.contentVersionId ||
      attempt.exerciseVersion !== session.exerciseSchemaVersion ||
      canonicalStringify(attempt.attempt.result) !== canonicalStringify(session.finalResult) ||
      !chartMatches
    )
      conflicts.push({
        category: 'analysis-sessions',
        stableId: session.sessionId,
        code: 'ancestry-mismatch',
        message: 'Credited finalized analysis differs from its immutable attempt.',
      });
  }

  duplicateSecondaryIdentity(
    paperSessions,
    (record) => (record as PaperExecutionSession).orderId,
    'paper-execution-sessions',
    conflicts,
  );
  duplicateSecondaryIdentity(
    paperSessions,
    (record) => (record as PaperExecutionSession).positionId,
    'paper-execution-sessions',
    conflicts,
  );
  duplicateSecondaryIdentity(
    paperSessions,
    (record) => (record as PaperExecutionSession).debriefId,
    'paper-execution-sessions',
    conflicts,
  );
  duplicateSecondaryIdentity(
    paperSessions.filter(({ status }) => ['draft', 'working', 'open'].includes(status)),
    (record) => (record as PaperExecutionSession).source.analysisSessionId,
    'paper-execution-sessions',
    conflicts,
    'logical-identity-conflict',
  );
  for (const paper of paperSessions) {
    const analysis = analysisSessions.find(
      ({ sessionId }) => sessionId === paper.source.analysisSessionId,
    );
    if (!analysis)
      conflicts.push({
        category: 'paper-execution-sessions',
        stableId: paper.sessionId,
        code: 'missing-ancestry',
        message: 'Paper execution has no exact finalized analysis.',
      });
    else if (!paperMatchesAnalysis(paper, analysis))
      conflicts.push({
        category: 'paper-execution-sessions',
        stableId: paper.sessionId,
        code: 'ancestry-mismatch',
        message: 'Paper execution differs from its finalized analysis evidence.',
      });
  }

  duplicateSecondaryIdentity(
    managementSessions,
    (record) => (record as PositionManagementSession).handoff.sessionId,
    'position-management-sessions',
    conflicts,
    'logical-identity-conflict',
  );
  duplicateSecondaryIdentity(
    managementSessions,
    (record) => (record as PositionManagementSession).debriefId,
    'position-management-sessions',
    conflicts,
  );
  const journalEntryOwners = new Map<string, string>();
  for (const management of managementSessions) {
    const paper = paperSessions.find(({ sessionId }) => sessionId === management.handoff.sessionId);
    const analysis = paper
      ? analysisSessions.find(({ sessionId }) => sessionId === paper.source.analysisSessionId)
      : undefined;
    if (!paper)
      conflicts.push({
        category: 'position-management-sessions',
        stableId: management.sessionId,
        code: 'missing-ancestry',
        message: 'Position management has no exact paper execution handoff.',
      });
    else if (
      canonicalStringify(paper) !== canonicalStringify(management.handoff) ||
      !analysis ||
      !paperMatchesAnalysis(paper, analysis)
    )
      conflicts.push({
        category: 'position-management-sessions',
        stableId: management.sessionId,
        code: 'ancestry-mismatch',
        message: 'Position management differs from its exact paper or analysis handoff.',
      });
    for (const entry of management.journal) {
      const owner = journalEntryOwners.get(entry.entryId);
      if (owner !== undefined && owner !== management.sessionId)
        conflicts.push({
          category: 'position-management-sessions',
          stableId: entry.entryId,
          code: 'secondary-identity-conflict',
          message: `Journal entry ID is already owned by ${owner}.`,
        });
      else journalEntryOwners.set(entry.entryId, management.sessionId);
    }
  }
}

export function buildRecoveryImport(input: {
  readonly current: PersistenceSnapshot;
  readonly payload: RecoveryPayloadV1;
  readonly importedAt: string;
  readonly selectedCategories?: readonly RecoveryCategory[];
}): { readonly plan: RecoveryImportPlan; readonly snapshot: PersistenceSnapshot } {
  const { current, payload, importedAt } = input;
  const selectedCategories = resolveRecoveryImportSelection({
    current,
    payload,
    selectedCategories: input.selectedCategories,
  });
  const added = emptyCounts();
  const unchanged = emptyCounts();
  const conflicts: RecoveryImportConflict[] = [];
  const data = payload.data;

  let settings = current.settings;
  if (selectedCategories.includes('settings') && data.settings) {
    const portableCurrent = {
      theme: current.settings.theme,
      reducedMotion: current.settings.reducedMotion,
      hapticsEnabled: current.settings.hapticsEnabled,
      textScale: current.settings.textScale,
      dailyGoalMinutes: current.settings.dailyGoalMinutes,
    };
    if (canonicalStringify(portableCurrent) === canonicalStringify(data.settings))
      unchanged.settings = 1;
    else {
      settings = normalizeSettings({ ...current.settings, ...data.settings });
      added.settings = 1;
    }
  }

  const attempts = mergeByStableId({
    category: 'attempts',
    local: current.attempts,
    incoming: selectedCategories.includes('attempts') ? (data.attempts ?? []) : [],
    stableId: ({ attempt }) => attempt.id,
    onAdded: () => (added.attempts += 1),
    onUnchanged: () => (unchanged.attempts += 1),
    conflicts,
  });
  const analysisSessions = mergeByStableId({
    category: 'analysis-sessions',
    local: current.analysisSessions,
    incoming: selectedCategories.includes('analysis-sessions') ? (data.analysisSessions ?? []) : [],
    stableId: ({ sessionId }) => sessionId,
    onAdded: () => (added.analysisSessions += 1),
    onUnchanged: () => (unchanged.analysisSessions += 1),
    conflicts,
  });
  const paperExecutionSessions = mergeByStableId({
    category: 'paper-execution-sessions',
    local: current.paperExecutionSessions,
    incoming: selectedCategories.includes('paper-execution-sessions')
      ? (data.paperExecutionSessions ?? [])
      : [],
    stableId: ({ sessionId }) => sessionId,
    onAdded: () => (added.paperExecutionSessions += 1),
    onUnchanged: () => (unchanged.paperExecutionSessions += 1),
    conflicts,
  });
  const positionManagementSessions = mergeByStableId({
    category: 'position-management-sessions',
    local: current.positionManagementSessions,
    incoming: selectedCategories.includes('position-management-sessions')
      ? (data.positionManagementSessions ?? [])
      : [],
    stableId: ({ sessionId }) => sessionId,
    onAdded: () => (added.positionManagementSessions += 1),
    onUnchanged: () => (unchanged.positionManagementSessions += 1),
    conflicts,
  });
  const quarantine = selectedCategories.includes('quarantine-records')
    ? data.quarantineRecords
    : undefined;
  const quarantinedAnalysisSessions = mergeByStableId<QuarantinedAnalysisSession>({
    category: 'quarantine-records',
    local: current.quarantinedAnalysisSessions,
    incoming: quarantine?.analysisSessions ?? [],
    stableId: ({ quarantineId }) => quarantineId,
    onAdded: () => countQuarantine(added, 'analysisSessions'),
    onUnchanged: () => countQuarantine(unchanged, 'analysisSessions'),
    conflicts,
  });
  const quarantinedPaperExecutionSessions = mergeByStableId<QuarantinedPaperExecutionSession>({
    category: 'quarantine-records',
    local: current.quarantinedPaperExecutionSessions,
    incoming: quarantine?.paperExecutionSessions ?? [],
    stableId: ({ quarantineId }) => quarantineId,
    onAdded: () => countQuarantine(added, 'paperExecutionSessions'),
    onUnchanged: () => countQuarantine(unchanged, 'paperExecutionSessions'),
    conflicts,
  });
  const quarantinedPositionManagementSessions =
    mergeByStableId<QuarantinedPositionManagementSession>({
      category: 'quarantine-records',
      local: current.quarantinedPositionManagementSessions,
      incoming: quarantine?.positionManagementSessions ?? [],
      stableId: ({ quarantineId }) => quarantineId,
      onAdded: () => countQuarantine(added, 'positionManagementSessions'),
      onUnchanged: () => countQuarantine(unchanged, 'positionManagementSessions'),
      conflicts,
    });

  assertCombinedGraph(
    attempts,
    analysisSessions,
    paperExecutionSessions,
    positionManagementSessions,
    conflicts,
  );
  const hasChanges =
    added.settings === 1 ||
    added.attempts > 0 ||
    added.analysisSessions > 0 ||
    added.paperExecutionSessions > 0 ||
    added.positionManagementSessions > 0 ||
    added.quarantineRecords.total > 0;
  const currentChecksum = snapshotChecksum(current);
  const planMaterial = {
    bundleId: payload.bundleId,
    payloadChecksum: payload.payloadChecksum,
    currentSnapshotChecksum: currentChecksum,
    selectedCategories,
    added,
    unchanged,
    conflicts,
  };
  const plan: RecoveryImportPlan = {
    ...planMaterial,
    planToken: `sha256:${sha256Hex(canonicalStringify(planMaterial))}`,
    incoming: countsForSelectedData(data, selectedCategories),
    canApply: conflicts.length === 0,
    hasChanges,
  };
  const currentUpdatedAt = Date.parse(current.metadata.updatedAt);
  const requestedUpdatedAt = Date.parse(importedAt);
  const updatedAt =
    currentUpdatedAt >= requestedUpdatedAt ? current.metadata.updatedAt : importedAt;
  const snapshot: PersistenceSnapshot = hasChanges
    ? {
        ...current,
        metadata: { ...current.metadata, updatedAt },
        settings,
        attempts,
        analysisSessions,
        quarantinedAnalysisSessions,
        paperExecutionSessions,
        quarantinedPaperExecutionSessions,
        positionManagementSessions,
        quarantinedPositionManagementSessions,
        projections: replayAttempts(attempts, localDateForTimestamp(importedAt)),
      }
    : current;
  return { plan, snapshot };
}
