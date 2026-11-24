import { useEffect, useRef, useState } from 'react';
import {
  AccountRequestError,
  accountClient,
  type AccountClient,
  type AccountUser,
} from './accountClient';
import './account.css';

interface AccountPageProps {
  /** Injected by tests; production uses the validated same-origin client. */
  client?: AccountClient;
}

type Busy = 'create' | 'signin' | 'logout' | null;
type Message = { kind: 'status' | 'error'; text: string } | null;

function errorMessage(error: unknown): string {
  if (error instanceof AccountRequestError) {
    if (error.status === 429) {
      return 'Too many attempts. Wait a few minutes and try again.';
    }
    if (error.code === 'invalid-credentials') {
      return 'The email or password did not match.';
    }
    if (error.code === 'invalid-request') {
      return 'Use a fictional @example.test email and a password of at least 15 characters.';
    }
    if (error.status === 403) {
      return 'This page could not verify the request. Refresh and try again.';
    }
    if (error.status >= 500) {
      return 'The account service is unavailable. Try again shortly.';
    }
  }
  return 'The account action could not be completed. Try again.';
}

/**
 * Local fictional-demo account page. Credentials are sent only to the
 * same-origin API, never placed in URLs or browser storage. No email is sent,
 * no recovery exists, and signing in does not grant AI consent.
 */
export default function AccountPage({ client = accountClient }: AccountPageProps): JSX.Element {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<Message>(null);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    Promise.all([client.csrf(), client.me()]).then(
      ([token, currentUser]) => {
        if (!active) return;
        setCsrfToken(token);
        setUser(currentUser);
        setLoading(false);
      },
      () => {
        if (!active) return;
        setLoading(false);
        setLoadError(true);
      },
    );
    return () => {
      active = false;
      requestId.current += 1;
    };
  }, [client, attempt]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const email = createEmail.trim();
    if (!email.includes('@')) {
      setMessage({ kind: 'error', text: 'Enter a fictional email address.' });
      return;
    }
    if (createPassword.length < 15) {
      setMessage({
        kind: 'error',
        text: 'Use a fictional passphrase of at least 15 characters.',
      });
      return;
    }
    if (csrfToken === null) {
      setMessage({ kind: 'error', text: 'The page is not ready. Refresh and try again.' });
      return;
    }

    const current = ++requestId.current;
    setBusy('create');
    setMessage(null);
    try {
      await client.register(email, createPassword, csrfToken);
      if (requestId.current !== current) return;
      setCreatePassword('');
      setSigninEmail(email);
      setMessage({
        kind: 'status',
        text: 'Account created. Sign in below with the same fictional email and passphrase.',
      });
    } catch (error) {
      if (requestId.current !== current) return;
      setMessage({ kind: 'error', text: errorMessage(error) });
    } finally {
      if (requestId.current === current) setBusy(null);
    }
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (csrfToken === null) {
      setMessage({ kind: 'error', text: 'The page is not ready. Refresh and try again.' });
      return;
    }

    const current = ++requestId.current;
    setBusy('signin');
    setMessage(null);
    try {
      const result = await client.login(signinEmail.trim(), signinPassword, csrfToken);
      if (requestId.current !== current) return;
      setUser(result.user);
      setCsrfToken(result.csrfToken);
      setSigninPassword('');
      setCreatePassword('');
      setMessage(null);
    } catch (error) {
      if (requestId.current !== current) return;
      setMessage({ kind: 'error', text: errorMessage(error) });
    } finally {
      if (requestId.current === current) setBusy(null);
    }
  }

  async function handleLogout(): Promise<void> {
    if (csrfToken === null) {
      setMessage({ kind: 'error', text: 'The page is not ready. Refresh and try again.' });
      return;
    }
    const current = ++requestId.current;
    setBusy('logout');
    setMessage(null);
    try {
      await client.logout(csrfToken);
      if (requestId.current !== current) return;
      setUser(null);
      setCsrfToken(null);
      setCreateEmail('');
      setSigninEmail('');
      setMessage({ kind: 'status', text: 'Signed out.' });
      try {
        const nextToken = await client.csrf();
        if (requestId.current === current) setCsrfToken(nextToken);
      } catch {
        if (requestId.current === current) {
          setMessage({
            kind: 'error',
            text: 'Signed out, but the page could not prepare another sign-in. Refresh to continue.',
          });
        }
      }
    } catch (error) {
      if (requestId.current !== current) return;
      setMessage({ kind: 'error', text: errorMessage(error) });
    } finally {
      if (requestId.current === current) setBusy(null);
    }
  }

  return (
    <main className="account-page">
      <header className="account-header">
        <p className="account-banner">Fictional demo accounts only</p>
        <h1>Account</h1>
        <p>
          This local demonstration uses fictional identities and has no email delivery or password
          recovery. Signing in does not grant AI consent or access to protected documents.
        </p>
        <p>
          <a href="/">Back to the foundation page</a>
        </p>
      </header>

      {loading ? (
        <p role="status" aria-live="polite">
          Loading account…
        </p>
      ) : null}

      {!loading && loadError ? (
        <section className="account-panel" aria-labelledby="account-error-heading">
          <h2 id="account-error-heading">Account service unavailable</h2>
          <p role="alert">The account page could not load its request token.</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Retry loading the account page
          </button>
        </section>
      ) : null}

      {!loading && !loadError && user !== null ? (
        <section className="account-panel" aria-labelledby="signed-in-heading">
          <h2 id="signed-in-heading">You are signed in</h2>
          <p>
            Signed in as <strong>{user.email}</strong>.
          </p>
          <p>
            This account can be used for the fictional demo. Private cases, protected uploads and
            legal features are not part of this slice.
          </p>
          <button type="button" onClick={() => void handleLogout()} disabled={busy !== null}>
            {busy === 'logout' ? 'Signing out…' : 'Sign out'}
          </button>
        </section>
      ) : null}

      {!loading && !loadError && user === null ? (
        <>
          <section className="account-panel" aria-labelledby="create-heading">
            <h2 id="create-heading">Create a fictional account</h2>
            <p>Use an @example.test address and a made-up passphrase. No email is sent.</p>
            <form onSubmit={(event) => void handleCreate(event)} noValidate>
              <label htmlFor="create-email">Email</label>
              <input
                id="create-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
              />
              <label htmlFor="create-password">Password</label>
              <input
                id="create-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                minLength={15}
                maxLength={128}
                required
                aria-describedby="create-password-help"
                value={createPassword}
                onChange={(event) => setCreatePassword(event.target.value)}
              />
              <p id="create-password-help">
                At least 15 characters. A passphrase with spaces is fine.
              </p>
              <button type="submit" disabled={busy !== null}>
                {busy === 'create' ? 'Creating…' : 'Create account'}
              </button>
            </form>
          </section>

          <section className="account-panel" aria-labelledby="signin-heading">
            <h2 id="signin-heading">Sign in</h2>
            <form onSubmit={(event) => void handleSignIn(event)} noValidate>
              <label htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
                value={signinEmail}
                onChange={(event) => setSigninEmail(event.target.value)}
              />
              <label htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                required
                value={signinPassword}
                onChange={(event) => setSigninPassword(event.target.value)}
              />
              <button type="submit" disabled={busy !== null}>
                {busy === 'signin' ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </section>
        </>
      ) : null}

      {message !== null ? (
        <p
          className={`account-message account-message--${message.kind}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {message.text}
        </p>
      ) : null}

      <footer className="account-footer">
        <p>Local fictional-data demonstration only. No real records, legal advice or recovery.</p>
      </footer>
    </main>
  );
}
