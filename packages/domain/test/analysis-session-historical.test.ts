import { describe, expect, it } from 'vitest';

import {
  ANALYSIS_SESSION_SCHEMA_VERSION,
  ANALYSIS_WORKFLOW_STEP_IDS,
  analysisChartIdentitiesEqual,
  assertCompatibleAnalysisChartIdentity,
  assertValidGuidedAnalysisSession,
  createGuidedAnalysisSession,
  learnerAnnotationsVisibleAtCursor,
  reduceGuidedAnalysisSession,
  type AnalysisWorkflowStepId,
  type AtomicAnswerRubric,
  type GuidedAnalysisSession,
  type HistoricalAnalysisChartIdentity,
  type LearnerChartAnnotation,
  type SyntheticAnalysisChartIdentity,
} from '../src/index.js';

const BASE_TIME = Date.parse('2026-08-24T12:00:00.000Z');

function at(second: number): string {
  return new Date(BASE_TIME + second * 1_000).toISOString();
}

const STEP_RUBRICS = Object.fromEntries(
  ANALYSIS_WORKFLOW_STEP_IDS.map((stepId) => [
    stepId,
    { kind: 'multiple-choice', acceptedOptionIds: [`answer-${stepId}`] },
  ]),
) as unknown as Readonly<Record<AnalysisWorkflowStepId, AtomicAnswerRubric>>;

function historicalIdentity(
  overrides: Partial<HistoricalAnalysisChartIdentity> = {},
): HistoricalAnalysisChartIdentity {
  return {
    kind: 'historical',
    id: 'historical-chart-001',
    scenarioId: 'historical-scenario-001',
    scenarioVersion: 'scenario-v1',
    datasetId: 'historical-dataset-001',
    datasetVersion: 'dataset-v1',
    canonicalChecksum: `sha256:${'a'.repeat(64)}`,
    candleCount: 12,
    interval: '1d',
    firstCandleTimestamp: '2025-01-02T14:30:00.000Z',
    lastCandleTimestamp: '2025-01-17T14:30:00.000Z',
    decisionCandleIndex: 8,
    learningCredit: 'none',
    ...overrides,
  };
}

function historicalSession(
  chart: HistoricalAnalysisChartIdentity = historicalIdentity(),
): GuidedAnalysisSession {
  return createGuidedAnalysisSession({
    sessionId: 'historical-session-001',
    attemptId: 'historical-attempt-001',
    finalizationIdempotencyKey: 'historical-finalization-001',
    exerciseId: 'u10-capstone-e03',
    contentVersionId: '2026.08-beta.1',
    exerciseSchemaVersion: 1,
    chart,
    createdAt: at(0),
    initialReplayCursorCandleIndex: 3,
    workflowStepIds: ANALYSIS_WORKFLOW_STEP_IDS,
    stepRubrics: STEP_RUBRICS,
  });
}

const earlyPoint: LearnerChartAnnotation = {
  id: 'early-point',
  kind: 'point',
  anchor: { candleIndex: 2, price: 101 },
  authoredAtCursorCandleIndex: 3,
};

