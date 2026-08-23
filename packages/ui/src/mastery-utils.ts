import type { BadgeTone } from './badge';

export interface MasteryLevel {
  minimumPercent: number;
  label: string;
  tone: BadgeTone;
}

export const defaultMasteryLevels: readonly MasteryLevel[] = [
  { minimumPercent: 90, label: 'שליטה גבוהה', tone: 'success' },
  { minimumPercent: 70, label: 'מבוסס', tone: 'teal' },
  { minimumPercent: 40, label: 'בתרגול', tone: 'info' },
  { minimumPercent: 1, label: 'מתחילים', tone: 'warning' },
  { minimumPercent: 0, label: 'טרם התחיל', tone: 'neutral' },
];

export function getMasteryLevel(
  percent: number,
  levels: readonly MasteryLevel[] = defaultMasteryLevels,
): MasteryLevel {
  const sortedLevels = [...levels].sort((a, b) => b.minimumPercent - a.minimumPercent);
  return (
    sortedLevels.find((level) => percent >= level.minimumPercent) ?? {
      minimumPercent: 0,
      label: 'טרם התחיל',
      tone: 'neutral',
    }
  );
}
