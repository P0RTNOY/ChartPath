import {
  DEVELOPMENT_HISTORICAL_DATASET,
  canonicalDatasetPayload,
  canonicalSerialize,
  sha256Hex,
  type HistoricalDataset,
  type Sha256Checksum,
} from '@chartpath/historical-data';

import {
  scenarioPositionManagementVariantRegistry,
  type ScenarioPositionManagementVariantV1,
} from './management.js';
import {
  publicationCandidateRegistry,
  validatePublicationCandidateRegistry,
} from './publication/candidates.js';
import {
  buildReviewPacketArtifactIndex,
  buildReviewPacketArtifacts,
  serializeReviewPacketArtifactIndex,
} from './publication/review-packet.js';
import type { PublicationCandidateV1 } from './publication/types.js';
import { scenarioCandidateRegistry } from './registry.js';
import type { CompiledScenarioCandidate, ScenarioAuthoringManifestV1 } from './types.js';

export const IDENTITY_HASH_DOMAIN_REPORT_VERSION = 'identity-hash-domain-report-v1' as const;
export const HISTORICAL_DATASET_CHECKSUM_PIN =
  'sha256:07907f75988d2aba5f27d6c73bc596ad9f896452f37a8ba9a240b8ae285a144e' as const;

export const IDENTITY_HASH_DOMAINS = {
  historicalDataset: 'historical-dataset-canonical-payload-v1',
  scenarioLearner: 'scenario-learner-exercise-v1',
  scenarioGrader: 'scenario-private-grader-exercise-v1',
  scenarioMaterial: 'scenario-authoring-material-v1',
  managementMaterial: 'position-management-material-v1',
  managementRubric: 'position-management-domain-rubric-v1',
  publicationMaterial: 'publication-candidate-material-set-v1',
  publicationPacket: 'publication-review-packet-material-v1',
  publicationPatchRecipe: 'publication-future-candle-patch-recipe-v1',
  publicationArtifact: 'publication-review-artifact-bytes-v1',
  report: 'identity-hash-domain-report-material-v1',
} as const;

export type IdentityHashDomain = (typeof IDENTITY_HASH_DOMAINS)[keyof typeof IDENTITY_HASH_DOMAINS];

export interface IdentityHashDomainSpecV1 {
  readonly domain: IdentityHashDomain;
  readonly payload: string;
  readonly serialization: 'canonical-json-v1' | 'utf8-file-bytes-v1';
  readonly interchangeableWith: readonly [];
}

export interface IdentityHashRecordV1 {
  readonly domain: IdentityHashDomain;
  readonly identity: string;
  readonly version: string;
  readonly checksum: Sha256Checksum;
  readonly byteLength: number;
  readonly serialization: 'canonical-json-v1' | 'utf8-file-bytes-v1';
  readonly declaredChecksum?: Sha256Checksum;
  readonly declaredChecksumMatches?: boolean;
  readonly referencedBy?: readonly string[];
}

export interface IdentityHashReferenceV1 {
  readonly domain: IdentityHashDomain;
  readonly identity: string;
  readonly version: string;
  readonly checksum: Sha256Checksum;
}

export type IdentityVersionSnapshotV1 = IdentityHashReferenceV1;

export interface IdentityHashDomainReportV1 {
  readonly schemaVersion: 1;
  readonly contractVersion: typeof IDENTITY_HASH_DOMAIN_REPORT_VERSION;
  readonly canonicalization: 'canonical-json-v1';
  readonly hashAlgorithm: 'sha256';
  readonly domains: readonly IdentityHashDomainSpecV1[];
  readonly historicalChecksumPin: {
    readonly datasetId: string;
    readonly datasetVersion: string;
    readonly expectedChecksum: typeof HISTORICAL_DATASET_CHECKSUM_PIN;
    readonly actualChecksum: Sha256Checksum;
    readonly matches: boolean;
  };
  readonly records: readonly IdentityHashRecordV1[];
  readonly issues: readonly string[];
  readonly valid: boolean;
  readonly reportChecksum: Sha256Checksum;
}

