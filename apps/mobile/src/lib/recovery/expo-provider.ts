import {
  AESSealedData,
  AESEncryptionKey,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytesAsync,
} from 'expo-crypto';

import type { RecoveryCryptoProvider } from './types';

async function importAesKey(key: Uint8Array): Promise<AESEncryptionKey> {
  const copy = Uint8Array.from(key);
  try {
    return (await AESEncryptionKey.import(copy)) as AESEncryptionKey;
  } finally {
    copy.fill(0);
  }
}

const provider: RecoveryCryptoProvider = {
  providerId: 'expo-crypto:aes-256-gcm',
  async randomBytes(byteLength) {
    return getRandomBytesAsync(byteLength);
  },
  async encryptAes256Gcm({ key, nonce, plaintext, additionalData }) {
    const importedKey = await importAesKey(key);
    const sealed = await aesEncryptAsync(plaintext, importedKey, {
      nonce: { bytes: nonce },
      tagLength: 16,
      additionalData,
    });
    return {
      ciphertext: Uint8Array.from(await sealed.ciphertext()),
      tag: Uint8Array.from(await sealed.tag()),
    };
  },
  async decryptAes256Gcm({ key, nonce, ciphertext, tag, additionalData }) {
    const importedKey = await importAesKey(key);
    const sealed = AESSealedData.fromParts(nonce, ciphertext, tag);
    return Uint8Array.from(
      await aesDecryptAsync(sealed, importedKey, { output: 'bytes', additionalData }),
    );
  },
};

export const expoRecoveryCryptoProvider: RecoveryCryptoProvider = Object.freeze(provider);
