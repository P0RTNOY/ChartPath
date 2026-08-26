import { canonicalSerialize, sha256Hex, type Sha256Checksum } from '@chartpath/historical-data';

import { SCENARIO_COMPILER_CONTRACT_V1, SCENARIO_COMPILER_VERSION } from '../types.js';
import { scenarioPositionManagementVariantRegistry } from '../management.js';
import { resolveScenarioCandidate } from '../registry.js';
import { publicationCandidateEvidence, publicationCandidateRegistry } from './candidates.js';
import {
  PUBLICATION_REVIEW_SCOPES,
  REVIEW_PACKET_CONTRACT_VERSION,
  type PublicationCandidateV1,
  type ReviewPacketArtifactIndexV1,
  type ReviewPacketMaterialV1,
  type ReviewPacketV1,
} from './types.js';

function checksum(value: unknown): Sha256Checksum {
  return `sha256:${sha256Hex(canonicalSerialize(value))}`;
}

function textChecksum(value: string): Sha256Checksum {
  return `sha256:${sha256Hex(value)}`;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function stableUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function resolveMaterial(candidate: PublicationCandidateV1) {
  const base = resolveScenarioCandidate(
    candidate.baseScenario.scenarioId,
    candidate.baseScenario.scenarioVersion,
  );
  if (!base) throw new Error(`Missing base scenario for ${candidate.candidateId}.`);
  const variant =
    candidate.kind === 'position-management'
      ? scenarioPositionManagementVariantRegistry.find(
          (item) =>
            item.scenarioId === candidate.scenario.scenarioId &&
            item.scenarioVersion === candidate.scenario.scenarioVersion,
        )
      : undefined;
  if (candidate.kind === 'position-management' && !variant)
    throw new Error(`Missing management variant for ${candidate.candidateId}.`);
  return { base, variant, dataset: variant?.dataset ?? base.dataset };
}

function ltr(value: string | number): string {
  return `\u2066${String(value)}\u2069`;
}

function chartAlternativeHe(candidate: PublicationCandidateV1): string {
  const { base, dataset } = resolveMaterial(candidate);
  const cutoff = base.manifest.knowledgeCutoffIndex;
  const visible = dataset.candles.slice(
    base.manifest.initialVisibleRange.startCandleIndex,
    cutoff + 1,
  );
  const selected = dataset.candles[cutoff];
  if (!selected || visible.length === 0)
    throw new Error(`Candidate ${candidate.candidateId} has no cutoff-safe chart range.`);
  const low = Math.min(...visible.map((candle) => candle.low));
  const high = Math.max(...visible.map((candle) => candle.high));
  return [
    `גרף נרות סינתטי עיוור, נרות גלויים ${ltr(base.manifest.initialVisibleRange.startCandleIndex)}–${ltr(cutoff)} בלבד.`,
    `טווח גלוי ${ltr(low)}–${ltr(high)}.`,
    `נר נבחר ${ltr(cutoff)}: פתיחה ${ltr(selected.open)}, גבוה ${ltr(selected.high)}, נמוך ${ltr(selected.low)}, סגירה ${ltr(selected.close)}, מחזור ${ltr(selected.volume)}.`,
    'אין בתיאור זה זהות נכס, תאריך נסתר, תשובה נכונה או נתון מנרות עתידיים.',
  ].join(' ');
}

function componentChecksums(candidate: PublicationCandidateV1) {
  const { base, variant } = resolveMaterial(candidate);
  const items = [
    {
      componentId: 'base-scenario-material',
      checksum: base.manifest.materialArtifactChecksum,
    },
    { componentId: 'dataset-candles', checksum: candidate.dataset.datasetChecksum },
    { componentId: 'chart-spec', checksum: base.manifest.chartSpecChecksum },
    { componentId: 'process-rubric', checksum: base.manifest.processRubric.checksum },
    {
      componentId: 'scenario-compiler-contract',
      checksum: checksum(SCENARIO_COMPILER_CONTRACT_V1),
    },
    ...candidate.sourceProvenance.map((source) => ({
      componentId: `source-provenance:${source.provenanceId}`,
      checksum: checksum(source),
    })),
    ...(base.manifest.expectedExecution
      ? [
          {
            componentId: 'base-execution-snapshot',
            checksum: base.manifest.expectedExecution.expectedSnapshot.checksum,
          },
        ]
      : []),
    ...(variant
      ? [
          {
            componentId: 'position-management-material',
            checksum: variant.materialArtifactChecksum,
          },
          {
            componentId: 'position-management-rubric',
            checksum: variant.management.rubric.checksum,
          },
          ...variant.management.expectedCases.flatMap((expectedCase) =>
            expectedCase.snapshots.map((snapshot, index) => ({
              componentId: `management-snapshot:${expectedCase.caseId}:${index}`,
              checksum: snapshot.checksum,
            })),
          ),
        ]
      : []),
  ];
  return items.sort((left, right) =>
    left.componentId < right.componentId ? -1 : left.componentId > right.componentId ? 1 : 0,
  );
}

function blockers(candidate: PublicationCandidateV1) {
  const { base, variant } = resolveMaterial(candidate);
  const scopeBlockers = PUBLICATION_REVIEW_SCOPES.map((scope) => ({
    blockerId: `review-scope:${scope}`,
    resolutionKind: 'external-attestation' as const,
    descriptionHe: `נדרשת החלטת סוקר אנושי מאומתת ועדכנית בתחום ${scope}.`,
  }));
  const inherited = stableUnique([
    ...base.publicationBlockers,
    ...(variant?.publication.blockers ?? []),
  ]).map((descriptionHe) => ({
    blockerId: `inherited:${sha256Hex(descriptionHe).slice(0, 16)}`,
    resolutionKind: 'external-evidence' as const,
    descriptionHe,
  }));
  return [
    ...scopeBlockers,
    {
      blockerId: 'licensing:redistribution-not-authorized',
      resolutionKind: 'material-change' as const,
      descriptionHe:
        'החומר המקובע מגדיר הפצה כאסורה ופרסום כפנימי; נדרשת החלטת זכויות אנושית וגרסה בלתי־משתנה חדשה לפי הצורך.',
    },
    {
      blockerId: 'native:candidate-lifecycle-open',
      resolutionKind: 'external-evidence' as const,
      descriptionHe:
        'מחזור חיים מקורי מלא, קורא מסך ומטריצת נגישות מערכת הפעלה טרם אומתו עבור המועמד המדויק.',
    },
    ...inherited,
  ].sort((left, right) =>
    left.blockerId < right.blockerId ? -1 : left.blockerId > right.blockerId ? 1 : 0,
  );
}

export function buildReviewPacketMaterial(
  candidate: PublicationCandidateV1,
): ReviewPacketMaterialV1 {
  const { base, variant, dataset } = resolveMaterial(candidate);
  const reviewerHebrewStrings = stableUnique([
    base.manifest.titleHe,
    base.manifest.promptHe,
    base.manifest.blindEvidenceSummaryHe,
    ...base.manifest.hintsHe,
    ...Object.values(base.manifest.workflowPromptsHe),
    ...base.manifest.processRubric.criteria.flatMap((criterion) => [
      criterion.criterionHe,
      criterion.expectedEvidenceHe,
    ]),
    base.manifest.accessibility.chartDescriptionHe,
    base.manifest.accessibility.interactionInstructionsHe,
    base.manifest.financialSafetyDisclosureHe,
    ...(variant?.management.rubric.criteria.flatMap((criterion) => [
      criterion.criterionHe,
      criterion.expectedEvidenceHe,
    ]) ?? []),
  ]);
  const ambiguityEvidence = variant
    ? stableUnique(
        variant.management.expectedCases.flatMap((expectedCase) =>
          expectedCase.evidence.filter((item) => item.includes('ambigu')),
        ),
      )
    : (base.execution?.evidence.filter((item) => item === 'ambiguity') ?? []);
  return deepFreeze({
    schemaVersion: 1,
    contractVersion: REVIEW_PACKET_CONTRACT_VERSION,
    canonicalization: 'canonical-json-v1',
    candidate,
    compiler: {
      scenarioCompilerVersion: SCENARIO_COMPILER_VERSION,
      scenarioCompilerContractChecksum: checksum(SCENARIO_COMPILER_CONTRACT_V1),
      chartGeneratorVersion: base.manifest.chartSpec.generatorVersion,
    },
    datasetProvenance: {
      generatorSeed: candidate.generatorSeed,
      chartSpec: base.manifest.chartSpec,
      chartSpecChecksum: base.manifest.chartSpecChecksum,
      datasetManifest: dataset.manifest,
      ...(candidate.management
        ? { futurePatchRecipe: candidate.management.datasetDerivation }
        : {}),
    },
    replay: {
      decisionCandleIndex: base.manifest.decisionCandleIndex,
      initialVisibleRange: base.manifest.initialVisibleRange,
      permittedReplayBoundaryIndex: base.manifest.permittedReplayBoundaryIndex,
      knowledgeCutoffIndex: base.manifest.knowledgeCutoffIndex,
      blind: true,
      reveal: 'after-finalization',
    },
    learnerMaterial: {
      titleHe: base.manifest.titleHe,
      promptHe: base.manifest.promptHe,
      hintsHe: base.manifest.hintsHe,
      blindEvidenceSummaryHe: base.manifest.blindEvidenceSummaryHe,
      workflowPromptsHe: base.manifest.workflowPromptsHe,
      financialSafetyDisclosureHe: base.manifest.financialSafetyDisclosureHe,
    },
    guidedAnalysis: base.manifest.guidedAnalysis,
    privateReviewerEvidence: {
      correctDecision: base.manifest.application,
      processRubric: base.manifest.processRubric,
      ...(base.scenario.paperExecution
        ? { paperExecutionConfiguration: base.scenario.paperExecution }
        : {}),
      ...(base.manifest.expectedExecution
        ? { expectedBaseExecution: base.manifest.expectedExecution }
        : {}),
      ...(variant ? { positionManagementConfiguration: variant.management } : {}),
      ...(base.manifest.expectedExecution
        ? { initialPaperPlan: base.manifest.expectedExecution.plan }
        : {}),
      ...(variant ? { expectedManagementCases: variant.management.expectedCases } : {}),
      ambiguityEvidence,
      profitAndLossAffectsScore: false,
    },
    sourceProvenance: candidate.sourceProvenance,
    licensing: {
      ...candidate.licensing,
      currentManifestRedistributionStatus: base.manifest.licensing.redistributionStatus,
      currentManifestPublicationStatus: base.manifest.licensing.publicationStatus,
      unresolvedQuestionsHe: [
        'האם מותר להפיץ את העיבוד החינוכי המבוסס על מושגי המקור?',
        'מהו נוסח הרישיון והייחוס הנדרש לנתונים הסינתטיים?',
        'האם גרסת המועמד המדויקת מאושרת להפצה מחוץ לכלי QA פנימי?',
      ],
    },
    accessibility: {
      chartAlternativeHe: chartAlternativeHe(candidate),
      interactionInstructionsHe: base.manifest.accessibility.interactionInstructionsHe,
      readingOrder: 'rtl',
      numericDirection: 'ltr',
      preservesBlindness: true,
      reviewerHebrewStrings,
      nativeVerificationStatus: 'open',
    },
    evidenceFiles: publicationCandidateEvidence[candidate.candidateId] ?? [],
    automatedTestReferences: [
      'packages/content/test/publication-candidates.test.ts',
      'packages/content/test/publication-attestations.test.ts',
      'packages/content/test/publication-preflight.test.ts',
      'packages/content/test/scenarios.test.ts',
      'packages/content/test/scenario-position-management.test.ts',
    ],
    componentChecksums: componentChecksums(candidate),
    remainingBlockers: blockers(candidate),
  }) as ReviewPacketMaterialV1;
}

export function buildReviewPacket(candidate: PublicationCandidateV1): ReviewPacketV1 {
  const material = buildReviewPacketMaterial(candidate);
  return deepFreeze({ ...material, reviewPacketChecksum: checksum(material) }) as ReviewPacketV1;
}

export function serializeReviewPacket(packet: ReviewPacketV1): string {
  const { reviewPacketChecksum, ...material } = packet;
  if (reviewPacketChecksum !== checksum(material))
    throw new Error(`Review packet checksum mismatch for ${packet.candidate.candidateId}.`);
  return `${canonicalSerialize(packet)}\n`;
}

function markdownList(values: readonly string[]): string {
  return values.length === 0 ? '- אין.' : values.map((value) => `- ${value}`).join('\n');
}

function markdownJson(value: unknown): string {
  return value === undefined
    ? '_לא חל על מועמד זה._'
    : `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function evidenceMarkdown(packet: ReviewPacketV1): string {
  if (packet.evidenceFiles.length === 0) return '- אין קובצי ראיות מוצמדים.';
  return packet.evidenceFiles
    .map((item) => {
      const dimensions =
        item.widthPixels === undefined || item.heightPixels === undefined
          ? 'לא חל'
          : `${item.widthPixels}×${item.heightPixels}`;
      return [
        `### ${item.evidenceId}`,
        '',
        `- סוג: \`${item.kind}\``,
        `- מצב: \`${item.status}\``,
        `- נתיב: \`${item.path}\``,
        `- checksum: \`${item.checksum}\``,
        `- גודל: ${item.sizeBytes} bytes`,
        `- ממדים: ${dimensions}`,
        `- תיאור: ${item.descriptionHe}`,
      ].join('\n');
    })
    .join('\n\n');
}

