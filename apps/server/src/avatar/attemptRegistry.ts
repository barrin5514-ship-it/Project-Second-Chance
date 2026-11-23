import { randomBytes } from 'node:crypto';

export interface Clock {
  now(): number;
}

export type AttemptStatus = 'pending' | 'consumed' | 'closed';

export interface Attempt {
  readonly id: string;
  readonly status: AttemptStatus;
}

type CloseReason = 'stopped' | 'failed' | 'timeout' | 'ended' | 'unmounted';

interface Record {
  sessionId: string;
  /** Deadline for STARTING an unused token. Irrelevant once a conversation started. */
  startDeadlineMs: number;
  consumed: boolean;
  closed: boolean;
  conversationStarted: boolean;
}

export type BeginOutcome =
  | { readonly ok: true; readonly attempt: Attempt }
  | { readonly ok: false; readonly reason: 'attempt-in-progress' | 'awaiting-start' };

/**
 * Single-use attempt guard.
 *
 * Identity: each explicit user Start creates a new attempt bound to one browser
 * session. The SDK token callback reuses that id for every callback in the
 * attempt, so an SDK-internal retry can never mint a second token.
 *
 * Consumption is terminal: once an attempt has minted, that id is refused
 * forever, including after Stop, failure, timeout, expiry or session end.
 * Closing frees session resources; it never revives the identity.
 *
 * Expiry scope: the token-start deadline applies only while an attempt has not
 * yet started a conversation. A running conversation is not ended by it.
 *
 * Session exclusivity: one active attempt per browser session, so a second
 * concurrent Start cannot mint alongside the first.
 */
export class AttemptRegistry {
  private readonly clock: Clock;
  private readonly tokenTtlMs: number;
  private readonly attempts = new Map<string, Record>();
  private readonly activeBySession = new Map<string, string>();

  constructor(options: { clock: Clock; tokenTtlMs: number }) {
    this.clock = options.clock;
    this.tokenTtlMs = options.tokenTtlMs;
  }

  /**
   * Starts a new attempt identity. Refused while the session already has an
   * attempt that is minting, holding a minted token or running a conversation.
   */
  begin(sessionId: string): BeginOutcome {
    const activeId = this.activeBySession.get(sessionId);
    if (activeId !== undefined) {
      const active = this.attempts.get(activeId);
      if (active !== undefined && !active.closed && this.stillHoldsSession(active)) {
        return {
          ok: false,
          reason: active.consumed && !active.conversationStarted ? 'awaiting-start' : 'attempt-in-progress',
        };
      }
      // Released or abandoned: this session's next attempt owns the slot.
      this.activeBySession.delete(sessionId);
    }

    const id = `att_${randomBytes(16).toString('base64url')}`;
    this.attempts.set(id, {
      sessionId,
      startDeadlineMs: this.clock.now() + this.tokenTtlMs,
      consumed: false,
      closed: false,
      conversationStarted: false,
    });
    this.activeBySession.set(sessionId, id);
    return { ok: true, attempt: { id, status: 'pending' } };
  }

  canMint(attemptId: string, sessionId: string): boolean {
    const record = this.lookup(attemptId, sessionId);
    if (record === null) return false;
    if (record.consumed || record.closed) return false;
    if (record.conversationStarted) return false;
    return this.clock.now() <= record.startDeadlineMs;
  }

  consume(attemptId: string, sessionId: string): boolean {
    if (!this.canMint(attemptId, sessionId)) return false;
    const record = this.attempts.get(attemptId);
    if (record === undefined) return false;
    // Re-check atomically against the record we just validated: Node's event
    // loop runs one handler at a time, so no interleaving is possible here.
    record.consumed = true;
    return true;
  }

  /** Resource cleanup only. A consumed identity stays consumed. */
  close(attemptId: string, sessionId: string, _reason?: CloseReason): void {
    const record = this.lookup(attemptId, sessionId);
    if (record === null) return;
    record.closed = true;
    record.conversationStarted = false;
  }

  markStarted(attemptId: string, sessionId: string): void {
    const record = this.lookup(attemptId, sessionId);
    if (record === null) return;
    record.conversationStarted = true;
  }

  isSessionActive(attemptId: string, sessionId: string): boolean {
    const record = this.lookup(attemptId, sessionId);
    if (record === null) return false;
    return record.conversationStarted;
  }

  /**
   * Whether this browser session may still act on the identity at all. False
   * for an unknown id, another session's id, or an attempt already released.
   * A started conversation past the token-start deadline is still owned.
   */
  owns(attemptId: string, sessionId: string): boolean {
    const record = this.lookup(attemptId, sessionId);
    if (record === null) return false;
    return !record.closed;
  }

  /**
   * Whether the record may still occupy its browser session's one slot.
   *
   * A running conversation holds the slot regardless of the token-start
   * deadline. Otherwise the deadline decides: an attempt that never started a
   * conversation is abandoned once it passes, so a dead browser session cannot
   * block every later explicit Start until the server restarts.
   */
  private stillHoldsSession(record: Record): boolean {
    if (record.conversationStarted) return true;
    return this.clock.now() <= record.startDeadlineMs;
  }

  private lookup(attemptId: string, sessionId: string): Record | null {
    const record = this.attempts.get(attemptId);
    if (record === undefined) return null;
    // An id presented under another browser session does not match.
    if (record.sessionId !== sessionId) return null;
    return record;
  }
}