export interface BuildIdentityHashDomainReportInput {
  readonly historicalDataset?: HistoricalDataset;
  readonly scenarios?: readonly CompiledScenarioCandidate[];
  readonly managementVariants?: readonly ScenarioPositionManagementVariantV1[];
  readonly publicationCandidates?: readonly PublicationCandidateV1[];
}

const DOMAIN_SPECS: readonly IdentityHashDomainSpecV1[] = Object.freeze([
  {
    domain: IDENTITY_HASH_DOMAINS.historicalDataset,
    payload: 'dataset manifest excluding canonicalChecksum, candles, corporate actions, and gaps',
    serialization: 'canonical-json-v1',
    interchangeableWith: [],
  },
  {
    domain: IDENTITY_HASH_DOMAINS.scenarioLearner,
    payload: 'exact learner-safe ScenarioLearnerExerciseProjection',
    serialization: 'canonical-json-v1',
    interchangeableWith: [],
  },
  {
    domain: IDENTITY_HASH_DOMAINS.scenarioGrader,
    payload: 'exact private deterministic ContentExercise grader projection',
    serialization: 'canonical-json-v1',
    interchangeableWith: [],
  },
  {
    domain: IDENTITY_HASH_DOMAINS.scenarioMaterial,
    payload: 'scenario authoring material excluding lifecycle and review bookkeeping',
    serialization: 'canonical-json-v1',
    interchangeableWith: [],
  },
  {
    domain: IDENTITY_HASH_DOMAINS.managementMaterial,
    payload: 'exact scenario, dataset, and position-management configuration material',
    serialization: 'canonical-json-v1',
    interchangeableWith: [],
  },
  {
    domain: IDENTITY_HASH_DOMAINS.managementRubric,
    payload: 'embedded position-management domain rubric',
    serialization: 'canonical-json-v1',
    interchangeableWith: [],
  },
  {
    domain: IDENTITY_HASH_DOMAINS.publicationMaterial,
    payload: 'publication candidate ancestry, provenance, and optional patch recipe material set',
    serialization: 'canonical-json-v1',
    interchangeableWith: [],
  },
  {
    domain: IDENTITY_HASH_DOMAINS.publicationPacket,
    payload: 'complete deterministic review packet excluding reviewPacketChecksum',
    serialization: 'canonical-json-v1',
    interchangeableWith: [],
  },
  {
    domain: IDENTITY_HASH_DOMAINS.publicationPatchRecipe,
    payload: 'future-candle OHLC replacement recipe excluding recipeChecksum',
    serialization: 'canonical-json-v1',
    interchangeableWith: [],
  },
  {
    domain: IDENTITY_HASH_DOMAINS.publicationArtifact,
    payload: 'exact UTF-8 bytes of a generated canonical JSON, Markdown, or artifact-index file',
    serialization: 'utf8-file-bytes-v1',
    interchangeableWith: [],
  },
  {
    domain: IDENTITY_HASH_DOMAINS.report,
    payload: 'complete identity report excluding reportChecksum',
    serialization: 'canonical-json-v1',
    interchangeableWith: [],
  },
]);

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function checksum(value: string): Sha256Checksum {
  return `sha256:${sha256Hex(value)}`;
}

function canonicalRecord(input: {
  readonly domain: IdentityHashDomain;
  readonly identity: string;
  readonly version: string;
  readonly value: unknown;
  readonly declaredChecksum?: Sha256Checksum;
  readonly referencedBy?: readonly string[];
}): IdentityHashRecordV1 {
  const serialized = canonicalSerialize(input.value);
  const computed = checksum(serialized);
  return {
    domain: input.domain,
    identity: input.identity,
    version: input.version,
    checksum: computed,
    byteLength: new TextEncoder().encode(serialized).byteLength,
    serialization: 'canonical-json-v1',
    ...(input.declaredChecksum
      ? {
          declaredChecksum: input.declaredChecksum,
          declaredChecksumMatches: computed === input.declaredChecksum,
        }
      : {}),
    ...(input.referencedBy ? { referencedBy: [...input.referencedBy].sort() } : {}),
  };
}

