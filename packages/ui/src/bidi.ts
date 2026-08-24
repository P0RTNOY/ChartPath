const LTR_ISOLATE = '\u2066';
const POP_DIRECTIONAL_ISOLATE = '\u2069';
const HEBREW_CHARACTER = /[\u0590-\u05ff]/u;
const LTR_TOKEN = /[A-Za-z0-9][A-Za-z0-9.,:/%+×=÷−\-–—]*/gu;

/** Keeps Latin abbreviations and numeric expressions stable inside authored Hebrew prose. */
export function isolateLtrRunsInHebrew(value: string): string {
  if (!HEBREW_CHARACTER.test(value) || !/[A-Za-z0-9]/.test(value)) return value;
  return value.replace(LTR_TOKEN, (token) => `${LTR_ISOLATE}${token}${POP_DIRECTIONAL_ISOLATE}`);
}
