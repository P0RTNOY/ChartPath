import type { HistoricalDataset, Sha256Checksum } from './types.js';
import { sha256Hex } from './sha256.js';

function serialize(value: unknown, seen: Set<object>): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TypeError('Canonical JSON only supports finite numbers.');
    if (Object.is(value, -0)) throw new TypeError('Canonical JSON does not support negative zero.');
    return JSON.stringify(value);
  }
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    throw new TypeError(`Canonical JSON does not support ${typeof value} values.`);
  }
  if (typeof value === 'bigint')
    throw new TypeError('Canonical JSON does not support bigint values.');
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError('Canonical JSON does not support circular values.');
    if (Object.keys(value).length !== value.length)
      throw new TypeError(
        'Canonical JSON does not support sparse arrays or custom array properties.',
      );
    seen.add(value);
    const result = `[${value.map((item) => serialize(item, seen)).join(',')}]`;
    seen.delete(value);
    return result;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) throw new TypeError('Canonical JSON does not support circular values.');
    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null)
      throw new TypeError('Canonical JSON only supports plain objects.');
    seen.add(value);
    const entries = Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${serialize(item, seen)}`);
    seen.delete(value);
    return `{${entries.join(',')}}`;
  }
  throw new TypeError('Unsupported canonical JSON value.');
}

export function canonicalSerialize(value: unknown): string {
  return serialize(value, new Set<object>());
}

export function canonicalDatasetPayload(dataset: HistoricalDataset): string {
  const manifest = Object.fromEntries(
    Object.entries(dataset.manifest).filter(([key]) => key !== 'canonicalChecksum'),
  );
  return canonicalSerialize({
    manifest,
    candles: dataset.candles,
    corporateActions: dataset.corporateActions,
    missingIntervals: dataset.missingIntervals,
  });
}

export function computeCanonicalDatasetChecksum(dataset: HistoricalDataset): Sha256Checksum {
  return `sha256:${sha256Hex(canonicalDatasetPayload(dataset))}`;
}
