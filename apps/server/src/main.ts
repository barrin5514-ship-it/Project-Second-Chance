import { createServer } from 'node:http';
import { loadAvatarConfig, readApiKey } from './config';
import { createApp, LOCAL_ORIGINS } from './app';
import { AttemptRegistry } from './avatar/attemptRegistry';

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

const app = createApp({
  hasApiKey,
  readApiKey: () => (e2eNoKey ? null : readApiKey()),
  fetchImpl: globalThis.fetch,
  registry: new AttemptRegistry({ clock: { now: () => Date.now() }, tokenTtlMs: 60_000 }),
  clock: { now: () => Date.now() },
});

// Bind loopback only: this prototype is never reachable from another machine.
createServer(app).listen(PORT, LOOPBACK_HOST, () => {
  console.log(`[api] listening on http://${LOOPBACK_HOST}:${PORT}`);
  console.log(`[api] allowed origins: ${LOCAL_ORIGINS.join(', ')}`);
});

