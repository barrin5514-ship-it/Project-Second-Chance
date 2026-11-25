import express, {
  type Express,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import cookieParser from 'cookie-parser';
import { AttemptRegistry, type Clock } from './avatar/attemptRegistry';
import type { AuthDependencies } from './auth/auth';
import { mountHealthRoute, mountReadinessRoute } from './health/health.routes';
import { mintSessionToken, type FetchLike } from './avatar/nuanceGateway';
import {
  CSRF_HEADER,
  SESSION_COOKIE,
  isLoopbackHost,
  issueSession,
  originAllowedForBootstrap,
  originAllowedForPost,
  safeEqual,
} from './avatar/sessionGuard';

/**
 * The only origins the browser may use. Both loopback, both the Vite dev port,
 * so the page is same-origin with itself and can call the API through the proxy.
 */
import { LOCAL_ORIGINS } from './security/localOrigins';
export { LOCAL_ORIGINS };

export interface AppDependencies {
  hasApiKey: boolean;
  readApiKey: () => string | null;
  fetchImpl: FetchLike;
  registry: AttemptRegistry;
  clock: Clock;
  tokenTtlMs?: number;
  providerTimeoutMs?: number;
  /** Optional in tests/foundation-only runs; production main supplies it. */
  auth?: AuthDependencies;
  /** Private case/document API; requires auth middleware to be mounted. */
  privateDocuments?: { router: RequestHandler };
  /** Optional readiness signal; absent means no readiness route. */
  privateReady?: () => boolean;
}

interface SessionRecord {
  csrfToken: string;
}

/** Generic bodies only: no provider text, no secrets, no token echo. */
const GENERIC = {
  forbidden: { error: 'forbidden' },
  tooMany: { error: 'attempt-in-progress' },
  unavailable: { error: 'unavailable' },
  provider: { error: 'provider-unavailable' },
  timeout: { error: 'provider-timeout' },
  malformed: { error: 'provider-unavailable' },
  method: { error: 'method-not-allowed' },
} as const;

export function createApp(deps: AppDependencies): Express {
  const app = express();
  const sessions = new Map<string, SessionRecord>();
  const allowedOrigins: readonly string[] = LOCAL_ORIGINS;

  app.disable('x-powered-by');

  app.use(cookieParser());
  app.use(express.json({ limit: '1kb' }));
  // No CORS middleware: cross-origin use is not supported or permitted.

  // Foundation contract: exact body, no configuration or provider access.
  mountHealthRoute(app);
  if (deps.privateReady !== undefined) mountReadinessRoute(app, deps.privateReady);

  // Account sessions are optional so the public foundation/health and Mira
  // tests can run without SQLite or an auth secret. They mount after health so
  // the health contract never depends on session/database state.
  if (deps.auth !== undefined) {
    for (const middleware of deps.auth.middleware) app.use(middleware);
    app.use(deps.auth.router);
  }
  if (deps.privateDocuments !== undefined) app.use(deps.privateDocuments.router);

  app.get('/api/avatar/bootstrap', (req: Request, res: Response) => {
    const host = req.headers.host;
    if (!isLoopbackHost(host)) {
      res.status(403).json(GENERIC.forbidden);
      return;
    }
    if (!originAllowedForBootstrap(req.headers.origin, allowedOrigins)) {
      res.status(403).json(GENERIC.forbidden);
      return;
    }

    const { sessionId, csrfToken } = issueSession();
    sessions.set(sessionId, { csrfToken });

    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'strict',
      // Loopback is treated as a secure context by browsers; secure would break
      // plain-http localhost in some configurations, so it is left off with the
      // HttpOnly + SameSite=Strict pair carrying the protection.
      secure: false,
      path: '/',
      maxAge: 30 * 60 * 1000,
    });
    res.setHeader('Cache-Control', 'no-store');
    // The CSRF value is deliberately readable by the page (double submit).
    res.status(200).json({ csrfToken });
  });

  /** Origin, session cookie and double-submit CSRF, in one place for both POST routes. */
  function authorizePost(req: Request, res: Response): { sessionId: string } | null {
    if (!originAllowedForPost(req.headers.origin, allowedOrigins)) {
      res.status(403).json(GENERIC.forbidden);
      return null;
    }

    const cookies = req.cookies as Record<string, unknown> | undefined;
    const sessionId = typeof cookies?.[SESSION_COOKIE] === 'string'
      ? (cookies[SESSION_COOKIE] as string)
      : undefined;
    const session = sessionId === undefined ? undefined : sessions.get(sessionId);
    const headerToken = req.headers[CSRF_HEADER];
    const headerValue = Array.isArray(headerToken) ? headerToken[0] : headerToken;

    if (sessionId === undefined || session === undefined || !safeEqual(headerValue, session.csrfToken)) {
      res.status(403).json(GENERIC.forbidden);
      return null;
    }
    return { sessionId };
  }

  app.all('/api/avatar/session-token', (req: Request, res: Response) => {
    if (req.method !== 'POST') {
      res.status(405).json(GENERIC.method);
      return;
    }

    const authorized = authorizePost(req, res);
    if (authorized === null) return;
    const { sessionId } = authorized;

    if (!deps.hasApiKey) {
      res.status(503).json(GENERIC.unavailable);
      return;
    }
    const apiKey = deps.readApiKey();
    if (apiKey === null) {
      res.status(503).json(GENERIC.unavailable);
      return;
    }

    // Everything above is decided before the provider can be contacted.
    void handleMint(req, res, deps, apiKey, sessionId as string);
  });

  /**
   * Browser-reported attempt lifecycle for the one identity that browser session
   * holds. Auth-guarded exactly like the token route; never contacts the provider.
   *
   * - POST {attemptId, action:'started'} records that the conversation began, so
   *   the token-start deadline no longer applies to this attempt.
   * - POST {attemptId, action:'stop'} releases the session's active attempt.
   *   Only resource cleanup: the consumed identity can never mint again.
   * - GET ?attemptId=… reports whether the attempt still counts as active.
   *
   * An unknown id, or another session's id, is refused with a generic 409.
   */
  app.all('/api/avatar/attempt-lifecycle', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
      const host = req.headers.host;
      if (!isLoopbackHost(host)) {
        res.status(403).json(GENERIC.forbidden);
        return;
      }
      const attemptId = typeof req.query['attemptId'] === 'string' ? req.query['attemptId'] : '';
      const cookies = req.cookies as Record<string, unknown> | undefined;
      const sessionId = typeof cookies?.[SESSION_COOKIE] === 'string'
        ? (cookies[SESSION_COOKIE] as string)
        : undefined;
      if (sessionId === undefined || !sessions.has(sessionId) || attemptId.length === 0) {
        res.status(403).json(GENERIC.forbidden);
        return;
      }
      // Read-only status: no CSRF value is needed or disclosed.
      res.status(200).json({ active: deps.registry.isSessionActive(attemptId, sessionId) });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json(GENERIC.method);
      return;
    }

    const authorized = authorizePost(req, res);
    if (authorized === null) return;
    const { sessionId } = authorized;

    const attemptId = readString(req.body, 'attemptId');
    const action = readString(req.body, 'action');
    if (attemptId === null || (action !== 'started' && action !== 'stop')) {
      res.status(409).json(GENERIC.tooMany);
      return;
    }

    if (!deps.registry.owns(attemptId, sessionId)) {
      res.status(409).json(GENERIC.tooMany);
      return;
    }

    if (action === 'started') {
      deps.registry.markStarted(attemptId, sessionId);
    } else {
      deps.registry.close(attemptId, sessionId, 'stopped');
    }
    res.status(204).end();
  });

  // Generic JSON 404: the Express default is HTML and echoes the request path.
  app.use((_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).json({ error: 'not-found' });
  });

  // Final JSON error boundary. body-parser runs before routing and its default
  // errors are HTML with a SyntaxError stack and absolute local paths. These
  // responses carry a generic code only; nothing from the body/path is logged
  // or echoed, and configuration/provider code is never reached.
  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    const status =
      typeof error === 'object' && error !== null
        ? (error as { status?: unknown }).status
        : undefined;
    if (status === 413) {
      res.status(413).json({ error: 'payload-too-large' });
      return;
    }
    if (status === 403) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    if (status === 401) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    if (status === 400) {
      res.status(400).json({ error: 'bad-request' });
      return;
    }
    res.status(500).json({ error: 'internal' });
  });

  return app;
}

