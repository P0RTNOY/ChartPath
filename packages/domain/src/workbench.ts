import type { ChartAnchor } from './types.js';

export type ChartTool =
  | { readonly kind: 'inspect' }
  | { readonly kind: 'point' }
  | { readonly kind: 'horizontal-level' }
  | { readonly kind: 'trendline' }
  | { readonly kind: 'zone' }
  | { readonly kind: 'select' };

interface BaseLearnerChartAnnotation {
  readonly id: string;
  /** Replay cursor at which the learner committed this geometry. */
  readonly authoredAtCursorCandleIndex?: number;
}

export interface LearnerPointAnnotation extends BaseLearnerChartAnnotation {
  readonly kind: 'point';
  readonly anchor: ChartAnchor;
}

export interface LearnerHorizontalLevelAnnotation extends BaseLearnerChartAnnotation {
  readonly kind: 'horizontal-level';
  /** The candle where the learner placed the level. */
  readonly candleIndex: number;
  readonly price: number;
}

export interface LearnerTrendlineAnnotation extends BaseLearnerChartAnnotation {
  readonly kind: 'trendline';
  readonly start: ChartAnchor;
  readonly end: ChartAnchor;
}

export interface LearnerZoneAnnotation extends BaseLearnerChartAnnotation {
  readonly kind: 'zone';
  readonly start: ChartAnchor;
  readonly end: ChartAnchor;
}

/** Learner-authored geometry. Screen pixels are deliberately not represented. */
export type LearnerChartAnnotation =
  | LearnerPointAnnotation
  | LearnerHorizontalLevelAnnotation
  | LearnerTrendlineAnnotation
  | LearnerZoneAnnotation;

export interface PendingTrendline {
  readonly kind: 'trendline';
  readonly id: string;
  readonly start: ChartAnchor;
  readonly authoredAtCursorCandleIndex?: number;
}

export interface PendingZone {
  readonly kind: 'zone';
  readonly id: string;
  readonly start: ChartAnchor;
  readonly authoredAtCursorCandleIndex?: number;
}

export type PendingDrawing = PendingTrendline | PendingZone;

export interface AnalysisDraftSnapshot {
  readonly annotations: readonly LearnerChartAnnotation[];
  readonly selectedAnnotationId?: string;
}

export interface AnalysisDraft {
  readonly activeTool: ChartTool;
  readonly annotations: readonly LearnerChartAnnotation[];
  readonly selectedAnnotationId?: string;
  readonly pendingDrawing?: PendingDrawing;
  readonly undoStack: readonly AnalysisDraftSnapshot[];
  readonly redoStack: readonly AnalysisDraftSnapshot[];
}

export type AnalysisDraftAction =
  | { readonly type: 'set-tool'; readonly tool: ChartTool }
  | {
      readonly type: 'place-anchor';
      readonly id: string;
      readonly anchor: ChartAnchor;
      readonly authoredAtCursorCandleIndex?: number;
    }
  | { readonly type: 'add-annotation'; readonly annotation: LearnerChartAnnotation }
  | { readonly type: 'select-annotation'; readonly id?: string }
  | { readonly type: 'cancel-drawing' }
  | { readonly type: 'delete-annotation'; readonly id: string }
  | { readonly type: 'clear' }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' };

export function createAnalysisDraft(
  activeTool: ChartTool = { kind: 'inspect' },
  annotations: readonly LearnerChartAnnotation[] = [],
): AnalysisDraft {
  assertUniqueAnnotationIds(annotations);
  annotations.forEach(assertValidLearnerAnnotation);
  return {
    activeTool,
    annotations: [...annotations],
    undoStack: [],
    redoStack: [],
  };
}

