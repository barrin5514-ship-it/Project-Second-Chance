import { useEffect, useState } from 'react';
import { fetchHealth, type HealthResponse } from '../api/health';
import './foundation.css';

interface FoundationLandingProps {
  /** Injected by tests; production uses the validated same-origin client. */
  loadHealth?: () => Promise<HealthResponse>;
}

type HealthStatus = 'checking' | 'ready' | 'unavailable';

const STATUS_COPY: Record<HealthStatus, string> = {
  checking: 'Checking the local API…',
  ready: 'The local API is available in fictional-demo mode.',
  unavailable: 'The local API is unavailable right now.',
};

/**
 * E0-S1 landing. Fictional-data foundation only; the optional Mira connection
 * test stays on its own `/mira` page and no provider or court request occurs
 * here. Only the same-origin health contract is fetched.
 */
export default function FoundationLanding({
  loadHealth = fetchHealth,
}: FoundationLandingProps): JSX.Element {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('checking');
    loadHealth().then(
      () => {
        if (active) setStatus('ready');
      },
      () => {
        if (active) setStatus('unavailable');
      },
    );
    return () => {
      active = false;
    };
  }, [loadHealth, attempt]);

  return (
    <main className="foundation-page">
      <header>
        <p className="foundation-banner">Fictional data only</p>
        <h1>Project Second Chance</h1>
        <p className="foundation-subtitle">
          Local fictional-data foundation — demo accounts are available; protected uploads are not.
        </p>
      </header>

      <section aria-labelledby="foundation-account-heading" className="foundation-panel">
        <h2 id="foundation-account-heading">Demo accounts</h2>
        <p>
          Create a fictional account or sign in to test the identity boundary. Use an @example.test
          address; no email is sent and there is no password recovery in this slice.
        </p>
        <p>
          <a href="/account">Create a fictional account or sign in</a>
        </p>
      </section>

      <section aria-labelledby="foundation-status-heading" className="foundation-panel">
        <h2 id="foundation-status-heading">Local API status</h2>
        <p role="status" aria-live="polite" aria-atomic="true" className="foundation-status">
          {STATUS_COPY[status]}
        </p>
        {status === 'unavailable' ? (
          <button type="button" className="foundation-retry" onClick={() => setAttempt((n) => n + 1)}>
            Retry the local API check
          </button>
        ) : null}
      </section>

      <section aria-labelledby="foundation-hope-heading" className="foundation-panel">
        <h2 id="foundation-hope-heading">No False Hope</h2>
        <p>
          Project Second Chance provides legal information, not legal advice. It does not decide
          eligibility, deadlines or court matches, and it keeps uncertainty visible.
        </p>
      </section>

      <section aria-labelledby="foundation-not-ready-heading" className="foundation-panel">
        <h2 id="foundation-not-ready-heading">Not available in this slice</h2>
        <p>
          Private cases, protected uploads, legal analysis and any sending or filing are not
          available yet. There is no form on this page, and the health check makes no external model
          or court request.
        </p>
      </section>

      <section aria-labelledby="foundation-mira-heading" className="foundation-panel">
        <h2 id="foundation-mira-heading">Optional Mira connection test</h2>
        <p>
          A separate, opt-in prototype checks a short spoken conversation with the Nuance Mira
          persona. It asks for microphone consent only after you press Start, keeps the camera off,
          and sends audio to Nuance. It is not needed to check this foundation.
        </p>
        <p>
          <a href="/mira">Open the optional Mira AI connection test</a>
        </p>
      </section>

      <footer className="foundation-footer">
        <p>Local fictional-data demonstration only. No hosting, deployment or legal decisions.</p>
      </footer>
    </main>
  );
}
