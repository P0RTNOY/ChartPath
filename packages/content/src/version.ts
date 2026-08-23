import type { ContentMigrationManifest, ContentVersion } from './types.js';

export const CONTENT_SCHEMA_VERSION = 1;
export const CONTENT_VERSION_ID = '2026.08-beta.1';

export const contentVersion: ContentVersion = {
  id: CONTENT_VERSION_ID,
  schemaVersion: CONTENT_SCHEMA_VERSION,
  generatorVersion: '1.0.0',
  titleHe: 'גרסת בטא מבוקרת — ניתוח טכני קלאסי ומודרני',
  releasedAt: '2026-08-23T00:00:00.000Z',
  sourceIds: ['ta-he-v2'],
  editorialStatus: 'reviewed',
};

export const contentMigrations: readonly ContentMigrationManifest[] = [
  {
    id: 'content-migration-2026.08-beta.0-to-2026.08-beta.1',
    fromContentVersionId: '2026.08-beta.0',
    toContentVersionId: CONTENT_VERSION_ID,
    aliases: {},
    retiredIds: [],
    invalidatedProjectionSkillIds: [],
    preservesAttempts: true,
  },
];

export function resolveMigratedContentId(id: string): string | undefined {
  let current = id;
  let changed = false;
  for (const migration of contentMigrations) {
    const next = migration.aliases[current];
    if (next) {
      current = next;
      changed = true;
    }
    if (migration.retiredIds.includes(current)) return undefined;
  }
  return changed ? current : id;
}
