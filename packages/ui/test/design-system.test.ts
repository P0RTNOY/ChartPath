import { describe, expect, it } from 'vitest';

import { isTextOnlyBadgeContent } from '../src/badge-utils';
import { isolateLtrRunsInHebrew } from '../src/bidi';
import { defaultMasteryLevels, getMasteryLevel } from '../src/mastery-utils';
import { normalizeProgress } from '../src/progress-utils';
import { darkColors, lightColors, normalizeTextScale } from '../src/tokens';

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);

  if (channels === undefined || channels.length !== 3) {
    throw new Error(`Expected an opaque six-digit hex color, received ${hex}`);
  }

  return channels
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme accessibility', () => {
  it.each([
    ['light body text', lightColors.text, lightColors.background],
    ['light muted text', lightColors.textMuted, lightColors.background],
    ['light primary action', lightColors.onPrimary, lightColors.primary],
    ['light danger action', lightColors.onDanger, lightColors.dangerStrong],
    ['dark body text', darkColors.text, darkColors.background],
    ['dark muted text', darkColors.textMuted, darkColors.background],
    ['dark primary action', darkColors.onPrimary, darkColors.primary],
    ['dark danger action', darkColors.onDanger, darkColors.dangerStrong],
  ])('%s meets WCAG AA normal-text contrast', (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('normalizeProgress', () => {
  it('clamps values and protects against invalid inputs', () => {
    expect(normalizeProgress(125)).toEqual({ value: 100, max: 100, ratio: 1, percent: 100 });
    expect(normalizeProgress(-4)).toEqual({ value: 0, max: 100, ratio: 0, percent: 0 });
    expect(normalizeProgress(Number.NaN, 0)).toEqual({
      value: 0,
      max: 100,
      ratio: 0,
      percent: 0,
    });
  });

  it('supports non-percentage scales', () => {
    expect(normalizeProgress(3, 4)).toEqual({ value: 3, max: 4, ratio: 0.75, percent: 75 });
  });
});

describe('isolateLtrRunsInHebrew', () => {
  it('isolates Latin and numeric runs only inside mixed Hebrew text', () => {
    expect(isolateLtrRunsInHebrew('יחס 1.5R עם ATR ו־HH/HL')).toBe(
      'יחס \u20661.5R\u2069 עם \u2066ATR\u2069 ו־\u2066HH/HL\u2069',
    );
    expect(isolateLtrRunsInHebrew('עברית בלבד')).toBe('עברית בלבד');
    expect(isolateLtrRunsInHebrew('English only 1.5R')).toBe('English only 1.5R');
  });
});

describe('isTextOnlyBadgeContent', () => {
  it('recognizes interpolated text fragments that React passes as an array', () => {
    expect(isTextOnlyBadgeContent(['שיעור ', 1, ' מתוך 12'])).toBe(true);
    expect(isTextOnlyBadgeContent(['רמז ', 2])).toBe(true);
    expect(isTextOnlyBadgeContent([{ type: 'custom-text' }])).toBe(false);
  });
});

describe('normalizeTextScale', () => {
  it('keeps user-controlled text scaling within a layout-safe accessible range', () => {
    expect(normalizeTextScale(1.15)).toBe(1.15);
    expect(normalizeTextScale(0.5)).toBe(1);
    expect(normalizeTextScale(2)).toBe(1.4);
    expect(normalizeTextScale(Number.NaN)).toBe(1);
  });
});

describe('getMasteryLevel', () => {
  it('uses deterministic transparent thresholds', () => {
    expect(getMasteryLevel(0, defaultMasteryLevels).label).toBe('טרם התחיל');
    expect(getMasteryLevel(40, defaultMasteryLevels).label).toBe('בתרגול');
    expect(getMasteryLevel(90, defaultMasteryLevels).label).toBe('שליטה גבוהה');
  });
});
