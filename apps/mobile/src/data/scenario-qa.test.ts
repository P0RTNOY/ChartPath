import {
  blindQaCandidateCards,
  qaScenarioIdForKey,
  revealedQaCandidateDetail,
} from './scenario-qa';

describe('internal scenario QA projections', () => {
  it('returns nine opaque QA cards with no raw title, identity, source, decision or outcome', () => {
    const cards = blindQaCandidateCards();
    const serialized = JSON.stringify(cards);

    expect(cards).toHaveLength(9);
    expect(cards.map(({ qaKey }) => qaKey)).toEqual(
      Array.from({ length: 9 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`),
    );
    expect(serialized).not.toMatch(
      /internal-|לונג|שורט|אין עסקה|ta-he-v2|PDF|sha256|market|limit|stop|target|ambiguous/,
    );
  });

  it('returns full provenance and blockers only from the explicit reveal lookup', () => {
    const first = revealedQaCandidateDetail('candidate-01');
    const blockedNoTrade = Array.from({ length: 9 }, (_, index) =>
      revealedQaCandidateDetail(`candidate-${String(index + 1).padStart(2, '0')}`),
    ).find((detail) =>
      detail?.publicationBlockers.some((blocker) => blocker.includes('אין בקטלוג רובריקה שלישית')),
    );

    expect(first).toMatchObject({
      qaKey: 'candidate-01',
      decisionHe: 'תרחיש לונג',
    });
    expect(first?.sourceIdentity).toMatch(/ta-he-v2.*PDF/);
    expect(first?.datasetChecksum).toMatch(/^sha256:/);
    expect(first?.publicationBlockers.length).toBeGreaterThan(0);
    expect(blockedNoTrade?.publicationBlockers.join(' ')).toMatch(/אין בקטלוג רובריקה שלישית/);
    expect(revealedQaCandidateDetail('candidate-99')).toBeUndefined();
  });

  it('resolves identity only through the explicit QA action-boundary lookup', () => {
    expect(qaScenarioIdForKey('candidate-01')).toMatch(/^internal-/);
    expect(qaScenarioIdForKey('candidate-99')).toBeUndefined();
  });
});
