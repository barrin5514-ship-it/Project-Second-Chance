import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  generateMasterKey,
  loadOrCreateMasterKey,
  loadPrivateKeys,
  openEnvelope,
  sealEnvelope,
  type PrivateKeys,
} from './crypto';

const CANARY = 'FICTIONAL-CANARY-case-label-9f3a';
const AAD = 'psc1|meta|usr_a|case_a|case_a|v1';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'psc-crypto-'));
}

describe('private envelope crypto', () => {
  it('round-trips plaintext through AES-256-GCM and hides it from the envelope', () => {
    const keys = loadPrivateKeys(tempDir(), { allowCreate: true });
    const envelope = sealEnvelope(keys, 'metadata', AAD, Buffer.from(CANARY, 'utf8'));

    expect(envelope.includes(Buffer.from(CANARY))).toBe(false);
    expect(openEnvelope(keys, 'metadata', AAD, envelope).toString('utf8')).toBe(CANARY);
  });

  it('uses a fresh nonce for each seal', () => {
    const keys = loadPrivateKeys(tempDir(), { allowCreate: true });
    const first = sealEnvelope(keys, 'metadata', AAD, Buffer.from('one'));
    const second = sealEnvelope(keys, 'metadata', AAD, Buffer.from('one'));
    expect(first.equals(second)).toBe(false);
  });

  it('rejects a changed AAD context, including owner/case/document/version swaps', () => {
    const keys = loadPrivateKeys(tempDir(), { allowCreate: true });
    const envelope = sealEnvelope(keys, 'blob', 'psc1|blob|usr_a|case_a|doc_a|v1', Buffer.from('x'));

    for (const changed of [
      'psc1|blob|usr_b|case_a|doc_a|v1',
      'psc1|blob|usr_a|case_b|doc_a|v1',
      'psc1|blob|usr_a|case_a|doc_b|v1',
      'psc1|blob|usr_a|case_a|doc_a|v2',
    ]) {
      expect(() => openEnvelope(keys, 'blob', changed, envelope)).toThrow(/integrity|auth/i);
    }
  });

  it('rejects tampered ciphertext, tag, truncation and wrong envelope magic/version', () => {
    const keys = loadPrivateKeys(tempDir(), { allowCreate: true });
    const envelope = sealEnvelope(keys, 'metadata', AAD, Buffer.from('tamper-me'));
    const tampered = Buffer.from(envelope);
    const last = tampered.length - 1;
    tampered[last] = (tampered[last] ?? 0) ^ 0x01;
    expect(() => openEnvelope(keys, 'metadata', AAD, tampered)).toThrow(/integrity|auth/i);

    const short = envelope.subarray(0, envelope.length - 10);
    expect(() => openEnvelope(keys, 'metadata', AAD, short)).toThrow(/integrity|auth|format/i);

    const badMagic = Buffer.from(envelope);
    badMagic[0] = 0x00;
    expect(() => openEnvelope(keys, 'metadata', AAD, badMagic)).toThrow(/integrity|auth|format/i);
  });

  it('rejects a different master key and a mismatched key id', () => {
    const first = loadPrivateKeys(tempDir(), { allowCreate: true });
    const second = loadPrivateKeys(tempDir(), { allowCreate: true });
    const envelope = sealEnvelope(first, 'metadata', AAD, Buffer.from('secret'));

    expect(() => openEnvelope(second, 'metadata', AAD, envelope)).toThrow(/integrity|auth|key/i);
  });

  it('creates a master key only for a fresh store and never replaces an existing/corrupt one', () => {
    const dir = tempDir();
    const created = loadOrCreateMasterKey(dir, { allowCreate: true });
    expect(created.key).toHaveLength(32);
    expect(created.keyId).toMatch(/^[a-f0-9]{16}$/);
    expect(existsSync(join(dir, 'master-key.json'))).toBe(true);

    expect(() => loadOrCreateMasterKey(dir, { allowCreate: false })).not.toThrow();
    const keyFile = join(dir, 'master-key.json');
    writeFileSync(keyFile, '{broken');
    expect(() => loadOrCreateMasterKey(dir, { allowCreate: true })).toThrow(/key|format/i);
  });

  it('fails closed when a missing key is not allowed to be created', () => {
    expect(() => loadOrCreateMasterKey(tempDir(), { allowCreate: false })).toThrow(/key|missing/i);
  });

  it('keeps key material out of the database-facing key object and files are not world-readable where supported', () => {
    const dir = tempDir();
    const master = loadOrCreateMasterKey(dir, { allowCreate: true });
    const raw = readFileSync(join(dir, 'master-key.json'), 'utf8');
    expect(raw).toContain(master.keyId);
    expect(raw).not.toContain(CANARY);
    rmSync(dir, { recursive: true, force: true });
  });
});
