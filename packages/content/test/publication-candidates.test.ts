import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalSerialize } from '@chartpath/historical-data';

import {
  publicationCandidateEvidence,
  publicationCandidateRegistry,
  validatePublicationCandidateRegistry,
} from '../src/scenarios/publication/candidates.js';
import {
  SOURCE_PDF_PATH,
  findRepositoryRoot,
  verifyEvidenceFiles,
  verifyPublicationArtifacts,
  writeReviewPacketArtifacts,
} from '../src/scenarios/publication/node-io.js';
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
      expect(candidate.sourceProvenance[0]?.role).toBe('base-scenario');
      if (candidate.kind === 'position-management') {
        expect(candidate.sourceProvenance).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'position-management-doctrine',
              physicalPages: { start: 76, end: 79 },
              printedPages: { start: 63, end: 66 },
              reviewedContentIds: ['u10-capstone-e05'],
            }),
          ]),
        );
      } else {
        expect(candidate.sourceProvenance).toHaveLength(1);
      }
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
      expect(packet.sourceProvenance.length).toBeGreaterThan(0);
      for (const source of packet.sourceProvenance) {
        expect(source.reviewedContentIds.length).toBeGreaterThan(0);
        expect(source.sourcePdfChecksum).toBe(
          'sha256:25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33',
        );
        expect(packet.componentChecksums.map((item) => item.componentId)).toContain(
          `source-provenance:${source.provenanceId}`,
        );
      }
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

  it('renders every reviewer-relevant packet area in the deterministic human-readable packet', () => {
    for (const candidate of publicationCandidateRegistry) {
      const packet = buildReviewPacket(candidate);
      const markdown = renderReviewPacketMarkdown(packet);

      expect(markdown).toContain(packet.compiler.scenarioCompilerVersion);
      expect(markdown).toContain(packet.compiler.chartGeneratorVersion);
      expect(markdown).toContain(`נר החלטה: \`${packet.replay.decisionCandleIndex}\``);
      expect(markdown).toContain(`Blind: \`${packet.replay.blind}\``);
      expect(markdown).toContain(packet.learnerMaterial.blindEvidenceSummaryHe);
      expect(markdown).toContain(packet.learnerMaterial.hintsHe[0]!);
      expect(markdown).toContain(`מופעל: \`${packet.guidedAnalysis.enabled}\``);
      expect(markdown).toContain(
        JSON.stringify(packet.privateReviewerEvidence.correctDecision, null, 2),
      );
      expect(markdown).toContain(
        JSON.stringify(packet.privateReviewerEvidence.processRubric, null, 2),
      );
      expect(markdown).toContain('תכנית Paper ראשונית — כניסה, סטופ, יעד וגודל');
      expect(markdown).toContain('תצורת ניהול, מגבלות סיכון ופעולות מותרות');
      expect(markdown).toContain('מקרי ניהול, אירועים, עמימות ותוצאות צפויות');
      expect(markdown).toContain(
        `רווח/הפסד משפיע על הציון: \`${packet.privateReviewerEvidence.profitAndLossAffectsScore}\``,
      );
      for (const source of packet.sourceProvenance) {
        expect(markdown).toContain(source.provenanceId);
        expect(markdown).toContain(
          `עמודי PDF פיזיים: ${source.physicalPages.start}–${source.physicalPages.end}`,
        );
        expect(markdown).toContain(source.originalSummaryHe);
      }
      expect(markdown).toContain(packet.licensing.currentManifestRedistributionStatus);
      expect(markdown).toContain(packet.licensing.unresolvedQuestionsHe[0]!);
      expect(markdown).toContain(packet.accessibility.interactionInstructionsHe);
      expect(markdown).toContain(packet.accessibility.chartAlternativeHe);
      expect(markdown).toContain(packet.accessibility.reviewerHebrewStrings[0]!);
      expect(markdown).toContain(packet.accessibility.nativeVerificationStatus);
      expect(markdown).toContain(packet.automatedTestReferences[0]!);
      expect(markdown).toContain(packet.componentChecksums[0]!.checksum);
      expect(markdown).toContain(packet.evidenceFiles[0]!.descriptionHe);
      expect(markdown).toContain(packet.remainingBlockers[0]!.descriptionHe);

      if (candidate.kind === 'position-management') {
        expect(markdown).toContain(JSON.stringify(packet.candidate.management, null, 2));
        expect(markdown).toContain(
          JSON.stringify(packet.privateReviewerEvidence.positionManagementConfiguration, null, 2),
        );
        expect(markdown).toContain(
          JSON.stringify(packet.privateReviewerEvidence.expectedManagementCases, null, 2),
        );
        expect(markdown).toContain('עמודי PDF פיזיים: 76–79');
      }
    }
  });

  it('invalidates the packet whenever reviewed candidate material changes', () => {
    const candidate = publicationCandidateRegistry[0]!;
    const original = buildReviewPacket(candidate);
    const changed = structuredClone(candidate);
    Object.assign(changed, { selectionRationaleHe: `${changed.selectionRationaleHe} שינוי` });
    const changedPacket = buildReviewPacket(changed);
    expect(changedPacket.reviewPacketChecksum).not.toBe(original.reviewPacketChecksum);
    const changedSource = structuredClone(candidate);
    Object.assign(changedSource.sourceProvenance[0]!, {
      originalSummaryHe: `${changedSource.sourceProvenance[0]!.originalSummaryHe} שינוי`,
    });
    expect(buildReviewPacket(changedSource).reviewPacketChecksum).not.toBe(
      original.reviewPacketChecksum,
    );
    expect(validatePublicationCandidateRegistry([changedSource])).toEqual(
      expect.arrayContaining([
        expect.stringContaining('source provenance is stale'),
        expect.stringContaining('material-set checksum mismatch'),
      ]),
    );
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

  it('verifies source PDF, evidence, and every tracked packet without writing', async () => {
    const root = await findRepositoryRoot();
    const report = await verifyPublicationArtifacts({
      repositoryRoot: root,
      bundles: buildReviewPacketArtifacts(),
    });
    expect(report.valid).toBe(true);
    expect(report.sourcePdf).toMatchObject({
      path: SOURCE_PDF_PATH,
      valid: true,
      expectedChecksum: 'sha256:25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33',
    });
    expect(report.evidenceFiles.every((item) => item.valid)).toBe(true);
    expect(report.trackedArtifacts).toHaveLength(7);
    expect(report.trackedArtifacts.every((item) => item.valid)).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('detects source-byte and tracked-packet mutation in an isolated repository tree', async () => {
    const sourceRoot = await findRepositoryRoot();
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'chartpath-publication-integrity-'));
    const bundles = buildReviewPacketArtifacts().map((bundle) => ({
      ...bundle,
      packet: { ...bundle.packet, evidenceFiles: [] },
    }));
    try {
      const paths = [SOURCE_PDF_PATH];
      for (const path of paths) {
        await mkdir(dirname(join(temporaryRoot, path)), { recursive: true });
        await copyFile(join(sourceRoot, path), join(temporaryRoot, path));
      }
      await writeReviewPacketArtifacts({
        repositoryRoot: temporaryRoot,
        outputDirectory: 'review-packets',
        bundles,
      });
      expect(
        (await verifyPublicationArtifacts({ repositoryRoot: temporaryRoot, bundles })).valid,
      ).toBe(true);

      const markdownPath = join(
        temporaryRoot,
        'review-packets/publication-candidate-long-v1/review-packet.md',
      );
      await writeFile(markdownPath, `${await readFile(markdownPath, 'utf8')}mutation\n`, 'utf8');
      const stalePacket = await verifyPublicationArtifacts({
        repositoryRoot: temporaryRoot,
        bundles,
      });
      expect(stalePacket.valid).toBe(false);
      expect(stalePacket.issues.join('\n')).toContain('tracked packet is stale');

      await writeFile(join(temporaryRoot, SOURCE_PDF_PATH), 'not the reviewed source', 'utf8');
      const staleSource = await verifyPublicationArtifacts({
        repositoryRoot: temporaryRoot,
        bundles,
      });
      expect(staleSource.valid).toBe(false);
      expect(staleSource.issues.join('\n')).toContain('source PDF checksum mismatch');
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