function byteRecord(input: {
  readonly identity: string;
  readonly version: string;
  readonly bytes: string;
}): IdentityHashRecordV1 {
  return {
    domain: IDENTITY_HASH_DOMAINS.publicationArtifact,
    identity: input.identity,
    version: input.version,
    checksum: checksum(input.bytes),
    byteLength: new TextEncoder().encode(input.bytes).byteLength,
    serialization: 'utf8-file-bytes-v1',
  };
}

function scenarioMaterial(manifest: ScenarioAuthoringManifestV1): unknown {
  const {
    schemaVersion: _schemaVersion,
    publication: _publication,
    materialArtifactChecksum: _materialArtifactChecksum,
    reviewStates: _reviewStates,
    reviewFingerprint: _reviewFingerprint,
    retirement: _retirement,
    ...material
  } = manifest;
  void _schemaVersion;
  void _publication;
  void _materialArtifactChecksum;
  void _reviewStates;
  void _reviewFingerprint;
  void _retirement;
  return material;
}

function managementMaterial(variant: ScenarioPositionManagementVariantV1): unknown {
  const {
    publication: _publication,
    materialArtifactChecksum: _materialArtifactChecksum,
    ...material
  } = variant;
  void _publication;
  void _materialArtifactChecksum;
  return material;
}

function publicationMaterial(candidate: PublicationCandidateV1): unknown {
  const {
    state: _state,
    decisionKind: _decisionKind,
    generatorSeed: _generatorSeed,
    materialSetChecksum: _materialSetChecksum,
    selectionRationaleHe: _selectionRationaleHe,
    requiredReviewScopes: _requiredReviewScopes,
    licensing: _licensing,
    ...material
  } = candidate;
  void _state;
  void _decisionKind;
  void _generatorSeed;
  void _materialSetChecksum;
  void _selectionRationaleHe;
  void _requiredReviewScopes;
  void _licensing;
  return material;
}

function datasetRecords(
  historicalDataset: HistoricalDataset,
  scenarios: readonly CompiledScenarioCandidate[],
  managementVariants: readonly ScenarioPositionManagementVariantV1[],
): { readonly records: readonly IdentityHashRecordV1[]; readonly issues: readonly string[] } {
  const datasets = [
    { dataset: historicalDataset, reference: 'historical-fixture' },
    ...scenarios.map((scenario) => ({
      dataset: scenario.dataset,
      reference: `scenario:${scenario.manifest.scenarioId}@${scenario.manifest.scenarioVersion}`,
    })),
    ...managementVariants.map((variant) => ({
      dataset: variant.dataset,
      reference: `management:${variant.scenarioId}@${variant.scenarioVersion}`,
    })),
  ];
  const grouped = new Map<
    string,
    { dataset: HistoricalDataset; references: string[]; payload: string }
  >();
  const issues: string[] = [];
  for (const entry of datasets) {
    const identity = `${entry.dataset.manifest.datasetId}@${entry.dataset.manifest.datasetVersion}`;
    const payload = canonicalDatasetPayload(entry.dataset);
    const existing = grouped.get(identity);
    if (existing) {
      if (existing.payload !== payload)
        issues.push(
          `immutable dataset identity reused with different canonical bytes: ${identity}`,
        );
      existing.references.push(entry.reference);
    } else {
      grouped.set(identity, { dataset: entry.dataset, references: [entry.reference], payload });
    }
  }
  const records = [...grouped.values()].map(({ dataset, references, payload }) => {
    const computed = checksum(payload);
    return {
      domain: IDENTITY_HASH_DOMAINS.historicalDataset,
      identity: dataset.manifest.datasetId,
      version: dataset.manifest.datasetVersion,
      checksum: computed,
      byteLength: new TextEncoder().encode(payload).byteLength,
      serialization: 'canonical-json-v1' as const,
      declaredChecksum: dataset.manifest.canonicalChecksum,
      declaredChecksumMatches: computed === dataset.manifest.canonicalChecksum,
      referencedBy: [...references].sort(),
    };
  });
  return { records, issues };
}

