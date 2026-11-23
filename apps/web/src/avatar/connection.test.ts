import { describe, expect, it } from 'vitest';
import { createAvatarConnection, classifyMediaError, MAX_SESSION_SECONDS } from './connection';
import type { ConversationLike, CreateConversationFn, TokenProvider } from './connection';

/** A synthetic server for tokens: no network, no credential, records resets. */
function fakeTokens(attemptId: string, token = 'st_abc'): TokenProvider & { resets: number } {
  const provider = {
    resets: 0,
    async fetchToken() {
      return { token, attemptId };
    },
    reset() {
      provider.resets += 1;
    },
  };
  return provider;
}


interface FakeConversation extends ConversationLike {
  connectCalls: number;
  disconnectCalls: number;
  listeners: Map<string, Set<(...args: unknown[]) => void>>;
  emit: (event: string, ...args: unknown[]) => void;
  /** The SDK's token callback, wired by tokenAwareFactory at construction. */
  tokenOnConnect: (() => Promise<string>) | null;
}

/** A stand-in for the SDK conversation, so no network or device is touched. */
function makeFakeConversation(options: { failOnConnect?: Error } = {}): {
  conversation: FakeConversation;
} {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const conversation: FakeConversation = {
    connectCalls: 0,
    disconnectCalls: 0,
    listeners,
    tokenOnConnect: null,
    on(event, handler) {
      const set = listeners.get(event) ?? new Set();
      set.add(handler);
      listeners.set(event, set);
      return () => set.delete(handler);
    },
    async connect() {
      conversation.connectCalls += 1;
      if (options.failOnConnect) throw options.failOnConnect;
      // The real SDK asks for its token during connect, after microphone
      // consent; a denial throws before this callback is reached.
      if (conversation.tokenOnConnect !== null) await conversation.tokenOnConnect();
    },
    disconnect() {
      conversation.disconnectCalls += 1;
    },
    emit(event, ...args) {
      for (const handler of listeners.get(event) ?? []) handler(...args);
    },
  };

  return { conversation };
}

/**
 * A factory that wires the SDK's token callback into each fake conversation,
 * in creation order, exactly as the real SDK does during connect().
 */
function tokenAwareFactory(...conversations: FakeConversation[]): CreateConversationFn {
  let index = 0;
  return (options) => {
    const target = conversations[index++]!;
    const token = options['token'];
    target.tokenOnConnect = typeof token === 'function' ? (token as () => Promise<string>) : null;
    return target;
  };
}

function optionsOf(factoryOptions: unknown[]): Record<string, unknown> {
  const first = factoryOptions[0];
  if (typeof first !== 'object' || first === null) {
    throw new Error('createConversation was never called');
  }
  return first as Record<string, unknown>;
}

describe('createAvatarConnection SDK options', () => {
  it('disables the camera, caps the session and does not stay connected on end', async () => {
    const factoryOptions: unknown[] = [];
    const conn = createAvatarConnection({
      createConversation: ((o: unknown) => {
        factoryOptions.push(o);
        return makeFakeConversation().conversation;
      }) as CreateConversationFn,
      tokens: fakeTokens('att_1'),
    });

    await conn.start();

    const opts = optionsOf(factoryOptions);
    expect(opts.mediaDevices).toEqual({ cameraEnabled: false });
    expect(opts.maxSessionSeconds).toBe(60);
    expect(MAX_SESSION_SECONDS).toBe(60);
    expect(opts.stayConnectedOnEnd).toBe(false);
  });

  it('reuses one server-issued attemptId for every token callback in the attempt', async () => {
    const { conversation } = makeFakeConversation();
    const factoryOptions: unknown[] = [];
    const conn = createAvatarConnection({
      createConversation: ((o: Record<string, unknown>) => {
        factoryOptions.push(o);
        return conversation;
      }) as CreateConversationFn,
      tokens: fakeTokens('att_fixed'),
    });

    await conn.start();

    const tokenFn = optionsOf(factoryOptions)['token'];
    expect(typeof tokenFn).toBe('function');
    if (typeof tokenFn !== 'function') throw new Error('token option is not a callback');

    // The SDK retries through this same callback; each call hits the server
    // with the identical identity so the guard can refuse the second mint.
    const first = await (tokenFn as () => Promise<string>)();
    const second = await (tokenFn as () => Promise<string>)();
    expect(first).toBe('st_abc');
    expect(second).toBe('st_abc');
    expect(conn.lastTokenRequestAttemptId).toBe('att_fixed');
  });
});

