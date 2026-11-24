export interface AccountUser {
  readonly id: string;
  readonly email: string;
}

export interface LoginResult {
  readonly user: AccountUser;
  readonly csrfToken: string;
}

export interface AccountClient {
  csrf(): Promise<string>;
  me(): Promise<AccountUser | null>;
  register(email: string, password: string, csrfToken: string): Promise<void>;
  login(email: string, password: string, csrfToken: string): Promise<LoginResult>;
  logout(csrfToken: string): Promise<void>;
}

export class AccountRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'AccountRequestError';
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function fail(response: Response): Promise<never> {
  const body = await readJson(response);
  const code = typeof body['error'] === 'string' ? body['error'] : 'request-failed';
  throw new AccountRequestError(response.status, code);
}

async function getCsrf(): Promise<string> {
  const response = await fetch('/api/auth/csrf', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return fail(response);
  const body = await readJson(response);
  if (typeof body['csrfToken'] !== 'string' || body['csrfToken'].length === 0) {
    throw new AccountRequestError(response.status, 'invalid-csrf-response');
  }
  return body['csrfToken'];
}

async function getMe(): Promise<AccountUser | null> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 401) return null;
  if (!response.ok) return fail(response);
  const body = await readJson(response);
  const user = body['user'];
  if (
    typeof user !== 'object' ||
    user === null ||
    typeof (user as Record<string, unknown>)['id'] !== 'string' ||
    typeof (user as Record<string, unknown>)['email'] !== 'string'
  ) {
    throw new AccountRequestError(response.status, 'invalid-user-response');
  }
  return {
    id: String((user as Record<string, unknown>)['id']),
    email: String((user as Record<string, unknown>)['email']),
  };
}

async function postJson(
  path: string,
  body: Record<string, string>,
  csrfToken: string,
): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify(body),
  });
}

async function register(email: string, password: string, csrfToken: string): Promise<void> {
  const response = await postJson('/api/auth/register', { email, password }, csrfToken);
  if (!response.ok) return fail(response);
}

async function login(email: string, password: string, csrfToken: string): Promise<LoginResult> {
  const response = await postJson('/api/auth/login', { email, password }, csrfToken);
  if (!response.ok) return fail(response);
  const body = await readJson(response);
  const user = body['user'];
  const freshToken = body['csrfToken'];
  if (
    typeof user !== 'object' ||
    user === null ||
    typeof (user as Record<string, unknown>)['id'] !== 'string' ||
    typeof (user as Record<string, unknown>)['email'] !== 'string' ||
    typeof freshToken !== 'string'
  ) {
    throw new AccountRequestError(response.status, 'invalid-login-response');
  }
  return {
    user: {
      id: String((user as Record<string, unknown>)['id']),
      email: String((user as Record<string, unknown>)['email']),
    },
    csrfToken: freshToken,
  };
}

async function logout(csrfToken: string): Promise<void> {
  const response = await postJson('/api/auth/logout', {}, csrfToken);
  if (!response.ok) return fail(response);
}

export const accountClient: AccountClient = {
  csrf: getCsrf,
  me: getMe,
  register,
  login,
  logout,
};
