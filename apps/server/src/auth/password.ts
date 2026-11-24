import { hash as argonHash, parseOptions, verify as argonVerify } from '@node-rs/argon2';

export const MIN_PASSWORD_LENGTH = 15;
export const MAX_PASSWORD_LENGTH = 128;

/** Argon2id is algorithm id 2 in the pinned @node-rs/argon2 contract. */
const ARGON2ID = 2;

/** OWASP Argon2id baseline: 19 MiB, 2 passes, 1 lane. */
export const ARGON2_OPTIONS = Object.freeze({
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  algorithm: ARGON2ID,
});

/** Small local deny-list; no external breach-checking service is contacted. */
const WEAK_PASSWORDS = new Set([
  'passwordpassword',
  '123456789012345',
  'qwertyuiopasdfg',
  'letmeinletmein',
  'administrator',
  'iloveyouiloveyou',
  'welcomewelcome',
  'correcthorsebatterystaple',
]);

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    return 'That password is too common or weak. Choose a longer passphrase.';
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(hash, password);
  } catch {
    return false;
  }
}

/** True when a stored hash was made with weaker/different parameters. */
export function needsRehash(hash: string): boolean {
  try {
    const parsed = parseOptions(hash);
    return (
      parsed.algorithm !== ARGON2_OPTIONS.algorithm ||
      parsed.memoryCost !== ARGON2_OPTIONS.memoryCost ||
      parsed.timeCost !== ARGON2_OPTIONS.timeCost ||
      parsed.parallelism !== ARGON2_OPTIONS.parallelism ||
      parsed.outputLen !== ARGON2_OPTIONS.outputLen
    );
  } catch {
    return true;
  }
}
