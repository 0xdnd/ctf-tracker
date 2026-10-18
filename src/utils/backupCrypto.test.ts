// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  BACKUP_ENVELOPE_FORMAT,
  BackupCryptoError,
  InvalidBackupEnvelopeError,
  MAX_PBKDF2_ITERATIONS,
  MIN_PBKDF2_ITERATIONS,
  PBKDF2_ITERATIONS,
  UnsupportedBackupVersionError,
  WRONG_PASSPHRASE_MESSAGE,
  WrongPassphraseError,
  base64ToBytes,
  buildAad,
  bytesToBase64,
  decryptBackup,
  encryptBackup,
  isCryptoAvailable,
  isEncryptedBackup,
  passphraseLength,
  passphraseStrength,
} from './backupCrypto';

const PASS = 'correct horse battery staple';
const PLAINTEXT = JSON.stringify({
  isRedacted: false,
  machines: [{ id: 'm1', name: 'Lame', notes: 'h\u{e9}llo w\u{f6}rld \u{1F512} "quoted" \\ back\nslash' }],
});

type Envelope = {
  format: string;
  v: number;
  kdf: { name: string; hash: string; iterations: number; salt: string };
  cipher: { name: string; iv: string };
  ciphertext: string;
};

const parse = (text: string) => JSON.parse(text) as Envelope;
const stringify = (env: unknown) => JSON.stringify(env);
const tamper = (text: string, mutate: (env: Envelope) => void) => {
  const env = parse(text);
  mutate(env);
  return stringify(env);
};
const randomB64 = (n: number) => bytesToBase64(globalThis.crypto.getRandomValues(new Uint8Array(n)));

afterEach(() => {
  vi.restoreAllMocks();
});

// One shared envelope for the tamper matrix keeps the suite fast (each derive is ~600k PBKDF2 rounds).
let sharedEnvelope: string | null = null;
const getEnvelope = async () => {
  sharedEnvelope ??= await encryptBackup(PLAINTEXT, PASS);
  return sharedEnvelope;
};

describe('backupCrypto: availability and envelope shape', () => {
  it('reports WebCrypto availability', () => {
    expect(isCryptoAvailable()).toBe(true);
  });

  it('produces the documented v1 envelope', async () => {
    const env = parse(await getEnvelope());
    expect(Object.keys(env)).toEqual(['format', 'v', 'kdf', 'cipher', 'ciphertext']);
    expect(env.format).toBe('zerobox-backup-encrypted');
    expect(env.format).toBe(BACKUP_ENVELOPE_FORMAT);
    expect(env.v).toBe(1);
    expect(env.kdf).toEqual({
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 600000,
      salt: expect.any(String),
    });
    expect(PBKDF2_ITERATIONS).toBe(600000);
    expect(env.cipher).toEqual({ name: 'AES-GCM', iv: expect.any(String) });
    expect(base64ToBytes(env.kdf.salt)).toHaveLength(16);
    expect(base64ToBytes(env.cipher.iv)).toHaveLength(12);
    // ciphertext = utf8(plaintext) + 16-byte GCM tag
    expect(base64ToBytes(env.ciphertext)).toHaveLength(new TextEncoder().encode(PLAINTEXT).length + 16);
    expect(env.ciphertext).not.toContain('Lame');
    expect(await getEnvelope()).not.toContain('Lame');
  });

  it('builds the AAD from parsed header values as a JSON array', () => {
    const aad = buildAad({
      format: 'zerobox-backup-encrypted',
      v: 1,
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: 'SALT' },
      cipher: { name: 'AES-GCM', iv: 'IV' },
    });
    expect(new TextDecoder().decode(aad)).toBe(
      '["zerobox-backup-encrypted",1,"PBKDF2","SHA-256",600000,"SALT","AES-GCM","IV"]'
    );
  });
});

