export const HISTORICAL_DATA_SCHEMA_VERSION = 1 as const;
export const HISTORICAL_SCENARIO_SCHEMA_VERSION = 1 as const;

export type Sha256Checksum = `sha256:${string}`;

export type PermittedUseStatus =
  'verified' | 'commercial-agreement-required' | 'unclear' | 'blocked';
export type RedistributionStatus = 'verified' | 'prohibited' | 'unclear';
export type DatasetPublicationStatus =
  'development-only' | 'internal' | 'publishable' | 'published';

export interface HistoricalDataLicense {
  readonly licenseName: string;
  readonly permittedUseStatus: PermittedUseStatus;
  readonly redistributionStatus: RedistributionStatus;
  readonly attributionRequirements: string;
  readonly evidenceReviewedAt: string;
  readonly evidenceNotes: string;
}

export interface HistoricalDataProvenance {
  readonly providerId: string;
  readonly providerName: string;
  readonly origin: 'chartpath-generated' | 'exchange' | 'market-data-provider' | 'other';
  readonly sourceUrl: string;
  readonly datasetOrEndpointId: string;
  readonly retrievedAt: string;
  readonly termsUrl: string;
  readonly license: HistoricalDataLicense;
  readonly knownLimitations: readonly string[];
}

export type CandleInterval =
  | { readonly unit: 'minute'; readonly value: number; readonly milliseconds: number }
  | { readonly unit: 'hour'; readonly value: number; readonly milliseconds: number }
  | { readonly unit: 'day'; readonly value: number; readonly milliseconds: number };

export type AdjustmentMode = 'raw' | 'split-adjusted' | 'total-return-adjusted';

export interface AdjustmentPolicy {
  readonly mode: AdjustmentMode;
  readonly splitPolicy: 'unadjusted' | 'adjusted';
  readonly dividendPolicy: 'unadjusted' | 'adjusted';
  readonly corporateActionPolicy: 'explicit-actions-only';
}

export type SessionClassification = 'pre-market' | 'regular' | 'after-hours' | 'continuous';

export interface TradingSessionPolicy {
  readonly calendarId: string;
  readonly includedSessions: readonly SessionClassification[];
  readonly regularSessionOpen: string;
  readonly regularSessionClose: string;
  readonly timestampConvention: 'start';
}

export interface DeclaredIntervalIrregularity {
  readonly afterTimestampUtc: string;
  readonly beforeTimestampUtc: string;
  readonly reason: 'scheduled-closure' | 'trading-halt' | 'provider-limitation' | 'other';
  readonly note: string;
}

export interface MissingIntervalPolicy {
  readonly behavior: 'record-and-preserve' | 'reject';
  readonly fillPolicy: 'never-invent-candles';
  readonly declaredIrregularities: readonly DeclaredIntervalIrregularity[];
}

export interface HistoricalDatasetManifest {
  readonly datasetId: string;
  readonly schemaVersion: typeof HISTORICAL_DATA_SCHEMA_VERSION;
  readonly datasetVersion: string;
  readonly provenance: HistoricalDataProvenance;
  readonly rawChecksum: Sha256Checksum;
  readonly canonicalChecksum: Sha256Checksum;
  readonly symbol: string;
  readonly displaySymbol: string;
  readonly exchange: string;
  readonly mic?: string;
  readonly currency: string;
  readonly exchangeTimezone: string;
  readonly interval: CandleInterval;
  readonly startTimestampUtc: string;
  readonly endTimestampUtc: string;
  readonly candleCount: number;
  readonly pricePrecision: number;
  readonly volumeUnit: string;
  readonly adjustment: AdjustmentPolicy;
  readonly sessionPolicy: TradingSessionPolicy;
  readonly missingIntervalPolicy: MissingIntervalPolicy;
  readonly publicationStatus: DatasetPublicationStatus;
  readonly anonymizedLearnerIdentity?: string;
}

export interface CandleAdjustmentMetadata {
  readonly mode: AdjustmentMode;
  readonly cumulativePriceFactor: number;
  readonly actionIds: readonly string[];
}

export interface HistoricalCandle {
  readonly index: number;
  readonly timestampUtc: string;
  readonly exchangeLocalTimestamp: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly session: SessionClassification;
  readonly adjustment?: CandleAdjustmentMetadata;
}

interface CorporateActionBase {
  readonly id: string;
  readonly effectiveAtUtc: string;
  readonly announcedAtUtc: string;
  readonly knownFromCandleIndex: number;
  readonly sourceUrl: string;
}

export type CorporateAction =
  | (CorporateActionBase & {
      readonly kind: 'split' | 'reverse-split';
      readonly numerator: number;
      readonly denominator: number;
    })
  | (CorporateActionBase & {
      readonly kind: 'cash-dividend';
      readonly amount: number;
      readonly currency: string;
    })
  | (CorporateActionBase & {
      readonly kind: 'symbol-change';
      readonly previousSymbol: string;
      readonly nextSymbol: string;
    })
  | (CorporateActionBase & {
      readonly kind: 'other';
      readonly description: string;
      readonly priceAffecting: boolean;
    });

