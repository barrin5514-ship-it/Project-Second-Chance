import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const configPath = resolve('playwright.config.ts');
const config = readFileSync(configPath, 'utf8');

const failures = [];
if (!config.includes('PSC_RUNTIME_DIR: isolatedRuntime')) {
  failures.push('Playwright API server does not set PSC_RUNTIME_DIR');
}
if (!config.includes('PSC_PRIVATE_DATA_DIR: resolve(isolatedRuntime, \'private\')')) {
  failures.push('Playwright does not neutralize inherited PSC_PRIVATE_DATA_DIR');
}
if (!config.includes('PSC_PRIVATE_KEY_DIR: resolve(isolatedRuntime, \'keys\')')) {
  failures.push('Playwright does not neutralize inherited PSC_PRIVATE_KEY_DIR');
}
if (!config.includes("'test-results'") || !config.includes('e2e-runtime-')) {
  failures.push('Playwright isolated runtime is not under test-results/e2e-runtime-<pid>');
}
if (/PSC_RUNTIME_DIR:\s*['"`]?[^,\n]*[/\\]runtime[/\\]?['"`]?/.test(config)) {
  failures.push('Playwright runtime points at the owner runtime directory');
}

if (failures.length > 0) {
  console.error('E2E isolation preflight failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('E2E isolation preflight passed: browser tests use a disposable runtime, not the owner runtime.');
