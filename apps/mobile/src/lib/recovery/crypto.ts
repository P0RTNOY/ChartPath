import { scryptAsync } from '@noble/hashes/scrypt.js';

import {
  MAX_RECOVERY_ENVELOPE_BYTES,
  MAX_RECOVERY_PASSPHRASE_BYTES,
  MAX_RECOVERY_PLAINTEXT_BYTES,
  MIN_RECOVERY_PASSPHRASE_CODE_POINTS,
  RECOVERY_AAD_DOMAIN,
  RECOVERY_ENCODING,
  RECOVERY_ENVELOPE_FORMAT,
  RECOVERY_ENVELOPE_VERSION,
  RECOVERY_KEY_BYTES,
  RECOVERY_NONCE_BYTES,
  RECOVERY_SALT_BYTES,
  RECOVERY_SCRYPT_MAX_MEMORY_BYTES,
  RECOVERY_SCRYPT_N,
  RECOVERY_SCRYPT_P,
  RECOVERY_SCRYPT_R,
  RECOVERY_SUITE,
  RECOVERY_TAG_BYTES,
} from './constants';
import {
  canonicalJsonBytes,
  canonicalJsonText,
  decodeCanonicalBase64,
  decodeRecoveryText,
  encodeBase64,
  recoveryChecksum,
  utf8,
} from './encoding';
import { createRecoveryPayload, recoveryPayloadPreview } from './payload';
import {
  RecoveryAuthenticationError,
  RecoveryBundleError,
  type EncryptedRecoveryPayloadV1,
  type ExportRecoveryBundleInput,
  type RecoveryBundleDecryptResultV1,
  type RecoveryBundleExportResultV1,
  type RecoveryCryptoProvider,
  type RecoveryEnvelopeV1,
  type RecoveryPayloadV1,
} from './types';
import { parseRecoveryEnvelope, parseRecoveryPayload } from './validation';

type RecoveryEnvelopeHeaderV1 = Omit<RecoveryEnvelopeV1, 'ciphertextBase64' | 'tagBase64'>;

function assertPassphrase(passphrase: string): Uint8Array {
  if (typeof passphrase !== 'string')
    throw new RecoveryBundleError(
      'RECOVERY_PASSPHRASE_INVALID',
      'Recovery password must be a string.',
    );
  if (passphrase.length > MAX_RECOVERY_PASSPHRASE_BYTES)
    throw new RecoveryBundleError(
      'RECOVERY_PASSPHRASE_INVALID',
      `Recovery password must be at most ${MAX_RECOVERY_PASSPHRASE_BYTES} UTF-8 bytes.`,
    );
  const normalized = passphrase.normalize('NFC');
  const bytes = utf8(normalized);
  if (
    normalized !== passphrase ||
    [...normalized].length < MIN_RECOVERY_PASSPHRASE_CODE_POINTS ||
    bytes.byteLength > MAX_RECOVERY_PASSPHRASE_BYTES
  ) {
    bytes.fill(0);
    throw new RecoveryBundleError(
      'RECOVERY_PASSPHRASE_INVALID',
      `Recovery password must be NFC, at least ${MIN_RECOVERY_PASSPHRASE_CODE_POINTS} characters, and at most ${MAX_RECOVERY_PASSPHRASE_BYTES} UTF-8 bytes.`,
    );
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  const passwordBytes = assertPassphrase(passphrase);
  try {
    return await scryptAsync(passwordBytes, salt, {
      N: RECOVERY_SCRYPT_N,
      r: RECOVERY_SCRYPT_R,
      p: RECOVERY_SCRYPT_P,
      dkLen: RECOVERY_KEY_BYTES,
      maxmem: RECOVERY_SCRYPT_MAX_MEMORY_BYTES,
      asyncTick: 10,
    });
  } finally {
    passwordBytes.fill(0);
  }
}

function recoveryEnvelopeAad(header: RecoveryEnvelopeHeaderV1): Uint8Array {
  return utf8(`${RECOVERY_AAD_DOMAIN}${canonicalJsonText(header)}`);
}

function envelopeHeader(
  salt: Uint8Array,
  nonce: Uint8Array,
  ciphertextByteLength: number,
): RecoveryEnvelopeHeaderV1 {
  return {
    format: RECOVERY_ENVELOPE_FORMAT,
    envelopeVersion: RECOVERY_ENVELOPE_VERSION,
    suite: RECOVERY_SUITE,
    encoding: RECOVERY_ENCODING,
    kdf: {
      algorithm: 'scrypt',
      saltBase64: encodeBase64(salt),
      N: RECOVERY_SCRYPT_N,
      r: RECOVERY_SCRYPT_R,
      p: RECOVERY_SCRYPT_P,
      dkLen: RECOVERY_KEY_BYTES,
    },
    aead: {
      algorithm: 'AES-256-GCM',
      nonceBase64: encodeBase64(nonce),
      tagLength: RECOVERY_TAG_BYTES,
    },
    ciphertextByteLength,
  };
}

function assertProviderBytes(bytes: Uint8Array, expectedLength: number, label: string): void {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== expectedLength)
    throw new RecoveryBundleError(
      'RECOVERY_FORMAT_INVALID',
      `Crypto provider returned an invalid ${label}.`,
    );
}

export function parseRecoveryBundleEnvelope(bundle: Uint8Array | string): RecoveryEnvelopeV1 {
  const { text } = decodeRecoveryText(bundle);
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new RecoveryBundleError('RECOVERY_FORMAT_INVALID', 'Recovery bundle is not valid JSON.');
  }
  const envelope = parseRecoveryEnvelope(raw);
  if (canonicalJsonText(envelope) !== text)
    throw new RecoveryBundleError(
      'RECOVERY_FORMAT_INVALID',
      'Recovery bundle is not canonical JSON.',
    );
  return envelope;
}