export interface RecordedMissingInterval {
  readonly afterCandleIndex: number;
  readonly beforeCandleIndex: number;
  readonly firstMissingTimestampUtc: string;
  readonly lastMissingTimestampUtc: string;
  readonly missingCandleCount: number;
  readonly reason: 'source-omission' | 'declared-irregularity';
}

export interface HistoricalDataset {
  readonly manifest: HistoricalDatasetManifest;
  readonly candles: readonly HistoricalCandle[];
  readonly corporateActions: readonly CorporateAction[];
  readonly missingIntervals: readonly RecordedMissingInterval[];
}

export interface EducationalSourceReference {
  readonly sourceId: string;
  readonly pageStart: number;
  readonly pageEnd: number;
  readonly section: string;
}

export type ScenarioEditorialStatus = 'draft' | 'internal' | 'reviewed' | 'published';

export interface ScenarioAnnotation {
  readonly id: string;
  readonly kind: 'point' | 'horizontal-level' | 'trendline' | 'zone' | 'label';
  readonly visibleFromCandleIndex: number;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
}

export interface HistoricalReplayScenario {
  readonly scenarioId: string;
  readonly schemaVersion: typeof HISTORICAL_SCENARIO_SCHEMA_VERSION;
  readonly scenarioVersion: string;
  readonly dataset: {
    readonly datasetId: string;
    readonly datasetVersion: string;
    readonly canonicalChecksum: Sha256Checksum;
  };
  readonly educationalContentId: string;
  readonly decisionCandleIndex: number;
  readonly initialVisibleRange: {
    readonly startCandleIndex: number;
    readonly endCandleIndex: number;
  };
  readonly permittedReplayBoundaryIndex: number;
  readonly knowledgeCutoffIndex: number;
  readonly blindMode: boolean;
  readonly revealPolicy: 'after-finalization' | 'never';
  readonly blindTitleHebrew: string;
  readonly revealedTitleHebrew: string;
  readonly educationalSourceReferences: readonly EducationalSourceReference[];
  readonly marketDataProvenance: {
    readonly providerId: string;
    readonly sourceUrl: string;
    readonly termsUrl: string;
  };
  readonly publicationStatus: DatasetPublicationStatus;
  readonly editorial: {
    readonly status: ScenarioEditorialStatus;
    readonly humanReviewer?: string;
    readonly reviewedAt?: string;
  };
  readonly annotations: readonly ScenarioAnnotation[];
  readonly hebrewDisclosure: string;
  readonly deterministicRubric: {
    readonly rubricId: string;
    readonly rubricVersion: string;
    readonly graderId: string;
    readonly checksum: Sha256Checksum;
  };
  readonly futureLeakValidation: {
    readonly status: 'not-run' | 'passed' | 'failed';
    readonly validatedAt?: string;
    readonly validatorVersion: string;
  };
}

export interface HistoricalValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface HistoricalValidationReport {
  readonly valid: boolean;
  readonly publishable: boolean;
  readonly issues: readonly HistoricalValidationIssue[];
  readonly counts: {
    readonly candles: number;
    readonly corporateActions: number;
    readonly missingIntervals: number;
  };
}

export interface HistoricalSourceManifest extends Omit<
  HistoricalDatasetManifest,
  'rawChecksum' | 'canonicalChecksum' | 'startTimestampUtc' | 'endTimestampUtc' | 'candleCount'
> {
  readonly expectedRawChecksum?: Sha256Checksum;
  readonly expectedStartTimestampUtc?: string;
  readonly expectedEndTimestampUtc?: string;
  readonly expectedCandleCount?: number;
  readonly corporateActions: readonly CorporateAction[];
}

export interface HistoricalImportReport {
  readonly valid: boolean;
  readonly rawChecksum: Sha256Checksum;
  readonly canonicalChecksum?: Sha256Checksum;
  readonly rowsRead: number;
  readonly rowsAccepted: number;
  readonly recordedMissingIntervals: number;
  readonly issues: readonly HistoricalValidationIssue[];
}

export type HistoricalImportResult =
  | {
      readonly ok: true;
      readonly dataset: HistoricalDataset;
      readonly report: HistoricalImportReport;
    }
  | { readonly ok: false; readonly report: HistoricalImportReport };

export interface ReplayKnowledgeView {
  readonly scenarioId: string;
  readonly cursor: number;
  readonly candles: readonly (Omit<HistoricalCandle, 'timestampUtc' | 'exchangeLocalTimestamp'> & {
    readonly timestampUtc?: string;
    readonly exchangeLocalTimestamp?: string;
  })[];
  readonly annotations: readonly ScenarioAnnotation[];
  readonly corporateActions: readonly CorporateAction[];
  readonly visibleStatistics: {
    readonly low: number;
    readonly high: number;
    readonly volume: number;
  };
  readonly visibleScale: { readonly minimum: number; readonly maximum: number };
  readonly identity: null | {
    readonly symbol: string;
    readonly displaySymbol: string;
    readonly exchange: string;
    readonly periodStartUtc: string;
    readonly periodEndUtc: string;
  };
  readonly titleHebrew: string;
  readonly accessibilityLabel: string;
}
