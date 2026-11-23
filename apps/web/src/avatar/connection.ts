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

/** A remote persona video track, as exposed by the pinned SDK. */
export interface VideoTrackLike {
  attach(element: HTMLVideoElement): void;
  detach(): void;
}

/** A remote persona audio track, as exposed by the pinned SDK. */
export interface AudioTrackLike {
  attach(element: HTMLAudioElement): void;
  detach(): void;
}

/** The persona's remote output tracks, when the SDK exposes them. */
export interface AvatarMediaLike {
  readonly videoTrack: VideoTrackLike | null;
  readonly audioTrack: AudioTrackLike | null;
}

/** The subset of the pinned SDK conversation this wrapper relies on. */
export interface ConversationLike {
  /**
   * Subscribes to lifecycle events. These are the `onChange` event names of
   * `@nuancelabs/js-sdk@0.40.0` (`'avatar-presented'`, `'session-ended'`,
   * `'tracks-changed'`, …).
   */
  on(event: string, handler: (...args: unknown[]) => void): () => void;
  connect(): Promise<void>;
  disconnect(): Promise<void> | void;
  /** The remote Mira participant; absent only in older test doubles. */
  readonly avatar?: AvatarMediaLike;
}

export type CreateConversationFn = (options: Record<string, unknown>) => ConversationLike;

/** Page elements the remote tracks are attached to. */
export interface MediaElements {
  video: HTMLVideoElement | null;
  audio: HTMLAudioElement | null;
}

/**
 * Mints one token per explicit Start. `attemptId` is the server-issued
 * identity for that Start and is reused for every SDK token callback.
 */
export interface TokenProvider {
  fetchToken(): Promise<{ token: string; attemptId: string }>;
  /** Closes this Start's lifecycle so a new explicit Start may mint again. */
  reset(): void;
  /** Reports that the conversation for this identity really began. */
  markStarted?(attemptId: string): Promise<void> | void;
  /**
   * Releases this identity on the server without minting again. The returned
   * promise lets the next Start sequence after the release has reached the
   * server.
   */
  closeAttempt?(attemptId: string): Promise<void> | void;
}

export interface AvatarConnection {
  start(): Promise<void>;
  stop(): void;
  getState(): ConnectionState;
  subscribe(listener: (state: ConnectionState) => void): () => void;
  /**
   * Registers the page's output elements. Available remote tracks are attached
   * now, and later `tracks-changed` events re-attach; null detaches.
   */
  setMediaElements(elements: MediaElements): void;
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
  /** Server release started by the most recent Stop; the next Start awaits it. */
  let releasePending: Promise<void> | null = null;
  let mediaElements: MediaElements = { video: null, audio: null };
  let attachedVideo: VideoTrackLike | null = null;
  let attachedAudio: AudioTrackLike | null = null;
  const listeners = new Set<(state: ConnectionState) => void>();

  function setState(next: ConnectionState): void {
    state = next;
    for (const listener of listeners) listener(next);
  }

  /** Detaches any remote output currently playing into the page. */
  function detachMedia(): void {
    if (attachedVideo !== null) {
      try {
        attachedVideo.detach();
      } catch {
        // A failed detach must not mask cleanup of the rest.
      }
      attachedVideo = null;
    }
    if (attachedAudio !== null) {
      try {
        attachedAudio.detach();
      } catch {
        // Same.
      }
      attachedAudio = null;
    }
  }