function sourceProvenanceMarkdown(packet: ReviewPacketV1): string {
  return packet.sourceProvenance
    .map((source, index) =>
      [
        `### ${index + 1}. ${source.provenanceId}`,
        '',
        `- תפקיד: \`${source.role}\``,
        `- מקור: \`${source.sourceId}\``,
        `- מסמך PDF: \`${source.pdfDocumentId}\``,
        `- checksum של מסמך המקור: \`${source.sourcePdfChecksum}\``,
        `- עמודי PDF פיזיים: ${source.physicalPages.start}–${source.physicalPages.end}`,
        `- עמודים מודפסים: ${source.printedPages.start}–${source.printedPages.end}`,
        `- פרק: ${source.chapter}`,
        `- איור/מקרה: ${source.figureOrCase}`,
        `- מזהי תוכן שנבדקו: ${source.reviewedContentIds.map((id) => `\`${id}\``).join(', ')}`,
        `- מושג נתמך: ${source.concept}`,
        `- מצב זכויות PDF: \`${source.sourcePdfRightsStatus}\``,
        '',
        source.originalSummaryHe,
      ].join('\n'),
    )
    .join('\n\n');
}

export function renderReviewPacketMarkdown(packet: ReviewPacketV1): string {
  const managementMaterial = packet.candidate.management
    ? packet.candidate.management.materialArtifactChecksum
    : 'לא חל';
  const workflowPrompts = Object.entries(packet.learnerMaterial.workflowPromptsHe)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([step, prompt]) => `\`${step}\`: ${prompt}`);
  return [
    `# חבילת ביקורת — ${packet.candidate.candidateId}`,
    '',
    '> חומר לביקורת אנושית בלבד. מועמד לפרסום אינו תרחיש מפורסם ואינו מעניק קרדיט.',
    '',
    '## חוזה וזהות מדויקת',
    '',
    `- Schema: \`${packet.schemaVersion}\``,
    `- Contract: \`${packet.contractVersion}\``,
    `- Canonicalization: \`${packet.canonicalization}\``,
    `- Candidate state: \`${packet.candidate.state}\``,
    `- Candidate kind: \`${packet.candidate.kind}\``,
    `- Correct decision kind: \`${packet.candidate.decisionKind}\``,
    `- Scenario: \`${packet.candidate.scenario.scenarioId}@${packet.candidate.scenario.scenarioVersion}\``,
    `- Dataset: \`${packet.candidate.dataset.datasetId}@${packet.candidate.dataset.datasetVersion}\``,
    `- Dataset checksum: \`${packet.candidate.dataset.datasetChecksum}\``,
    `- Base scenario: \`${packet.candidate.baseScenario.scenarioId}@${packet.candidate.baseScenario.scenarioVersion}\``,
    `- Base dataset: \`${packet.candidate.baseScenario.dataset.datasetId}@${packet.candidate.baseScenario.dataset.datasetVersion}\``,
    `- Base dataset checksum: \`${packet.candidate.baseScenario.dataset.datasetChecksum}\``,
    `- Base material: \`${packet.candidate.baseScenario.materialArtifactChecksum}\``,
    `- Position-management material: \`${managementMaterial}\``,
    `- Material set: \`${packet.candidate.materialSetChecksum}\``,
    `- Review packet: \`${packet.reviewPacketChecksum}\``,
    '',
    '## נימוק בחירה',
    '',
    packet.candidate.selectionRationaleHe,
    '',
    '## הידור, יצירה ונתוני מקור',
    '',
    `- Scenario compiler: \`${packet.compiler.scenarioCompilerVersion}\``,
    `- Compiler contract checksum: \`${packet.compiler.scenarioCompilerContractChecksum}\``,
    `- Chart generator: \`${packet.compiler.chartGeneratorVersion}\``,
    `- Generator seed: \`${packet.datasetProvenance.generatorSeed}\``,
    `- Chart-spec checksum: \`${packet.datasetProvenance.chartSpecChecksum}\``,
    '',
    '### Chart spec',
    '',
    markdownJson(packet.datasetProvenance.chartSpec),
    '',
    '### Dataset manifest',
    '',
    markdownJson(packet.datasetProvenance.datasetManifest),
    '',
    '### מתכון גזירת נרות עתידיים',
    '',
    markdownJson(packet.datasetProvenance.futurePatchRecipe),
    '',
    '## Replay, חיתוך ידע ועיוורון',
    '',
    `- נר החלטה: \`${packet.replay.decisionCandleIndex}\``,
    `- טווח גלוי התחלתי: \`${packet.replay.initialVisibleRange.startCandleIndex}–${packet.replay.initialVisibleRange.endCandleIndex}\``,
    `- גבול Replay מורשה: \`${packet.replay.permittedReplayBoundaryIndex}\``,
    `- חיתוך ידע: \`${packet.replay.knowledgeCutoffIndex}\``,
    `- Blind: \`${packet.replay.blind}\``,
    `- Reveal: \`${packet.replay.reveal}\``,
    '',
    '## חומר לומד בעברית ומבנה Guided Analysis',
    '',
    `### ${packet.learnerMaterial.titleHe}`,
    '',
    packet.learnerMaterial.promptHe,
    '',
    `**סיכום ראיות עיוור:** ${packet.learnerMaterial.blindEvidenceSummaryHe}`,
    '',
    `**שפת בטיחות פיננסית:** ${packet.learnerMaterial.financialSafetyDisclosureHe}`,
    '',
    '### רמזים',
    '',
    markdownList(packet.learnerMaterial.hintsHe),
    '',
    '### 11 שלבי התהליך / הנחיות עבודה',
    '',
    markdownList(workflowPrompts),
    '',
    '### Guided Analysis',
    '',
    `- מופעל: \`${packet.guidedAnalysis.enabled}\``,
    `- מספר רמזים זמין: \`${packet.guidedAnalysis.availableHintCount}\``,
    `- שומר על חיתוך ההחלטה: \`${packet.guidedAnalysis.preservesDecisionCutoff}\``,
    '',
    '## תשובה נכונה ורובריקת תהליך — פרטי לסוקר',
    '',
    '### החלטה נכונה ונימוק',
    '',
    markdownJson(packet.privateReviewerEvidence.correctDecision),
    '',
    '### רובריקת תהליך',
    '',
    markdownJson(packet.privateReviewerEvidence.processRubric),
    '',
    '## תכנית, סיכון וביצוע דטרמיניסטי',
    '',
    '### תצורת Paper Execution',
    '',
    markdownJson(packet.privateReviewerEvidence.paperExecutionConfiguration),
    '',
    '### תכנית Paper ראשונית — כניסה, סטופ, יעד וגודל',
    '',
    markdownJson(packet.privateReviewerEvidence.initialPaperPlan),
    '',
    '### אירועי ביצוע בסיסיים צפויים',
    '',
    markdownJson(packet.privateReviewerEvidence.expectedBaseExecution),
    '',
    '## הרשאות ניהול, מקרי בדיקה ו־P&L',
    '',
    '### פין חומר הניהול, מדיניות, הרשאות וגזירת dataset',
    '',
    markdownJson(packet.candidate.management),
    '',
    '### תצורת ניהול, מגבלות סיכון ופעולות מותרות',
    '',
    markdownJson(packet.privateReviewerEvidence.positionManagementConfiguration),
    '',
    '### מקרי ניהול, אירועים, עמימות ותוצאות צפויות',
    '',
    markdownJson(packet.privateReviewerEvidence.expectedManagementCases),
    '',
    '### ראיות עמימות',
    '',
    markdownList(packet.privateReviewerEvidence.ambiguityEvidence),
    '',
    `- רווח/הפסד משפיע על הציון: \`${packet.privateReviewerEvidence.profitAndLossAffectsScore}\``,
    '',
    '## מקורות חינוכיים מדויקים וסיכומים מקוריים',
    '',
    sourceProvenanceMarkdown(packet),
    '',
    '## זכויות ורישוי',
    '',
    `- מקור dataset סינתטי: \`${packet.licensing.syntheticDatasetOrigin}\``,
    `- גאומטריית תרשים הועתקה: \`${packet.licensing.chartGeometryCopied}\``,
    `- פרוזה הועתקה: \`${packet.licensing.proseCopied}\``,
    `- מצב זכויות נתונים שנוצרו: \`${packet.licensing.generatedDataRightsStatus}\``,
    `- מצב זכויות עיבוד המקור: \`${packet.licensing.sourceAdaptationRightsStatus}\``,
    `- מצב הפצה מיועד: \`${packet.licensing.intendedRedistributionMode}\``,
    `- מצב הפצה במניפסט: \`${packet.licensing.currentManifestRedistributionStatus}\``,
    `- מצב פרסום במניפסט: \`${packet.licensing.currentManifestPublicationStatus}\``,
    '',
    '### שאלות רישוי פתוחות',
    '',
    markdownList(packet.licensing.unresolvedQuestionsHe),
    '',
    '## נגישות, עברית ואימות Native',
    '',
    `- סדר קריאה: \`${packet.accessibility.readingOrder}\``,
    `- כיוון מספרי: \`${packet.accessibility.numericDirection}\``,
    `- שומר עיוורון: \`${packet.accessibility.preservesBlindness}\``,
    `- מצב אימות Native: \`${packet.accessibility.nativeVerificationStatus}\``,
    '',
    `**הוראות אינטראקציה:** ${packet.accessibility.interactionInstructionsHe}`,
    '',
    `**חלופת תרשים:** ${packet.accessibility.chartAlternativeHe}`,
    '',
    '### מחרוזות עבריות לביקורת',
    '',
    markdownList(packet.accessibility.reviewerHebrewStrings),
    '',
    '## תחומי ביקורת נדרשים',
    '',
    markdownList(packet.candidate.requiredReviewScopes),
    '',
    '## צילומי מסך וקובצי ראיות',
    '',
    evidenceMarkdown(packet),
    '',
    '## בדיקות אוטומטיות',
    '',
    markdownList(packet.automatedTestReferences.map((reference) => `\`${reference}\``)),
    '',
    '## hashes של כל רכיבי החומר שנבדקו',
    '',
    markdownList(
      packet.componentChecksums.map(
        (component) => `\`${component.componentId}\`: \`${component.checksum}\``,
      ),
    ),
    '',
    '## חסמים שנותרו',
    '',
    markdownList(
      packet.remainingBlockers.map(
        (blocker) => `${blocker.blockerId} [${blocker.resolutionKind}] — ${blocker.descriptionHe}`,
      ),
    ),
    '',
    'החבילה אינה כוללת תרשימי מקור, קטעי מקור ארוכים או קביעה משפטית.',
    '',
  ].join('\n');
}

