export interface TokenTransport {
  get(url: string): Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
  post(
    url: string,
    body: unknown,
  ): Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
}

export interface IssuedToken {
  token: string;
  attemptId: string;
}

export interface HttpTokenAdapter {
  fetchToken(): Promise<IssuedToken>;
  /** Ends the current Start's lifecycle so a fresh explicit Start may mint. */
  reset(): void;
  /** Tells the server the conversation for this identity actually began. */
  markStarted(attemptId: string): Promise<void>;
  /** Tells the server to release this identity without minting again. */
  closeAttempt(attemptId: string): Promise<void>;
}

export const BOOTSTRAP_URL = '/api/avatar/bootstrap';
export const TOKEN_URL = '/api/avatar/session-token';
export const LIFECYCLE_URL = '/api/avatar/attempt-lifecycle';

/**
 * Mints exactly one token per explicit Start.
 *
 * The server issues the attempt identity: a fresh Start posts no `attemptId`
 * and the server answers with a new `att_…`. Every later call for the same
 * Start — an SDK capacity retry calling `token()` again — posts *that identity*
 * so the server's single-use guard refuses a second mint, and the adapter
 * answers the SDK from its cache. A closed lifecycle always mints again with a
 * new identity.
 */
export function createHttpTokenAdapter(transport: TokenTransport): HttpTokenAdapter {
  let settled: IssuedToken | null = null;
  let pending: Promise<IssuedToken> | null = null;
  let csrfToken: string | null = null;
  /** Bumped by reset(): a mint that resolves afterwards belongs to a closed Start. */
  let epoch = 0;

  async function bootstrap(): Promise<void> {
    const boot = await transport.get(BOOTSTRAP_URL);
    if (!boot.ok) throw new Error('bootstrap failed');
    const body = (await boot.json()) as { csrfToken?: unknown };
    if (typeof body.csrfToken !== 'string' || body.csrfToken.length === 0) {
      throw new Error('bootstrap gave no csrf token');
    }
    csrfToken = body.csrfToken;
  }

  async function mint(): Promise<IssuedToken> {
    if (csrfToken === null) await bootstrap();

    // A new explicit Start: no identity yet, the server minted one for us.
    // A repeat callback in the same Start: present the identity we hold.
    const attemptId = settled === null ? null : settled.attemptId;
    const res = await transport.post(TOKEN_URL, attemptId === null ? {} : { attemptId });
    if (!res.ok) throw new Error('token failed');
    const body = (await res.json()) as { token?: unknown; attemptId?: unknown };
    if (typeof body.token !== 'string' || typeof body.attemptId !== 'string') {
      throw new Error('malformed token response');
    }
    return { token: body.token, attemptId: body.attemptId };
  }

  return {
    async fetchToken(): Promise<IssuedToken> {
      if (settled !== null) return settled;
      if (pending !== null) return pending;
      const myEpoch = epoch;
      const request = mint()
        .then((issued) => {
          if (myEpoch !== epoch) {
            // The Start was closed while this mint was in flight. The server
            // already consumed the identity, so release its session slot and
            // never hand the token to a later Start.
            notify(issued.attemptId, 'stop');
            throw new Error('superseded by a newer Start');
          }
          settled = issued;
          return issued;
        })
        .finally(() => {
          // A reset already cleared `pending`; only clear our own entry.
          if (pending === request) pending = null;
        });
      pending = request;
      return request;
    },
    reset(): void {
      epoch += 1;
      settled = null;
      pending = null;
    },
    markStarted(attemptId: string): Promise<void> {
      return notify(attemptId, 'started');
    },
    closeAttempt(attemptId: string): Promise<void> {
      return notify(attemptId, 'stop');
    },
  };

  /**
   * Best-effort lifecycle note to the server. It carries the identity, never a
   * token, and always resolves: the caller may need to await it for ordering,
   * while the mint guard stays authoritative even if the request fails.
   */
  function notify(attemptId: string, action: 'started' | 'stop'): Promise<void> {
    return Promise.resolve()
      .then(() => transport.post(LIFECYCLE_URL, { attemptId, action }))
      .then(
        () => undefined,
        () => undefined,
      );
  }
}