describe('historical analysis identity', () => {
  it('creates a schema-v2 session with a fully pinned historical identity', () => {
    const session = historicalSession();

    expect(ANALYSIS_SESSION_SCHEMA_VERSION).toBe(2);
    expect(session).toMatchObject({
      schemaVersion: 2,
      chart: historicalIdentity(),
      replay: {
        initialCursorCandleIndex: 3,
        cursorCandleIndex: 3,
        maxCursorSeenCandleIndex: 3,
        decisionCandleIndex: 8,
      },
    });
  });

  it.each([
    ['checksum algorithm', { canonicalChecksum: `fnv:${'a'.repeat(64)}` }, 'SHA-256'],
    ['uppercase checksum', { canonicalChecksum: `sha256:${'A'.repeat(64)}` }, 'SHA-256'],
    ['scenario version', { scenarioVersion: '' }, 'scenario version'],
    ['dataset version', { datasetVersion: '' }, 'dataset version'],
    ['interval', { interval: '' }, 'interval'],
    ['first timestamp', { firstCandleTimestamp: '2025-01-02' }, 'canonical UTC'],
    [
      'timestamp order',
      {
        firstCandleTimestamp: '2025-01-18T14:30:00.000Z',
        lastCandleTimestamp: '2025-01-17T14:30:00.000Z',
      },
      'must not follow',
    ],
    ['learning credit', { learningCredit: 'bonus' }, 'learning credit'],
  ] as const)('rejects invalid historical %s', (_label, override, message) => {
    expect(() =>
      historicalSession(
        historicalIdentity(override as unknown as Partial<HistoricalAnalysisChartIdentity>),
      ),
    ).toThrow(message);
  });

  it.each([
    ['scenario ID', { scenarioId: 'historical-scenario-002' }],
    ['scenario version', { scenarioVersion: 'scenario-v2' }],
    ['dataset ID', { datasetId: 'historical-dataset-002' }],
    ['dataset version', { datasetVersion: 'dataset-v2' }],
    ['canonical checksum', { canonicalChecksum: `sha256:${'b'.repeat(64)}` }],
    ['candle count', { candleCount: 13 }],
    ['decision cutoff', { decisionCandleIndex: 7 }],
    ['learning credit', { learningCredit: 'course' }],
  ] as const)('detects a restored %s mismatch', (_label, override) => {
    const pinned = historicalIdentity();
    const available = historicalIdentity(
      override as unknown as Partial<HistoricalAnalysisChartIdentity>,
    );
    expect(analysisChartIdentitiesEqual(pinned, available)).toBe(false);
    expect(() => assertCompatibleAnalysisChartIdentity(pinned, available)).toThrow(
      'does not match',
    );
  });

  it('rejects a synthetic source for a historical pin and accepts an exact clone', () => {
    const pinned = historicalIdentity();
    const synthetic: SyntheticAnalysisChartIdentity = {
      kind: 'synthetic',
      id: pinned.id,
      seed: 1,
      generatorVersion: '1.0.0',
      candleCount: pinned.candleCount,
      decisionCandleIndex: pinned.decisionCandleIndex,
    };
    expect(() => assertCompatibleAnalysisChartIdentity(pinned, synthetic)).toThrow(
      'does not match',
    );
    expect(analysisChartIdentitiesEqual(pinned, { ...pinned })).toBe(true);
    expect(() => assertCompatibleAnalysisChartIdentity(pinned, { ...pinned })).not.toThrow();
  });

  it('rejects schema-v1 records so persistence must migrate them explicitly', () => {
    expect(() =>
      assertValidGuidedAnalysisSession({ ...historicalSession(), schemaVersion: 1 } as never),
    ).toThrow('Unsupported analysis session schema version');
  });
});

describe('historical replay high-water state', () => {
  it('tracks forward progress monotonically while allowing safe backward replay', () => {
    let session = reduceGuidedAnalysisSession(historicalSession(), {
      type: 'set-replay-cursor',
      cursorCandleIndex: 7,
      updatedAt: at(1),
    });
    expect(session.replay).toMatchObject({
      initialCursorCandleIndex: 3,
      cursorCandleIndex: 7,
      maxCursorSeenCandleIndex: 7,
      decisionCandleIndex: 8,
    });

    session = reduceGuidedAnalysisSession(session, {
      type: 'set-replay-cursor',
      cursorCandleIndex: 5,
      updatedAt: at(2),
    });
    expect(session.replay.cursorCandleIndex).toBe(5);
    expect(session.replay.maxCursorSeenCandleIndex).toBe(7);

    session = reduceGuidedAnalysisSession(session, {
      type: 'set-replay-cursor',
      cursorCandleIndex: 8,
      updatedAt: at(3),
    });
    expect(session.replay.maxCursorSeenCandleIndex).toBe(8);
  });

  it('rejects cursors before the initial boundary or after the decision cutoff', () => {
    const session = historicalSession();
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'set-replay-cursor',
        cursorCandleIndex: 2,
        updatedAt: at(1),
      }),
    ).toThrow('decision-safe');
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'set-replay-cursor',
        cursorCandleIndex: 9,
        updatedAt: at(1),
      }),
    ).toThrow('decision-safe');
  });

  it('rejects corrupt cursor, maximum, and decision relationships', () => {
    const session = historicalSession();
    expect(() =>
      assertValidGuidedAnalysisSession({
        ...session,
        replay: { ...session.replay, cursorCandleIndex: 2 },
      }),
    ).toThrow('decision-safe');
    expect(() =>
      assertValidGuidedAnalysisSession({
        ...session,
        replay: { ...session.replay, cursorCandleIndex: 5, maxCursorSeenCandleIndex: 4 },
      }),
    ).toThrow('maximum cursor');
    expect(() =>
      assertValidGuidedAnalysisSession({
        ...session,
        replay: { ...session.replay, maxCursorSeenCandleIndex: 9 },
      }),
    ).toThrow('maximum cursor');
  });
});

