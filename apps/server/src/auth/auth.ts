import type { Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import session from 'express-session';
import passportModule from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { csrfSync } from 'csrf-sync';
import {
  isLoopbackHost,
  originAllowedForBootstrap,
  originAllowedForPost,
} from '../avatar/sessionGuard';
import { LOCAL_ORIGINS } from '../security/localOrigins';
import { createAccountStore, normalizeEmail, type AccountStore } from './accountStore';
import { AuthValidationError, createAuthService } from './authService';
import { SqliteSessionStore } from './sessionStore';
import './sessionTypes';

export const AUTH_COOKIE = 'psc_auth_sid';

const DEFAULT_IDLE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_RATE_WINDOW_MS = 15 * 60 * 1000;

export interface AuthOptions {
  databasePath: string;
  sessionSecret: string;
  idleTtlMs?: number;
  absoluteTtlMs?: number;
  rateLimit?: {
    windowMs?: number;
    registerWindowMs?: number;
    loginPerEmail?: number;
    loginPerIp?: number;
    registerPerIp?: number;
  };
  now?: () => number;
  cookieSecure?: boolean;
}

export interface AuthDependencies {
  middleware: RequestHandler[];
  router: Router;
  accountStore: AccountStore;
  sessionStore: SqliteSessionStore;
  requireAuth: RequestHandler;
  isAuthorized: (req: Request) => boolean;
  rejectUnauthorized: (req: Request, res: Response) => void;
  csrfProtection: RequestHandler;
  requireLoopbackHost: RequestHandler;
  requireExactOrigin: RequestHandler;
  close(): void;
}

interface PassportLike {
  use(strategy: unknown): void;
  initialize(): RequestHandler;
  session(): RequestHandler;
  authenticate(
    name: string,
    options: { session?: boolean },
    callback: (error: unknown, user?: unknown) => void,
  ): RequestHandler;
  serializeUser(fn: (user: Express.User, done: (error: Error | null, id?: string) => void) => void): void;
  deserializeUser(
    fn: (id: string, done: (error: Error | null, user?: Express.User | false) => void) => void,
  ): void;
}

const PassportConstructor = (
  passportModule as unknown as { Passport: new () => PassportLike }
).Passport;

function readString(body: unknown, key: string): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function noStore(_req: Request, res: Response, next: () => void): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

function forbidden(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
  res.status(403).json({ error: 'forbidden' });
}

function unavailable(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
  res.status(503).json({ error: 'unavailable' });
}

function asUser(value: unknown): Express.User | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record['id'] !== 'string' || typeof record['email'] !== 'string') return null;
  return { id: record['id'], email: record['email'] };
}

