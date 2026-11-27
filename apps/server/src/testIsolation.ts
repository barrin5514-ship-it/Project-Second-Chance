import { isAbsolute, relative, resolve, sep } from 'node:path';

function escapes(base: string, candidate: string): boolean {
  const rel = relative(base, candidate);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

export function assertE2EIsolation(root: string, env: NodeJS.ProcessEnv): void {
  const e2e = env['PSC_E2E_NO_KEY'] === '1' || env['PSC_E2E_AUTH_RELAXED'] === '1';
  if (!e2e) return;
  const configured = env['PSC_RUNTIME_DIR'];
  if (!configured) throw new Error('E2E mode requires PSC_RUNTIME_DIR');
  const runtime = resolve(configured);
  const ownerRuntime = resolve(root, 'runtime');
  const windows = process.platform === 'win32';
  const comparableRuntime = windows ? runtime.toLowerCase() : runtime;
  const comparableOwner = windows ? ownerRuntime.toLowerCase() : ownerRuntime;
  if (comparableRuntime === comparableOwner || !escapes(comparableOwner, comparableRuntime)) {
    throw new Error('E2E mode must not use the owner runtime');
  }
  for (const key of ['PSC_PRIVATE_DATA_DIR', 'PSC_PRIVATE_KEY_DIR']) {
    const value = env[key];
    if (value === '') throw new Error(`${key} must not be empty in E2E mode`);
    if (!value) continue;
    const resolved = windows ? resolve(value).toLowerCase() : resolve(value);
    if (resolved === comparableRuntime || escapes(comparableRuntime, resolved)) {
      throw new Error(`${key} must stay inside the isolated E2E runtime`);
    }
  }
}
