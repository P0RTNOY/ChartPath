import {
  assertCompatibleAnalysisChartIdentity,
  type AnalysisChartIdentity,
  type Attempt,
  type Difficulty,
} from '@chartpath/domain';

import { PersistenceCorruptionError } from './adapter';
import {
  ATTEMPT_RECORD_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  type LearnerSettings,
  type NewAttemptRecord,
  type PersistedAttempt,
} from './types';

const ID_MAX_LENGTH = 200;
const MAX_SKILLS_PER_ATTEMPT = 32;
const MAX_JSON_DEPTH = 20;
const MAX_JSON_KEYS = 1_000;

function fail(message: string): never {
  throw new PersistenceCorruptionError(message);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > ID_MAX_LENGTH) {
    fail(`${field} must be a non-empty string of at most ${ID_MAX_LENGTH} characters.`);
  }
}

export function assertUtcTimestamp(value: unknown, field: string): asserts value is string {
  assertNonEmptyString(value, field);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail(`${field} must be an ISO-8601 UTC timestamp.`);
  }
}

export function assertLocalDate(value: unknown, field: string): asserts value is string {
  assertNonEmptyString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${field} must use YYYY-MM-DD.`);
  const [year, month, day] = value.split('-').map(Number);
  const canonical = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0))
    .toISOString()
    .slice(0, 10);
  if (canonical !== value) fail(`${field} must be a valid calendar date.`);
}

function assertFiniteRange(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    fail(`${field} must be a finite number between ${minimum} and ${maximum}.`);
  }
}

function assertIntegerRange(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): asserts value is number {
  assertFiniteRange(value, field, minimum, maximum);
  if (!Number.isInteger(value)) fail(`${field} must be an integer.`);
}

function assertJsonCompatible(value: unknown, field: string, depth = 0): void {
  if (depth > MAX_JSON_DEPTH) fail(`${field} exceeds the supported JSON depth.`);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(`${field} contains a non-finite number.`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_JSON_KEYS) fail(`${field} is too large.`);
    value.forEach((item, index) => assertJsonCompatible(item, `${field}[${index}]`, depth + 1));
    return;
  }
  if (!isObject(value)) fail(`${field} is not JSON-compatible.`);
  const entries = Object.entries(value);
  if (entries.length > MAX_JSON_KEYS) fail(`${field} is too large.`);
  for (const [key, item] of entries) {
    if (item === undefined) continue;
    assertJsonCompatible(item, `${field}.${key}`, depth + 1);
  }
}

function assertStringArray(
  value: unknown,
  field: string,
  maximum = 200,
): asserts value is string[] {
  if (!Array.isArray(value) || value.length > maximum) fail(`${field} must be a bounded array.`);
  value.forEach((item, index) => assertNonEmptyString(item, `${field}[${index}]`));
}

function assertChartAnchor(value: unknown, field: string): void {
  if (!isObject(value)) fail(`${field} must be an object.`);
  assertIntegerRange(value.candleIndex, `${field}.candleIndex`, 0, 1_000_000);
  assertFiniteRange(value.price, `${field}.price`, -1_000_000_000_000, 1_000_000_000_000);
}

function assertAnswer(value: unknown, allowCapstone = true): void {
  if (!isObject(value) || typeof value.kind !== 'string') {
    fail('attempt.answer must be a discriminated answer object.');
  }
  switch (value.kind) {
    case 'multiple-choice':
      assertNonEmptyString(value.optionId, 'attempt.answer.optionId');
      break;
    case 'selection':
      assertStringArray(value.selectedIds, 'attempt.answer.selectedIds');
      break;
    case 'sequence':
      assertStringArray(value.orderedIds, 'attempt.answer.orderedIds');
      break;
    case 'point':
      if (!Array.isArray(value.points) || value.points.length > 200) {
        fail('attempt.answer.points must be a bounded array.');
      }
      value.points.forEach((point, index) =>
        assertChartAnchor(point, `attempt.answer.points[${index}]`),
      );
      break;
    case 'zone':
      if (!isObject(value.zone)) fail('attempt.answer.zone must be an object.');
      assertIntegerRange(
        value.zone.startCandleIndex,
        'attempt.answer.zone.startCandleIndex',
        0,
        1_000_000,
      );
      assertIntegerRange(
        value.zone.endCandleIndex,
        'attempt.answer.zone.endCandleIndex',
        0,
        1_000_000,
      );
      assertFiniteRange(
        value.zone.priceLow,
        'attempt.answer.zone.priceLow',
        -1_000_000_000_000,
        1_000_000_000_000,
      );
      assertFiniteRange(
        value.zone.priceHigh,
        'attempt.answer.zone.priceHigh',
        -1_000_000_000_000,
        1_000_000_000_000,
      );
      if (
        value.zone.startCandleIndex > value.zone.endCandleIndex ||
        value.zone.priceLow > value.zone.priceHigh
      ) {
        fail('attempt.answer.zone bounds are reversed.');
      }
      break;
    case 'line':
      if (!isObject(value.line)) fail('attempt.answer.line must be an object.');
      assertChartAnchor(value.line.start, 'attempt.answer.line.start');
      assertChartAnchor(value.line.end, 'attempt.answer.line.end');
      break;
    case 'risk': {
      if (!isObject(value.values)) fail('attempt.answer.values must be an object.');
      const allowed = new Set([
        'accountRisk',
        'stopDistance',
        'perUnitRisk',
        'positionSize',
        'riskMultiple',
      ]);
      for (const [key, item] of Object.entries(value.values)) {
        if (!allowed.has(key)) fail(`attempt.answer.values.${key} is unsupported.`);
        assertFiniteRange(
          item,
          `attempt.answer.values.${key}`,
          -1_000_000_000_000,
          1_000_000_000_000,
        );
      }
      break;
    }
    case 'decision':
      if (
        !['trade', 'wait', 'reject', 'no-trade', 'insufficient-evidence'].includes(
          String(value.decision),
        )
      ) {
        fail('attempt.answer.decision is unsupported.');
      }
      if (value.reasonIds !== undefined) {
        assertStringArray(value.reasonIds, 'attempt.answer.reasonIds');
      }
      if (value.optionId !== undefined) {
        assertNonEmptyString(value.optionId, 'attempt.answer.optionId');
      }
      break;
    case 'label-placement': {
      if (
        !Array.isArray(value.placements) ||
        value.placements.length === 0 ||
        value.placements.length > 200
      ) {
        fail('attempt.answer.placements must be a non-empty bounded array.');
      }
      const labelIds = new Set<string>();
      value.placements.forEach((placement, index) => {
        if (!isObject(placement)) fail(`attempt.answer.placements[${index}] must be an object.`);
        assertNonEmptyString(placement.labelId, `attempt.answer.placements[${index}].labelId`);
        if (labelIds.has(placement.labelId)) {
          fail(`attempt.answer.placements contains duplicate label ${placement.labelId}.`);
        }
        labelIds.add(placement.labelId);
        assertChartAnchor(placement.anchor, `attempt.answer.placements[${index}].anchor`);
      });
      break;
    }
    case 'capstone': {
      if (!allowCapstone) fail('attempt.answer cannot contain a nested capstone answer.');
      if (
        !Array.isArray(value.stepAnswers) ||
        value.stepAnswers.length === 0 ||
        value.stepAnswers.length > 32
      ) {
        fail('attempt.answer.stepAnswers must be a non-empty bounded array.');
      }
      const stepIds = new Set<string>();
      value.stepAnswers.forEach((stepAnswer, index) => {
        if (!isObject(stepAnswer)) {
          fail(`attempt.answer.stepAnswers[${index}] must be an object.`);
        }
        assertNonEmptyString(stepAnswer.stepId, `attempt.answer.stepAnswers[${index}].stepId`);
        if (stepIds.has(stepAnswer.stepId)) {
          fail(`attempt.answer.stepAnswers contains duplicate step ${stepAnswer.stepId}.`);
        }
        stepIds.add(stepAnswer.stepId);
        assertAnswer(stepAnswer.answer, false);
      });
      break;
    }
    default:
      fail(`attempt.answer kind ${value.kind} is unsupported.`);
  }
  assertJsonCompatible(value, 'attempt.answer');
}

function assertAttempt(value: unknown): asserts value is Attempt {
  if (!isObject(value)) fail('attempt must be an object.');
  assertNonEmptyString(value.id, 'attempt.id');
  assertNonEmptyString(value.exerciseId, 'attempt.exerciseId');
  assertNonEmptyString(value.contentVersionId, 'attempt.contentVersionId');
  assertUtcTimestamp(value.startedAt, 'attempt.startedAt');
  assertUtcTimestamp(value.submittedAt, 'attempt.submittedAt');
  if (Date.parse(value.submittedAt) < Date.parse(value.startedAt)) {
    fail('attempt.submittedAt cannot precede attempt.startedAt.');
  }
  assertAnswer(value.answer);
  if (!isObject(value.result)) fail('attempt.result must be an object.');
  if (typeof value.result.correct !== 'boolean') fail('attempt.result.correct must be boolean.');
  assertFiniteRange(value.result.score, 'attempt.result.score', 0, 1);
  assertNonEmptyString(value.result.feedbackCode, 'attempt.result.feedbackCode');
  assertNonEmptyString(value.result.graderVersion, 'attempt.result.graderVersion');
  if (!Array.isArray(value.result.details) || value.result.details.length > 200) {
    fail('attempt.result.details must be a bounded array.');
  }
  value.result.details.forEach((detail, index) => {
    if (!isObject(detail)) fail(`attempt.result.details[${index}] must be an object.`);
    assertNonEmptyString(detail.key, `attempt.result.details[${index}].key`);
    if (!['string', 'number', 'boolean'].includes(typeof detail.value)) {
      fail(`attempt.result.details[${index}].value has an invalid type.`);
    }
    if (typeof detail.value === 'number' && !Number.isFinite(detail.value)) {
      fail(`attempt.result.details[${index}].value must be finite.`);
    }
  });
  if (!Array.isArray(value.result.misconceptionIds)) {
    fail('attempt.result.misconceptionIds must be an array.');
  }
  if (value.result.misconceptionIds.length > 200) {
    fail('attempt.result.misconceptionIds is too large.');
  }
  value.result.misconceptionIds.forEach((id, index) =>
    assertNonEmptyString(id, `attempt.result.misconceptionIds[${index}]`),
  );
  assertStringArray(value.hintIdsUsed, 'attempt.hintIdsUsed');
  if (value.responseTimeMs !== undefined) {
    assertIntegerRange(value.responseTimeMs, 'attempt.responseTimeMs', 0, 86_400_000);
  }
}

export function normalizeAttemptRecord(value: NewAttemptRecord | unknown): PersistedAttempt {
  if (!isObject(value)) fail('attempt record must be an object.');
  assertAttempt(value.attempt);
  assertNonEmptyString(value.lessonId, 'lessonId');
  if (!Array.isArray(value.skillIds) || value.skillIds.length === 0) {
    fail('skillIds must contain at least one skill.');
  }
  if (value.skillIds.length > MAX_SKILLS_PER_ATTEMPT) fail('skillIds contains too many skills.');
  value.skillIds.forEach((id, index) => assertNonEmptyString(id, `skillIds[${index}]`));
  assertIntegerRange(value.difficulty, 'difficulty', 1, 5);
  assertIntegerRange(value.exerciseVersion, 'exerciseVersion', 1, 1_000_000);
  if (value.generatorVersion !== undefined) {
    assertNonEmptyString(value.generatorVersion, 'generatorVersion');
  }
  if (value.analysisChartIdentity !== undefined) {
    try {
      assertCompatibleAnalysisChartIdentity(
        value.analysisChartIdentity as AnalysisChartIdentity,
        value.analysisChartIdentity as AnalysisChartIdentity,
      );
    } catch (error) {
      fail(
        `analysisChartIdentity is invalid: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
  if (typeof value.isReview !== 'boolean') fail('isReview must be boolean.');
  assertIntegerRange(value.xpAwarded, 'xpAwarded', 0, 1_000_000);
  assertLocalDate(value.activityDate, 'activityDate');
  assertIntegerRange(value.dailyGoalMinutes, 'dailyGoalMinutes', 1, 1_440);
  assertFiniteRange(value.activeMinutes, 'activeMinutes', 0, 1_440);
  if (typeof value.completesLesson !== 'boolean') fail('completesLesson must be boolean.');
  if (value.schemaVersion !== undefined && value.schemaVersion !== ATTEMPT_RECORD_SCHEMA_VERSION) {
    fail(`Unsupported attempt record schema ${String(value.schemaVersion)}.`);
  }

  return {
    attempt: value.attempt,
    lessonId: value.lessonId,
    skillIds: [...new Set(value.skillIds)].sort(),
    difficulty: value.difficulty as Difficulty,
    exerciseVersion: value.exerciseVersion,
    ...(value.generatorVersion === undefined ? {} : { generatorVersion: value.generatorVersion }),
    ...(value.analysisChartIdentity === undefined
      ? {}
      : { analysisChartIdentity: value.analysisChartIdentity as AnalysisChartIdentity }),
    isReview: value.isReview,
    xpAwarded: value.xpAwarded,
    activityDate: value.activityDate,
    dailyGoalMinutes: value.dailyGoalMinutes,
    activeMinutes: value.activeMinutes,
    completesLesson: value.completesLesson,
    schemaVersion: ATTEMPT_RECORD_SCHEMA_VERSION,
  };
}

