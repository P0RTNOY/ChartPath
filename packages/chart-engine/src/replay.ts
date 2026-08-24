import type { GeneratedChart, LearnerChartAnnotation } from '@chartpath/domain';
import { learnerAnnotationLastCandleIndex } from '@chartpath/domain';

import { sliceChartAt, type DecisionChartSlice } from './decision.js';

export interface ReplayDrawingSnapshot {
  readonly visibleCandleIndex: number;
  readonly annotations: readonly LearnerChartAnnotation[];
}

export interface ReplayState {
  readonly chartId: string;
  readonly sourceCandleCount: number;
  readonly initialVisibleCandleCount: number;
  readonly visibleCandleIndex: number;
  readonly decisionCandleIndex: number;
  readonly fixedGroupSize: number;
  readonly learnerAnnotations: readonly LearnerChartAnnotation[];
  readonly drawingSnapshots: readonly ReplayDrawingSnapshot[];
}

export type ReplayAction =
  | { readonly type: 'reset' }
  | { readonly type: 'next' }
  | { readonly type: 'fixed-group' }
  | { readonly type: 'to-decision' }
  | { readonly type: 'set-drawings'; readonly annotations: readonly LearnerChartAnnotation[] }
  | { readonly type: 'snapshot-drawings' };

export interface ReplayOptions {
  readonly initialVisibleCandleCount: number;
  readonly decisionCandleIndex?: number;
  readonly fixedGroupSize?: number;
  readonly learnerAnnotations?: readonly LearnerChartAnnotation[];
}

export interface ReplayChartSlice extends DecisionChartSlice {
  readonly learnerAnnotations: readonly LearnerChartAnnotation[];
}

export function createReplayState(chart: GeneratedChart, options: ReplayOptions): ReplayState {
  const sourceCandleCount = chart.candles.length;
  if (sourceCandleCount === 0) throw new RangeError('Replay requires at least one candle');
  if (
    !Number.isInteger(options.initialVisibleCandleCount) ||
    options.initialVisibleCandleCount < 1
  ) {
    throw new RangeError('Initial visible candle count must be a positive integer');
  }
  const decisionCandleIndex =
    options.decisionCandleIndex ?? chart.spec.decisionCandleIndex ?? sourceCandleCount - 1;
  if (
    !Number.isInteger(decisionCandleIndex) ||
    decisionCandleIndex < 0 ||
    decisionCandleIndex >= sourceCandleCount
  ) {
    throw new RangeError('Decision candle index must refer to a source candle');
  }
  if (options.initialVisibleCandleCount > decisionCandleIndex + 1) {
    throw new RangeError('Initial visible candles must not cross the decision cutoff');
  }
  const fixedGroupSize = options.fixedGroupSize ?? 3;
  if (!Number.isInteger(fixedGroupSize) || fixedGroupSize < 1) {
    throw new RangeError('Fixed replay group size must be a positive integer');
  }
  const learnerAnnotations = [...(options.learnerAnnotations ?? [])];
  return {
    chartId: chart.spec.id,
    sourceCandleCount,
    initialVisibleCandleCount: options.initialVisibleCandleCount,
    visibleCandleIndex: options.initialVisibleCandleCount - 1,
    decisionCandleIndex,
    fixedGroupSize,
    learnerAnnotations,
    drawingSnapshots: [],
  };
}

export function reduceReplayState(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case 'reset':
      return moveReplayTo(state, state.initialVisibleCandleCount - 1);
    case 'next':
      return moveReplayTo(state, state.visibleCandleIndex + 1);
    case 'fixed-group':
      return moveReplayTo(state, state.visibleCandleIndex + state.fixedGroupSize);
    case 'to-decision':
      return moveReplayTo(state, state.decisionCandleIndex);
    case 'set-drawings':
      return { ...state, learnerAnnotations: [...action.annotations] };
    case 'snapshot-drawings':
      return snapshotReplayDrawings(state);
  }
}

/** Slices both curated semantics and learner geometry at the exact replay boundary. */
export function replayChartSlice(chart: GeneratedChart, state: ReplayState): ReplayChartSlice {
  if (chart.spec.id !== state.chartId || chart.candles.length !== state.sourceCandleCount) {
    throw new Error('Replay state does not belong to this chart');
  }
  if (state.visibleCandleIndex > state.decisionCandleIndex) {
    throw new RangeError('Replay state crosses the authored decision cutoff');
  }
  const slice = sliceChartAt(chart, state.visibleCandleIndex);
  return {
    ...slice,
    learnerAnnotations: learnerAnnotationsVisibleAt(
      state.learnerAnnotations,
      state.visibleCandleIndex,
    ),
  };
}

export function learnerAnnotationsVisibleAt(
  annotations: readonly LearnerChartAnnotation[],
  visibleCandleIndex: number,
): readonly LearnerChartAnnotation[] {
  if (!Number.isInteger(visibleCandleIndex) || visibleCandleIndex < 0) {
    throw new RangeError('Visible candle index must be a non-negative integer');
  }
  return annotations.filter(
    (annotation) => learnerAnnotationLastCandleIndex(annotation) <= visibleCandleIndex,
  );
}

function moveReplayTo(state: ReplayState, requestedIndex: number): ReplayState {
  const visibleCandleIndex = Math.max(
    state.initialVisibleCandleCount - 1,
    Math.min(state.decisionCandleIndex, requestedIndex),
  );
  if (visibleCandleIndex === state.visibleCandleIndex) return state;
  return snapshotReplayDrawings({ ...state, visibleCandleIndex });
}

function snapshotReplayDrawings(state: ReplayState): ReplayState {
  const snapshot: ReplayDrawingSnapshot = {
    visibleCandleIndex: state.visibleCandleIndex,
    annotations: [...state.learnerAnnotations],
  };
  const drawingSnapshots = state.drawingSnapshots.filter(
    ({ visibleCandleIndex }) => visibleCandleIndex !== state.visibleCandleIndex,
  );
  return { ...state, drawingSnapshots: [...drawingSnapshots, snapshot] };
}
