import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

/**
 * Project root, resolved from this file's location rather than process.cwd(),
 * so it is identical whether npm starts from the root or from apps/server.
 */
export const PROJECT_ROOT = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../',
);

export interface AvatarConfig {
  /** Presence only. The key value is never returned, logged or serialised. */
  readonly hasApiKey: boolean;
}

const KEY_NAME = 'NUANCE_API_KEY';

/**
 * Reads the ignored project-root .env programmatically and reports only whether
 * a usable key is present. Callers that need the key call `readApiKey`, which is
 * the single place that touches the value and hands it straight to fetch.
 */
export function loadAvatarConfig(options: { rootDir?: string } = {}): AvatarConfig {
  const rootDir = options.rootDir ?? PROJECT_ROOT;
  return Object.freeze({ hasApiKey: readApiKey(rootDir) !== null });
}

/**
 * Returns the API key or null. Kept separate from the config object so the key
 * cannot leak through `JSON.stringify(config)` or template interpolation.
 */
export function readApiKey(rootDir: string = PROJECT_ROOT): string | null {
  const envPath = join(rootDir, '.env');
  if (!existsSync(envPath)) return null;
  let parsed: Record<string, string>;
  try {
    parsed = parse(readFileSync(envPath));
  } catch {
    return null;
  }
  const value = parsed[KEY_NAME];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