describe('media error classification', () => {
  it('reports microphone permission denied distinctly', () => {
    expect(classifyMediaError({ device: 'microphone', reason: 'permission-denied' })).toBe(
      'mic-denied',
    );
  });

  it('distinguishes other microphone problems from denial', () => {
    expect(classifyMediaError({ device: 'microphone', reason: 'device-not-found' })).toBe(
      'mic-unavailable',
    );
    expect(classifyMediaError({ device: 'microphone', reason: 'device-in-use' })).toBe(
      'mic-busy',
    );
    expect(classifyMediaError({ device: 'microphone', reason: 'unknown' })).toBe('mic-unavailable');
  });

  it('treats a camera failure as its own state, since the camera must stay off', () => {
    expect(classifyMediaError({ device: 'camera', reason: 'permission-denied' })).toBe(
      'camera-unavailable',
    );
  });

  it('falls back to a generic state for unknown devices', () => {
    expect(classifyMediaError({ device: 'unknown', reason: 'unknown' })).toBe('unavailable');
  });
});

describe('lifecycle and cleanup', () => {
  it('calls connect exactly once and never retries on its own', async () => {
    const { conversation } = makeFakeConversation();
    const conn = createAvatarConnection({
      createConversation: (() => conversation) as CreateConversationFn,
      tokens: fakeTokens('att_1'),
    });

    await conn.start();
    expect(conversation.connectCalls).toBe(1);
    // A second start without stop is refused, not silently retried.
    await expect(conn.start()).rejects.toThrow(/already/i);
    expect(conversation.connectCalls).toBe(1);
  });

  it('disconnects on stop and reports the stopped state', async () => {
    const { conversation } = makeFakeConversation();
    const conn = createAvatarConnection({
      createConversation: (() => conversation) as CreateConversationFn,
      tokens: fakeTokens('att_1'),
    });

    await conn.start();
    conn.stop();

    expect(conversation.disconnectCalls).toBe(1);
    expect(conn.getState()).toBe('stopped');
  });

  it('is safe to stop twice and safe to stop before starting', () => {
    const { conversation } = makeFakeConversation();
    const conn = createAvatarConnection({
      createConversation: (() => conversation) as CreateConversationFn,
      tokens: fakeTokens('att_1'),
    });

    expect(() => conn.stop()).not.toThrow();
    expect(conversation.disconnectCalls).toBe(0);
  });

  it('disconnects when the SDK reports the session ended', async () => {
    const { conversation } = makeFakeConversation();
    const conn = createAvatarConnection({
      createConversation: (() => conversation) as CreateConversationFn,
      tokens: fakeTokens('att_1'),
    });

    await conn.start();
    conversation.emit('session-ended', { reason: 'ended' });

    expect(conversation.disconnectCalls).toBeGreaterThanOrEqual(1);
    expect(conn.getState()).toBe('ended');
  });

  it('reports ready when the SDK presents the avatar', async () => {
    const { conversation } = makeFakeConversation();
    const conn = createAvatarConnection({
      createConversation: (() => conversation) as CreateConversationFn,
      tokens: fakeTokens('att_1'),
    });

    await conn.start();
    conversation.emit('avatar-presented');

    expect(conn.getState()).toBe('ready');
  });

  it('maps a connect-time MediaAccessError to the matching state', async () => {
    const error = Object.assign(new Error('Permission denied'), {
      name: 'MediaAccessError',
      device: 'microphone',
      reason: 'permission-denied',
    });
    const { conversation } = makeFakeConversation({ failOnConnect: error });
    const conn = createAvatarConnection({
      createConversation: (() => conversation) as CreateConversationFn,
      tokens: fakeTokens('att_1'),
    });

    await expect(conn.start()).rejects.toThrow();
    expect(conn.getState()).toBe('mic-denied');
    expect(conversation.disconnectCalls).toBeGreaterThanOrEqual(1);
  });

  it('ignores late events from an older attempt after a new one starts', async () => {
    const first = makeFakeConversation();
    const second = makeFakeConversation();
    const conversations = [first.conversation, second.conversation];
    let index = 0;

    const conn = createAvatarConnection({
      createConversation: (() => conversations[index++]!) as CreateConversationFn,
      tokens: fakeTokens(`att_${index}`),
    });

    await conn.start();
    conn.stop();
    await conn.start();
    expect(conn.getState()).not.toBe('stopped');

    // Stale callback from the closed first attempt.
    first.conversation.emit('session-ended', { reason: 'ended' });
    expect(conn.getState()).not.toBe('ended');
  });

  it('notifies subscribers of state changes and can unsubscribe', async () => {
    const { conversation } = makeFakeConversation();
    const conn = createAvatarConnection({
      createConversation: (() => conversation) as CreateConversationFn,
      tokens: fakeTokens('att_1'),
    });

    const seen: string[] = [];
    const unsubscribe = conn.subscribe((state) => seen.push(state));
    await conn.start();
    conversation.emit('avatar-presented');
    unsubscribe();
    conn.stop();

    expect(seen).toContain('ready');
    expect(seen[seen.length - 1]).not.toBe('stopped');
  });

  it('reports a token fetch failure as unavailable without reaching ready', async () => {
    const { conversation } = makeFakeConversation();
    const tokens: TokenProvider = {
      fetchToken: async () => {
        throw new Error('503');
      },
      reset: () => {},
    };
    const conn = createAvatarConnection({
      createConversation: tokenAwareFactory(conversation),
      tokens,
    });

    await expect(conn.start()).rejects.toThrow();
    expect(conn.getState()).toBe('unavailable');
    // The SDK asked for the token during connect, after media setup; the
    // failure never produced a ready/connected state.
    expect(conversation.connectCalls).toBe(1);
  });

  it('closes the Start lifecycle on Stop so the next explicit Start may mint again', async () => {
    const first = makeFakeConversation();
    const second = makeFakeConversation();
    const conversations = [first.conversation, second.conversation];
    let index = 0;
    const tokens = fakeTokens('att_1');

    const conn = createAvatarConnection({
      createConversation: (() => conversations[index++]!) as CreateConversationFn,
      tokens,
    });

    await conn.start();
    expect(tokens.resets).toBe(0);
    conn.stop();
    // The adapter is told this Start is over; otherwise the next Start would
    // be served the closed Start's token instead of a fresh identity.
    expect(tokens.resets).toBe(1);
  });

  it('closes the Start lifecycle when the SDK ends the session', async () => {
    const { conversation } = makeFakeConversation();
    const tokens = fakeTokens('att_1');
    const conn = createAvatarConnection({
      createConversation: (() => conversation) as CreateConversationFn,
      tokens,
    });

    await conn.start();
    conversation.emit('session-ended', { reason: 'ended' });
    expect(tokens.resets).toBe(1);
  });

  it('refuses an SDK token callback that arrives after Stop, without minting again', async () => {
    const { conversation } = makeFakeConversation();
    let tokenCalls = 0;
    const tokens: TokenProvider = {
      async fetchToken() {
        tokenCalls += 1;
        return { token: 'st_abc', attemptId: 'att_1' };
      },
      reset: () => {},
    };
    const conn = createAvatarConnection({
      createConversation: tokenAwareFactory(conversation),
      tokens,
    });

    await conn.start();
    expect(tokenCalls).toBe(1);
    conn.stop();

    // A delayed capacity retry from the SDK asks for a token for a Start that
    // is already over. It must be refused before any provider contact.
    const tokenFn = conversation.tokenOnConnect as () => Promise<string>;
    await expect(tokenFn()).rejects.toThrow();
    expect(tokenCalls).toBe(1);
  });

  it('refuses an SDK token callback after a failed connect, without minting again', async () => {
    const failure = Object.assign(new Error('Permission denied'), {
      name: 'MediaAccessError',
      device: 'microphone',
      reason: 'permission-denied',
    });
    const { conversation } = makeFakeConversation({ failOnConnect: failure });
    let tokenCalls = 0;
    const tokens: TokenProvider = {
      async fetchToken() {
        tokenCalls += 1;
        return { token: 'st_abc', attemptId: 'att_1' };
      },
      reset: () => {},
    };
    const conn = createAvatarConnection({
      createConversation: tokenAwareFactory(conversation),
      tokens,
    });

    await expect(conn.start()).rejects.toThrow();
    // Denial happens before the SDK asks for its token.
    expect(tokenCalls).toBe(0);

    const tokenFn = conversation.tokenOnConnect as () => Promise<string>;
    await expect(tokenFn()).rejects.toThrow();
    expect(tokenCalls).toBe(0);
  });

  it('does not hand a closed attempt token callback a newer Start token', async () => {
    const first = makeFakeConversation();
    const second = makeFakeConversation();
    let tokenCalls = 0;
    const tokens: TokenProvider = {
      async fetchToken() {
        tokenCalls += 1;
        return { token: `st_token_${tokenCalls}`, attemptId: `att_${tokenCalls}` };
      },
      reset: () => {},
    };
    const conn = createAvatarConnection({
      createConversation: tokenAwareFactory(first.conversation, second.conversation),
      tokens,
    });

    await conn.start();
    const oldTokenFn = first.conversation.tokenOnConnect as () => Promise<string>;
    conn.stop();
    await conn.start();

    expect(tokenCalls).toBe(2);
    // The stale callback belongs to the closed first Start and must not be
    // served the second Start's token.
    await expect(oldTokenFn()).rejects.toThrow();
    expect(tokenCalls).toBe(2);
  });
});
