import {
  blindQaCandidateCards,
  qaScenarioIdentityForKey,
  revealedQaCandidateDetail,
} from './scenario-qa';

describe('internal scenario QA projections', () => {
  it('returns opaque analysis and management QA cards with no identity or outcome', () => {
    const cards = blindQaCandidateCards();
    const serialized = JSON.stringify(cards);

    expect(cards).toHaveLength(12);
    expect(cards.map(({ qaKey }) => qaKey)).toEqual(
      Array.from({ length: 12 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`),
    );
    expect(serialized).not.toMatch(
      /internal-|לונג|שורט|אין עסקה|ta-he-v2|PDF|sha256|market|limit|stop|target|ambiguous/,
    );
    expect(serialized).not.toMatch(/2\.0|2\.1|startTestID|management|range-breakout|double-top/);
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

  it('projects the base chart specification checksum separately from management material', () => {
    const management = revealedQaCandidateDetail('candidate-11');

    expect(management?.chartSpecChecksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(management?.materialArtifactChecksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(management?.chartSpecChecksum).not.toBe(management?.materialArtifactChecksum);
  });

  it('marks exactly the three selected publication candidates only after QA reveal', () => {
    const details = Array.from({ length: 12 }, (_, index) =>
      revealedQaCandidateDetail(`candidate-${String(index + 1).padStart(2, '0')}`),
    );
    const selected = details.filter((detail) => detail?.publicationCandidate);

    expect(selected.map((detail) => detail?.qaKey)).toEqual([
      'candidate-04',
      'candidate-11',
      'candidate-12',
    ]);
    expect(selected.map((detail) => detail?.publicationCandidate?.candidateId)).toEqual([
      'publication-candidate-no-trade-v1',
      'publication-candidate-long-v1',
      'publication-candidate-short-v1',
    ]);
    for (const detail of selected) {
      expect(detail?.publicationCandidate).toMatchObject({
        state: 'publication-candidate',
        materialSetChecksum: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
        requiredReviewScopes: expect.arrayContaining(['accessibility', 'licensing', 'publication']),
      });
      expect(detail?.publicationCandidate?.reviewPacketPath).toMatch(/review-packets\/.+\.jsonl$/);
    }
  });

  it('resolves identity only through the explicit QA action-boundary lookup', () => {
    expect(qaScenarioIdentityForKey('candidate-01')).toMatchObject({
      scenarioId: expect.stringMatching(/^internal-/),
      scenarioVersion: '1.0.0',
    });
    expect(qaScenarioIdentityForKey('candidate-10')).toMatchObject({
      scenarioId: 'internal-long-range-breakout',
      scenarioVersion: '2.0.0',
    });
    expect(qaScenarioIdentityForKey('candidate-11')).toMatchObject({
      scenarioId: 'internal-long-range-breakout',
      scenarioVersion: '2.1.0',
    });
    expect(qaScenarioIdentityForKey('candidate-99')).toBeUndefined();
  });
});
