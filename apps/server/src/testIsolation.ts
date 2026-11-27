import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';

export function assertE2EIsolation(root: string, env: NodeJS.ProcessEnv): void {
  const e2e = env['PSC_E2E_NO_KEY'] === '1' || env['PSC_E2E_AUTH_RELAXED'] === '1';
  if (!e2e) return;
  const configured = env['PSC_RUNTIME_DIR'];
  if (!configured) throw new Error('E2E mode requires PSC_RUNTIME_DIR');
  const runtime = resolve(configured);
  const ownerRuntime = resolve(root, 'runtime');
  if (runtime === ownerRuntime) throw new Error('E2E mode must not use the owner runtime');
  if (basename(dirname(runtime)) !== 'test-results' || !basename(runtime).startsWith('e2e-runtime-')) {
    throw new Error('E2E runtime must be an isolated test-results/e2e-runtime-* directory');
  }
  for (const key of ['PSC_PRIVATE_DATA_DIR', 'PSC_PRIVATE_KEY_DIR']) {
    const value = env[key];
    if (!value) continue;
    const resolved = resolve(value);
    const rel = relative(runtime, resolved);
    if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error(`${key} must stay inside the isolated E2E runtime`);
    }
  }
}
