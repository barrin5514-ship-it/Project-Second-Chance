import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { assertE2EIsolation } from '../testIsolation';

export interface AuthRuntimeSettings {
  databasePath: string;
  sessionSecret: string;
}

const PROJECT_ROOT = resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

/**
 * Load local auth settings without reading .env values. The secret is generated
 * once into an ignored runtime file and never logged. Existing short/empty
 * secrets fail closed instead of being replaced silently.
 */
export function loadAuthSettings(
  root = PROJECT_ROOT,
  env: NodeJS.ProcessEnv = process.env,
): AuthRuntimeSettings {
  if (
    (env['PSC_E2E_NO_KEY'] === '1' || env['PSC_E2E_AUTH_RELAXED'] === '1') &&
    !env['PSC_RUNTIME_DIR']
  ) {
    // Test mode must never fall back to the project owner runtime.
    throw new Error('E2E mode requires PSC_RUNTIME_DIR');
  }
  assertE2EIsolation(root, env);
  const runtimeDir = env['PSC_RUNTIME_DIR']
    ? resolve(env['PSC_RUNTIME_DIR'])
    : join(root, 'runtime');
  mkdirSync(runtimeDir, { recursive: true });

  const secretPath = join(runtimeDir, 'auth-session-secret');
  let sessionSecret: string;
  if (!existsSync(secretPath)) {
    sessionSecret = randomBytes(48).toString('base64url');
    writeFileSync(secretPath, `${sessionSecret}\n`, { encoding: 'utf8', mode: 0o600 });
    try {
      chmodSync(secretPath, 0o600);
    } catch {
      // Windows may ignore POSIX mode; the file remains under the ignored runtime dir.
    }
  } else {
    sessionSecret = readFileSync(secretPath, 'utf8').trim();
  }
  if (sessionSecret.length < 32) {
    throw new Error('Auth session secret is missing or too short');
  }

  return {
    databasePath: join(runtimeDir, 'psc-auth.sqlite'),
    sessionSecret,
  };
}