export function reduceAnalysisDraft(
  draft: AnalysisDraft,
  action: AnalysisDraftAction,
): AnalysisDraft {
  switch (action.type) {
    case 'set-tool':
      return {
        ...draft,
        activeTool: action.tool,
        selectedAnnotationId:
          action.tool.kind === 'select' ? draft.selectedAnnotationId : undefined,
        pendingDrawing: undefined,
      };
    case 'place-anchor':
      return placeAnchor(draft, action.id, action.anchor, action.authoredAtCursorCandleIndex);
    case 'add-annotation':
      assertValidLearnerAnnotation(action.annotation);
      if (draft.annotations.some(({ id }) => id === action.annotation.id)) {
        throw new Error(`Learner annotation ID already exists: ${action.annotation.id}`);
      }
      return commitDraft(draft, [...draft.annotations, action.annotation], action.annotation.id);
    case 'select-annotation':
      if (action.id !== undefined && !draft.annotations.some(({ id }) => id === action.id)) {
        throw new Error(`Cannot select unknown learner annotation: ${action.id}`);
      }
      return { ...draft, selectedAnnotationId: action.id, pendingDrawing: undefined };
    case 'cancel-drawing':
      return { ...draft, pendingDrawing: undefined };
    case 'delete-annotation': {
      const remaining = draft.annotations.filter(({ id }) => id !== action.id);
      if (remaining.length === draft.annotations.length) return draft;
      return commitDraft(
        draft,
        remaining,
        draft.selectedAnnotationId === action.id ? undefined : draft.selectedAnnotationId,
      );
    }
    case 'clear':
      if (draft.annotations.length === 0 && draft.pendingDrawing === undefined) return draft;
      return commitDraft(draft, [], undefined);
    case 'undo':
      return moveThroughHistory(draft, 'undo');
    case 'redo':
      return moveThroughHistory(draft, 'redo');
  }
}

/** True when there is at least one finished annotation and no unfinished gesture. */
export function isDrawingComplete(draft: AnalysisDraft): boolean {
  return draft.annotations.length > 0 && draft.pendingDrawing === undefined;
}

export function learnerAnnotationLastCandleIndex(annotation: LearnerChartAnnotation): number {
  switch (annotation.kind) {
    case 'point':
      return annotation.anchor.candleIndex;
    case 'horizontal-level':
      return annotation.candleIndex;
    case 'trendline':
    case 'zone':
      return Math.max(annotation.start.candleIndex, annotation.end.candleIndex);
  }
}

/**
 * Projects learner geometry using both its candle anchors and its authorship boundary.
 * This prevents an annotation drawn with hindsight from appearing at an earlier replay cursor.
 */
export function learnerAnnotationsVisibleAtCursor(
  annotations: readonly LearnerChartAnnotation[],
  cursorCandleIndex: number,
): readonly LearnerChartAnnotation[] {
  if (!Number.isInteger(cursorCandleIndex) || cursorCandleIndex < 0) {
    throw new RangeError('Replay cursor must be a non-negative integer');
  }
  return annotations.filter(
    (annotation) =>
      learnerAnnotationLastCandleIndex(annotation) <= cursorCandleIndex &&
      (annotation.authoredAtCursorCandleIndex ?? 0) <= cursorCandleIndex,
  );
}

function placeAnchor(
  draft: AnalysisDraft,
  id: string,
  anchor: ChartAnchor,
  authoredAtCursorCandleIndex?: number,
): AnalysisDraft {
  assertAnchor(anchor);
  if (
    authoredAtCursorCandleIndex !== undefined &&
    (!Number.isInteger(authoredAtCursorCandleIndex) ||
      authoredAtCursorCandleIndex < anchor.candleIndex)
  ) {
    throw new RangeError('Annotation authorship cursor must include its placed anchor');
  }
  if (id.length === 0) throw new Error('Learner annotation ID must not be empty');
  if (draft.annotations.some((annotation) => annotation.id === id)) {
    throw new Error(`Learner annotation ID already exists: ${id}`);
  }

  switch (draft.activeTool.kind) {
    case 'point':
      return commitDraft(
        draft,
        [
          ...draft.annotations,
          {
            id,
            kind: 'point',
            anchor,
            ...(authoredAtCursorCandleIndex === undefined ? {} : { authoredAtCursorCandleIndex }),
          },
        ],
        id,
      );
    case 'horizontal-level':
      return commitDraft(
        draft,
        [
          ...draft.annotations,
          {
            id,
            kind: 'horizontal-level',
            ...anchor,
            ...(authoredAtCursorCandleIndex === undefined ? {} : { authoredAtCursorCandleIndex }),
          },
        ],
        id,
      );
    case 'trendline':
    case 'zone': {
      const pending = draft.pendingDrawing;
      if (pending?.kind !== draft.activeTool.kind) {
        return {
          ...draft,
          selectedAnnotationId: undefined,
          pendingDrawing: {
            kind: draft.activeTool.kind,
            id,
            start: anchor,
            ...(authoredAtCursorCandleIndex === undefined ? {} : { authoredAtCursorCandleIndex }),
          },
        };
      }
      const committedAtCursorCandleIndex =
        authoredAtCursorCandleIndex ?? pending.authoredAtCursorCandleIndex;
      const annotation: LearnerChartAnnotation = {
        id: pending.id,
        kind: pending.kind,
        start: pending.start,
        end: anchor,
        ...(committedAtCursorCandleIndex === undefined
          ? {}
          : { authoredAtCursorCandleIndex: committedAtCursorCandleIndex }),
      };
      assertValidLearnerAnnotation(annotation);
      return commitDraft(draft, [...draft.annotations, annotation], annotation.id);
    }
    case 'inspect':
    case 'select':
      return draft;
  }
}

