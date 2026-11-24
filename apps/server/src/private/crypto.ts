import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface MasterKey {
  keyId: string;
  key: Buffer;
}

export interface PrivateKeys {
  keyId: string;
  metadataKey: Buffer;
  blobKey: Buffer;
}

interface KeyFile {
  version: 1;
  keyId: string;
  key: string;
}

const KEY_BYTES = 32;
const KEY_ID_BYTES = 8;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const MAGIC = Buffer.from('PSC1');
const FORMAT_VERSION = 1;
const AAD_PREFIX = 'psc1';
const KEY_FILE = 'master-key.json';
const KEY_ID_PATTERN = /^[a-f0-9]{16}$/;

function cryptoError(): Error {
  return new Error('private-data-integrity-failure');
}

function parseKeyFile(raw: string): MasterKey {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) throw cryptoError();
    const file = value as Partial<KeyFile>;
    if (
      file.version !== 1 ||
      typeof file.keyId !== 'string' ||
      !KEY_ID_PATTERN.test(file.keyId) ||
      typeof file.key !== 'string'
    ) {
      throw cryptoError();
    }
    const key = Buffer.from(file.key, 'base64');
    if (key.length !== KEY_BYTES) throw cryptoError();
    return { keyId: file.keyId, key };
  } catch (error) {
    if (error instanceof Error && error.message.includes('integrity')) throw error;
    throw new Error('private-key-format-invalid');
  }
}

export function generateMasterKey(): MasterKey {
  return {
    keyId: randomBytes(KEY_ID_BYTES).toString('hex'),
    key: randomBytes(KEY_BYTES),
  };
}

export function loadOrCreateMasterKey(
  keyDir: string,
  options: { allowCreate: boolean },
): MasterKey {
  mkdirSync(keyDir, { recursive: true, mode: 0o700 });
  try {
    chmodSync(keyDir, 0o700);
  } catch {
    // Windows may not honor POSIX directory modes.
  }

  const path = join(keyDir, KEY_FILE);
  if (existsSync(path)) {
    const master = parseKeyFile(readFileSync(path, 'utf8'));
    try {
      chmodSync(path, 0o600);
    } catch {
      // Windows may not honor POSIX file modes.
    }
    return master;
  }

  if (!options.allowCreate) throw new Error('private-key-missing');

  const master = generateMasterKey();
  const payload: KeyFile = {
    version: 1,
    keyId: master.keyId,
    key: master.key.toString('base64'),
  };
  writeFileSync(path, `${JSON.stringify(payload)}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Windows may not honor POSIX file modes.
  }
  return master;
}

export function loadPrivateKeys(
  keyDir: string,
  options: { allowCreate: boolean },
): PrivateKeys {
  const master = loadOrCreateMasterKey(keyDir, options);
  const derive = (info: string): Buffer =>
    Buffer.from(
      hkdfSync('sha256', master.key, Buffer.from('psc-private-salt-v1'), Buffer.from(info), 32),
    );
  return {
    keyId: master.keyId,
    metadataKey: derive('metadata-key-v1'),
    blobKey: derive('blob-key-v1'),
  };
}

export function buildAad(
  kind: 'metadata' | 'blob',
  ownerId: string,
  caseId: string,
  recordId: string,
  version: number,
): string {
  return `${AAD_PREFIX}|${kind}|${ownerId}|${caseId}|${recordId}|v${version}`;
}

export function sealEnvelope(
  keys: PrivateKeys,
  kind: 'metadata' | 'blob',
  aad: string,
  plaintext: Buffer,
): Buffer {
  const key = kind === 'metadata' ? keys.metadataKey : keys.blobKey;
  const keyId = Buffer.from(keys.keyId, 'utf8');
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'), { plaintextLength: plaintext.length });
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([
    MAGIC,
    Buffer.from([FORMAT_VERSION, keyId.length]),
    keyId,
    iv,
    tag,
    ciphertext,
  ]);
}

export function openEnvelope(
  keys: PrivateKeys,
  kind: 'metadata' | 'blob',
  aad: string,
  envelope: Buffer,
): Buffer {
  try {
    const headerLength = MAGIC.length + 2;
    if (envelope.length < headerLength + IV_BYTES + TAG_BYTES) throw cryptoError();
    if (!envelope.subarray(0, MAGIC.length).equals(MAGIC)) throw cryptoError();
    const version = envelope[MAGIC.length];
    const keyIdLength = envelope[MAGIC.length + 1];
    if (version !== FORMAT_VERSION || keyIdLength === undefined || keyIdLength !== 16) {
      throw cryptoError();
    }
    const keyIdStart = headerLength;
    const ivStart = keyIdStart + keyIdLength;
    const tagStart = ivStart + IV_BYTES;
    const ciphertextStart = tagStart + TAG_BYTES;
    if (envelope.length < ciphertextStart) throw cryptoError();

    const keyId = envelope.subarray(keyIdStart, ivStart).toString('utf8');
    if (keyId !== keys.keyId) throw cryptoError();
    const key = kind === 'metadata' ? keys.metadataKey : keys.blobKey;
    const iv = envelope.subarray(ivStart, tagStart);
    const tag = envelope.subarray(tagStart, ciphertextStart);
    const ciphertext = envelope.subarray(ciphertextStart);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(aad, 'utf8'), { plaintextLength: ciphertext.length });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('integrity')) throw error;
    throw cryptoError();
  }
}
