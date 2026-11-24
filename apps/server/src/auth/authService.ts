import type { Account, AccountStore } from './accountStore';
import { AccountExistsError, normalizeEmail } from './accountStore';
import { hashPassword, needsRehash, validatePassword, verifyPassword } from './password';

export interface PublicUser {
  readonly id: string;
  readonly email: string;
}

export class AuthValidationError extends Error {
  constructor(message = 'invalid authentication input') {
    super(message);
    this.name = 'AuthValidationError';
  }
}

export interface AuthService {
  register(email: string, password: string): Promise<PublicUser>;
  authenticate(email: string, password: string): Promise<PublicUser | null>;
  findPublicById(id: string): PublicUser | null;
}

export function toPublicUser(account: Account): PublicUser {
  return { id: account.id, email: account.email };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length >= 3 && email.length <= 254 && EMAIL_PATTERN.test(email);
}

export function createAuthService(options: {
  accounts: AccountStore;
  hash?: (password: string) => Promise<string>;
  verify?: (hash: string, password: string) => Promise<boolean>;
}): AuthService {
  const accounts = options.accounts;
  const hash = options.hash ?? hashPassword;
  const verify = options.verify ?? verifyPassword;

  // A fixed dummy verification target makes unknown/disabled accounts do
  // comparable Argon2 work without revealing which case occurred.
  const dummyHash = hash('dummy password for account-enumeration timing only');

  return {
    async register(email, password) {
      if (!isValidEmail(email)) throw new AuthValidationError();
      const policyError = validatePassword(password);
      if (policyError !== null) throw new AuthValidationError(policyError);
      const passwordHash = await hash(password);
      try {
        return toPublicUser(accounts.create({ email, passwordHash }));
      } catch (error) {
        if (error instanceof AccountExistsError) throw new AuthValidationError();
        throw error;
      }
    },

    async authenticate(email, password) {
      const normalized = normalizeEmail(email);
      const account = isValidEmail(email) ? accounts.findByEmail(normalized) : null;
      let target = '';
      if (account === null || account.disabledAt !== null) {
        target = await dummyHash;
      } else {
        target = account.passwordHash;
      }
      const valid = await verify(target, password);
      if (account === null || account.disabledAt !== null || !valid) return null;
      if (needsRehash(account.passwordHash)) {
        try {
          accounts.updatePasswordHash(account.id, await hash(password));
        } catch {
          // A rehash failure must not turn a valid login into an invalid one.
        }
      }
      return toPublicUser(account);
    },

    findPublicById(id) {
      const account = accounts.findById(id);
      if (account === null || account.disabledAt !== null) return null;
      return toPublicUser(account);
    },
  };
}