function commitDraft(
  draft: AnalysisDraft,
  annotations: readonly LearnerChartAnnotation[],
  selectedAnnotationId: string | undefined,
): AnalysisDraft {
  return {
    ...draft,
    annotations,
    selectedAnnotationId,
    pendingDrawing: undefined,
    undoStack: [...draft.undoStack, snapshot(draft)],
    redoStack: [],
  };
}

function moveThroughHistory(draft: AnalysisDraft, direction: 'undo' | 'redo'): AnalysisDraft {
  const source = direction === 'undo' ? draft.undoStack : draft.redoStack;
  const destination = direction === 'undo' ? draft.redoStack : draft.undoStack;
  const target = source[source.length - 1];
  if (target === undefined) return draft;
  const nextSource = source.slice(0, -1);
  const nextDestination = [...destination, snapshot(draft)];
  return {
    ...draft,
    annotations: target.annotations,
    selectedAnnotationId: target.selectedAnnotationId,
    pendingDrawing: undefined,
    undoStack: direction === 'undo' ? nextSource : nextDestination,
    redoStack: direction === 'undo' ? nextDestination : nextSource,
  };
}

function snapshot(draft: AnalysisDraft): AnalysisDraftSnapshot {
  return {
    annotations: draft.annotations,
    selectedAnnotationId: draft.selectedAnnotationId,
  };
}

function assertUniqueAnnotationIds(annotations: readonly LearnerChartAnnotation[]): void {
  const ids = new Set<string>();
  for (const annotation of annotations) {
    if (ids.has(annotation.id))
      throw new Error(`Duplicate learner annotation ID: ${annotation.id}`);
    ids.add(annotation.id);
  }
}

function assertValidLearnerAnnotation(annotation: LearnerChartAnnotation): void {
  if (annotation.id.length === 0) throw new Error('Learner annotation ID must not be empty');
  switch (annotation.kind) {
    case 'point':
      assertAnchor(annotation.anchor);
      break;
    case 'horizontal-level':
      assertAnchor({ candleIndex: annotation.candleIndex, price: annotation.price });
      break;
    case 'trendline':
    case 'zone':
      assertAnchor(annotation.start);
      assertAnchor(annotation.end);
  }
  if (
    annotation.authoredAtCursorCandleIndex !== undefined &&
    (!Number.isInteger(annotation.authoredAtCursorCandleIndex) ||
      annotation.authoredAtCursorCandleIndex < learnerAnnotationLastCandleIndex(annotation))
  ) {
    throw new RangeError('Annotation authorship cursor must include all geometry anchors');
  }
}

function assertAnchor(anchor: ChartAnchor): void {
  if (!Number.isInteger(anchor.candleIndex) || anchor.candleIndex < 0) {
    throw new RangeError('Candle index must be a non-negative integer');
  }
  if (!Number.isFinite(anchor.price)) throw new RangeError('Price must be finite');
}