function recordKey(record: Pick<IdentityHashRecordV1, 'domain' | 'identity' | 'version'>): string {
  return `${record.domain}\u0000${record.identity}\u0000${record.version}`;
}

function sortRecords(records: readonly IdentityHashRecordV1[]): readonly IdentityHashRecordV1[] {
  return [...records].sort((left, right) => {
    const leftKey = recordKey(left);
    const rightKey = recordKey(right);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

export function identityHashReferenceMatches(
  record: IdentityHashRecordV1,
  reference: IdentityHashReferenceV1,
): boolean {
  return (
    record.domain === reference.domain &&
    record.identity === reference.identity &&
    record.version === reference.version &&
    record.checksum === reference.checksum
  );
}

export function validateIdentityVersionTransition(
  previous: readonly IdentityVersionSnapshotV1[],
  current: readonly IdentityVersionSnapshotV1[],
): readonly string[] {
  const previousByIdentityVersion = new Map(previous.map((item) => [recordKey(item), item]));
  const issues: string[] = [];
  for (const item of current) {
    const prior = previousByIdentityVersion.get(recordKey(item));
    if (prior && prior.checksum !== item.checksum)
      issues.push(
        `immutable identity mutated without a version change: ${item.domain}:${item.identity}@${item.version}`,
      );
  }
  return Object.freeze([...new Set(issues)].sort());
}

export function buildIdentityHashDomainReport(
  input: BuildIdentityHashDomainReportInput = {},
): IdentityHashDomainReportV1 {
  const historicalDataset = input.historicalDataset ?? DEVELOPMENT_HISTORICAL_DATASET;
  const scenarios = input.scenarios ?? scenarioCandidateRegistry;
  const managementVariants = input.managementVariants ?? scenarioPositionManagementVariantRegistry;
  const publicationCandidates = input.publicationCandidates ?? publicationCandidateRegistry;
  const datasetResult = datasetRecords(historicalDataset, scenarios, managementVariants);
  const records: IdentityHashRecordV1[] = [...datasetResult.records];

  for (const candidate of scenarios) {
    const identity = candidate.manifest.scenarioId;
    const version = candidate.manifest.scenarioVersion;
    records.push(
      canonicalRecord({
        domain: IDENTITY_HASH_DOMAINS.scenarioLearner,
        identity,
        version,
        value: candidate.exercise,
      }),
      canonicalRecord({
        domain: IDENTITY_HASH_DOMAINS.scenarioGrader,
        identity,
        version,
        value: candidate.gradingExercise,
      }),
      canonicalRecord({
        domain: IDENTITY_HASH_DOMAINS.scenarioMaterial,
        identity,
        version,
        value: scenarioMaterial(candidate.manifest),
        declaredChecksum: candidate.manifest.materialArtifactChecksum,
      }),
    );
  }

  for (const variant of managementVariants) {
    records.push(
      canonicalRecord({
        domain: IDENTITY_HASH_DOMAINS.managementMaterial,
        identity: variant.scenarioId,
        version: variant.scenarioVersion,
        value: managementMaterial(variant),
        declaredChecksum: variant.materialArtifactChecksum,
      }),
      canonicalRecord({
        domain: IDENTITY_HASH_DOMAINS.managementRubric,
        identity: variant.scenarioId,
        version: variant.scenarioVersion,
        value: variant.management.rubric.domainRubric,
        declaredChecksum: variant.management.rubric.checksum,
      }),
    );
  }

  const bundles = buildReviewPacketArtifacts(publicationCandidates);
  for (const bundle of bundles) {
    const candidate = bundle.packet.candidate;
    const packet = bundle.packet;
    const { reviewPacketChecksum, ...packetMaterial } = packet;
    records.push(
      canonicalRecord({
        domain: IDENTITY_HASH_DOMAINS.publicationMaterial,
        identity: candidate.candidateId,
        version: String(candidate.schemaVersion),
        value: publicationMaterial(candidate),
        declaredChecksum: candidate.materialSetChecksum,
      }),
      canonicalRecord({
        domain: IDENTITY_HASH_DOMAINS.publicationPacket,
        identity: candidate.candidateId,
        version: packet.contractVersion,
        value: packetMaterial,
        declaredChecksum: reviewPacketChecksum,
      }),
      byteRecord({
        identity: `${bundle.directoryName}/review-packet.canonical.jsonl`,
        version: packet.contractVersion,
        bytes: bundle.json,
      }),
      byteRecord({
        identity: `${bundle.directoryName}/review-packet.md`,
        version: packet.contractVersion,
        bytes: bundle.markdown,
      }),
    );
    const derivation = candidate.management?.datasetDerivation;
    if (derivation) {
      const { recipeChecksum, ...recipeMaterial } = derivation;
      records.push(
        canonicalRecord({
          domain: IDENTITY_HASH_DOMAINS.publicationPatchRecipe,
          identity: candidate.candidateId,
          version: derivation.recipeVersion,
          value: recipeMaterial,
          declaredChecksum: recipeChecksum,
        }),
      );
    }
  }
  const artifactIndex = buildReviewPacketArtifactIndex(bundles);
  records.push(
    byteRecord({
      identity: 'index.canonical.jsonl',
      version: artifactIndex.contractVersion,
      bytes: serializeReviewPacketArtifactIndex(artifactIndex),
    }),
  );

  const sortedRecords = sortRecords(records);
  const issues = [
    ...datasetResult.issues,
    ...validatePublicationCandidateRegistry(publicationCandidates),
  ];
  const keys = new Set<string>();
  for (const record of sortedRecords) {
    const key = recordKey(record);
    if (keys.has(key)) issues.push(`duplicate hash-domain identity record: ${key}`);
    keys.add(key);
    if (record.declaredChecksumMatches === false)
      issues.push(
        `declared checksum does not match canonical bytes: ${record.domain}:${record.identity}@${record.version}`,
      );
  }
  const historicalPinMatches =
    historicalDataset.manifest.canonicalChecksum === HISTORICAL_DATASET_CHECKSUM_PIN;
  if (!historicalPinMatches)
    issues.push(
      `canonical historical checksum pin changed: ${historicalDataset.manifest.datasetId}@${historicalDataset.manifest.datasetVersion}`,
    );
  const uniqueIssues = [...new Set(issues)].sort();
  const material = {
    schemaVersion: 1 as const,
    contractVersion: IDENTITY_HASH_DOMAIN_REPORT_VERSION,
    canonicalization: 'canonical-json-v1' as const,
    hashAlgorithm: 'sha256' as const,
    domains: DOMAIN_SPECS,
    historicalChecksumPin: {
      datasetId: historicalDataset.manifest.datasetId,
      datasetVersion: historicalDataset.manifest.datasetVersion,
      expectedChecksum: HISTORICAL_DATASET_CHECKSUM_PIN,
      actualChecksum: historicalDataset.manifest.canonicalChecksum,
      matches: historicalPinMatches,
    },
    records: sortedRecords,
    issues: uniqueIssues,
    valid: uniqueIssues.length === 0,
  };
  return deepFreeze({ ...material, reportChecksum: checksum(canonicalSerialize(material)) });
}

export function serializeIdentityHashDomainReport(report: IdentityHashDomainReportV1): string {
  const { reportChecksum, ...material } = report;
  if (reportChecksum !== checksum(canonicalSerialize(material)))
    throw new Error('Identity hash-domain report checksum does not match its canonical material.');
  return `${canonicalSerialize(report)}\n`;
}

export const identityHashDomainReport = buildIdentityHashDomainReport();