export function normalizeSettings(value: unknown): LearnerSettings {
  if (!isObject(value)) fail('settings must be an object.');
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS, ...value };
  if (!['system', 'light', 'dark'].includes(String(merged.theme))) fail('Invalid theme setting.');
  if (typeof merged.reducedMotion !== 'boolean') fail('Invalid reducedMotion setting.');
  if (typeof merged.hapticsEnabled !== 'boolean') fail('Invalid hapticsEnabled setting.');
  if (!['system', 'large', 'extra-large'].includes(String(merged.textScale))) {
    fail('Invalid textScale setting.');
  }
  assertIntegerRange(merged.dailyGoalMinutes, 'settings.dailyGoalMinutes', 1, 1_440);
  if (merged.disclaimerVersionAccepted !== null) {
    assertNonEmptyString(merged.disclaimerVersionAccepted, 'settings.disclaimerVersionAccepted');
  }
  if (merged.disclaimerAcceptedAt !== null) {
    assertUtcTimestamp(merged.disclaimerAcceptedAt, 'settings.disclaimerAcceptedAt');
  }
  if ((merged.disclaimerVersionAccepted === null) !== (merged.disclaimerAcceptedAt === null)) {
    fail('Disclaimer version and acceptance time must be set together.');
  }
  return {
    theme: merged.theme as LearnerSettings['theme'],
    reducedMotion: merged.reducedMotion,
    hapticsEnabled: merged.hapticsEnabled,
    textScale: merged.textScale as LearnerSettings['textScale'],
    dailyGoalMinutes: merged.dailyGoalMinutes,
    disclaimerVersionAccepted: merged.disclaimerVersionAccepted,
    disclaimerAcceptedAt: merged.disclaimerAcceptedAt,
  } as LearnerSettings;
}

export function canonicalStringify(value: unknown): string {
  const visit = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(visit);
    if (!isObject(input)) return input;
    return Object.fromEntries(
      Object.entries(input)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, visit(item)]),
    );
  };
  return JSON.stringify(visit(value));
}