export interface ReviewPacketArtifactBundle {
  readonly candidateId: string;
  readonly directoryName: string;
  readonly packet: ReviewPacketV1;
  readonly json: string;
  readonly markdown: string;
}

export function buildReviewPacketArtifacts(
  candidates: readonly PublicationCandidateV1[] = publicationCandidateRegistry,
): readonly ReviewPacketArtifactBundle[] {
  return candidates.map((candidate) => {
    const packet = buildReviewPacket(candidate);
    return {
      candidateId: candidate.candidateId,
      directoryName: candidate.candidateId,
      packet,
      json: serializeReviewPacket(packet),
      markdown: renderReviewPacketMarkdown(packet),
    };
  });
}

export function buildReviewPacketArtifactIndex(
  bundles: readonly ReviewPacketArtifactBundle[],
): ReviewPacketArtifactIndexV1 {
  return deepFreeze({
    schemaVersion: 1,
    contractVersion: REVIEW_PACKET_CONTRACT_VERSION,
    artifacts: [...bundles]
      .sort((left, right) =>
        left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0,
      )
      .map((bundle) => ({
        candidateId: bundle.candidateId,
        reviewPacketChecksum: bundle.packet.reviewPacketChecksum,
        json: {
          path: `${bundle.directoryName}/review-packet.canonical.jsonl`,
          checksum: textChecksum(bundle.json),
          sizeBytes: byteLength(bundle.json),
        },
        markdown: {
          path: `${bundle.directoryName}/review-packet.md`,
          checksum: textChecksum(bundle.markdown),
          sizeBytes: byteLength(bundle.markdown),
        },
      })),
  }) as ReviewPacketArtifactIndexV1;
}

export function serializeReviewPacketArtifactIndex(index: ReviewPacketArtifactIndexV1): string {
  return `${canonicalSerialize(index)}\n`;
}
