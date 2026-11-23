export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const NUANCE_SESSION_TOKEN_URL = 'https://api.nuancelabs.ai/session-tokens';
export const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Fixed, server-owned purpose prompt. Never caller-supplied. It deliberately
 * makes no legal claim, offers no advice and asks for no personal data, which
 * also keeps it within the provider's Acceptable Use Policy for review.
 */
export const MIRA_PURPOSE_PROMPT = [
  'You are Mira, an AI connection test inside Project Second Chance, a local prototype.',
  'Your only job is to confirm that a short spoken conversation works.',
  'Greet the person briefly, ask how their day is going, and reply warmly for one or two turns.',
  'You are an AI, not a human.',
  'Do not give any legal, tax, financial or medical guidance, and do not say whether anyone qualifies for anything.',
  'Ask for no personal information: no names, contact details, case numbers, dates or documents.',
  'If asked for advice or personal details, say warmly that this is only a connection test and offer no guidance.',
  'Keep every answer short and spoken.',
].join(' ');

export type FailureReason =
  | 'provider-rejected'
  | 'provider-error'
  | 'provider-malformed'
  | 'provider-unreachable'
  | 'provider-timeout';

export interface MintSuccess {
  readonly ok: true;
  readonly token: string;
  readonly expiresAt: string | null;
}

export interface MintFailure {
  readonly ok: false;
  /** Status this server should answer its own caller with. */
  readonly status: 502 | 504;
  readonly reason: FailureReason;
  readonly requestTimedOut: boolean;
}

export type MintResult = MintSuccess | MintFailure;

function failure(reason: FailureReason, status: 502 | 504, timedOut = false): MintFailure {
  return Object.freeze({ ok: false, status, reason, requestTimedOut: timedOut });
}

/**
 * Mints one short-lived Nuance session token.
 *
 * The key goes only into the Authorization header. Nothing from the provider's
 * response body is passed through except the token and its expiry, and no
 * failure message reproduces provider text, so a secret or raw body can never
 * reach the browser.
 */
export async function mintSessionToken(options: {
  apiKey: string;
  endUserId: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  nowMs?: number;
}): Promise<MintResult> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const body = {
    interface: 'nuance_live',
    personality: {
      persona_id: 'mira',
      system_prompt: MIRA_PURPOSE_PROMPT,
    },
    interface_setup: {
      video: { input: { camera: false } },
    },
    end_user_id: options.endUserId,
  };
  // `max_session_seconds` is deliberately absent: the pinned package's
  // `SessionTokenRequest` has no duration field. The page requests the 60 s cap
  // through the SDK's `maxSessionSeconds` option at conversation start, which
  // the provider enforces up to the account maximum.

  try {
    const response = await fetchImpl(NUANCE_SESSION_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status >= 500) {
      return failure('provider-error', 502);
    }
    if (!response.ok) {
      return failure('provider-rejected', 502);
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      return failure('provider-malformed', 502);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return failure('provider-malformed', 502);
    }
    const record = parsed as Record<string, unknown>;
    const token = record['token'];
    if (typeof token !== 'string' || !token.startsWith('st_') || token.length < 10) {
      return failure('provider-malformed', 502);
    }
    const expiresAt =
      typeof record['expires_at'] === 'string' ? record['expires_at'] : null;

    return Object.freeze({ ok: true, token, expiresAt });
  } catch (error) {
    const aborted =
      typeof error === 'object' &&
      error !== null &&
      (error as { name?: unknown }).name === 'AbortError';
    return aborted
      ? failure('provider-timeout', 504, true)
      : failure('provider-unreachable', 502);
  } finally {
    clearTimeout(timer);
  }
}
