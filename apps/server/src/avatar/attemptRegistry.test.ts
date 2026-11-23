import { describe, expect, it } from 'vitest';
import { AttemptRegistry, type Clock } from './attemptRegistry';

/** Deterministic fake clock: tests advance time explicitly. */
function fakeClock(startMs = Date.UTC(2026, 10, 22, 17, 0, 0)): Clock & { advance: (ms: number) => void } {
  let now = startMs;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const TOKEN_TTL_MS = 60_000;

describe('AttemptRegistry', () => {
  it('issues one attempt per explicit Start and marks it usable', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const attempt = mustBegin(reg, 'session-a');
    expect(attempt.status).toBe('pending');
    expect(reg.canMint(attempt.id, 'session-a')).toBe(true);
  });

  it('consumes an attempt on the first successful mint and refuses every later callback', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const attempt = mustBegin(reg, 'session-a');

    expect(reg.consume(attempt.id, 'session-a')).toBe(true);
    expect(reg.canMint(attempt.id, 'session-a')).toBe(false);
    // SDK capacity retry calls token() again with the same identity.
    expect(reg.consume(attempt.id, 'session-a')).toBe(false);
    expect(reg.consume(attempt.id, 'session-a')).toBe(false);
  });

  it('keeps a consumed identity refused after Stop', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const attempt = mustBegin(reg, 'session-a');
    reg.consume(attempt.id, 'session-a');
    reg.close(attempt.id, 'session-a');

    expect(reg.canMint(attempt.id, 'session-a')).toBe(false);
    expect(reg.consume(attempt.id, 'session-a')).toBe(false);
  });

  it('keeps a consumed identity refused after a connection failure', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const attempt = mustBegin(reg, 'session-a');
    reg.consume(attempt.id, 'session-a');
    reg.close(attempt.id, 'session-a', 'failed');

    expect(reg.consume(attempt.id, 'session-a')).toBe(false);
  });

  it('refuses a pending attempt once its token-start deadline passes', () => {
    const clock = fakeClock();
    const reg = new AttemptRegistry({ clock, tokenTtlMs: TOKEN_TTL_MS });
    const attempt = mustBegin(reg, 'session-a');

    clock.advance(TOKEN_TTL_MS + 1);
    expect(reg.canMint(attempt.id, 'session-a')).toBe(false);
    expect(reg.consume(attempt.id, 'session-a')).toBe(false);
  });

  it('does not treat a started conversation as ended when the token deadline passes', () => {
    const clock = fakeClock();
    const reg = new AttemptRegistry({ clock, tokenTtlMs: TOKEN_TTL_MS });
    const attempt = mustBegin(reg, 'session-a');
    reg.consume(attempt.id, 'session-a');
    reg.markStarted(attempt.id, 'session-a');

    clock.advance(TOKEN_TTL_MS * 10);
    expect(reg.isSessionActive(attempt.id, 'session-a')).toBe(true);
  });

  it('lets a fresh explicit Start mint once after the previous lifecycle closed', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const first = mustBegin(reg, 'session-a');
    reg.consume(first.id, 'session-a');
    reg.close(first.id, 'session-a');

    const second = mustBegin(reg, 'session-a');
    expect(second.id).not.toBe(first.id);
    expect(reg.consume(second.id, 'session-a')).toBe(true);
    expect(reg.consume(second.id, 'session-a')).toBe(false);
  });

  it('does not let a stale callback unlock a newer attempt', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const old = mustBegin(reg, 'session-a');
    reg.consume(old.id, 'session-a');
    // Safe closure is required before a new Start is allowed.
    reg.close(old.id, 'session-a', 'stopped');

    const newer = mustBegin(reg, 'session-a');
    // Late Stop/end/error from the old identity arrives now.
    reg.close(old.id, 'session-a', 'ended');

    expect(reg.canMint(newer.id, 'session-a')).toBe(true);
    expect(reg.consume(newer.id, 'session-a')).toBe(true);
    // And the old identity is still dead.
    expect(reg.consume(old.id, 'session-a')).toBe(false);
  });

  it('rejects an attempt id presented under a different browser session', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const attempt = mustBegin(reg, 'session-a');

    expect(reg.canMint(attempt.id, 'session-b')).toBe(false);
    expect(reg.consume(attempt.id, 'session-b')).toBe(false);
    // The rightful owner is unaffected.
    expect(reg.canMint(attempt.id, 'session-a')).toBe(true);
  });

  it('lets a genuinely new attempt mint after an abandoned attempt expired', () => {
    const clock = fakeClock();
    const reg = new AttemptRegistry({ clock, tokenTtlMs: TOKEN_TTL_MS });
    const abandoned = mustBegin(reg, 'session-a');
    reg.consume(abandoned.id, 'session-a');

    // The browser gives up without ever starting a conversation.
    clock.advance(TOKEN_TTL_MS + 1);

    // A new explicit Start: its deadline runs from now, not from the first Start.
    const fresh = mustBegin(reg, 'session-a');
    expect(fresh.id).not.toBe(abandoned.id);
    expect(reg.canMint(fresh.id, 'session-a')).toBe(true);
    expect(reg.consume(fresh.id, 'session-a')).toBe(true);
    // The expired identity stays dead.
    expect(reg.consume(abandoned.id, 'session-a')).toBe(false);
  });

  it('rejects unknown attempt ids', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    expect(reg.canMint('attempt_does_not_exist', 'session-a')).toBe(false);
    expect(reg.consume('attempt_does_not_exist', 'session-a')).toBe(false);
  });

  it('issues unguessable, distinct attempt ids', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const ids = new Set(Array.from({ length: 50 }, (_v, i) => mustBegin(reg, `session-` + i).id));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^att_[A-Za-z0-9_-]{20,}$/);
  });
});