describe('historical annotation knowledge boundaries', () => {
  it('requires authorship at the current cursor and geometry no later than that cursor', () => {
    const session = historicalSession();
    const withoutAuthorship = { ...earlyPoint, authoredAtCursorCandleIndex: undefined };
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'replace-annotations',
        annotations: [withoutAuthorship],
        updatedAt: at(1),
      }),
    ).toThrow('authored replay cursor');
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'replace-annotations',
        annotations: [{ ...earlyPoint, authoredAtCursorCandleIndex: 2 }],
        updatedAt: at(1),
      }),
    ).toThrow('current cursor');
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'replace-annotations',
        annotations: [
          {
            id: 'future-point',
            kind: 'point',
            anchor: { candleIndex: 4, price: 102 },
            authoredAtCursorCandleIndex: 3,
          },
        ],
        updatedAt: at(1),
      }),
    ).toThrow('authorship cursor');
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'replace-annotations',
        annotations: [{ ...earlyPoint, authoredAtCursorCandleIndex: 4 }],
        updatedAt: at(1),
      }),
    ).toThrow('beyond replay history');
  });

  it('retains hindsight-authored geometry but hides it when projecting an earlier cursor', () => {
    let session = reduceGuidedAnalysisSession(historicalSession(), {
      type: 'replace-annotations',
      annotations: [earlyPoint],
      updatedAt: at(1),
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'set-replay-cursor',
      cursorCandleIndex: 7,
      updatedAt: at(2),
    });
    const laterPoint: LearnerChartAnnotation = {
      id: 'later-point',
      kind: 'point',
      anchor: { candleIndex: 4, price: 103 },
      authoredAtCursorCandleIndex: 7,
    };
    session = reduceGuidedAnalysisSession(session, {
      type: 'replace-annotations',
      annotations: [earlyPoint, laterPoint],
      updatedAt: at(3),
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'set-replay-cursor',
      cursorCandleIndex: 5,
      updatedAt: at(4),
    });

    expect(session.annotations).toEqual([earlyPoint, laterPoint]);
    expect(learnerAnnotationsVisibleAtCursor(session.annotations, 5)).toEqual([earlyPoint]);
    expect(learnerAnnotationsVisibleAtCursor(session.annotations, 7)).toEqual([
      earlyPoint,
      laterPoint,
    ]);
    expect(() =>
      reduceGuidedAnalysisSession(session, {
        type: 'replace-annotations',
        annotations: [earlyPoint, { ...laterPoint, anchor: { ...laterPoint.anchor, price: 104 } }],
        updatedAt: at(5),
      }),
    ).toThrow('current cursor');
  });

  it('rejects a persisted authorship cursor beyond the replay high-water mark', () => {
    const session = historicalSession();
    expect(() =>
      assertValidGuidedAnalysisSession({
        ...session,
        annotations: [{ ...earlyPoint, authoredAtCursorCandleIndex: 4 }],
      }),
    ).toThrow('beyond replay history');
  });
});

