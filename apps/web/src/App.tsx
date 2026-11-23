import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createAvatarConnection,
  MAX_SESSION_SECONDS,
  type AvatarConnection,
  type ConnectionState,
  type CreateConversationFn,
  type TokenProvider,
} from './avatar/connection';
import { createHttpTokenAdapter, type HttpTokenAdapter } from './avatar/tokenAdapter';
import { createSdkAdapter } from './avatar/sdk';

const TERMS_URL = 'https://app.nuancelabs.ai/terms';
const PRIVACY_URL = 'https://app.nuancelabs.ai/privacy';

interface AppProps {
  /** Injected so tests can supply a fake; production uses the SDK loader. */
  connectionFactory?: () => AvatarConnection;
  /** Injected so tests never touch the network or the SDK. */
  createConversation?: CreateConversationFn;
  /** Injected so tests never mint a real token. */
  tokens?: TokenProvider;
}

interface StateCopy {
  readonly label: string;
  readonly detail: string;
}

/** One distinct label per state. Never implies a live avatar it did not get. */
const STATE_COPY: Record<ConnectionState, StateCopy> = {
  idle: { label: 'Not started', detail: 'Nothing is running. Starting is your choice.' },
  connecting: {
    label: 'Connecting…',
    detail: 'Asking for a session and waiting for the microphone permission prompt.',
  },
  ready: {
    label: 'Connected — Mira (AI) is here',
    detail: 'You are talking to an AI. Speak briefly; this test ends after one minute.',
  },
  ended: { label: 'The test has ended', detail: 'Mira ended the conversation.' },
  stopped: { label: 'You stopped the test', detail: 'The microphone and call were released.' },
  'mic-denied': {
    label: 'Microphone blocked',
    detail: 'Your browser denied microphone access. Allow it for this site, then start again.',
  },
  'mic-unavailable': {
    label: 'Microphone unavailable',
    detail: 'No working microphone was found. Check your device, then start again.',
  },
  'mic-busy': {
    label: 'Microphone in use',
    detail: 'Another application is using the microphone. Close it, then start again.',
  },
  'camera-unavailable': {
    label: 'Camera problem',
    detail: 'The camera is not used in this test, but the browser reported a camera error.',
  },
  unavailable: {
    label: 'Could not start the test',
    detail: 'The connection service is unavailable right now. You can try again in a moment.',
  },
};

const ACTIVE_STATES: ReadonlySet<ConnectionState> = new Set(['connecting', 'ready']);

/**
 * Resolves the pinned Nuance SDK lazily, on the first Start only, through the
 * adapter that maps its real `onChange` events onto `ConversationLike`. The
 * factory itself was registered by main.tsx, so importing this file (or the
 * test suite) never requires the SDK and never throws during render.
 */
const SDK_ADAPTER = createSdkAdapter();

/**
 * The page's one token adapter. It holds the Start lifecycle (one mint per
 * explicit Start), so it must be a single module-level instance rather than
 * something rebuilt per render.
 */
const SHARED_TOKEN_ADAPTER: HttpTokenAdapter = createHttpTokenAdapter({
  get: async (url) => {
    const response = await fetch(url, { credentials: 'same-origin' });
    return {
      ok: response.ok,
      status: response.status,
      json: async () => {
        const body = await response.json();
        rememberCsrf(body);
        return body;
      },
    };
  },
  post: async (url, body) => {
    // Double-submit protection: the token adapter sends the CSRF value it
    // received from bootstrap in this constant header, matching the cookie.
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'x-psc-csrf': currentCsrfToken(),
      },
      body: JSON.stringify(body),
    });
    return { ok: response.ok, status: response.status, json: () => response.json() };
  },
});

/** CSRF value from the most recent bootstrap; read by the POST transport. */
let csrfHolder = '';
function currentCsrfToken(): string {
  return csrfHolder;
}

/** Keeps only the bootstrap's CSRF value; nothing else is retained. */
function rememberCsrf(body: unknown): void {
  if (typeof body !== 'object' || body === null) return;
  const value = (body as { csrfToken?: unknown }).csrfToken;
  if (typeof value === 'string') csrfHolder = value;
}