describe('backupCrypto: round trip', () => {
  it('decrypts back to the exact plaintext', async () => {
    expect(await decryptBackup(await getEnvelope(), PASS)).toBe(PLAINTEXT);
  });

  it('keeps isRedacted inside the plaintext, not in the envelope', async () => {
    const redacted = JSON.stringify({ isRedacted: true, machines: [] });
    const envText = await encryptBackup(redacted, PASS);
    expect(parse(envText)).not.toHaveProperty('isRedacted');
    expect(envText).not.toContain('isRedacted');
    expect(JSON.parse(await decryptBackup(envText, PASS)).isRedacted).toBe(true);
  });

  it('round-trips a 5MB plaintext without a stack overflow (chunked base64)', async () => {
    const unit = 'zerobox-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ-h\u{e9}llo-';
    const big = unit.repeat(Math.ceil((5 * 1024 * 1024) / unit.length));
    expect(big.length).toBeGreaterThanOrEqual(5 * 1024 * 1024);
    const envText = await encryptBackup(big, PASS);
    expect(await decryptBackup(envText, PASS)).toBe(big);
  });

  it('uses Uint8Array toBase64/fromBase64 when the runtime provides them', async () => {
    const toBase64 = vi.fn(function (this: Uint8Array) {
      return Buffer.from(this).toString('base64');
    });
    const fromBase64 = vi.fn((s: string) => new Uint8Array(Buffer.from(s, 'base64')));
    const proto = Uint8Array.prototype as unknown as Record<string, unknown>;
    const ctor = Uint8Array as unknown as Record<string, unknown>;
    proto.toBase64 = toBase64;
    ctor.fromBase64 = fromBase64;
    try {
      const envText = await encryptBackup(PLAINTEXT, PASS);
      expect(toBase64).toHaveBeenCalled();
      expect(await decryptBackup(envText, PASS)).toBe(PLAINTEXT);
      expect(fromBase64).toHaveBeenCalled();
    } finally {
      delete proto.toBase64;
      delete ctor.fromBase64;
    }
  });
});

describe('backupCrypto: wrong passphrase', () => {
  it('fails with the generic typed error', async () => {
    const err = await decryptBackup(await getEnvelope(), PASS + '!').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WrongPassphraseError);
    expect(err).toBeInstanceOf(BackupCryptoError);
    expect((err as BackupCryptoError).code).toBe('wrong-passphrase');
    expect((err as Error).message).toBe('Wrong passphrase or corrupted file');
    expect((err as Error).message).toBe(WRONG_PASSPHRASE_MESSAGE);
  });
});

describe('backupCrypto: tamper detection (every case must fail decrypt)', () => {
  const expectGeneric = async (mutated: string) => {
    const err = await decryptBackup(mutated, PASS).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WrongPassphraseError);
    expect((err as Error).message).toBe('Wrong passphrase or corrupted file');
  };

  it('rejects changed iterations (still inside the allowed range)', async () => {
    await expectGeneric(tamper(await getEnvelope(), (e) => void (e.kdf.iterations = 600001)));
  });

  it('rejects a changed salt', async () => {
    await expectGeneric(tamper(await getEnvelope(), (e) => void (e.kdf.salt = randomB64(16))));
  });

  it('rejects a changed iv', async () => {
    await expectGeneric(tamper(await getEnvelope(), (e) => void (e.cipher.iv = randomB64(12))));
  });

  it('rejects a modified ciphertext byte', async () => {
    await expectGeneric(
      tamper(await getEnvelope(), (e) => {
        const bytes = base64ToBytes(e.ciphertext)!;
        bytes[Math.floor(bytes.length / 2)] ^= 0x01;
        e.ciphertext = bytesToBase64(bytes);
      })
    );
  });

  it('rejects a modified GCM tag byte', async () => {
    await expectGeneric(
      tamper(await getEnvelope(), (e) => {
        const bytes = base64ToBytes(e.ciphertext)!;
        bytes[bytes.length - 1] ^= 0x80;
        e.ciphertext = bytesToBase64(bytes);
      })
    );
  });

  it('rejects a truncated ciphertext and a non-base64 ciphertext', async () => {
    await expectGeneric(
      tamper(await getEnvelope(), (e) => {
        e.ciphertext = bytesToBase64(base64ToBytes(e.ciphertext)!.subarray(0, 20));
      })
    );
    await expectGeneric(tamper(await getEnvelope(), (e) => void (e.ciphertext = '***not base64***')));
  });

  it('authenticates the salt text, not just its decoded bytes (AAD binding)', async () => {
    // The last base64 char of a 16-byte value carries 2 unused low bits: flipping one decodes to the
    // same salt bytes (same derived key) but changes the header text, so only the AAD can catch it.
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const envText = await getEnvelope();
    const env = parse(envText);
    const body = env.kdf.salt.slice(0, -2);
    const lastIdx = alphabet.indexOf(body[body.length - 1]);
    const altSalt = body.slice(0, -1) + alphabet[lastIdx ^ 1] + '==';
    expect(altSalt).not.toBe(env.kdf.salt);
    expect(Buffer.from(altSalt, 'base64').equals(Buffer.from(env.kdf.salt, 'base64'))).toBe(true);
    await expectGeneric(tamper(envText, (e) => void (e.kdf.salt = altSalt)));
  });

  it('reports a changed version as unsupported, before deriving a key', async () => {
    const deriveSpy = vi.spyOn(globalThis.crypto.subtle, 'deriveKey');
    const importSpy = vi.spyOn(globalThis.crypto.subtle, 'importKey');
    const mutated = tamper(await getEnvelope(), (e) => void (e.v = 2));
    const err = await decryptBackup(mutated, PASS).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnsupportedBackupVersionError);
    expect((err as BackupCryptoError).code).toBe('unsupported-version');
    expect((err as Error).message).toMatch(/unsupported backup version/i);
    expect(deriveSpy).not.toHaveBeenCalled();
    expect(importSpy).not.toHaveBeenCalled();
  });
});

