import { canonicalSerialize, sha256Hex, type Sha256Checksum } from '@chartpath/historical-data';

import { scenarioPositionManagementVariantRegistry } from '../management.js';
import { resolveScenarioCandidate } from '../registry.js';
import {
  PUBLICATION_CANDIDATE_SCHEMA_VERSION,
  PUBLICATION_REVIEW_SCOPES,
  type PublicationCandidateV1,
  type PublicationSourceProvenanceV1,
  type ReviewEvidenceFileV1,
} from './types.js';

const SOURCE_PDF_CHECKSUM =
  'sha256:25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33' as const;

function checksum(value: unknown): Sha256Checksum {
  return `sha256:${sha256Hex(canonicalSerialize(value))}`;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function base(scenarioId: string) {
  const candidate = resolveScenarioCandidate(scenarioId, '1.0.0');
  if (!candidate) throw new Error(`Missing publication-candidate base ${scenarioId}@1.0.0.`);
  return candidate;
}

function management(scenarioId: string, scenarioVersion: string) {
  const variant = scenarioPositionManagementVariantRegistry.find(
    (item) => item.scenarioId === scenarioId && item.scenarioVersion === scenarioVersion,
  );
  if (!variant)
    throw new Error(
      `Missing publication-candidate management variant ${scenarioId}@${scenarioVersion}.`,
    );
  return variant;
}

function datasetDerivation(
  baseDataset: ReturnType<typeof base>['dataset'],
  derivedDataset: ReturnType<typeof management>['dataset'],
): NonNullable<PublicationCandidateV1['management']>['datasetDerivation'] {
  if (baseDataset.candles.length !== derivedDataset.candles.length)
    throw new Error('Management future-candle derivation must preserve candle count.');
  const replacements = baseDataset.candles.flatMap((baseCandle, position) => {
    const derivedCandle = derivedDataset.candles[position];
    if (
      !derivedCandle ||
      baseCandle.index !== derivedCandle.index ||
      baseCandle.timestampUtc !== derivedCandle.timestampUtc ||
      baseCandle.exchangeLocalTimestamp !== derivedCandle.exchangeLocalTimestamp ||
      baseCandle.volume !== derivedCandle.volume ||
      baseCandle.session !== derivedCandle.session
    )
      throw new Error('Management future-candle derivation may replace OHLC values only.');
    if (
      baseCandle.open === derivedCandle.open &&
      baseCandle.high === derivedCandle.high &&
      baseCandle.low === derivedCandle.low &&
      baseCandle.close === derivedCandle.close
    )
      return [];
    return [
      {
        candleIndex: derivedCandle.index,
        open: derivedCandle.open,
        high: derivedCandle.high,
        low: derivedCandle.low,
        close: derivedCandle.close,
      },
    ];
  });
  if (replacements.length === 0)
    throw new Error('Management future-candle derivation requires at least one replacement.');
  const recipeMaterial = {
    schemaVersion: 1 as const,
    recipeVersion: 'management-future-candle-replacement-v1' as const,
    lastPreservedCandleIndex: replacements[0]!.candleIndex - 1,
    replacements,
  };
  if (
    replacements.some(({ candleIndex }) => candleIndex <= recipeMaterial.lastPreservedCandleIndex)
  )
    throw new Error('Management replacements must be strictly after the preserved prefix.');
  return deepFreeze({ ...recipeMaterial, recipeChecksum: checksum(recipeMaterial) });
}

function sourceProvenance(
  source: ReturnType<typeof base>,
  variant: ReturnType<typeof management> | undefined,
): readonly PublicationSourceProvenanceV1[] {
  const baseSource = source.manifest.source;
  const managementSources =
    variant?.management.rubric.criteria.flatMap((criterion) => {
      const doctrine = criterion.source;
      if (!doctrine) return [];
      if (doctrine.sourceId !== baseSource.sourceId)
        throw new Error(
          `Management doctrine ${criterion.criterionId} uses a different source document.`,
        );
      return [
        {
          provenanceId: `position-management-doctrine:${criterion.criterionId}`,
          role: 'position-management-doctrine' as const,
          sourceId: doctrine.sourceId,
          pdfDocumentId: baseSource.pdfDocumentId,
          sourcePdfChecksum: SOURCE_PDF_CHECKSUM,
          physicalPages: { start: doctrine.pageStart, end: doctrine.pageEnd },
          printedPages: { start: doctrine.bookPageStart, end: doctrine.bookPageEnd },
          chapter: doctrine.chapter,
          figureOrCase: doctrine.figureOrCase,
          reviewedContentIds: [doctrine.reviewedContentId],
          concept: criterion.criterionHe,
          originalSummaryHe: `${criterion.criterionHe} ${criterion.expectedEvidenceHe}`,
          sourcePdfRightsStatus: 'human-decision-required' as const,
        },
      ];
    }) ?? [];
  return deepFreeze([
    {
      provenanceId: `base-scenario:${source.manifest.scenarioId}`,
      role: 'base-scenario',
      sourceId: baseSource.sourceId,
      pdfDocumentId: baseSource.pdfDocumentId,
      sourcePdfChecksum: SOURCE_PDF_CHECKSUM,
      physicalPages: { start: baseSource.pageStart, end: baseSource.pageEnd },
      printedPages: { start: baseSource.bookPageStart, end: baseSource.bookPageEnd },
      chapter: baseSource.chapter,
      figureOrCase: baseSource.figure,
      reviewedContentIds: baseSource.reviewedContentIds,
      concept: baseSource.concept,
      originalSummaryHe: baseSource.rationaleHe,
      sourcePdfRightsStatus: 'human-decision-required',
    },
    ...managementSources,
  ]);
}

function publicationCandidate(input: {
  readonly candidateId: string;
  readonly decisionKind: PublicationCandidateV1['decisionKind'];
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly rationaleHe: string;
}): PublicationCandidateV1 {
  const source = base(input.scenarioId);
  const variant =
    input.scenarioVersion === source.manifest.scenarioVersion
      ? undefined
      : management(input.scenarioId, input.scenarioVersion);
  const dataset = variant?.dataset ?? source.dataset;
  const materialSet = {
    schemaVersion: PUBLICATION_CANDIDATE_SCHEMA_VERSION,
    candidateId: input.candidateId,
    kind: variant ? ('position-management' as const) : ('base-scenario' as const),
    scenario: {
      scenarioId: input.scenarioId,
      scenarioVersion: input.scenarioVersion,
    },
    dataset: {
      datasetId: dataset.manifest.datasetId,
      datasetVersion: dataset.manifest.datasetVersion,
      datasetChecksum: dataset.manifest.canonicalChecksum,
    },
    baseScenario: {
      scenarioId: source.manifest.scenarioId,
      scenarioVersion: source.manifest.scenarioVersion,
      materialArtifactChecksum: source.manifest.materialArtifactChecksum,
      dataset: {
        datasetId: source.dataset.manifest.datasetId,
        datasetVersion: source.dataset.manifest.datasetVersion,
        datasetChecksum: source.dataset.manifest.canonicalChecksum,
      },
    },
    sourceProvenance: sourceProvenance(source, variant),
    ...(variant
      ? {
          management: {
            materialArtifactChecksum: variant.materialArtifactChecksum,
            policyVersion: variant.management.policy.version,
            permissionVersion: variant.management.permissionVersion,
            datasetDerivation: datasetDerivation(source.dataset, variant.dataset),
          },
        }
      : {}),
  };
  return deepFreeze({
    ...materialSet,
    state: 'publication-candidate',
    decisionKind: input.decisionKind,
    generatorSeed: source.manifest.chartSpec.seed,
    materialSetChecksum: checksum(materialSet),
    selectionRationaleHe: input.rationaleHe,
    requiredReviewScopes: PUBLICATION_REVIEW_SCOPES,
    licensing: {
      syntheticDatasetOrigin: 'chartpath-generated',
      chartGeometryCopied: false,
      proseCopied: false,
      generatedDataRightsStatus: 'human-decision-required',
      sourceAdaptationRightsStatus: 'human-decision-required',
      intendedRedistributionMode: 'not-authorized',
    },
  }) as PublicationCandidateV1;
}

export const publicationCandidateRegistry: readonly PublicationCandidateV1[] = deepFreeze([
  publicationCandidate({
    candidateId: 'publication-candidate-long-v1',
    decisionKind: 'long',
    scenarioId: 'internal-long-range-breakout',
    scenarioVersion: '2.1.0',
    rationaleHe:
      'מקרה המקור השלם ביותר ללונג, עם נתוני עתיד נפרדים שמכסים עצירה שלילית ועמימות פתיחה בלי לבחור מסלול מיטיב.',
  }),
  publicationCandidate({
    candidateId: 'publication-candidate-short-v1',
    decisionKind: 'short',
    scenarioId: 'internal-short-double-top',
    scenarioVersion: '2.0.0',
    rationaleHe:
      'תרחיש שורט בעל מקור מדויק, אישור מבני והרשאת ניהול שנבחנת מול פער מאוחר תחת אותה מדיניות דטרמיניסטית.',
  }),
  publicationCandidate({
    candidateId: 'publication-candidate-no-trade-v1',
    decisionKind: 'no-trade',
    scenarioId: 'internal-no-trade-capstone-c',
    scenarioVersion: '1.0.0',
    rationaleHe:
      'זהו המועמד היחיד שמחובר לרובריקת 11 שלבים שנבדקה עבור החלטת אי־עסקה מפורשת; הרווח העתידי אינו שיקול בבחירה.',
  }),
]);

export function resolvePublicationCandidate(
  candidateId: string,
): PublicationCandidateV1 | undefined {
  return publicationCandidateRegistry.find((candidate) => candidate.candidateId === candidateId);
}

export function validatePublicationCandidateRegistry(
  registry: readonly PublicationCandidateV1[] = publicationCandidateRegistry,
): readonly string[] {
  const issues: string[] = [];
  const candidateIds = new Set<string>();
  const scenarioIdentities = new Set<string>();
  for (const candidate of registry) {
    const identity = `${candidate.scenario.scenarioId}@${candidate.scenario.scenarioVersion}`;
    if (candidateIds.has(candidate.candidateId))
      issues.push(`duplicate publication candidate ID ${candidate.candidateId}`);
    if (scenarioIdentities.has(identity))
      issues.push(`duplicate publication candidate scenario identity ${identity}`);
    candidateIds.add(candidate.candidateId);
    scenarioIdentities.add(identity);
    if (candidate.state !== 'publication-candidate')
      issues.push(`${candidate.candidateId} must remain publication-candidate`);
    if (candidate.requiredReviewScopes !== PUBLICATION_REVIEW_SCOPES)
      issues.push(`${candidate.candidateId} must use the canonical review scope tuple`);
    if (candidate.licensing.intendedRedistributionMode !== 'not-authorized')
      issues.push(`${candidate.candidateId} cannot claim redistribution authorization`);
    const source = base(candidate.baseScenario.scenarioId);
    const variant =
      candidate.kind === 'position-management'
        ? management(candidate.scenario.scenarioId, candidate.scenario.scenarioVersion)
        : undefined;
    const expectedDataset = variant?.dataset ?? source.dataset;
    const expectedSourceProvenance = sourceProvenance(source, variant);
    if (
      candidate.baseScenario.materialArtifactChecksum !==
        source.manifest.materialArtifactChecksum ||
      candidate.baseScenario.dataset.datasetChecksum !== source.dataset.manifest.canonicalChecksum
    )
      issues.push(`${candidate.candidateId} base material identity is stale`);
    if (
      candidate.dataset.datasetId !== expectedDataset.manifest.datasetId ||
      candidate.dataset.datasetVersion !== expectedDataset.manifest.datasetVersion ||
      candidate.dataset.datasetChecksum !== expectedDataset.manifest.canonicalChecksum
    )
      issues.push(`${candidate.candidateId} dataset identity is stale`);
    if (
      variant &&
      candidate.management?.materialArtifactChecksum !== variant.materialArtifactChecksum
    )
      issues.push(`${candidate.candidateId} management material identity is stale`);
    if (
      canonicalSerialize(candidate.sourceProvenance) !==
      canonicalSerialize(expectedSourceProvenance)
    )
      issues.push(`${candidate.candidateId} source provenance is stale`);
    const {
      state: _state,
      decisionKind: _decisionKind,
      generatorSeed: _generatorSeed,
      materialSetChecksum: _materialSetChecksum,
      selectionRationaleHe: _selectionRationaleHe,
      requiredReviewScopes: _requiredReviewScopes,
      licensing: _licensing,
      ...materialSet
    } = candidate;
    void _state;
    void _decisionKind;
    void _generatorSeed;
    void _materialSetChecksum;
    void _selectionRationaleHe;
    void _requiredReviewScopes;
    void _licensing;
    if (candidate.materialSetChecksum !== checksum(materialSet))
      issues.push(`${candidate.candidateId} material-set checksum mismatch`);
  }
  if (registry.length !== 3)
    issues.push('publication registry must contain exactly three candidates');
  for (const decision of ['long', 'short', 'no-trade'] as const)
    if (registry.filter((candidate) => candidate.decisionKind === decision).length !== 1)
      issues.push(`publication registry must contain exactly one ${decision} candidate`);
  return Object.freeze([...new Set(issues)].sort());
}

export const publicationCandidateEvidence: Readonly<
  Record<string, readonly ReviewEvidenceFileV1[]>
> = deepFreeze({
  'publication-candidate-long-v1': [
    {
      evidenceId: 'long-decision-browser',
      kind: 'browser-screenshot',
      path: 'docs/screenshots/m7-publication-candidate-long-decision-browser.png',
      checksum: 'sha256:5775d8ed78649175991cf094c1758da49441f00cdcecbba9096e0eeff474a2c6',
      sizeBytes: 62_850,
      widthPixels: 390,
      heightPixels: 844,
      status: 'supporting-only',
      descriptionHe: 'מצב החלטת לונג בדפדפן; אינו אישור נגישות או בדיקת מכשיר מקורי.',
    },
    {
      evidenceId: 'long-opening-ambiguity-browser',
      kind: 'browser-screenshot',
      path: 'docs/screenshots/position-management-ambiguity-light-phone.png',
      checksum: 'sha256:5fde4d720360a2ae8483b30638b30589a039738a5408367e410f8fda1daf4e21',
      sizeBytes: 57_314,
      widthPixels: 390,
      heightPixels: 844,
      status: 'supporting-only',
      descriptionHe: 'עמימות ניהול מפורשת בדפדפן; אין הכרעת OHLCV מיטיבה.',
    },
  ],
  'publication-candidate-short-v1': [
    {
      evidenceId: 'short-decision-browser',
      kind: 'browser-screenshot',
      path: 'docs/screenshots/m7-publication-candidate-short-decision-browser.png',
      checksum: 'sha256:df8d755868ca2ce9fccf5799238472ba697d67572e73a29808f85acfbe8c79bb',
      sizeBytes: 72_689,
      widthPixels: 430,
      heightPixels: 932,
      status: 'supporting-only',
      descriptionHe: 'מצב תרחיש שורט עיוור בדפדפן; אינו בדיקת TalkBack או מכשיר Android.',
    },
  ],
  'publication-candidate-no-trade-v1': [
    {
      evidenceId: 'no-trade-decision-browser',
      kind: 'browser-screenshot',
      path: 'docs/screenshots/scenario-no-trade-decision-light-phone.png',
      checksum: 'sha256:6d8a65193174848b73f2071f67ab68a875081cc00063feb92da565e03702aed0',
      sizeBytes: 48_295,
      widthPixels: 390,
      heightPixels: 844,
      status: 'supporting-only',
      descriptionHe: 'החלטת אי־עסקה בדפדפן עם ניסוח עברי מפורש.',
    },
    {
      evidenceId: 'no-trade-debrief-browser',
      kind: 'browser-screenshot',
      path: 'docs/screenshots/scenario-no-trade-debrief-light-phone.png',
      checksum: 'sha256:8146899b697dd8719019323d0c4eab4ce56e355999ccb2ec4380325ccab67e73',
      sizeBytes: 57_316,
      widthPixels: 390,
      heightPixels: 844,
      status: 'supporting-only',
      descriptionHe: 'תחקיר אי־עסקה בדפדפן; התוצאה אינה משנה את ציון התהליך.',
    },
  ],
});
