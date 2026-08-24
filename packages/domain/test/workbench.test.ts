import { describe, expect, it } from 'vitest';

import {
  createAnalysisDraft,
  isDrawingComplete,
  reduceAnalysisDraft,
  type ChartTool,
  type LearnerChartAnnotation,
} from '../src/index.js';

describe('chart workbench analysis draft', () => {
  it('represents every active tool as an exhaustive discriminated union', () => {
    const tools: readonly ChartTool[] = [
      { kind: 'inspect' },
      { kind: 'point' },
      { kind: 'horizontal-level' },
      { kind: 'trendline' },
      { kind: 'zone' },
      { kind: 'select' },
    ];

    expect(tools.map(({ kind }) => kind)).toEqual([
      'inspect',
      'point',
      'horizontal-level',
      'trendline',
      'zone',
      'select',
    ]);
  });

  it('creates point and horizontal-level annotations in candle/price coordinates', () => {
    let draft = createAnalysisDraft({ kind: 'point' });
    draft = reduceAnalysisDraft(draft, {
      type: 'place-anchor',
      id: 'point-1',
      anchor: { candleIndex: 12, price: 104.25 },
    });
    draft = reduceAnalysisDraft(draft, {
      type: 'set-tool',
      tool: { kind: 'horizontal-level' },
    });
    draft = reduceAnalysisDraft(draft, {
      type: 'place-anchor',
      id: 'level-1',
      anchor: { candleIndex: 15, price: 101.5 },
    });

    expect(draft.annotations).toEqual([
      { id: 'point-1', kind: 'point', anchor: { candleIndex: 12, price: 104.25 } },
      {
        id: 'level-1',
        kind: 'horizontal-level',
        candleIndex: 15,
        price: 101.5,
      },
    ]);
    expect(isDrawingComplete(draft)).toBe(true);
  });

  it.each(['trendline', 'zone'] as const)('tracks %s completion across two anchors', (kind) => {
    let draft = createAnalysisDraft({ kind });
    draft = reduceAnalysisDraft(draft, {
      type: 'place-anchor',
      id: `${kind}-1`,
      anchor: { candleIndex: 4, price: 99 },
    });

    expect(draft.pendingDrawing).toEqual({
      kind,
      id: `${kind}-1`,
      start: { candleIndex: 4, price: 99 },
    });
    expect(isDrawingComplete(draft)).toBe(false);

    draft = reduceAnalysisDraft(draft, {
      type: 'place-anchor',
      id: 'unused-second-anchor-id',
      anchor: { candleIndex: 9, price: 105 },
    });

    expect(draft.pendingDrawing).toBeUndefined();
    expect(draft.annotations).toEqual([
      {
        id: `${kind}-1`,
        kind,
        start: { candleIndex: 4, price: 99 },
        end: { candleIndex: 9, price: 105 },
      },
    ]);
    expect(isDrawingComplete(draft)).toBe(true);
  });

  it('supports undo, redo, specific deletion, and clearing as reversible mutations', () => {
    const annotations: readonly LearnerChartAnnotation[] = [
      { id: 'a', kind: 'point', anchor: { candleIndex: 1, price: 10 } },
      { id: 'b', kind: 'point', anchor: { candleIndex: 2, price: 11 } },
    ];
    let draft = createAnalysisDraft({ kind: 'select' }, annotations);
    draft = reduceAnalysisDraft(draft, { type: 'select-annotation', id: 'b' });
    draft = reduceAnalysisDraft(draft, { type: 'delete-annotation', id: 'b' });
    expect(draft.annotations.map(({ id }) => id)).toEqual(['a']);
    expect(draft.selectedAnnotationId).toBeUndefined();

    draft = reduceAnalysisDraft(draft, { type: 'undo' });
    expect(draft.annotations).toEqual(annotations);
    expect(draft.selectedAnnotationId).toBe('b');

    draft = reduceAnalysisDraft(draft, { type: 'redo' });
    expect(draft.annotations.map(({ id }) => id)).toEqual(['a']);

    draft = reduceAnalysisDraft(draft, { type: 'clear' });
    expect(draft.annotations).toEqual([]);
    draft = reduceAnalysisDraft(draft, { type: 'undo' });
    expect(draft.annotations.map(({ id }) => id)).toEqual(['a']);
  });

  it('invalidates redo after a new annotation mutation', () => {
    let draft = createAnalysisDraft({ kind: 'point' });
    draft = reduceAnalysisDraft(draft, {
      type: 'place-anchor',
      id: 'first',
      anchor: { candleIndex: 1, price: 10 },
    });
    draft = reduceAnalysisDraft(draft, { type: 'undo' });
    expect(draft.redoStack).toHaveLength(1);

    draft = reduceAnalysisDraft(draft, {
      type: 'place-anchor',
      id: 'replacement',
      anchor: { candleIndex: 2, price: 11 },
    });
    expect(draft.redoStack).toEqual([]);
    expect(draft.annotations.map(({ id }) => id)).toEqual(['replacement']);
  });

  it('carries an explicit replay authorship cursor through point and two-anchor tools', () => {
    let pointDraft = createAnalysisDraft({ kind: 'point' });
    pointDraft = reduceAnalysisDraft(pointDraft, {
      type: 'place-anchor',
      id: 'authored-point',
      anchor: { candleIndex: 3, price: 100 },
      authoredAtCursorCandleIndex: 5,
    });
    expect(pointDraft.annotations[0]).toMatchObject({ authoredAtCursorCandleIndex: 5 });

    let lineDraft = createAnalysisDraft({ kind: 'trendline' });
    lineDraft = reduceAnalysisDraft(lineDraft, {
      type: 'place-anchor',
      id: 'authored-line',
      anchor: { candleIndex: 2, price: 99 },
      authoredAtCursorCandleIndex: 4,
    });
    lineDraft = reduceAnalysisDraft(lineDraft, {
      type: 'place-anchor',
      id: 'second-anchor',
      anchor: { candleIndex: 5, price: 103 },
      authoredAtCursorCandleIndex: 6,
    });
    expect(lineDraft.annotations[0]).toMatchObject({ authoredAtCursorCandleIndex: 6 });

    expect(() =>
      reduceAnalysisDraft(createAnalysisDraft({ kind: 'point' }), {
        type: 'place-anchor',
        id: 'future-point',
        anchor: { candleIndex: 5, price: 100 },
        authoredAtCursorCandleIndex: 4,
      }),
    ).toThrow('authorship cursor');
  });
});