export async function encryptRecoveryPayload(
  inputPayload: RecoveryPayloadV1,
  passphrase: string,
  cryptoProvider: RecoveryCryptoProvider,
): Promise<EncryptedRecoveryPayloadV1> {
  const payload = parseRecoveryPayload(inputPayload);
  const plaintext = canonicalJsonBytes(payload);
  if (plaintext.byteLength > MAX_RECOVERY_PLAINTEXT_BYTES) {
    plaintext.fill(0);
    throw new RecoveryBundleError(
      'RECOVERY_SIZE_LIMIT_EXCEEDED',
      'Recovery payload exceeds the supported plaintext byte limit.',
    );
  }

  let salt: Uint8Array | undefined;
  let nonce: Uint8Array | undefined;
  let key: Uint8Array | undefined;
  let aad: Uint8Array | undefined;
  try {
    salt = await cryptoProvider.randomBytes(RECOVERY_SALT_BYTES);
    nonce = await cryptoProvider.randomBytes(RECOVERY_NONCE_BYTES);
    assertProviderBytes(salt, RECOVERY_SALT_BYTES, 'salt');
    assertProviderBytes(nonce, RECOVERY_NONCE_BYTES, 'nonce');
    key = await deriveKey(passphrase, salt);
    const header = envelopeHeader(salt, nonce, plaintext.byteLength);
    aad = recoveryEnvelopeAad(header);
    const encrypted = await cryptoProvider.encryptAes256Gcm({
      key,
      nonce,
      plaintext,
      additionalData: aad,
    });
    assertProviderBytes(encrypted.ciphertext, plaintext.byteLength, 'ciphertext');
    assertProviderBytes(encrypted.tag, RECOVERY_TAG_BYTES, 'authentication tag');
    const envelope = parseRecoveryEnvelope({
      ...header,
      ciphertextBase64: encodeBase64(encrypted.ciphertext),
      tagBase64: encodeBase64(encrypted.tag),
    });
    const bundleText = canonicalJsonText(envelope);
    const bundleBytes = utf8(bundleText);
    if (bundleBytes.byteLength > MAX_RECOVERY_ENVELOPE_BYTES)
      throw new RecoveryBundleError(
        'RECOVERY_SIZE_LIMIT_EXCEEDED',
        'Encrypted recovery bundle exceeds the supported byte limit.',
      );
    return {
      bundleBytes,
      bundleText,
      bundleDigest: recoveryChecksum(bundleBytes),
    };
  } finally {
    plaintext.fill(0);
    key?.fill(0);
    aad?.fill(0);
  }
}

export async function exportRecoveryBundle(
  input: ExportRecoveryBundleInput,
): Promise<RecoveryBundleExportResultV1> {
  const payload = createRecoveryPayload(input.snapshot, input.options);
  const encrypted = await encryptRecoveryPayload(payload, input.passphrase, input.cryptoProvider);
  return {
    ...encrypted,
    payload,
    preview: recoveryPayloadPreview(payload),
  };
}

export async function decryptRecoveryBundle(
  bundle: Uint8Array | string,
  passphrase: string,
  cryptoProvider: RecoveryCryptoProvider,
): Promise<RecoveryBundleDecryptResultV1> {
  const decoded = decodeRecoveryText(bundle);
  const envelope = parseRecoveryBundleEnvelope(bundle);
  const salt = decodeCanonicalBase64(envelope.kdf.saltBase64, 'kdf.saltBase64');
  const nonce = decodeCanonicalBase64(envelope.aead.nonceBase64, 'aead.nonceBase64');
  const ciphertext = decodeCanonicalBase64(envelope.ciphertextBase64, 'ciphertextBase64');
  const tag = decodeCanonicalBase64(envelope.tagBase64, 'tagBase64');
  const { ciphertextBase64: _ciphertext, tagBase64: _tag, ...header } = envelope;
  void _ciphertext;
  void _tag;
  let key: Uint8Array | undefined;
  let aad: Uint8Array | undefined;
  let plaintext: Uint8Array | undefined;
  try {
    key = await deriveKey(passphrase, salt);
    aad = recoveryEnvelopeAad(header);
    try {
      plaintext = await cryptoProvider.decryptAes256Gcm({
        key,
        nonce,
        ciphertext,
        tag,
        additionalData: aad,
      });
    } catch {
      throw new RecoveryAuthenticationError();
    }
    if (
      !(plaintext instanceof Uint8Array) ||
      plaintext.byteLength !== envelope.ciphertextByteLength ||
      plaintext.byteLength > MAX_RECOVERY_PLAINTEXT_BYTES
    )
      throw new RecoveryAuthenticationError();
    let plaintextText: string;
    try {
      plaintextText = new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
    } catch {
      throw new RecoveryAuthenticationError();
    }
    let raw: unknown;
    try {
      raw = JSON.parse(plaintextText) as unknown;
    } catch {
      throw new RecoveryAuthenticationError();
    }
    const payload = parseRecoveryPayload(raw);
    if (canonicalJsonText(payload) !== plaintextText)
      throw new RecoveryBundleError(
        'RECOVERY_PAYLOAD_INVALID',
        'Decrypted recovery payload is not canonical JSON.',
      );
    return {
      bundleDigest: recoveryChecksum(decoded.bytes),
      payload,
      preview: recoveryPayloadPreview(payload),
    };
  } finally {
    key?.fill(0);
    aad?.fill(0);
    plaintext?.fill(0);
  }
}
