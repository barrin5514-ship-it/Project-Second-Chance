/** Server-enforced conversation cap, in seconds. Not a spending guarantee. */
export const MAX_SESSION_SECONDS = 60;

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'ended'
  | 'stopped'
  | 'mic-denied'
  | 'mic-unavailable'
  | 'mic-busy'
  | 'camera-unavailable'
  | 'unavailable';

export type MediaFailure =
  | 'mic-denied'
  | 'mic-unavailable'
  | 'mic-busy'
  | 'camera-unavailable'
  | 'unavailable';

/**
 * Mirrors the SDK's MediaAccessError surface. Classified on BOTH device and
 * reason, so a denied microphone is distinct from a missing or busy one.
 */
export function classifyMediaError(error: { device: string; reason: string }): MediaFailure {
  if (error.device === 'camera') return 'camera-unavailable';
  if (error.device !== 'microphone') return 'unavailable';
  switch (error.reason) {
    case 'permission-denied':
      return 'mic-denied';
    case 'device-in-use':
      return 'mic-busy';
    case 'device-not-found':
    case 'unknown':
      return 'mic-unavailable';
    default:
      return 'mic-unavailable';
  }
}

/** The subset of the pinned SDK conversation this wrapper relies on. */
export interface ConversationLike {
  /**
   * Subscribes to lifecycle events. These are the `onChange` event names of
   * `@nuancelabs/js-sdk@0.40.0` (`'avatar-presented'`, `'session-ended'`).
   */
  on(event: string, handler: (...args: unknown[]) => void): () => void;
  connect(): Promise<void>;
  disconnect(): Promise<void> | void;
}

export type CreateConversationFn = (options: Record<string, unknown>) => ConversationLike;

/**
 * Mints one token per explicit Start. `attemptId` is the server-issued
 * identity for that Start and is reused for every SDK token callback.
 */
export interface TokenProvider {
  fetchToken(): Promise<{ token: string; attemptId: string }>;
  /** Closes this Start's lifecycle so a new explicit Start may mint again. */
  reset(): void;
  /** Reports that the conversation for this identity really began. */
  markStarted?(attemptId: string): void;
  /** Releases this identity on the server without minting again. */
  closeAttempt?(attemptId: string): void;
}

export interface AvatarConnection {
  start(): Promise<void>;
  stop(): void;
  getState(): ConnectionState;
  subscribe(listener: (state: ConnectionState) => void): () => void;
  /** Exposed so tests and the UI can assert the identity was reused. */
  readonly lastTokenRequestAttemptId: string | null;
}

/**
 * Wraps the Nuance SDK behind a small interface so App.tsx never imports it.
 *
 * - camera stays off, the session is capped and the SDK does not linger on end
 * - one server-issued attemptId is reused for every token callback in an attempt
 * - no application-level retry: a second start without stop is refused
 * - late events from a closed attempt cannot alter the current attempt's state
 *
 * The token callback is the SDK's own `token` option (the only token source it
 * honours). The first call on an explicit Start performs the mint; later calls
 * within the same Start (an SDK capacity retry) receive that same token and
 * never reach the provider.
 */
