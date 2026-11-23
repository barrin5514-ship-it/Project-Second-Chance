import { describe, expect, it } from 'vitest';
import {
  createHttpTokenAdapter,
  LIFECYCLE_URL,
  TOKEN_URL,
  type TokenTransport,
} from './tokenAdapter';

const FAKE_TOKEN_A = 'st_test_first_0000000000000000';
const FAKE_TOKEN_B = 'st_test_second_000000000000000';

interface PendingPost {
  url: string;
  body: unknown;
  resolve: (value: { ok: boolean; status: number; json(): Promise<unknown> }) => void;
}

/** A transport whose token replies the test controls, to model an in-flight mint. */
function controllableTransport(): {
  transport: TokenTransport;
  posts: Array<{ url: string; body: unknown }>;
  pending: PendingPost[];
  waitForTokenPost: (index: number) => Promise<PendingPost>;
  resolveToken: (index: number, body: unknown) => void;
} {
  const posts: Array<{ url: string; body: unknown }> = [];
  const pending: PendingPost[] = [];

  const transport: TokenTransport = {
    async get() {
      return { ok: true, status: 200, json: async () => ({ csrfToken: 'csrf_test_value' }) };
    },
    post(url, body) {
      posts.push({ url, body });
      if (url === TOKEN_URL) {
        return new Promise((resolve) => {
          pending.push({ url, body, resolve });
        });
      }
      // Lifecycle notes are best-effort and answer immediately.
      return Promise.resolve({ ok: true, status: 204, json: async () => ({}) });
    },
  };

  return {
    transport,
    posts,
    pending,
    async waitForTokenPost(index: number) {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        if (pending[index] !== undefined) return pending[index]!;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      throw new Error(`token POST ${index} never happened`);
    },
    resolveToken(index: number, body: unknown) {
      pending[index]!.resolve({ ok: true, status: 200, json: async () => body });
    },
  };
}

describe('createHttpTokenAdapter lifecycle', () => {
  it('does not resurrect a token minted for a Start closed while the mint was in flight', async () => {
    const harness = controllableTransport();
    const tokens = createHttpTokenAdapter(harness.transport);

    const first = tokens.fetchToken();
    await harness.waitForTokenPost(0);

    // The user stops while the server is still minting.
    tokens.reset();
    harness.resolveToken(0, { token: FAKE_TOKEN_A, attemptId: 'att_first' });
    await expect(first).rejects.toThrow(/superseded/i);

    const second = tokens.fetchToken();
    await harness.waitForTokenPost(1);
    harness.resolveToken(1, { token: FAKE_TOKEN_B, attemptId: 'att_second' });

    // The new Start minted fresh; the closed Start's token was never reused.
    await expect(second).resolves.toEqual({ token: FAKE_TOKEN_B, attemptId: 'att_second' });
    expect(harness.posts.filter((entry) => entry.url === TOKEN_URL)).toHaveLength(2);
    // The closed Start's identity is released on the server without a re-mint.
    const lifecycle = harness.posts.filter((entry) => entry.url === LIFECYCLE_URL);
    expect(lifecycle).toContainEqual({ url: LIFECYCLE_URL, body: { attemptId: 'att_first', action: 'stop' } });
  });

  it('still caches and de-duplicates token calls inside one open Start', async () => {
    const harness = controllableTransport();
    const tokens = createHttpTokenAdapter(harness.transport);

    const first = tokens.fetchToken();
    await harness.waitForTokenPost(0);
    harness.resolveToken(0, { token: FAKE_TOKEN_A, attemptId: 'att_first' });

    const [a, b] = await Promise.all([first, tokens.fetchToken()]);
    expect(a).toEqual({ token: FAKE_TOKEN_A, attemptId: 'att_first' });
    expect(b).toEqual(a);
    expect(harness.posts.filter((entry) => entry.url === TOKEN_URL)).toHaveLength(1);
  });
});
