import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { canonicalSerialize, type Sha256Checksum } from '@chartpath/historical-data';

import { MAX_RECOVERY_ENVELOPE_BYTES } from './constants';
import { RecoveryBundleError } from './types';

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_INDEX = new Map([...BASE64_ALPHABET].map((character, index) => [character, index]));

export function encodeBase64(bytes: Uint8Array): string {
  let result = '';
  for (let offset = 0; offset < bytes.length; offset += 3) {
    const first = bytes[offset] ?? 0;
    const second = bytes[offset + 1] ?? 0;
    const third = bytes[offset + 2] ?? 0;
    const word = (first << 16) | (second << 8) | third;
    result += BASE64_ALPHABET[(word >>> 18) & 63]!;
    result += BASE64_ALPHABET[(word >>> 12) & 63]!;
    result += offset + 1 < bytes.length ? BASE64_ALPHABET[(word >>> 6) & 63]! : '=';
    result += offset + 2 < bytes.length ? BASE64_ALPHABET[word & 63]! : '=';
  }
  return result;
}

export function decodeCanonicalBase64(value: unknown, field: string): Uint8Array {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)
  )
    throw new RecoveryBundleError('RECOVERY_FORMAT_INVALID', `${field} is not canonical base64.`);
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const output = new Uint8Array((value.length / 4) * 3 - padding);
  let cursor = 0;
  for (let offset = 0; offset < value.length; offset += 4) {
    const a = BASE64_INDEX.get(value[offset]!) ?? 0;
    const b = BASE64_INDEX.get(value[offset + 1]!) ?? 0;
    const c = value[offset + 2] === '=' ? 0 : (BASE64_INDEX.get(value[offset + 2]!) ?? 0);
    const d = value[offset + 3] === '=' ? 0 : (BASE64_INDEX.get(value[offset + 3]!) ?? 0);
    const word = (a << 18) | (b << 12) | (c << 6) | d;
    if (cursor < output.length) output[cursor++] = (word >>> 16) & 0xff;
    if (cursor < output.length) output[cursor++] = (word >>> 8) & 0xff;
    if (cursor < output.length) output[cursor++] = word & 0xff;
  }
  if (encodeBase64(output) !== value)
    throw new RecoveryBundleError('RECOVERY_FORMAT_INVALID', `${field} is not canonical base64.`);
  return output;
}

export function recoveryChecksum(value: string | Uint8Array): Sha256Checksum {
  const bytes = typeof value === 'string' ? utf8ToBytes(value) : value;
  return `sha256:${bytesToHex(sha256(bytes))}`;
}

export function canonicalJsonBytes(value: unknown): Uint8Array {
  return utf8ToBytes(`${canonicalSerialize(value)}\n`);
}

export function canonicalJsonText(value: unknown): string {
  return `${canonicalSerialize(value)}\n`;
}

export function decodeRecoveryText(value: Uint8Array | string): {
  readonly bytes: Uint8Array;
  readonly text: string;
} {
  if (typeof value === 'string' && value.length > MAX_RECOVERY_ENVELOPE_BYTES)
    throw new RecoveryBundleError(
      'RECOVERY_SIZE_LIMIT_EXCEEDED',
      'Recovery bundle exceeds the supported byte limit.',
    );
  const bytes = typeof value === 'string' ? utf8ToBytes(value) : new Uint8Array(value);
  if (bytes.byteLength > MAX_RECOVERY_ENVELOPE_BYTES)
    throw new RecoveryBundleError(
      'RECOVERY_SIZE_LIMIT_EXCEEDED',
      'Recovery bundle exceeds the supported byte limit.',
    );
  let text: string;
  try {
    text =
      typeof value === 'string' ? value : new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new RecoveryBundleError('RECOVERY_FORMAT_INVALID', 'Recovery bundle is not valid UTF-8.');
  }
  if (text.startsWith('\ufeff'))
    throw new RecoveryBundleError(
      'RECOVERY_FORMAT_INVALID',
      'Recovery bundle cannot contain a BOM.',
    );
  return { bytes, text };
}

export function utf8(value: string): Uint8Array {
  return utf8ToBytes(value);
}
