import type { ExactSourceReference } from './types.js';

export const SOURCE_IDS = {
  canonical: 'ta-he-v2',
} as const;

export function sourceRefs(
  pdfStart: number,
  pdfEnd: number,
  bookStart: number | string,
  bookEnd: number | string,
  section: string,
): readonly ExactSourceReference[] {
  return [
    {
      sourceId: SOURCE_IDS.canonical,
      pageStart: pdfStart,
      pageEnd: pdfEnd,
      bookPageStart: bookStart,
      bookPageEnd: bookEnd,
      section,
    },
  ];
}