  /**
   * Attaches the avatar's current remote tracks to whichever page elements are
   * registered. Safe to call before the elements exist: the tracks are read
   * again when the page registers them or the SDK reports a change.
   */
  function syncMedia(): void {
    // The pinned facade throws from its participant getter before connect and
    // after disconnect. Treat any unavailable participant as "no tracks yet".
    let avatar: AvatarMediaLike | undefined;
    try {
      avatar = conversation?.avatar;
    } catch {
      avatar = undefined;
    }
    let videoTrack: VideoTrackLike | null = null;
    let audioTrack: AudioTrackLike | null = null;
    try {
      videoTrack = avatar?.videoTrack ?? null;
    } catch {
      videoTrack = null;
    }
    try {
      audioTrack = avatar?.audioTrack ?? null;
    } catch {
      audioTrack = null;
    }

    if (attachedVideo !== null && attachedVideo !== videoTrack) {
      try {
        attachedVideo.detach();
      } catch {
        // Continue with the new track.
      }
      attachedVideo = null;
    }
    if (attachedAudio !== null && attachedAudio !== audioTrack) {
      try {
        attachedAudio.detach();
      } catch {
        // Continue with the new track.
      }
      attachedAudio = null;
    }

    if (videoTrack !== null && mediaElements.video !== null && attachedVideo === null) {
      try {
        videoTrack.attach(mediaElements.video);
        attachedVideo = videoTrack;
      } catch {
        attachedVideo = null;
      }
    }
    if (audioTrack !== null && mediaElements.audio !== null && attachedAudio === null) {
      try {
        audioTrack.attach(mediaElements.audio);
        attachedAudio = audioTrack;
      } catch {
        attachedAudio = null;
      }
    }
  }

  /** Registers the page's output elements; null detaches. */
  function setMediaElements(elements: MediaElements): void {
    const changed =
      elements.video !== mediaElements.video || elements.audio !== mediaElements.audio;
    mediaElements = elements;
    if (changed) detachMedia();
    syncMedia();
  }

  function teardown(): void {
    for (const off of unsubscribers) off();
    unsubscribers = [];
    detachMedia();
    mediaElements = { video: null, audio: null };
    const current = conversation;
    conversation = null;
    if (current !== null) {
      try {
        void Promise.resolve(current.disconnect()).catch(() => undefined);
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
    // The next Start awaits `releasePending`, so it cannot race the release.
    const closingId = attemptId;
    attemptId = null;
    if (closingId !== null && options.tokens.closeAttempt !== undefined) {
      try {
        const released = options.tokens.closeAttempt(closingId);
        releasePending = Promise.resolve(released).catch(() => undefined);
      } catch {
        // A refused release is left to the server's same-session guard.
      }
    }
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

    // A previous Stop releases its server attempt asynchronously. Mint only
    // after that release has reached the server, so the same-session guard
    // cannot see the old attempt and refuse this legitimate new Start.
    if (releasePending !== null) {
      try {
        await releasePending;
      } catch {
        // Fall through to the server's own guard; never silently bypass it.
      }
    }
    if (generation !== myGeneration) throw new Error('Start cancelled.');

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

    const guard =
      (handler: (...args: unknown[]) => void) =>
      (...args: unknown[]): void => {
        if (generation !== myGeneration) return;
        handler(...args);
      };

    // The pinned SDK calls ensureMicrophone before it asks for a token, so the
    // first mint happens inside connect(), after consent. Minting here would
    // spend an attempt and start the token lifetime before any permission.
    let created: ConversationLike;
    try {
      created = options.createConversation({
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
        // Remote tracks may arrive after connect, or be replaced mid-call.
        created.on(
          'tracks-changed',
          guard(() => {
            syncMedia();
          }),
        ),
        created.on(
          'avatar-ready',
          guard(() => {
            syncMedia();
          }),
        ),
      );
    } catch (error) {
      // A synchronous construction or subscription failure must not strand the
      // UI in `connecting` or leave an attempt slot held.
      if (generation === myGeneration) {
        closeLifecycle();
        setState('unavailable');
      }
      throw error instanceof Error ? error : new Error('Conversation could not be created.');
    }

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
    // Pick up tracks already present without a change event (the page may not
    // have registered its elements yet; that path calls syncMedia again).
    if (generation === myGeneration) syncMedia();
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
    setMediaElements,
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
