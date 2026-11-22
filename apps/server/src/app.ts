import express, { type Express, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { AttemptRegistry, type Clock } from './avatar/attemptRegistry';
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
export const LOCAL_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173'] as const;

export interface AppDependencies {
  hasApiKey: boolean;
  readApiKey: () => string | null;
  fetchImpl: FetchLike;
  registry: AttemptRegistry;
  clock: Clock;
  tokenTtlMs?: number;
  providerTimeoutMs?: number;
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

  app.all('/api/avatar/session-token', (req: Request, res: Response) => {
    if (req.method !== 'POST') {
      res.status(405).json(GENERIC.method);
      return;
    }

    if (!originAllowedForPost(req.headers.origin, allowedOrigins)) {
      res.status(403).json(GENERIC.forbidden);
      return;
    }

    const cookies = req.cookies as Record<string, unknown> | undefined;
    const sessionId = typeof cookies?.[SESSION_COOKIE] === 'string'
      ? (cookies[SESSION_COOKIE] as string)
      : undefined;
    const session = sessionId === undefined ? undefined : sessions.get(sessionId);
    const headerToken = req.headers[CSRF_HEADER];
    const headerValue = Array.isArray(headerToken) ? headerToken[0] : headerToken;

    if (session === undefined || !safeEqual(headerValue, session.csrfToken)) {
      res.status(403).json(GENERIC.forbidden);
      return;
    }

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
