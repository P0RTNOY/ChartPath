import {
  DEVELOPMENT_HISTORICAL_DATASET,
  DEVELOPMENT_HISTORICAL_SCENARIO,
  historicalContentRegistry,
  type HistoricalContentRegistry,
} from '@chartpath/content';
import type { GuidedAnalysisSession } from '@chartpath/domain';

import {
  historicalChartEvidence,
  resolveHistoricalAnalysisSession,
  resolveHistoricalReplayScenario,
} from './historical-replay';

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

function registry(): Mutable<HistoricalContentRegistry> {
  return structuredClone(historicalContentRegistry) as Mutable<HistoricalContentRegistry>;
}

function historicalSession(
  chart: Extract<GuidedAnalysisSession['chart'], { kind: 'historical' }>,
): GuidedAnalysisSession {
  return {
    schemaVersion: 2,
    revision: 0,
    sessionId: 'test-historical-session',
    attemptId: 'test-historical-attempt',
    finalizationIdempotencyKey: 'test-historical-finalization',
    exerciseId: DEVELOPMENT_HISTORICAL_SCENARIO.educationalContentId,
    contentVersionId: 'test-content',
    exerciseSchemaVersion: 1,
    chart,
    status: 'active',
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    currentStepId: 'context',
    steps: {} as GuidedAnalysisSession['steps'],
    annotations: [],
    replay: {
      initialCursorCandleIndex: 23,
      cursorCandleIndex: 23,
      maxCursorSeenCandleIndex: 23,
      decisionCandleIndex: 72,
      checkpoints: [],
    },
  };
}

describe('pure historical replay data resolution', () => {
  it('pins exact canonical metadata and exposes only decision-bounded grading evidence', () => {
    const resolved = resolveHistoricalReplayScenario(DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId);
    expect(resolved.status).toBe('ready');
    if (resolved.status !== 'ready') return;
    expect(resolved.chartIdentity).toMatchObject({
      kind: 'historical',
      scenarioId: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId,
      scenarioVersion: DEVELOPMENT_HISTORICAL_SCENARIO.scenarioVersion,
      datasetId: DEVELOPMENT_HISTORICAL_DATASET.manifest.datasetId,
      datasetVersion: DEVELOPMENT_HISTORICAL_DATASET.manifest.datasetVersion,
      canonicalChecksum: DEVELOPMENT_HISTORICAL_DATASET.manifest.canonicalChecksum,
      candleCount: 96,
      interval: 'hour:1:3600000',
      firstCandleTimestamp: DEVELOPMENT_HISTORICAL_DATASET.candles[0]?.timestampUtc,
      lastCandleTimestamp: DEVELOPMENT_HISTORICAL_DATASET.candles.at(-1)?.timestampUtc,
      decisionCandleIndex: 72,
      learningCredit: 'none',
    });
    expect(resolved.initialKnowledgeView.candles).toHaveLength(24);
    expect(resolved.chartEvidence.candles).toHaveLength(73);
    expect(resolved.chartEvidence.candles.at(-1)?.index).toBe(72);
    expect(resolved.chartEvidence.candles[0]?.timestamp).toBe(
      DEVELOPMENT_HISTORICAL_DATASET.candles[0]?.timestampUtc,
    );
  });

  it('fails closed for missing scenario, missing dataset, checksum mismatch, and modified bytes', () => {
    expect(resolveHistoricalReplayScenario('missing', { datasets: [], scenarios: [] }).status).toBe(
      'scenario-missing',
    );

    const missingDataset = registry();
    missingDataset.datasets = [];
    expect(
      resolveHistoricalReplayScenario(DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId, missingDataset)
        .status,
    ).toBe('dataset-missing');

    const checksum = registry();
    checksum.datasets[0]!.manifest.canonicalChecksum = `sha256:${'a'.repeat(64)}`;
    expect(
      resolveHistoricalReplayScenario(DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId, checksum).status,
    ).toBe('checksum-mismatch');

    const modified = registry();
    modified.datasets[0]!.candles[0]!.close += 0.01;
    expect(
      resolveHistoricalReplayScenario(DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId, modified).status,
    ).toBe('dataset-modified');
  });

  it('resolves a session only when every persisted identity field matches', () => {
    const ready = resolveHistoricalReplayScenario(DEVELOPMENT_HISTORICAL_SCENARIO.scenarioId);
    if (ready.status !== 'ready') throw new Error('Fixture must resolve');
    const session = historicalSession(ready.chartIdentity);
    expect(resolveHistoricalAnalysisSession(session).status).toBe('ready');

    const checksum = historicalSession({
      ...ready.chartIdentity,
      canonicalChecksum: `sha256:${'b'.repeat(64)}`,
    });
    expect(resolveHistoricalAnalysisSession(checksum).status).toBe('checksum-mismatch');

    const metadata = historicalSession({ ...ready.chartIdentity, candleCount: 95 });
    expect(resolveHistoricalAnalysisSession(metadata).status).toBe('metadata-mismatch');
  });

  it('converts candles without mutating canonical data or including future evidence', () => {
    const before = JSON.stringify(DEVELOPMENT_HISTORICAL_DATASET);
    const evidence = historicalChartEvidence(DEVELOPMENT_HISTORICAL_DATASET, 40);
    expect(evidence.candles).toHaveLength(41);
    expect(evidence.candles.at(-1)?.index).toBe(40);
    expect(JSON.stringify(DEVELOPMENT_HISTORICAL_DATASET)).toBe(before);
  });
});