export function createAuth(options: AuthOptions): AuthDependencies {
  if (options.sessionSecret.length < 32) {
    throw new Error('Auth session secret must be at least 32 characters');
  }

  const accounts = createAccountStore(options.databasePath);
  const idleTtlMs = options.idleTtlMs ?? DEFAULT_IDLE_TTL_MS;
  const absoluteTtlMs = options.absoluteTtlMs ?? DEFAULT_ABSOLUTE_TTL_MS;
  const now = options.now ?? Date.now;
  const cookieSecure = options.cookieSecure ?? false;
  const windowMs = options.rateLimit?.windowMs ?? DEFAULT_RATE_WINDOW_MS;
  const registerWindowMs = options.rateLimit?.registerWindowMs ?? 60 * 60 * 1000;
  const loginPerEmail = options.rateLimit?.loginPerEmail ?? 5;
  const loginPerIp = options.rateLimit?.loginPerIp ?? 20;
  const registerPerIp = options.rateLimit?.registerPerIp ?? 5;

  const service = createAuthService({ accounts });
  const sessionStore = new SqliteSessionStore({ db: accounts.db, defaultTtlMs: idleTtlMs, now });
  const passport = new PassportConstructor();

  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const user = await service.authenticate(email, password);
          done(null, user ?? false);
        } catch (error) {
          done(error);
        }
      },
    ),
  );
  passport.serializeUser((user: Express.User, done) => done(null, user.id));
  passport.deserializeUser((id: string, done) => {
    const user = service.findPublicById(String(id));
    done(null, user === null ? false : (user as Express.User));
  });

  const sessionMiddleware = session({
    name: AUTH_COOKIE,
    secret: options.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: false,
    unset: 'destroy',
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      path: '/',
      maxAge: idleTtlMs,
    },
  });

  const { generateToken, csrfSynchronisedProtection } = csrfSync({
    getTokenFromRequest: (req) => {
      const value = req.headers['x-csrf-token'];
      return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;
    },
  });

  function requireLoopbackHost(req: Request, res: Response, next: () => void): void {
    if (!isLoopbackHost(req.headers.host)) {
      forbidden(res);
      return;
    }
    next();
  }

  function requireBootstrapOrigin(req: Request, res: Response, next: () => void): void {
    if (!originAllowedForBootstrap(req.headers.origin, LOCAL_ORIGINS)) {
      forbidden(res);
      return;
    }
    next();
  }

  function requireExactOrigin(req: Request, res: Response, next: () => void): void {
    if (!originAllowedForPost(req.headers.origin, LOCAL_ORIGINS)) {
      forbidden(res);
      return;
    }
    next();
  }

  function clearAuthCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      path: '/',
    });
  }

  /**
   * Re-check authorization part-way through a request. `req.user` and
   * `req.session` are snapshots from when the request arrived, so a logout,
   * expiry or disable that happened since then is only visible in the stores.
   */
  function isAuthorized(req: Request): boolean {
    if (!req.isAuthenticated() || req.user === undefined) return false;
    const userId = req.user.id;
    let stored: unknown = null;
    // SqliteSessionStore is synchronous: the callback runs before get returns.
    sessionStore.get(req.sessionID, (error, value) => {
      stored = error ? null : value;
    });
    if (typeof stored !== 'object' || stored === null) return false;
    const { createdAt, passport: login } = stored as {
      createdAt?: unknown;
      passport?: { user?: unknown };
    };
    return (
      login?.user === userId &&
      typeof createdAt === 'number' &&
      now() - createdAt <= absoluteTtlMs &&
      service.findPublicById(userId) !== null
    );
  }

  /**
   * Answer 401 part-way through a request. If the stored session is already gone,
   * drop this request's copy too, so a late response cannot re-send its cookie
   * over a newer sign-in in the same browser.
   */
  function rejectUnauthorized(req: Request, res: Response): void {
    const reply = (): void => {
      res.setHeader('Cache-Control', 'no-store');
      res.status(401).json({ error: 'unauthenticated' });
    };
    let exists = true;
    sessionStore.get(req.sessionID, (error, value) => {
      exists = !error && value !== null && value !== undefined;
    });
    if (exists) reply();
    else req.session.destroy(reply);
  }

  function requireAuth(req: Request, res: Response, next: () => void): void {
    if (!req.isAuthenticated() || req.user === undefined) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    const createdAt = req.session.createdAt;
    if (typeof createdAt !== 'number' || now() - createdAt > absoluteTtlMs) {
      req.session.destroy(() => {
        clearAuthCookie(res);
        res.setHeader('Cache-Control', 'no-store');
        res.status(401).json({ error: 'unauthenticated' });
      });
      return;
    }
    next();
  }

  function rateLimitedFor(window: number): (_req: Request, res: Response) => void {
    return (_req, res) => {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil(window / 1000))));
      res.setHeader('Cache-Control', 'no-store');
      res.status(429).json({ error: 'rate-limited' });
    };
  }

  const loginEmailLimiter = rateLimit({
    windowMs,
    limit: loginPerEmail,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = normalizeEmail(readString(req.body, 'email') ?? '');
      return `login-email:${email}:${ipKeyGenerator(req.ip ?? 'unknown')}`;
    },
    handler: rateLimitedFor(windowMs),
  });
  const loginIpLimiter = rateLimit({
    windowMs,
    limit: loginPerIp,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitedFor(windowMs),
  });
  const registerLimiter = rateLimit({
    windowMs: registerWindowMs,
    limit: registerPerIp,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitedFor(registerWindowMs),
  });

  const router = Router();
  router.use('/api/auth', noStore);

  router.get('/api/auth/csrf', requireLoopbackHost, requireBootstrapOrigin, (req, res) => {
    res.status(200).json({ csrfToken: generateToken(req) });
  });

  router.post(
    '/api/auth/register',
    requireLoopbackHost,
    requireExactOrigin,
    csrfSynchronisedProtection,
    registerLimiter,
    (req, res) => {
      const email = readString(req.body, 'email');
      const password = readString(req.body, 'password');
      if (email === null || password === null) {
        res.status(400).json({ error: 'invalid-request' });
        return;
      }
      void service.register(email, password).then(
        () => {
          res.status(201).json({ ok: true });
        },
        (error: unknown) => {
          if (error instanceof AuthValidationError) {
            res.status(400).json({ error: 'invalid-request' });
            return;
          }
          unavailable(res);
        },
      );
    },
  );

  router.post(
    '/api/auth/login',
    requireLoopbackHost,
    requireExactOrigin,
    csrfSynchronisedProtection,
    loginEmailLimiter,
    loginIpLimiter,
    (req, res, next) => {
      const email = readString(req.body, 'email');
      const password = readString(req.body, 'password');
      if (email === null || password === null) {
        res.status(400).json({ error: 'invalid-request' });
        return;
      }

      passport.authenticate('local', { session: false }, (error, candidate) => {
        if (error !== null && error !== undefined) {
          unavailable(res);
          return;
        }
        const user = asUser(candidate);
        if (user === null) {
          res.status(401).json({ error: 'invalid-credentials' });
          return;
        }

        // Passport regenerates the session as part of login (fixation guard).
        // Record the absolute lifetime and issue a fresh CSRF token after that
        // regeneration, then save before reporting success.
        req.login(user, (loginError) => {
          if (loginError !== null && loginError !== undefined) {
            unavailable(res);
            return;
          }
          req.session.createdAt = now();
          req.session.cookie.maxAge = idleTtlMs;
          const csrfToken = generateToken(req, true);
          req.session.save((saveError) => {
            if (saveError !== null && saveError !== undefined) {
              req.session.destroy(() => unavailable(res));
              return;
            }
            res.status(200).json({ user, csrfToken });
          });
        });
      })(req, res, next);
    },
  );

  router.get('/api/auth/me', requireLoopbackHost, requireAuth, (req, res) => {
    const user = asUser(req.user);
    if (user === null) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    res.status(200).json({ user });
  });

  router.post(
    '/api/auth/logout',
    requireLoopbackHost,
    requireExactOrigin,
    csrfSynchronisedProtection,
    (req, res) => {
      const finish = (): void => {
        req.session.destroy((destroyError) => {
          if (destroyError !== null && destroyError !== undefined) {
            unavailable(res);
            return;
          }
          clearAuthCookie(res);
          res.status(204).end();
        });
      };

      if (req.isAuthenticated()) {
        req.logout((logoutError) => {
          if (logoutError !== null && logoutError !== undefined) {
            unavailable(res);
            return;
          }
          finish();
        });
        return;
      }
      finish();
    },
  );

  for (const [path, allow] of [
    ['/api/auth/csrf', 'GET, HEAD'],
    ['/api/auth/register', 'POST'],
    ['/api/auth/login', 'POST'],
    ['/api/auth/me', 'GET, HEAD'],
    ['/api/auth/logout', 'POST'],
  ] as const) {
    router.all(path, (_req, res) => {
      res.setHeader('Allow', allow);
      res.status(405).json({ error: 'method-not-allowed' });
    });
  }

  return {
    middleware: [sessionMiddleware, passport.initialize(), passport.session()],
    router,
    accountStore: accounts,
    sessionStore,
    requireAuth,
    isAuthorized,
    rejectUnauthorized,
    csrfProtection: csrfSynchronisedProtection,
    requireLoopbackHost,
    requireExactOrigin,
    close() {
      sessionStore.close();
      accounts.close();
    },
  };
}
