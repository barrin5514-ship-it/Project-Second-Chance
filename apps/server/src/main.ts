import { createServer } from 'node:http';
import { loadAvatarConfig, readApiKey } from './config';
import { createApp, LOCAL_ORIGINS } from './app';
import { AttemptRegistry } from './avatar/attemptRegistry';
import { createAuth } from './auth/auth';
import { loadAuthSettings } from './auth/authConfig';
import { initializePrivateStore, loadPrivatePaths } from './private/privateConfig';
import { createPrivateRouter } from './private/privateRoutes';

const LOOPBACK_HOST = '127.0.0.1';
const PORT = Number(process.env.PORT ?? 3001);

const config = loadAvatarConfig();

// E2E runs against the real HTTP server but must never contact the provider or
// spend a credit, so the key is forced absent regardless of the local .env.
const e2eNoKey = process.env.PSC_E2E_NO_KEY === '1';
const hasApiKey = e2eNoKey ? false : config.hasApiKey;
if (!hasApiKey) {
  console.warn('[api] No usable NUANCE_API_KEY. Start will answer 503.');
}

const authSettings = loadAuthSettings();
const e2eRelaxedLimits = process.env.PSC_E2E_AUTH_RELAXED === '1';
const auth = createAuth({
  ...authSettings,
  ...(e2eRelaxedLimits
    ? {
        rateLimit: {
          windowMs: 60_000,
          loginPerEmail: 1_000,
          loginPerIp: 1_000,
          registerPerIp: 1_000,
        },
      }
    : {}),
});
const privateStore = initializePrivateStore({
  db: auth.accountStore.db,
  paths: loadPrivatePaths(),
});
const app = createApp({
  hasApiKey,
  readApiKey: () => (e2eNoKey ? null : readApiKey()),
  fetchImpl: globalThis.fetch,
  registry: new AttemptRegistry({ clock: { now: () => Date.now() }, tokenTtlMs: 60_000 }),
  clock: { now: () => Date.now() },
  auth,
  privateDocuments: { router: createPrivateRouter({ auth, store: privateStore.store }) },
});

// Bind loopback only: this prototype is never reachable from another machine.
const server = createServer(app).listen(PORT, LOOPBACK_HOST, () => {
  console.log(`[api] listening on http://${LOOPBACK_HOST}:${PORT}`);
  console.log(`[api] allowed origins: ${LOCAL_ORIGINS.join(', ')}`);
});

function shutdown(): void {
  privateStore.store.reconcile();
  auth.close();
  server.close(() => {
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
