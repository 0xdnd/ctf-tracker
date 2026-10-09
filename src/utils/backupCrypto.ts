/**
 * Optional passphrase encryption for ZeroBox backups.
 *
 * WebCrypto only, no dependencies. The store stays crypto-free: the UI encrypts
 * the plaintext produced by `exportBackup()` and decrypts before `importBackup()`.
 *
 * Envelope (v1):
 *   {
 *     "format": "zerobox-backup-encrypted",
 *     "v": 1,
 *     "kdf": { "name": "PBKDF2", "hash": "SHA-256", "iterations": 600000, "salt": <b64, 16 bytes> },
 *     "cipher": { "name": "AES-GCM", "iv": <b64, 12 bytes> },
 *     "ciphertext": <b64, AES-256-GCM with a 128-bit tag>
 *   }
 *
 * Every header field is bound to the ciphertext as AES-GCM additional data
 * (see `buildAad`), so tampering with any of them makes decryption fail.
 */

export const BACKUP_ENVELOPE_FORMAT = 'zerobox-backup-encrypted';
export const BACKUP_ENVELOPE_VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;
export const MIN_PBKDF2_ITERATIONS = 100_000;
export const MAX_PBKDF2_ITERATIONS = 5_000_000;
export const MIN_PASSPHRASE_LENGTH = 12;

const KDF_NAME = 'PBKDF2';
const KDF_HASH = 'SHA-256';
const CIPHER_NAME = 'AES-GCM';
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BITS = 128;
const TAG_BYTES = TAG_BITS / 8;
const BASE64_CHUNK = 0x8000; // 32 KB

export const WRONG_PASSPHRASE_MESSAGE = 'Wrong passphrase or corrupted file';
export const UNSUPPORTED_VERSION_MESSAGE = 'Unsupported backup version';
export const INVALID_ENVELOPE_MESSAGE = 'Invalid encrypted backup file';
export const CRYPTO_UNAVAILABLE_MESSAGE =
  'Encryption is unavailable here. WebCrypto requires a secure context (HTTPS or localhost).';

export type BackupCryptoErrorCode =
  | 'wrong-passphrase'
  | 'unsupported-version'
  | 'invalid-envelope'
  | 'crypto-unavailable'
  | 'invalid-passphrase';

export class BackupCryptoError extends Error {
  readonly code: BackupCryptoErrorCode;
  constructor(code: BackupCryptoErrorCode, message: string) {
    super(message);
    this.name = 'BackupCryptoError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Decrypt failed: wrong passphrase OR modified/corrupted file (deliberately indistinguishable). */
export class WrongPassphraseError extends BackupCryptoError {
  constructor() {
    super('wrong-passphrase', WRONG_PASSPHRASE_MESSAGE);
    this.name = 'WrongPassphraseError';
  }
}

export class UnsupportedBackupVersionError extends BackupCryptoError {
  constructor() {
    super('unsupported-version', UNSUPPORTED_VERSION_MESSAGE);
    this.name = 'UnsupportedBackupVersionError';
  }
}

export class InvalidBackupEnvelopeError extends BackupCryptoError {
  constructor(detail?: string) {
    super('invalid-envelope', detail ? `${INVALID_ENVELOPE_MESSAGE}: ${detail}` : INVALID_ENVELOPE_MESSAGE);
    this.name = 'InvalidBackupEnvelopeError';
  }
}

/** Parsed (never raw-text) header fields that are authenticated as AAD. */
export interface BackupEnvelopeHeader {
  format: string;
  v: number;
  kdf: { name: string; hash: string; iterations: number; salt: string };
  cipher: { name: string; iv: string };
}

export function isCryptoAvailable(): boolean {
  try {
    return (
      typeof globalThis.crypto !== 'undefined' &&
      typeof globalThis.crypto.subtle !== 'undefined' &&
      globalThis.crypto.subtle !== null &&
      typeof globalThis.crypto.getRandomValues === 'function'
    );
  } catch {
    return false;
  }
}

function requireCrypto(): SubtleCrypto {
  if (!isCryptoAvailable()) {
    throw new BackupCryptoError('crypto-unavailable', CRYPTO_UNAVAILABLE_MESSAGE);
  }
  return globalThis.crypto.subtle;
}

// ---------------------------------------------------------------------------
// Base64 (no spread of large arrays; native helpers when the runtime has them)
// ---------------------------------------------------------------------------

type NativeBase64Bytes = { toBase64?: () => string };
type Bytes = Uint8Array<ArrayBuffer>;
type NativeBase64Ctor = { fromBase64?: (s: string) => Bytes };

// Single-character class loop only: a grouped repeat would grow V8's backtrack stack on multi-MB input.
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

export function bytesToBase64(bytes: Uint8Array): string {
  const nativeToBase64 = (Uint8Array.prototype as unknown as NativeBase64Bytes).toBase64;
  if (typeof nativeToBase64 === 'function') {
    return nativeToBase64.call(bytes);
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + BASE64_CHUNK) as unknown as number[]);
  }
  return btoa(binary);
}