describe('historical replay checkpoint integrity', () => {
  function sessionWithTwoCheckpoints(): GuidedAnalysisSession {
    let session = reduceGuidedAnalysisSession(historicalSession(), {
      type: 'replace-annotations',
      annotations: [earlyPoint],
      updatedAt: at(1),
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'set-replay-cursor',
      cursorCandleIndex: 7,
      updatedAt: at(2),
    });
    const hindsightPoint: LearnerChartAnnotation = {
      id: 'hindsight-point',
      kind: 'point',
      anchor: { candleIndex: 4, price: 102 },
      authoredAtCursorCandleIndex: 7,
    };
    session = reduceGuidedAnalysisSession(session, {
      type: 'replace-annotations',
      annotations: [earlyPoint, hindsightPoint],
      updatedAt: at(3),
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'set-replay-cursor',
      cursorCandleIndex: 5,
      updatedAt: at(4),
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'add-replay-checkpoint',
      checkpoint: { id: 'checkpoint-1', stepId: 'context', capturedAt: at(5) },
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'set-replay-cursor',
      cursorCandleIndex: 6,
      updatedAt: at(6),
    });
    return reduceGuidedAnalysisSession(session, {
      type: 'add-replay-checkpoint',
      checkpoint: { id: 'checkpoint-2', stepId: 'structure', capturedAt: at(7) },
    });
  }

  it('creates contiguous checkpoints with high-water state and exact safe snapshots', () => {
    const session = sessionWithTwoCheckpoints();
    expect(session.replay.checkpoints).toEqual([
      {
        id: 'checkpoint-1',
        sequence: 1,
        stepId: 'context',
        cursorCandleIndex: 5,
        maxCursorSeenCandleIndex: 7,
        annotations: [earlyPoint],
        capturedAt: at(5),
      },
      {
        id: 'checkpoint-2',
        sequence: 2,
        stepId: 'structure',
        cursorCandleIndex: 6,
        maxCursorSeenCandleIndex: 7,
        annotations: [earlyPoint],
        capturedAt: at(7),
      },
    ]);
  });

  it('rejects noncontiguous sequence, regressing high-water, timestamp disorder, and unsafe geometry', () => {
    const session = sessionWithTwoCheckpoints();
    const [first, second] = session.replay.checkpoints;
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    expect(() =>
      assertValidGuidedAnalysisSession({
        ...session,
        replay: {
          ...session.replay,
          checkpoints: [first!, { ...second!, sequence: 3 }],
        },
      }),
    ).toThrow('contiguous');
    expect(() =>
      assertValidGuidedAnalysisSession({
        ...session,
        replay: {
          ...session.replay,
          checkpoints: [first!, { ...second!, maxCursorSeenCandleIndex: 6 }],
        },
      }),
    ).toThrow('non-monotonic');
    expect(() =>
      assertValidGuidedAnalysisSession({
        ...session,
        replay: {
          ...session.replay,
          checkpoints: [first!, { ...second!, capturedAt: at(4) }],
        },
      }),
    ).toThrow('timestamps must be monotonic');
    expect(() =>
      assertValidGuidedAnalysisSession({
        ...session,
        replay: {
          ...session.replay,
          checkpoints: [
            { ...first!, annotations: [...first!.annotations, session.annotations[1]!] },
            second!,
          ],
        },
      }),
    ).toThrow('unavailable at its cursor');
  });
});

describe('synthetic schema-v2 compatibility', () => {
  it('keeps synthetic annotations optional and checkpoint projection geometry-based', () => {
    const synthetic: SyntheticAnalysisChartIdentity = {
      kind: 'synthetic',
      id: 'synthetic-chart',
      seed: 42,
      generatorVersion: '1.0.0',
      candleCount: 20,
      decisionCandleIndex: 8,
    };
    let session = createGuidedAnalysisSession({
      sessionId: 'synthetic-session',
      attemptId: 'synthetic-attempt',
      finalizationIdempotencyKey: 'synthetic-finalization',
      exerciseId: 'u10-capstone-e03',
      contentVersionId: '2026.08-beta.1',
      exerciseSchemaVersion: 1,
      chart: synthetic,
      createdAt: at(0),
      initialReplayCursorCandleIndex: 3,
      stepRubrics: STEP_RUBRICS,
    });
    const annotation: LearnerChartAnnotation = {
      id: 'legacy-style-point',
      kind: 'point',
      anchor: { candleIndex: 2, price: 100 },
    };
    session = reduceGuidedAnalysisSession(session, {
      type: 'replace-annotations',
      annotations: [annotation],
      updatedAt: at(1),
    });
    session = reduceGuidedAnalysisSession(session, {
      type: 'add-replay-checkpoint',
      checkpoint: { id: 'synthetic-checkpoint', stepId: 'context', capturedAt: at(2) },
    });
    expect(session.annotations).toEqual([annotation]);
    expect(session.replay.checkpoints[0]?.annotations).toEqual([annotation]);
  });
});
