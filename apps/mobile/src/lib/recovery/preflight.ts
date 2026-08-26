import { utf8 } from './encoding';
import {
  MAX_RECOVERY_JSON_DEPTH,
  MAX_RECOVERY_JSON_NODES,
  MAX_RECOVERY_STRING_BYTES,
  MAX_RECOVERY_TOTAL_STRING_BYTES,
} from './constants';
import { RecoveryBundleError } from './types';

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function boundedRecoveryPreflight(
  value: unknown,
  label: string,
  options: {
    readonly maximumStringBytes?: number;
    readonly maximumTotalStringBytes?: number;
  } = {},
): void {
  const seen = new WeakSet<object>();
  let nodes = 0;
  let totalStringBytes = 0;
  const countString = (input: string, path: string): void => {
    const maximumStringBytes = options.maximumStringBytes ?? MAX_RECOVERY_STRING_BYTES;
    if (input.length > maximumStringBytes)
      throw new RecoveryBundleError(
        'RECOVERY_SIZE_LIMIT_EXCEEDED',
        `${path} exceeds the supported string size.`,
      );
    const byteLength = utf8(input).byteLength;
    if (byteLength > maximumStringBytes)
      throw new RecoveryBundleError(
        'RECOVERY_SIZE_LIMIT_EXCEEDED',
        `${path} exceeds the supported string size.`,
      );
    totalStringBytes += byteLength;
    if (totalStringBytes > (options.maximumTotalStringBytes ?? MAX_RECOVERY_TOTAL_STRING_BYTES))
      throw new RecoveryBundleError(
        'RECOVERY_SIZE_LIMIT_EXCEEDED',
        `${label} exceeds the supported total string size.`,
      );
  };
  const visit = (input: unknown, path: string, depth: number): void => {
    nodes += 1;
    if (nodes > MAX_RECOVERY_JSON_NODES)
      throw new RecoveryBundleError(
        'RECOVERY_SIZE_LIMIT_EXCEEDED',
        `${label} exceeds the supported structural size.`,
      );
    if (depth > MAX_RECOVERY_JSON_DEPTH)
      throw new RecoveryBundleError(
        'RECOVERY_SIZE_LIMIT_EXCEEDED',
        `${label} exceeds the supported nesting depth.`,
      );
    if (input === null || typeof input === 'boolean') return;
    if (typeof input === 'string') {
      countString(input, path);
      return;
    }
    if (typeof input === 'number') {
      if (!Number.isFinite(input) || Object.is(input, -0))
        throw new RecoveryBundleError(
          'RECOVERY_FORMAT_INVALID',
          `${path} must be a finite canonical number.`,
        );
      return;
    }
    if (typeof input !== 'object')
      throw new RecoveryBundleError('RECOVERY_FORMAT_INVALID', `${path} is not JSON-compatible.`);
    if (seen.has(input))
      throw new RecoveryBundleError(
        'RECOVERY_FORMAT_INVALID',
        `${path} contains a cycle or shared object reference.`,
      );
    seen.add(input);
    const ownKeys = Reflect.ownKeys(input);
    if (ownKeys.length > MAX_RECOVERY_JSON_NODES - nodes)
      throw new RecoveryBundleError(
        'RECOVERY_SIZE_LIMIT_EXCEEDED',
        `${path} exceeds the supported property count.`,
      );
    if (ownKeys.some((key) => typeof key === 'symbol'))
      throw new RecoveryBundleError('RECOVERY_FORMAT_INVALID', `${path} contains symbol keys.`);
    const descriptors = Object.getOwnPropertyDescriptors(input);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (FORBIDDEN_KEYS.has(key))
        throw new RecoveryBundleError(
          'RECOVERY_FORMAT_INVALID',
          `${path} contains a forbidden key.`,
        );
      if ('get' in descriptor || 'set' in descriptor)
        throw new RecoveryBundleError(
          'RECOVERY_FORMAT_INVALID',
          `${path}.${key} cannot be an accessor.`,
        );
      if (!descriptor.enumerable && !(Array.isArray(input) && key === 'length'))
        throw new RecoveryBundleError(
          'RECOVERY_FORMAT_INVALID',
          `${path}.${key} cannot be a hidden property.`,
        );
      countString(key, `${path} property name`);
    }
    if (Array.isArray(input)) {
      const keys = Object.keys(input);
      if (
        Object.getPrototypeOf(input) !== Array.prototype ||
        keys.length !== input.length ||
        keys.some((key, index) => key !== String(index))
      )
        throw new RecoveryBundleError(
          'RECOVERY_FORMAT_INVALID',
          `${path} must be a dense plain array.`,
        );
      input.forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1));
    } else {
      if (Object.getPrototypeOf(input) !== Object.prototype)
        throw new RecoveryBundleError('RECOVERY_FORMAT_INVALID', `${path} must be a plain object.`);
      for (const [key, item] of Object.entries(input)) visit(item, `${path}.${key}`, depth + 1);
    }
  };
  visit(value, label, 0);
}

export function deepFrozenCanonicalCopy<T>(value: T): T {
  const copy = JSON.parse(JSON.stringify(value)) as T;
  const freeze = (input: unknown): void => {
    if (typeof input !== 'object' || input === null || Object.isFrozen(input)) return;
    Object.freeze(input);
    for (const item of Array.isArray(input) ? input : Object.values(input)) freeze(item);
  };
  freeze(copy);
  return copy;
}
