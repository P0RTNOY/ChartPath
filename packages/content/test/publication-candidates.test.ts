import { describe, expect, it } from 'vitest';

import { canonicalSerialize } from '@chartpath/historical-data';

import {
  publicationCandidateEvidence,
  publicationCandidateRegistry,
  validatePublicationCandidateRegistry,
} from '../src/scenarios/publication/candidates.js';
import { verifyEvidenceFiles, findRepositoryRoot } from '../src/scenarios/publication/node-io.js';
import {
  buildReviewPacket,
  buildReviewPacketArtifactIndex,
  buildReviewPacketArtifacts,
  renderReviewPacketMarkdown,
  serializeReviewPacket,
  serializeReviewPacketArtifactIndex,
} from '../src/scenarios/publication/review-packet.js';
import { PUBLICATION_REVIEW_SCOPES } from '../src/scenarios/publication/types.js';

describe('publication candidate registry and deterministic review packets', () => {
  it('selects one exact long, short, and no-trade publication candidate with composite pins', () => {
    expect(validatePublicationCandidateRegistry()).toEqual([]);
    expect(publicationCandidateRegistry).toHaveLength(3);
    expect(publicationCandidateRegistry.map((candidate) => candidate.decisionKind).sort()).toEqual([
      'long',
      'no-trade',
      'short',
    ]);
    expect(publicationCandidateRegistry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateId: 'publication-candidate-long-v1',
          scenario: {
            scenarioId: 'internal-long-range-breakout',
            scenarioVersion: '2.1.0',
          },
          dataset: {
            datasetId: 'internal-long-range-breakout-dataset',
            datasetVersion: '2.0.0',
            datasetChecksum:
              'sha256:f927f4758ad81c6bdc1b2da7c5d4948af21ea930a0094db2ac9d49ee69e7f7d2',
          },
          management: expect.objectContaining({
            materialArtifactChecksum:
              'sha256:1f39e49342e080c9d9bbc9ebdd1b4884a2b5826e3c46507ed2ae4e83e53e15e0',
            datasetDerivation: expect.objectContaining({
              recipeVersion: 'management-future-candle-replacement-v1',
              lastPreservedCandleIndex: 64,
              replacements: [{ candleIndex: 65, open: 102, high: 102.5, low: 101.4, close: 101.8 }],
            }),
          }),
        }),
        expect.objectContaining({
          candidateId: 'publication-candidate-short-v1',
          scenario: {
            scenarioId: 'internal-short-double-top',
            scenarioVersion: '2.0.0',
          },
          dataset: expect.objectContaining({
            datasetChecksum:
              'sha256:357d1c59b511573583f40ee0ec332d737485fae2917ec3a3b7bec3564326967d',
          }),
          management: expect.objectContaining({
            datasetDerivation: expect.objectContaining({
              lastPreservedCandleIndex: 64,
              replacements: [
                { candleIndex: 65, open: 94.2, high: 95, low: 93.6, close: 94.4 },
                { candleIndex: 66, open: 94.5, high: 95.2, low: 93.9, close: 94.8 },
                { candleIndex: 67, open: 98, high: 99, low: 97.5, close: 98.5 },
              ],
            }),
          }),
        }),
        expect.objectContaining({
          candidateId: 'publication-candidate-no-trade-v1',
          scenario: {
            scenarioId: 'internal-no-trade-capstone-c',
            scenarioVersion: '1.0.0',
          },
          dataset: expect.objectContaining({
            datasetChecksum:
              'sha256:c0b58867716179d9050c896988729457f3ddef8d083f4f103c3f7e7b49833aa2',
          }),
        }),
      ]),
    );
    for (const candidate of publicationCandidateRegistry) {
      expect(candidate.state).toBe('publication-candidate');
      expect(candidate.requiredReviewScopes).toEqual(PUBLICATION_REVIEW_SCOPES);
      expect(candidate.requiredReviewScopes).toContain('licensing');
      expect(candidate.licensing.intendedRedistributionMode).toBe('not-authorized');
    }
  });

  it('generates byte-identical canonical JSON, Markdown, and artifact indexes', () => {
    const first = buildReviewPacketArtifacts();
    const second = buildReviewPacketArtifacts();
    expect(first).toEqual(second);
    for (let index = 0; index < first.length; index += 1) {
      const left = first[index]!;
      const right = second[index]!;
      expect(left.json).toBe(right.json);
      expect(left.markdown).toBe(right.markdown);
      expect(left.json).toBe(serializeReviewPacket(left.packet));
      expect(left.markdown).toBe(renderReviewPacketMarkdown(left.packet));
      expect(left.json.endsWith('\n')).toBe(true);
      expect(left.markdown.endsWith('\n')).toBe(true);
    }
    const firstIndex = serializeReviewPacketArtifactIndex(buildReviewPacketArtifactIndex(first));
    const secondIndex = serializeReviewPacketArtifactIndex(buildReviewPacketArtifactIndex(second));
    expect(firstIndex).toBe(secondIndex);
  });

  it('pins source, rubric, execution, management, licensing, Hebrew, and cutoff-safe accessibility material', () => {
    for (const candidate of publicationCandidateRegistry) {
      const packet = buildReviewPacket(candidate);
      expect(packet.sourceProvenance.reviewedContentIds.length).toBeGreaterThan(0);
      expect(packet.sourceProvenance.sourcePdfChecksum).toBe(
        'sha256:25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33',
      );
      expect(packet.datasetProvenance.generatorSeed).toBe(candidate.generatorSeed);
      expect(packet.datasetProvenance.chartSpecChecksum).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(packet.componentChecksums.map((item) => item.componentId)).toEqual(
        expect.arrayContaining(['base-scenario-material', 'dataset-candles', 'process-rubric']),
      );
      if (candidate.kind === 'position-management')
        expect(packet.componentChecksums.map((item) => item.componentId)).toContain(
          'position-management-material',
        );
      if (candidate.kind === 'position-management') {
        expect(packet.datasetProvenance.futurePatchRecipe).toEqual(
          candidate.management!.datasetDerivation,
        );
        expect(packet.privateReviewerEvidence.positionManagementConfiguration).toBeDefined();
      }
      expect(packet.accessibility.chartAlternativeHe).toContain('\u206663\u2069');
      expect(packet.accessibility.chartAlternativeHe).not.toMatch(/timestamp|20\d\d-/u);
      expect(packet.accessibility.chartAlternativeHe).not.toContain(candidate.scenario.scenarioId);
      expect(packet.privateReviewerEvidence.profitAndLossAffectsScore).toBe(false);
      expect(packet.licensing.currentManifestRedistributionStatus).toBe('prohibited');
      expect(packet.licensing.currentManifestPublicationStatus).toBe('internal');
      expect(packet.remainingBlockers.map((item) => item.blockerId)).toEqual(
        expect.arrayContaining([
          'licensing:redistribution-not-authorized',
          'review-scope:licensing',
          'review-scope:publication',
        ]),
      );
      const serialized = canonicalSerialize(packet);
      expect(serialized).not.toMatch(/data:image|base64,|sourceExcerpt|copiedDiagram/u);
    }
  });

  it('invalidates the packet whenever reviewed candidate material changes', () => {
    const candidate = publicationCandidateRegistry[0]!;
    const original = buildReviewPacket(candidate);
    const changed = structuredClone(candidate);
    Object.assign(changed, { selectionRationaleHe: `${changed.selectionRationaleHe} שינוי` });
    const changedPacket = buildReviewPacket(changed);
    expect(changedPacket.reviewPacketChecksum).not.toBe(original.reviewPacketChecksum);
    const staleIdentity = structuredClone(candidate);
    Object.assign(staleIdentity.dataset, {
      datasetChecksum: `sha256:${'a'.repeat(64)}`,
    });
    expect(validatePublicationCandidateRegistry([staleIdentity])).toEqual(
      expect.arrayContaining([
        expect.stringContaining('dataset identity is stale'),
        expect.stringContaining('material-set checksum mismatch'),
      ]),
    );
  });

  it('verifies every referenced screenshot by exact repository-relative bytes', async () => {
    const root = await findRepositoryRoot();
    await expect(
      verifyEvidenceFiles(root, Object.values(publicationCandidateEvidence).flat()),
    ).resolves.toBeUndefined();
  });
});
