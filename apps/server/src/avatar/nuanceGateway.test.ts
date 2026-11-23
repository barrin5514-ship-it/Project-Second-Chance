import { describe, expect, it } from 'vitest';
import { mintSessionToken, MIRA_PURPOSE_PROMPT, type FetchLike } from './nuanceGateway';

const FAKE_KEY = 'nk_test_000000000000000000000000';
const FAKE_TOKEN = 'st_test_000000000000000000000000';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function recordingFetch(impl: () => Promise<Response> | Response): FetchLike & { calls: unknown[] } {
  const calls: unknown[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return impl();
  }) as FetchLike & { calls: unknown[] };
  fn.calls = calls;
  return fn;
}

describe('mintSessionToken', () => {
  it('sends fixed mira persona and camera disabled, and returns only the token', async () => {
    const fetchImpl = recordingFetch(() =>
      jsonResponse({ token: FAKE_TOKEN, expires_at: '2026-11-22T17:01:00Z', warnings: [] }),
    );

    const result = await mintSessionToken({
      apiKey: FAKE_KEY,
      endUserId: 'local-avatar',
      fetchImpl,
      nowMs: Date.UTC(2026, 10, 22, 17, 0, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.token).toBe(FAKE_TOKEN);
    expect(Object.keys(result).sort()).toEqual(['expiresAt', 'ok', 'token']);

    const body = JSON.parse(String((fetchImpl.calls[0] as { init: RequestInit }).init.body));
    expect(body.personality.persona_id).toBe('mira');
    expect(body.personality.system_prompt).toBe(MIRA_PURPOSE_PROMPT);
    expect(body.interface_setup.video.input.camera).toBe(false);
    expect(body.end_user_id).toBe('local-avatar');
  });

  it('keeps the token-mint body on the documented contract, leaving duration to the SDK start', async () => {
    const fetchImpl = recordingFetch(() =>
      jsonResponse({ token: FAKE_TOKEN, expires_at: '2026-11-22T17:01:00Z' }),
    );

    await mintSessionToken({ apiKey: FAKE_KEY, endUserId: 'local-avatar', fetchImpl });

    const body = JSON.parse(String((fetchImpl.calls[0] as { init: RequestInit }).init.body));
    // Verified against the pinned package: `SessionTokenRequest` has no
    // duration field, and the SDK sends `max_session_seconds` on the
    // conversation-start request from its `maxSessionSeconds` option
    // (index.js). Adding it here would assert a contract the provider does
    // not document; the 60 s cap is covered by the web connection tests.
    expect(body.max_session_seconds).toBeUndefined();

    // The request stays a fixed contract: only these top-level keys, so no
    // caller can smuggle in a persona, prompt or API destination.
    expect(Object.keys(body).sort()).toEqual([
      'end_user_id',
      'interface',
      'interface_setup',
      'personality',
    ]);
    expect(Object.keys(body.personality).sort()).toEqual(['persona_id', 'system_prompt']);
    expect(Object.keys(body.interface_setup).sort()).toEqual(['video']);
  });

  it('never puts the API key in the request body or URL', async () => {
    const fetchImpl = recordingFetch(() => jsonResponse({ token: FAKE_TOKEN, expires_at: 'x' }));
    await mintSessionToken({ apiKey: FAKE_KEY, endUserId: 'u', fetchImpl });

    const call = fetchImpl.calls[0] as { input: RequestInfo | URL; init: RequestInit };
    expect(String(call.init.body)).not.toContain(FAKE_KEY);
    expect(String(call.input)).not.toContain(FAKE_KEY);
  });

  it('keeps the purpose prompt free of legal advice or eligibility claims', () => {
    const lowered = MIRA_PURPOSE_PROMPT.toLowerCase();
    for (const forbidden of ['eligib', 'legal advice', 'you qualify', 'deadline', 'expungement']) {
      expect(lowered).not.toContain(forbidden);
    }
  });

  it('maps a provider 401 to a sanitized failure', async () => {
    const fetchImpl = recordingFetch(() =>
      jsonResponse({ detail: 'invalid api key nk_leaked_value', code: 'not_authenticated' }, 401),
    );
    const result = await mintSessionToken({ apiKey: FAKE_KEY, endUserId: 'u', fetchImpl });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(502);
    expect(result.reason).toBe('provider-rejected');
    expect(JSON.stringify(result)).not.toContain('nk_leaked_value');
    expect(JSON.stringify(result)).not.toContain(FAKE_KEY);
  });

  it('maps a provider 5xx to a sanitized failure', async () => {
    const fetchImpl = recordingFetch(() => jsonResponse({ detail: 'internal' }, 500));
    const result = await mintSessionToken({ apiKey: FAKE_KEY, endUserId: 'u', fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('provider-error');
  });

  it('maps a 200 without a usable token to a malformed failure', async () => {
    const fetchImpl = recordingFetch(() => jsonResponse({ token: 42, extra: 'ignored' }));
    const result = await mintSessionToken({ apiKey: FAKE_KEY, endUserId: 'u', fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('provider-malformed');
      expect(JSON.stringify(result)).not.toContain('ignored');
    }
  });

  it('maps an aborted request to a timeout failure', async () => {
    const fetchImpl = recordingFetch(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    const result = await mintSessionToken({
      apiKey: FAKE_KEY,
      endUserId: 'u',
      fetchImpl,
      timeoutMs: 5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.requestTimedOut).toBe(true);
  });

  it('maps a network error to an unavailable failure without leaking the cause', async () => {
    const fetchImpl = recordingFetch(() => Promise.reject(new Error(`connect failed ${FAKE_KEY}`)));
    const result = await mintSessionToken({ apiKey: FAKE_KEY, endUserId: 'u', fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('provider-unreachable');
      expect(JSON.stringify(result)).not.toContain(FAKE_KEY);
    }
  });

  it('passes a timeout signal so a hanging provider cannot block forever', async () => {
    const fetchImpl = recordingFetch(() => jsonResponse({ token: FAKE_TOKEN, expires_at: 'x' }));
    await mintSessionToken({ apiKey: FAKE_KEY, endUserId: 'u', fetchImpl, timeoutMs: 250 });
    const call = fetchImpl.calls[0] as { init: RequestInit };
    expect(call.init.signal).toBeInstanceOf(AbortSignal);
  });
});
