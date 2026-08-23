export interface NormalizedProgress {
  value: number;
  max: number;
  ratio: number;
  percent: number;
}

export function normalizeProgress(value: number, max = 100): NormalizedProgress {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const finiteValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(Math.max(finiteValue, 0), safeMax);
  const ratio = clampedValue / safeMax;

  return {
    value: clampedValue,
    max: safeMax,
    ratio,
    percent: ratio * 100,
  };
}
