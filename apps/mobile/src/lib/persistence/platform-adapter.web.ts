import {
  LocalStoragePersistenceAdapter,
  type LocalStorageAdapterOptions,
} from './local-storage-adapter';

export type PlatformPersistenceAdapterOptions = LocalStorageAdapterOptions;

export function createPlatformPersistenceAdapter(
  options: PlatformPersistenceAdapterOptions = {},
): LocalStoragePersistenceAdapter {
  return new LocalStoragePersistenceAdapter(options);
}