async function handleMint(
  req: Request,
  res: Response,
  deps: AppDependencies,
  apiKey: string,
  sessionId: string,
): Promise<void> {
  const requestedAttempt = readString(req.body, 'attemptId');

  let attemptId: string;
  if (requestedAttempt === null) {
    // A fresh explicit Start asks for a new identity. Refused while this
    // browser session already has an attempt in progress.
    const begun = deps.registry.begin(sessionId);
    if (!begun.ok) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(409).json(GENERIC.tooMany);
      return;
    }
    attemptId = begun.attempt.id;
  } else {
    attemptId = requestedAttempt;
  }

  if (!deps.registry.consume(attemptId, sessionId)) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(409).json(GENERIC.tooMany);
    return;
  }

  const result = await mintSessionToken({
    apiKey,
    endUserId: `local-avatar:${sessionId.slice(0, 12)}`,
    fetchImpl: deps.fetchImpl,
    timeoutMs: deps.providerTimeoutMs ?? 8_000,
  });

  res.setHeader('Cache-Control', 'no-store');

  if (!result.ok) {
    deps.registry.close(attemptId, sessionId, 'failed');
    if (result.requestTimedOut) {
      res.status(504).json(GENERIC.timeout);
      return;
    }
    res.status(502).json(result.reason === 'provider-malformed' ? GENERIC.malformed : GENERIC.provider);
    return;
  }

  res.status(200).json({ token: result.token, attemptId });
}

function readString(body: unknown, key: string): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 && value.length < 200 ? value : null;
}
