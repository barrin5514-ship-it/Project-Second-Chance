import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validatePassword,
  verifyPassword,
} from './password';

const PASSPHRASE = 'correct horse battery staple';

describe('password policy and hashing', () => {
  it('hashes a passphrase with Argon2id and verifies it without retaining cleartext', async () => {
    const hash = await hashPassword(PASSPHRASE);

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain(PASSPHRASE);
    expect(await verifyPassword(hash, PASSPHRASE)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword(PASSPHRASE);
    expect(await verifyPassword(hash, 'correct horse battery staple!')).toBe(false);
  });

  it('accepts a long passphrase with spaces and no composition rules', () => {
    expect(validatePassword(PASSPHRASE)).toBeNull();
    expect(validatePassword('this is a longer fictional demo passphrase')).toBeNull();
    expect(validatePassword('ALL CAPS AND SPACES ARE FINE')).toBeNull();
  });

  it('rejects passwords shorter than the minimum', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toMatch(/at least/i);
  });

  it('rejects passwords longer than the maximum without truncating them', () => {
    expect(validatePassword('a'.repeat(MAX_PASSWORD_LENGTH + 1))).toMatch(/at most/i);
  });

  it('rejects a small local list of common weak values', () => {
    expect(validatePassword('passwordpassword')).toMatch(/common|weak/i);
    expect(validatePassword('123456789012345')).toMatch(/common|weak/i);
  });

  it('does not trim or normalise the password', async () => {
    const spaced = '  a fictional passphrase  ';
    const hash = await hashPassword(spaced);
    expect(await verifyPassword(hash, spaced)).toBe(true);
    expect(await verifyPassword(hash, spaced.trim())).toBe(false);
  });
});
