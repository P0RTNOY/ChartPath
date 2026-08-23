export const MAX_RESPONSE_TIME_MS = 86_400_000;
export const MAX_ACTIVE_MINUTES = 1_440;

export interface BoundedAttemptTiming {
  readonly responseTimeMs: number;
  readonly activeMinutes: number;
}

export function boundedAttemptTiming(startedAt: string, submittedAt: string): BoundedAttemptTiming {
  const elapsed = Date.parse(submittedAt) - Date.parse(startedAt);
  const nonNegativeElapsed = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const responseTimeMs = Math.min(MAX_RESPONSE_TIME_MS, nonNegativeElapsed);
  return {
    responseTimeMs,
    activeMinutes: Math.min(MAX_ACTIVE_MINUTES, Math.max(1, Math.round(responseTimeMs / 60_000))),
  };
}