describe('backupCrypto: strict envelope validation (no key derivation on bad input)', () => {
  const rejectsInvalid = async (mutated: string, code = 'invalid-envelope') => {
    const deriveSpy = vi.spyOn(globalThis.crypto.subtle, 'deriveKey');
    const importSpy = vi.spyOn(globalThis.crypto.subtle, 'importKey');
    const err = await decryptBackup(mutated, PASS).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BackupCryptoError);
    expect((err as BackupCryptoError).code).toBe(code);
    expect(deriveSpy).not.toHaveBeenCalled();
    expect(importSpy).not.toHaveBeenCalled();
    return err as Error;
  };

  it.each([
    ['below minimum', MIN_PBKDF2_ITERATIONS - 1],
    ['zero', 0],
    ['negative', -600000],
    ['above maximum', MAX_PBKDF2_ITERATIONS + 1],
    ['huge DoS value', 2_000_000_000],
    ['non-integer', 600000.5],
    ['string', '600000'],
    ['null', null],
    ['NaN-ish (serialises to null)', Number.NaN],
  ])('rejects iterations that are %s', async (_label, value) => {
    const err = await rejectsInvalid(tamper(await getEnvelope(), (e) => void ((e.kdf as { iterations: unknown }).iterations = value)));
    expect(err).toBeInstanceOf(InvalidBackupEnvelopeError);
  });

  it('accepts the iteration bounds as structurally valid (fails later, at authentication)', async () => {
    // Bounds are inclusive: 100000 passes validation and fails generically, rather than as invalid-envelope.
    const mutated = tamper(await getEnvelope(), (e) => void (e.kdf.iterations = MIN_PBKDF2_ITERATIONS));
    await expect(decryptBackup(mutated, PASS)).rejects.toBeInstanceOf(WrongPassphraseError);
  });

  it('rejects unknown kdf name, hash and cipher name', async () => {
    const envText = await getEnvelope();
    await rejectsInvalid(tamper(envText, (e) => void (e.kdf.name = 'scrypt')));
    await rejectsInvalid(tamper(envText, (e) => void (e.kdf.name = 'pbkdf2')));
    await rejectsInvalid(tamper(envText, (e) => void (e.kdf.hash = 'SHA-1')));
    await rejectsInvalid(tamper(envText, (e) => void (e.kdf.hash = 'SHA-512')));
    await rejectsInvalid(tamper(envText, (e) => void (e.cipher.name = 'AES-CBC')));
    await rejectsInvalid(tamper(envText, (e) => void (e.cipher.name = 'AES-CTR')));
  });

  it('rejects salt/iv of the wrong length or malformed base64', async () => {
    const envText = await getEnvelope();
    await rejectsInvalid(tamper(envText, (e) => void (e.kdf.salt = randomB64(15))));
    await rejectsInvalid(tamper(envText, (e) => void (e.kdf.salt = randomB64(32))));
    await rejectsInvalid(tamper(envText, (e) => void (e.cipher.iv = randomB64(16))));
    await rejectsInvalid(tamper(envText, (e) => void (e.cipher.iv = randomB64(8))));
    await rejectsInvalid(tamper(envText, (e) => void (e.kdf.salt = '!!!!')));
    await rejectsInvalid(tamper(envText, (e) => void ((e.cipher as { iv: unknown }).iv = 12)));
    await rejectsInvalid(tamper(envText, (e) => void (e.kdf.salt = e.kdf.salt + '\n')));
  });

  it('rejects a wrong format, wrong version type, and structurally broken envelopes', async () => {
    const envText = await getEnvelope();
    await rejectsInvalid(tamper(envText, (e) => void (e.format = 'something-else')));
    await rejectsInvalid(tamper(envText, (e) => void ((e as { v: unknown }).v = '1')));
    await rejectsInvalid(tamper(envText, (e) => void ((e as { kdf: unknown }).kdf = null)));
    await rejectsInvalid(tamper(envText, (e) => void ((e as { cipher: unknown }).cipher = [])));
    await rejectsInvalid(tamper(envText, (e) => void ((e as { ciphertext: unknown }).ciphertext = 5)));
    await rejectsInvalid('not json at all');
    await rejectsInvalid('[]');
    await rejectsInvalid('null');
    await rejectsInvalid('');
    await rejectsInvalid(JSON.stringify({ machines: [] }));
  });

  it('rejects v values other than 1 as unsupported (including 0 and 99)', async () => {
    const envText = await getEnvelope();
    await rejectsInvalid(tamper(envText, (e) => void (e.v = 0)), 'unsupported-version');
    await rejectsInvalid(tamper(envText, (e) => void (e.v = 99)), 'unsupported-version');
  });
});