export function createAvatarConnection(options: {
  createConversation: CreateConversationFn;
  tokens: TokenProvider;
}): AvatarConnection {
  let state: ConnectionState = 'idle';
  let conversation: ConversationLike | null = null;
  let generation = 0;
  let attemptId: string | null = null;
  let unsubscribers: Array<() => void> = [];
  let minted: { token: string; attemptId: string } | null = null;
  let pendingTokenRequest: Promise<string> | null = null;
  const listeners = new Set<(state: ConnectionState) => void>();

  function setState(next: ConnectionState): void {
    state = next;
    for (const listener of listeners) listener(next);
  }

  function teardown(): void {
    for (const off of unsubscribers) off();
    unsubscribers = [];
    const current = conversation;
    conversation = null;
    if (current !== null) {
      try {
        void current.disconnect();
      } catch {
        // A disconnect failure must not mask the state being reported.
      }
    }
  }

  /** Closes the lifecycle of this Start so the next one gets a fresh identity. */
  function closeLifecycle(): void {
    // Ends this Start's generation: any delayed SDK token callback from it is
    // refused instead of minting again or receiving a newer Start's token.
    generation += 1;
    teardown();
    // Release the identity on the server, but only if a mint ever happened.
    if (attemptId !== null) options.tokens.closeAttempt?.(attemptId);
    minted = null;
    pendingTokenRequest = null;
    options.tokens.reset();
  }

  async function start(): Promise<void> {
    if (conversation !== null || state === 'connecting') {
      throw new Error('A start is already in progress; stop it first.');
    }

    const myGeneration = generation + 1;
    generation = myGeneration;
    minted = null;
    pendingTokenRequest = null;
    attemptId = null;
    setState('connecting');

    const tokenFn = async (): Promise<string> => {
      // A token callback belongs to exactly one Start. Stop, a failed connect,
      // session end or a newer Start closes that generation, so a delayed SDK
      // retry must never reach the provider again.
      if (generation !== myGeneration) throw new Error('This Start has ended.');
      if (minted !== null) return minted.token;
      if (pendingTokenRequest === null) {
        pendingTokenRequest = options.tokens.fetchToken().then((issued) => {
          minted = issued;
          attemptId = issued.attemptId;
          return issued.token;
        });
      }
      return pendingTokenRequest;
    };

    try {
      // The first mint happens here, on the explicit Start, before any media.
      await tokenFn();
    } catch {
      if (generation === myGeneration) {
        closeLifecycle();
        setState('unavailable');
      }
      throw new Error('Could not start the conversation.');
    }
    if (generation !== myGeneration) throw new Error('Start cancelled.');

    const created = options.createConversation({
      // The SDK's only token source. It reuses the identity handed to it by
      // the server, so an internal capacity retry cannot mint a second token.
      token: tokenFn,
      maxSessionSeconds: MAX_SESSION_SECONDS,
      stayConnectedOnEnd: false,
      // Camera off in the client, mirroring the server-side token config.
      mediaDevices: { cameraEnabled: false },
      startOn: 'first-frame',
    });
    conversation = created;

    const guard =
      (handler: (...args: unknown[]) => void) =>
      (...args: unknown[]): void => {
        if (generation !== myGeneration) return;
        handler(...args);
      };

    unsubscribers.push(
      created.on(
        'avatar-presented',
        guard(() => {
          setState('ready');
        }),
      ),
      created.on(
        'session-ended',
        guard(() => {
          closeLifecycle();
          setState('ended');
        }),
      ),
    );

    try {
      await created.connect();
    } catch (error) {
      if (generation !== myGeneration) throw new Error('Start cancelled.');
      const media = asMediaError(error);
      closeLifecycle();
      setState(media !== null ? classifyMediaError(media) : 'unavailable');
      throw error instanceof Error ? error : new Error('Conversation failed.');
    }

    // The SDK reports the conversation connected. Only now may the token-start
    // deadline stop applying to this attempt.
    if (generation === myGeneration && attemptId !== null) {
      options.tokens.markStarted?.(attemptId);
    }
  }

  function stop(): void {
    const wasActive = conversation !== null;
    closeLifecycle();
    if (wasActive || state === 'connecting' || state === 'ready') {
      setState('stopped');
    }
  }

  return {
    start,
    stop,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get lastTokenRequestAttemptId() {
      return attemptId;
    },
  };
}

function asMediaError(error: unknown): { device: string; reason: string } | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as { name?: unknown; device?: unknown; reason?: unknown };
  if (candidate.name !== 'MediaAccessError') return null;
  const device = typeof candidate.device === 'string' ? candidate.device : 'unknown';
  const reason = typeof candidate.reason === 'string' ? candidate.reason : 'unknown';
  return { device, reason };
}