export default function App({
  connectionFactory,
  createConversation,
  tokens,
}: AppProps): JSX.Element {
  const connection = useMemo<AvatarConnection>(() => {
    if (connectionFactory) return connectionFactory();
    return createAvatarConnection({
      // Deferred: the SDK is only resolved when the user actually presses Start.
      createConversation: createConversation ?? SDK_ADAPTER.createConversation,
      tokens: tokens ?? SHARED_TOKEN_ADAPTER,
    });
  }, [connectionFactory, createConversation, tokens]);

  const [state, setState] = useState<ConnectionState>(connection.getState());
  const [secondsLeft, setSecondsLeft] = useState(MAX_SESSION_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef<HTMLButtonElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => connection.subscribe(setState), [connection]);

  // The media surface exists only while connected. Register it so the remote
  // tracks can attach, and detach them when it unmounts.
  useEffect(() => {
    if (state !== 'ready') return;
    connection.setMediaElements({ video: videoRef.current, audio: audioRef.current });
    return () => connection.setMediaElements({ video: null, audio: null });
  }, [state, connection]);

  const handleStart = useCallback(async () => {
    setError(null);
    setSecondsLeft(MAX_SESSION_SECONDS);
    try {
      await connection.start();
    } catch {
      // Stopping during connecting is the user's choice, not a failure.
      if (connection.getState() === 'stopped') return;
      // The connection reports a specific state; keep this copy generic.
      setError('That start did not work. You can try again.');
    }
  }, [connection]);

  const handleStop = useCallback(() => {
    connection.stop();
  }, [connection]);

  const isActive = ACTIVE_STATES.has(state);

  // Visible countdown plus an automatic stop. A courtesy timer only: the
  // server's maxSessionSeconds is the enforced cap.
  useEffect(() => {
    if (!isActive) return;
    const deadline = Date.now() + MAX_SESSION_SECONDS * 1000;
    const tick = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(tick);
        connection.stop();
      }
    }, 1000);
    // Cover a very short (<1s) run so the timer still fires.
    tick;
    return () => window.clearInterval(tick);
  }, [isActive, connection]);

  // Leaving the page must release the microphone and the call.
  useEffect(() => () => connection.stop(), [connection]);

  const copy = STATE_COPY[state];
  const canRetry =
    state === 'unavailable' || state.startsWith('mic-') || state === 'camera-unavailable';

  return (
    <main className="page">
      <header>
        <h1>Project Second Chance — Mira connection prototype</h1>
        <p className="tagline">
          An AI connection prototype. Mira is an AI, not a person. This prototype gives no legal
          advice and makes no decision about anyone&rsquo;s situation.
        </p>
      </header>

      <section aria-labelledby="about-heading" className="panel">
        <h2 id="about-heading">What this test is</h2>
        <p>
          This is a small, local check that a short spoken conversation with an AI character works.
          It is not a case service: it has no forms, no case files, no uploading and no sending or
          filing anything.
        </p>
        <p>
          When you press Start, your <strong>microphone</strong> is used and the audio is
          <strong> sent to Nuance</strong>, the company that runs Mira, so it can respond. Nothing
          you say is saved by this prototype; please do not share personal details.
        </p>
        <p>
          Your camera stays off. Nuance may record or analyse call audio and video under its own
          policies. Please read the{' '}
          <a href={TERMS_URL} rel="noreferrer noopener" target="_blank">
            Nuance terms of service
          </a>{' '}
          and the{' '}
          <a href={PRIVACY_URL} rel="noreferrer noopener" target="_blank">
            Nuance privacy policy
          </a>
          , including how recordings are handled. The text above is available without starting a
          call.
        </p>
      </section>

      <section aria-labelledby="status-heading" className="panel">
        <h2 id="status-heading">Status</h2>
        <p role="status" aria-live="polite" aria-atomic="true" className="status">
          <span className="status-label">{copy.label}</span>
          <span className="status-detail"> {copy.detail}</span>
        </p>

        {isActive ? (
          <p>
            Time remaining in this test: <strong>{secondsLeft}</strong> seconds.
          </p>
        ) : null}

        {error !== null ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}

        {state === 'ready' ? (
          <div className="conversation" data-live-avatar="sdk-presented">
            <p>
              <strong>Mira (AI)</strong> is connected. Speak clearly and briefly.
            </p>
            {/* Remote output only. The camera is disabled in both layers, and
                no media element exists before the user starts. */}
            <video
              ref={videoRef}
              className="mira-video"
              autoPlay
              playsInline
              aria-label="Mira, an AI, on video"
            />
            <audio ref={audioRef} autoPlay aria-label="Mira&rsquo;s voice" />
          </div>
        ) : null}

        <div className="controls">
          {isActive ? (
            <button type="button" onClick={handleStop}>
              Stop the test
            </button>
          ) : (
            <button type="button" ref={startRef} onClick={handleStart}>
              {canRetry ? 'Start again' : 'Start the test'}
            </button>
          )}
        </div>
      </section>

      <footer>
        <p>
          Fictional-data prototype only. No legal advice, no eligibility decisions and no automatic
          sending or filing.
        </p>
      </footer>
    </main>
  );
}