function mustBegin(reg: AttemptRegistry, sessionId: string): { id: string; status: string } {
  const outcome = reg.begin(sessionId);
  if (!outcome.ok) throw new Error(`begin refused: ${outcome.reason}`);
  return outcome.attempt;
}

describe('AttemptRegistry session exclusivity', () => {
  it('refuses a second Start while the first attempt is still minting', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    mustBegin(reg, 'session-a');
    const second = reg.begin('session-a');
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('attempt-in-progress');
  });

  it('refuses a second Start while a minted token is waiting to start', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const first = mustBegin(reg, 'session-a');
    reg.consume(first.id, 'session-a');

    const second = reg.begin('session-a');
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('awaiting-start');
  });

  it('refuses a second Start while a conversation is running', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const first = mustBegin(reg, 'session-a');
    reg.consume(first.id, 'session-a');
    reg.markStarted(first.id, 'session-a');

    const second = reg.begin('session-a');
    expect(second.ok).toBe(false);
  });

  it('keeps refusing a new Start while a started conversation outlives the token deadline', () => {
    const clock = fakeClock();
    const reg = new AttemptRegistry({ clock, tokenTtlMs: TOKEN_TTL_MS });
    const first = mustBegin(reg, 'session-a');
    reg.consume(first.id, 'session-a');
    reg.markStarted(first.id, 'session-a');

    clock.advance(TOKEN_TTL_MS * 10);
    const second = reg.begin('session-a');
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('attempt-in-progress');
  });

  it('allows a new Start once the previous attempt is closed', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    const first = mustBegin(reg, 'session-a');
    reg.consume(first.id, 'session-a');
    reg.close(first.id, 'session-a', 'stopped');

    const second = reg.begin('session-a');
    expect(second.ok).toBe(true);
  });

  it('keeps sessions independent', () => {
    const reg = new AttemptRegistry({ clock: fakeClock(), tokenTtlMs: TOKEN_TTL_MS });
    mustBegin(reg, 'session-a');
    expect(reg.begin('session-b').ok).toBe(true);
  });
});
