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

/** Budget covers response headers and the body read. */
export const ACCOUNT_REQUEST_BUDGET_MS = 10_000;

export class AccountRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'AccountRequestError';
  }
}

type JsonBody = Record<string, unknown>;

function timeoutError(): AccountRequestError {
  return new AccountRequestError(0, 'timeout');
}

async function withBudget<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(timeoutError());
    }, ACCOUNT_REQUEST_BUDGET_MS);
  });

  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } catch (error) {
    if (error instanceof AccountRequestError) throw error;
    throw new AccountRequestError(0, controller.signal.aborted ? 'timeout' : 'network-error');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
  }
}

async function readBody(response: Response): Promise<JsonBody> {
  try {
    const text = await response.text();
    if (text.length === 0) return {};
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null ? (value as JsonBody) : {};
  } catch (error) {
    if (error instanceof AccountRequestError) throw error;
    if ((error as { name?: unknown } | null)?.name === 'AbortError') throw timeoutError();
    return {};
  }
}

interface AccountResponse {
  readonly response: Response;
  readonly body: JsonBody;
}

async function request(path: string, init: RequestInit): Promise<AccountResponse> {
  return withBudget(async (signal) => {
    const response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    });
    const body = await readBody(response);
    return { response, body };
  });
}

function fail(response: Response, body: JsonBody): never {
  const code = typeof body['error'] === 'string' ? body['error'] : 'request-failed';
  throw new AccountRequestError(response.status, code);
}

async function getCsrf(): Promise<string> {
  const { response, body } = await request('/api/auth/csrf', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) fail(response, body);
  if (typeof body['csrfToken'] !== 'string' || body['csrfToken'].length === 0) {
    throw new AccountRequestError(response.status, 'invalid-csrf-response');
  }
  return body['csrfToken'];
}

async function getMe(): Promise<AccountUser | null> {
  const { response, body } = await request('/api/auth/me', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 401) return null;
  if (!response.ok) fail(response, body);
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
): Promise<AccountResponse> {
  return request(path, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify(body),
  });
}

async function register(email: string, password: string, csrfToken: string): Promise<void> {
  const { response, body } = await postJson('/api/auth/register', { email, password }, csrfToken);
  if (!response.ok) fail(response, body);
}

async function login(email: string, password: string, csrfToken: string): Promise<LoginResult> {
  const { response, body } = await postJson('/api/auth/login', { email, password }, csrfToken);
  if (!response.ok) fail(response, body);
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
  const { response, body } = await postJson('/api/auth/logout', {}, csrfToken);
  if (!response.ok) fail(response, body);
}

export const accountClient: AccountClient = {
  csrf: getCsrf,
  me: getMe,
  register,
  login,
  logout,
};
