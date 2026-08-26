import { describe, expect, it } from 'vitest';

import {
  DEVELOPMENT_HISTORICAL_DATASET,
  type HistoricalDataset,
  type Sha256Checksum,
} from '@chartpath/historical-data';

import {
  HISTORICAL_DATASET_CHECKSUM_PIN,
  IDENTITY_HASH_DOMAINS,
  buildIdentityHashDomainReport,
  identityHashDomainReport,
  identityHashReferenceMatches,
  serializeIdentityHashDomainReport,
  validateIdentityVersionTransition,
  type IdentityHashRecordV1,
  type IdentityVersionSnapshotV1,
} from '../src/scenarios/identity.js';

function record(
  domain: IdentityHashRecordV1['domain'],
  identity: string,
  version: string,
): IdentityHashRecordV1 {
  const resolved = identityHashDomainReport.records.find(
    (item) => item.domain === domain && item.identity === identity && item.version === version,
  );
  if (!resolved) throw new Error(`Missing identity record ${domain}:${identity}@${version}.`);
  return resolved;
}

describe('machine-readable identity and hash-domain report', () => {
  it('is stable, canonical, valid, and contains every required domain', () => {
    const rebuilt = buildIdentityHashDomainReport();
    expect(rebuilt).toEqual(identityHashDomainReport);
    expect(serializeIdentityHashDomainReport(rebuilt)).toBe(
      serializeIdentityHashDomainReport(buildIdentityHashDomainReport()),
    );
    expect(rebuilt).toMatchObject({
      schemaVersion: 1,
      contractVersion: 'identity-hash-domain-report-v1',
      canonicalization: 'canonical-json-v1',
      hashAlgorithm: 'sha256',
      valid: true,
      issues: [],
      reportChecksum: 'sha256:ba7499f4977af92a78211f9c890ec6ea898776f2f747a524ac0b6b9ddcc67bd0',
    });
    expect(rebuilt.records).toHaveLength(60);
    expect(new Set(rebuilt.domains.map((item) => item.domain))).toEqual(
      new Set(Object.values(IDENTITY_HASH_DOMAINS)),
    );
    expect(rebuilt.domains.every((item) => item.interchangeableWith.length === 0)).toBe(true);
  });

  it('pins canonical historical and scenario dataset bytes independently of their references', () => {
    expect(identityHashDomainReport.historicalChecksumPin).toEqual({
      datasetId: 'chartpath-generated-hourly-fixture',
      datasetVersion: '1.0.0-dev',
      expectedChecksum: HISTORICAL_DATASET_CHECKSUM_PIN,
      actualChecksum: HISTORICAL_DATASET_CHECKSUM_PIN,
      matches: true,
    });
    expect(
      record(
        IDENTITY_HASH_DOMAINS.historicalDataset,
        'chartpath-generated-hourly-fixture',
        '1.0.0-dev',
      ),
    ).toMatchObject({
      checksum: HISTORICAL_DATASET_CHECKSUM_PIN,
      byteLength: 20_964,
      declaredChecksumMatches: true,
      referencedBy: ['historical-fixture'],
    });
    expect(
      record(
        IDENTITY_HASH_DOMAINS.historicalDataset,
        'internal-long-range-breakout-dataset',
        '1.0.0',
      ),
    ).toMatchObject({
      checksum: 'sha256:3119ca8967a40347d85d0c990ac9eea506402bee4b6d5414e93139768aecb2df',
      byteLength: 21_513,
      declaredChecksumMatches: true,
      referencedBy: [
        'management:internal-long-range-breakout@2.0.0',
        'scenario:internal-long-range-breakout@1.0.0',
      ],
    });
    expect(
      identityHashDomainReport.records.filter(
        (item) => item.domain === IDENTITY_HASH_DOMAINS.historicalDataset,
      ),
    ).toHaveLength(12);
  });

  it('pins distinct learner, private grader, and authoring-material identities', () => {
    expect(
      record(IDENTITY_HASH_DOMAINS.scenarioLearner, 'internal-long-range-breakout', '1.0.0'),
    ).toMatchObject({
      checksum: 'sha256:078f72c6b0a46d87a385e463869b3495eaca89fe039e3a5d705e1f7c7eb60f42',
      byteLength: 10_113,
    });
    expect(
      record(IDENTITY_HASH_DOMAINS.scenarioGrader, 'internal-long-range-breakout', '1.0.0'),
    ).toMatchObject({
      checksum: 'sha256:4ea32b067f5c9c05e951638d4143ad17575937d062b991cd8cf5a49030e6be31',
      byteLength: 15_411,
    });
    expect(
      record(IDENTITY_HASH_DOMAINS.scenarioMaterial, 'internal-long-range-breakout', '1.0.0'),
    ).toMatchObject({
      checksum: 'sha256:aff491ab6a4c5a124b8d1a61657f74a0765b31e17c582cffad947d45b34b263c',
      declaredChecksumMatches: true,
    });
  });

  it('pins management material and rubric in separate domains', () => {
    expect(
      record(IDENTITY_HASH_DOMAINS.managementMaterial, 'internal-long-range-breakout', '2.1.0'),
    ).toMatchObject({
      checksum: 'sha256:1f39e49342e080c9d9bbc9ebdd1b4884a2b5826e3c46507ed2ae4e83e53e15e0',
      declaredChecksumMatches: true,
    });
    expect(
      record(IDENTITY_HASH_DOMAINS.managementRubric, 'internal-long-range-breakout', '2.1.0'),
    ).toMatchObject({
      checksum: 'sha256:5e57d7d778cc91416f2137902e0921a0eaf97818bcdd33a6cd58ba5e443d7ee0',
      declaredChecksumMatches: true,
    });
  });

  it('pins publication material, packet, patch recipes, and generated artifact bytes', () => {
    expect(
      record(IDENTITY_HASH_DOMAINS.publicationMaterial, 'publication-candidate-long-v1', '1'),
    ).toMatchObject({
      checksum: 'sha256:5212b1d0aab4eb6a1b6fd028a2a8f8d1d87551f7cf7530720c6fed65551a7b54',
      declaredChecksumMatches: true,
    });
    expect(
      record(
        IDENTITY_HASH_DOMAINS.publicationPacket,
        'publication-candidate-long-v1',
        'review-packet-v1',
      ),
    ).toMatchObject({
      checksum: 'sha256:8d4578880f791c69acfc8ee39d2e98adf6880330a520438c60eee9522a93d159',
      declaredChecksumMatches: true,
    });
    expect(
      record(
        IDENTITY_HASH_DOMAINS.publicationPatchRecipe,
        'publication-candidate-long-v1',
        'management-future-candle-replacement-v1',
      ),
    ).toMatchObject({
      checksum: 'sha256:0649a41651d08b80b607d7d06639e10e962c749166c6022b26f2713a525018d6',
      declaredChecksumMatches: true,
    });
    expect(
      record(
        IDENTITY_HASH_DOMAINS.publicationArtifact,
        'publication-candidate-long-v1/review-packet.canonical.jsonl',
        'review-packet-v1',
      ),
    ).toMatchObject({
      checksum: 'sha256:c68370770654670bd5b5cf65ada9d6fc0b6d6bb82ea29581ece4a2f29c9ac259',
      byteLength: 45_269,
      serialization: 'utf8-file-bytes-v1',
    });
    expect(
      record(
        IDENTITY_HASH_DOMAINS.publicationArtifact,
        'index.canonical.jsonl',
        'review-packet-v1',
      ),
    ).toMatchObject({
      checksum: 'sha256:c65606c3e595df1302ccfdf738b64e158c91763df24830d77ba0afa8b374f9ba',
      byteLength: 1_580,
    });
  });

  it('detects same-version mutation and permits a changed hash only under a new version', () => {
    const original: IdentityVersionSnapshotV1 = {
      domain: IDENTITY_HASH_DOMAINS.scenarioLearner,
      identity: 'scenario-a',
      version: '1.0.0',
      checksum: `sha256:${'1'.repeat(64)}`,
    };
    const mutation = { ...original, checksum: `sha256:${'2'.repeat(64)}` as Sha256Checksum };
    expect(validateIdentityVersionTransition([original], [mutation])).toEqual([
      `immutable identity mutated without a version change: ${IDENTITY_HASH_DOMAINS.scenarioLearner}:scenario-a@1.0.0`,
    ]);
    expect(
      validateIdentityVersionTransition([original], [{ ...mutation, version: '1.0.1' }]),
    ).toEqual([]);
  });

  it('fails closed when canonical dataset bytes mutate under the pinned version', () => {
    const changed = structuredClone(DEVELOPMENT_HISTORICAL_DATASET) as HistoricalDataset;
    Object.assign(changed.candles[0]!, { close: changed.candles[0]!.close + 0.01 });
    const report = buildIdentityHashDomainReport({ historicalDataset: changed });
    expect(report.valid).toBe(false);
    expect(report.issues).toContain(
      `declared checksum does not match canonical bytes: ${IDENTITY_HASH_DOMAINS.historicalDataset}:chartpath-generated-hourly-fixture@1.0.0-dev`,
    );
  });

  it('never treats a bare digest as authority across hash domains', () => {
    const dataset = record(
      IDENTITY_HASH_DOMAINS.historicalDataset,
      'internal-long-range-breakout-dataset',
      '1.0.0',
    );
    expect(
      identityHashReferenceMatches(dataset, {
        domain: dataset.domain,
        identity: dataset.identity,
        version: dataset.version,
        checksum: dataset.checksum,
      }),
    ).toBe(true);
    expect(
      identityHashReferenceMatches(dataset, {
        domain: IDENTITY_HASH_DOMAINS.scenarioMaterial,
        identity: dataset.identity,
        version: dataset.version,
        checksum: dataset.checksum,
      }),
    ).toBe(false);
  });

  it('rejects serialization after report material is tampered without re-hashing', () => {
    const changed = structuredClone(identityHashDomainReport);
    Object.assign(changed.records[0]!, { byteLength: changed.records[0]!.byteLength + 1 });
    expect(() => serializeIdentityHashDomainReport(changed)).toThrow(
      /report checksum does not match/u,
    );
  });
});
