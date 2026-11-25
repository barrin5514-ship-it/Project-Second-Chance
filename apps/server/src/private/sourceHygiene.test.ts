import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['apps/server/src', 'apps/web/src'];
const DIRECTION_CONTROLS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/;

function files(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) result.push(...files(path));
    else if (/\.(ts|tsx|mjs|js)$/.test(entry)) result.push(path);
  }
  return result;
}

describe('source hygiene', () => {
  it('does not contain raw Unicode direction-control characters in app source', () => {
    const offenders = ROOTS.flatMap(files).filter((path) =>
      DIRECTION_CONTROLS.test(readFileSync(path, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
