import { isAbsolute, relative, resolve } from 'node:path';

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
  const relativeToOwner = relative(comparableOwner, comparableRuntime);
  if (
    comparableRuntime === comparableOwner ||
    (relativeToOwner !== '' && !relativeToOwner.startsWith('..') && !isAbsolute(relativeToOwner))
  ) {
    throw new Error('E2E mode must not use the owner runtime');
  }
  for (const key of ['PSC_PRIVATE_DATA_DIR', 'PSC_PRIVATE_KEY_DIR']) {
    const value = env[key];
    if (!value) continue;
    const resolved = resolve(value);
    const rel = relative(
      comparableRuntime,
      windows ? resolved.toLowerCase() : resolved,
    );
    if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error(`${key} must stay inside the isolated E2E runtime`);
    }
  }
}