/** Strict standard-alphabet base64 (padded, no whitespace). Returns null when malformed. */
export function base64ToBytes(text: string): Bytes | null {
  if (typeof text !== 'string' || text.length % 4 !== 0 || !BASE64_RE.test(text)) return null;
  try {
    const nativeFromBase64 = (Uint8Array as unknown as NativeBase64Ctor).fromBase64;
    if (typeof nativeFromBase64 === 'function') {
      return nativeFromBase64.call(Uint8Array, text);
    }
    const binary = atob(text);
    const out: Bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

/**
 * AAD shared by encrypt and decrypt. Always built from parsed header values,
 * never from raw file text, so JSON whitespace/key-order cannot desync it.
 */
export function buildAad(header: BackupEnvelopeHeader): Bytes {
  return encoder.encode(
    JSON.stringify([
      header.format,
      header.v,
      header.kdf.name,
      header.kdf.hash,
      header.kdf.iterations,
      header.kdf.salt,
      header.cipher.name,
      header.cipher.iv,
    ])
  );
}

async function deriveAesKey(
  subtle: SubtleCrypto,
  passphrase: string,
  salt: Bytes,
  iterations: number,
  usage: 'encrypt' | 'decrypt'
): Promise<CryptoKey> {
  const passBytes = encoder.encode(passphrase.normalize('NFC'));
  try {
    const baseKey = await subtle.importKey('raw', passBytes, KDF_NAME, false, ['deriveKey']);
    return await subtle.deriveKey(
      { name: KDF_NAME, hash: KDF_HASH, salt, iterations },
      baseKey,
      { name: CIPHER_NAME, length: 256 },
      false,
      [usage]
    );
  } finally {
    passBytes.fill(0);
  }
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True when `text` parses to an object whose `format` is the encrypted-backup marker. Never throws. */
export function isEncryptedBackup(text: string): boolean {
  if (typeof text !== 'string') return false;
  const trimmed = text.replace(/^\u{FEFF}/u, '').trimStart();
  // Cheap pre-checks keep this from fully parsing multi-MB plaintext backups.
  if (trimmed.charCodeAt(0) !== 0x7b /* { */ || !trimmed.includes(BACKUP_ENVELOPE_FORMAT)) return false;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isPlainObject(parsed) && parsed.format === BACKUP_ENVELOPE_FORMAT;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Encrypt
// ---------------------------------------------------------------------------

export async function encryptBackup(plaintextJson: string, passphrase: string): Promise<string> {
  const subtle = requireCrypto();
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw new BackupCryptoError('invalid-passphrase', 'A passphrase is required');
  }

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const header: BackupEnvelopeHeader = {
    format: BACKUP_ENVELOPE_FORMAT,
    v: BACKUP_ENVELOPE_VERSION,
    kdf: { name: KDF_NAME, hash: KDF_HASH, iterations: PBKDF2_ITERATIONS, salt: bytesToBase64(salt) },
    cipher: { name: CIPHER_NAME, iv: bytesToBase64(iv) },
  };

  const key = await deriveAesKey(subtle, passphrase, salt, header.kdf.iterations, 'encrypt');
  const ciphertext = new Uint8Array(
    await subtle.encrypt(
      { name: CIPHER_NAME, iv, additionalData: buildAad(header), tagLength: TAG_BITS },
      key,
      encoder.encode(plaintextJson)
    )
  );

  return JSON.stringify(
    {
      format: header.format,
      v: header.v,
      kdf: header.kdf,
      cipher: header.cipher,
      ciphertext: bytesToBase64(ciphertext),
    },
    null,
    2
  );
}

// ---------------------------------------------------------------------------
// Decrypt
// ---------------------------------------------------------------------------

interface ValidatedEnvelope {
  header: BackupEnvelopeHeader;
  salt: Bytes;
  iv: Bytes;
  ciphertext: Bytes;
}

/** Strict structural validation. Runs entirely before any key derivation. */
function validateEnvelope(envelopeText: string): ValidatedEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof envelopeText === 'string' ? envelopeText.replace(/^\u{FEFF}/u, '') : '');
  } catch {
    throw new InvalidBackupEnvelopeError('not valid JSON');
  }
  if (!isPlainObject(parsed) || parsed.format !== BACKUP_ENVELOPE_FORMAT) {
    throw new InvalidBackupEnvelopeError('unrecognized format');
  }
  if (typeof parsed.v !== 'number') {
    throw new InvalidBackupEnvelopeError('missing version');
  }
  if (parsed.v !== BACKUP_ENVELOPE_VERSION) {
    throw new UnsupportedBackupVersionError();
  }

  const { kdf, cipher, ciphertext } = parsed;
  if (!isPlainObject(kdf) || !isPlainObject(cipher) || typeof ciphertext !== 'string') {
    throw new InvalidBackupEnvelopeError('malformed header');
  }
  if (kdf.name !== KDF_NAME || kdf.hash !== KDF_HASH) {
    throw new InvalidBackupEnvelopeError('unsupported key derivation');
  }
  if (cipher.name !== CIPHER_NAME) {
    throw new InvalidBackupEnvelopeError('unsupported cipher');
  }

  const iterations = kdf.iterations;
  if (
    typeof iterations !== 'number' ||
    !Number.isInteger(iterations) ||
    iterations < MIN_PBKDF2_ITERATIONS ||
    iterations > MAX_PBKDF2_ITERATIONS
  ) {
    throw new InvalidBackupEnvelopeError('iteration count out of range');
  }

  if (typeof kdf.salt !== 'string' || typeof cipher.iv !== 'string') {
    throw new InvalidBackupEnvelopeError('malformed salt or iv');
  }
  const salt = base64ToBytes(kdf.salt);
  const iv = base64ToBytes(cipher.iv);
  if (!salt || salt.length !== SALT_BYTES || !iv || iv.length !== IV_BYTES) {
    throw new InvalidBackupEnvelopeError('malformed salt or iv');
  }

  // A damaged ciphertext is indistinguishable from a wrong passphrase by design.
  const ciphertextBytes = base64ToBytes(ciphertext);
  if (!ciphertextBytes || ciphertextBytes.length < TAG_BYTES) {
    throw new WrongPassphraseError();
  }

  return {
    header: {
      format: BACKUP_ENVELOPE_FORMAT,
      v: BACKUP_ENVELOPE_VERSION,
      kdf: { name: KDF_NAME, hash: KDF_HASH, iterations, salt: kdf.salt },
      cipher: { name: CIPHER_NAME, iv: cipher.iv },
    },
    salt,
    iv,
    ciphertext: ciphertextBytes,
  };
}

