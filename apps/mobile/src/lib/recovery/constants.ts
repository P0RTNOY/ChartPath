export const RECOVERY_ENVELOPE_FORMAT = 'chartpath-recovery' as const;
export const RECOVERY_PAYLOAD_FORMAT = 'chartpath-recovery-payload' as const;
export const RECOVERY_ENVELOPE_VERSION = 1 as const;
export const RECOVERY_PAYLOAD_VERSION = 1 as const;
export const RECOVERY_SUITE = 'scrypt-rfc7914-n32768-r8-p1-aes-256-gcm-v1' as const;
export const RECOVERY_ENCODING = 'canonical-json-v1' as const;
export const RECOVERY_AAD_DOMAIN = 'ChartPath\0RecoveryBundle\0v1\0' as const;

export const RECOVERY_SCRYPT_N = 32_768 as const;
export const RECOVERY_SCRYPT_R = 8 as const;
export const RECOVERY_SCRYPT_P = 1 as const;
export const RECOVERY_KEY_BYTES = 32 as const;
export const RECOVERY_SALT_BYTES = 16 as const;
export const RECOVERY_NONCE_BYTES = 12 as const;
export const RECOVERY_TAG_BYTES = 16 as const;
/** Bounded working-memory ceiling with room for implementation bookkeeping above scrypt's 32 MiB ROM. */
export const RECOVERY_SCRYPT_MAX_MEMORY_BYTES = 64 * 1024 * 1024;

export const MAX_RECOVERY_ENVELOPE_BYTES = 12 * 1024 * 1024;
export const MAX_RECOVERY_CIPHERTEXT_BYTES = 8 * 1024 * 1024;
export const MAX_RECOVERY_PLAINTEXT_BYTES = MAX_RECOVERY_CIPHERTEXT_BYTES;
export const MAX_RECOVERY_JSON_DEPTH = 32;
export const MAX_RECOVERY_JSON_NODES = 200_000;
export const MAX_RECOVERY_TOTAL_STRING_BYTES = 8 * 1024 * 1024;
export const MAX_RECOVERY_STRING_BYTES = 512 * 1024;
export const MAX_RECOVERY_ATTEMPTS = 25_000;
export const MAX_RECOVERY_SESSIONS_PER_CATEGORY = 2_000;
export const MAX_RECOVERY_QUARANTINES_PER_CATEGORY = 1_000;
export const MAX_RECOVERY_SESSION_EVENTS = 10_000;
export const MAX_RECOVERY_QUARANTINE_PAYLOAD_BYTES = 512 * 1024;
export const MAX_RECOVERY_PASSPHRASE_BYTES = 1_024;
export const MIN_RECOVERY_PASSPHRASE_CODE_POINTS = 15;
