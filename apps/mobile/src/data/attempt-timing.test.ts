import { boundedAttemptTiming, MAX_ACTIVE_MINUTES, MAX_RESPONSE_TIME_MS } from './attempt-timing';

describe('boundedAttemptTiming', () => {
  it('clamps a backgrounded multi-day session to persistence limits', () => {
    expect(boundedAttemptTiming('2026-08-20T08:00:00.000Z', '2026-08-23T12:00:00.000Z')).toEqual({
      responseTimeMs: MAX_RESPONSE_TIME_MS,
      activeMinutes: MAX_ACTIVE_MINUTES,
    });
  });

  it('keeps clock skew diagnostic-only and saveable', () => {
    expect(boundedAttemptTiming('2026-08-23T12:00:00.000Z', '2026-08-23T11:00:00.000Z')).toEqual({
      responseTimeMs: 0,
      activeMinutes: 1,
    });
  });
});