export async function decryptBackup(envelopeText: string, passphrase: string): Promise<string> {
  const { header, salt, iv, ciphertext } = validateEnvelope(envelopeText);
  const subtle = requireCrypto();
  if (typeof passphrase !== 'string') throw new WrongPassphraseError();

  try {
    const key = await deriveAesKey(subtle, passphrase, salt, header.kdf.iterations, 'decrypt');
    const plaintext = await subtle.decrypt(
      { name: CIPHER_NAME, iv, additionalData: buildAad(header), tagLength: TAG_BITS },
      key,
      ciphertext
    );
    return new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
  } catch {
    throw new WrongPassphraseError();
  }
}

// ---------------------------------------------------------------------------
// Passphrase strength hint (UI only; the hard rule is MIN_PASSPHRASE_LENGTH)
// ---------------------------------------------------------------------------

export type PassphraseStrength = 'too-short' | 'weak' | 'fair' | 'strong';

/** Passphrase length in characters (code points) after NFC normalization. */
export function passphraseLength(passphrase: string): number {
  return Array.from(passphrase.normalize('NFC')).length;
}

export function passphraseStrength(passphrase: string): PassphraseStrength {
  const chars = Array.from(passphrase.normalize('NFC'));
  if (chars.length < MIN_PASSPHRASE_LENGTH) return 'too-short';
  if (new Set(chars).size < 6) return 'weak';
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(passphrase)).length;
  if (chars.length >= 20 || (chars.length >= 16 && classes >= 3)) return 'strong';
  if (chars.length >= 16 || classes >= 3) return 'fair';
  return 'weak';
}