describe('backupCrypto: randomness', () => {
  it('uses a fresh salt and iv on every call, even for identical input', async () => {
    const [a, b] = await Promise.all([encryptBackup(PLAINTEXT, PASS), encryptBackup(PLAINTEXT, PASS)]);
    const ea = parse(a);
    const eb = parse(b);
    expect(ea.kdf.salt).not.toBe(eb.kdf.salt);
    expect(ea.cipher.iv).not.toBe(eb.cipher.iv);
    expect(ea.ciphertext).not.toBe(eb.ciphertext);
    expect(await decryptBackup(a, PASS)).toBe(PLAINTEXT);
    expect(await decryptBackup(b, PASS)).toBe(PLAINTEXT);
  });
});

describe('backupCrypto: passphrase normalization', () => {
  const composed = 'caf\u{e9} passphrase 123'; // e + acute as one code point
  const decomposed = 'cafe\u{301} passphrase 123'; // e + combining acute

  it('treats composed and decomposed \u{e9} as the same passphrase (NFC)', async () => {
    expect(composed).not.toBe(decomposed);
    expect(composed.normalize('NFC')).toBe(decomposed.normalize('NFC'));
    const fromComposed = await encryptBackup(PLAINTEXT, composed);
    expect(await decryptBackup(fromComposed, decomposed)).toBe(PLAINTEXT);
    const fromDecomposed = await encryptBackup(PLAINTEXT, decomposed);
    expect(await decryptBackup(fromDecomposed, composed)).toBe(PLAINTEXT);
  });

  it('rejects an empty passphrase on encrypt', async () => {
    await expect(encryptBackup(PLAINTEXT, '')).rejects.toMatchObject({ code: 'invalid-passphrase' });
  });
});

describe('backupCrypto: detection and helpers', () => {
  it('detects envelopes and ignores everything else without throwing', async () => {
    const envText = await getEnvelope();
    expect(isEncryptedBackup(envText)).toBe(true);
    expect(isEncryptedBackup('\u{FEFF}  \n' + envText)).toBe(true);
    expect(isEncryptedBackup(tamper(envText, (e) => void (e.v = 2)))).toBe(true);
    expect(isEncryptedBackup(PLAINTEXT)).toBe(false);
    expect(isEncryptedBackup('')).toBe(false);
    expect(isEncryptedBackup('not json')).toBe(false);
    expect(isEncryptedBackup('{"format":"zerobox-backup-encrypted"')).toBe(false);
    expect(isEncryptedBackup('[{"format":"zerobox-backup-encrypted"}]')).toBe(false);
    expect(isEncryptedBackup(JSON.stringify({ format: 'other', note: BACKUP_ENVELOPE_FORMAT }))).toBe(false);
    expect(isEncryptedBackup(JSON.stringify({ machines: [], note: BACKUP_ENVELOPE_FORMAT }))).toBe(false);
    expect(isEncryptedBackup(undefined as unknown as string)).toBe(false);
  });

  it('base64 helpers round-trip and reject malformed input', () => {
    const bytes = new Uint8Array(100_000).map((_, i) => (i * 7) % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    expect(bytesToBase64(new Uint8Array([104, 105]))).toBe('aGk=');
    expect(base64ToBytes('')).toEqual(new Uint8Array(0));
    expect(base64ToBytes('aGk')).toBeNull();
    expect(base64ToBytes('aG k=')).toBeNull();
    expect(base64ToBytes('a=Gk')).toBeNull();
    expect(base64ToBytes('aGk===')).toBeNull();
    expect(base64ToBytes('-_-_')).toBeNull();
  });

  it('measures passphrase length after NFC and grades strength', () => {
    expect(passphraseLength('cafe\u{301}')).toBe(4);
    expect(passphraseStrength('short')).toBe('too-short');
    expect(passphraseStrength('aaaaaaaaaaaaaaaa')).toBe('weak');
    expect(passphraseStrength('abcdefghijkl')).toBe('weak');
    expect(passphraseStrength('Abcdefghijk1')).toBe('fair');
    expect(passphraseStrength('correct horse battery staple')).toBe('strong');
    expect(passphraseStrength('Xk9#mQ2$vL7!pR4&')).toBe('strong');
  });
});
