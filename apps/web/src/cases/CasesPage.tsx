import { useEffect, useRef, useState } from 'react';
import type { AccountUser } from '../account/accountClient';
import {
  CasesRequestError,
  casesClient,
  type CasesClient,
  type PrivateCase,
  type PrivateDocument,
} from './casesClient';
import './cases.css';

interface CasesPageProps {
  client?: CasesClient;
}

type Message = { kind: 'status' | 'error'; text: string } | null;

function errorText(error: unknown): string {
  if (error instanceof CasesRequestError) {
    if (error.status === 429) return 'Too many attempts. Wait a few minutes and try again.';
    if (error.status === 413) return 'That file is too large. The limit is 5 MiB.';
    if (error.code === 'invalid-upload' || error.code === 'invalid-request') {
      return 'The request was not accepted. Check the fields and use a PDF, PNG or JPEG under 5 MiB.';
    }
    if (error.status === 0) return 'The request timed out or could not reach the server. Try again.';
    if (error.status === 403) return 'The request could not be verified. Refresh and try again.';
    if (error.status >= 500) return 'Private storage is unavailable. Try again shortly.';
  }
  return 'The action could not be completed. Try again.';
}

export default function CasesPage({ client = casesClient }: CasesPageProps): JSX.Element {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [cases, setCases] = useState<PrivateCase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<PrivateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [label, setLabel] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editJurisdiction, setEditJurisdiction] = useState('');
  const [confirmCase, setConfirmCase] = useState(false);
  const [confirmDocument, setConfirmDocument] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const requestId = useRef(0);

  async function refreshCases(active: () => boolean): Promise<void> {
    const items = await client.listCases();
    if (active()) setCases(items);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    Promise.all([client.csrf(), client.me()]).then(
      async ([token, currentUser]) => {
        if (!active) return;
        setCsrfToken(token);
        setUser(currentUser);
        if (currentUser !== null) {
          try {
            await refreshCases(() => active);
          } catch (error) {
            if (!active) return;
            if (error instanceof CasesRequestError && error.status === 401) {
              setUser(null);
              setCsrfToken(null);
            } else {
              setLoadError(true);
            }
          }
        }
        if (active) setLoading(false);
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
  }, [client]);

  const selected = cases.find((item) => item.id === selectedId) ?? null;

  async function openCase(id: string): Promise<void> {
    setSelectedId(id);
    setConfirmCase(false);
    setConfirmDocument(null);
    setMessage(null);
    try {
      setDocuments(await client.listDocuments(id));
    } catch (error) {
      setMessage({ kind: 'error', text: errorText(error) });
    }
  }

  async function reloadSelected(id: string): Promise<void> {
    const [nextCases, nextDocuments] = await Promise.all([
      client.listCases(),
      client.listDocuments(id),
    ]);
    setCases(nextCases);
    setDocuments(nextDocuments);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (csrfToken === null) {
      setMessage({ kind: 'error', text: 'The page is not ready. Refresh and try again.' });
      return;
    }
    const current = ++requestId.current;
    setBusy('create-case');
    setMessage(null);
    try {
      const created = await client.createCase(
        label.trim(),
        jurisdiction.trim() === '' ? null : jurisdiction.trim(),
        csrfToken,
      );
      if (requestId.current !== current) return;
      setLabel('');
      setJurisdiction('');
      await reloadSelected(created.id);
      if (requestId.current !== current) return;
      setSelectedId(created.id);
      setMessage({ kind: 'status', text: 'Case created.' });
    } catch (error) {
      if (requestId.current !== current) return;
      await handleError(error, current);
    } finally {
      if (requestId.current === current) setBusy(null);
    }
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (csrfToken === null || selected === null) return;
    const current = ++requestId.current;
    setBusy('edit-case');
    setMessage(null);
    try {
      await client.updateCase(
        selected.id,
        editLabel.trim(),
        editJurisdiction.trim() === '' ? null : editJurisdiction.trim(),
        csrfToken,
      );
      if (requestId.current !== current) return;
      await reloadSelected(selected.id);
      if (requestId.current !== current) return;
      setMessage({ kind: 'status', text: 'Case details saved.' });
    } catch (error) {
      if (requestId.current !== current) return;
      await handleError(error, current);
    } finally {
      if (requestId.current === current) setBusy(null);
    }
  }

  async function handleDeleteCase(): Promise<void> {
    if (csrfToken === null || selected === null) return;
    const current = ++requestId.current;
    setBusy('delete-case');
    setMessage(null);
    try {
      await client.deleteCase(selected.id, csrfToken);
      if (requestId.current !== current) return;
      setCases(await client.listCases());
      if (requestId.current !== current) return;
      setSelectedId(null);
      setDocuments([]);
      setConfirmCase(false);
      setMessage({ kind: 'status', text: 'Case and its documents were deleted from live storage.' });
    } catch (error) {
      if (requestId.current !== current) return;
      await handleError(error, current);
    } finally {
      if (requestId.current === current) setBusy(null);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (csrfToken === null || selected === null || file === null) return;
    const current = ++requestId.current;
    setBusy('upload');
    setMessage(null);
    try {
      await client.uploadDocument(selected.id, file, csrfToken);
      if (requestId.current !== current) return;
      setFile(null);
      await reloadSelected(selected.id);
      if (requestId.current !== current) return;
      setMessage({ kind: 'status', text: 'Document uploaded and encrypted.' });
    } catch (error) {
      if (requestId.current !== current) return;
      await handleError(error, current);
    } finally {
      if (requestId.current === current) setBusy(null);
    }
  }

  async function handleDownload(document: PrivateDocument): Promise<void> {
    if (selected === null) return;
    const current = ++requestId.current;
    setBusy(`download-${document.id}`);
    setMessage(null);
    try {
      const result = await client.downloadDocument(selected.id, document.id);
      if (requestId.current !== current) return;
      const url = URL.createObjectURL(result.blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      anchor.rel = 'noopener';
      anchor.click();
      // Keep the object URL alive while the browser consumes the download;
      // revoking immediately can truncate the file in Chromium.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage({ kind: 'status', text: 'Download prepared.' });
    } catch (error) {
      if (requestId.current !== current) return;
      await handleError(error, current);
    } finally {
      if (requestId.current === current) setBusy(null);
    }
  }

  async function handleDeleteDocument(document: PrivateDocument): Promise<void> {
    if (csrfToken === null || selected === null) return;
    const current = ++requestId.current;
    setBusy(`delete-document-${document.id}`);
    setMessage(null);
    try {
      await client.deleteDocument(selected.id, document.id, csrfToken);
      if (requestId.current !== current) return;
      await reloadSelected(selected.id);
      if (requestId.current !== current) return;
      setConfirmDocument(null);
      setMessage({ kind: 'status', text: 'Document deleted from live storage.' });
    } catch (error) {
      if (requestId.current !== current) return;
      await handleError(error, current);
    } finally {
      if (requestId.current === current) setBusy(null);
    }
  }

  async function handleError(error: unknown, current: number): Promise<void> {
    if (error instanceof CasesRequestError && (error.status === 401 || error.status === 403)) {
      try {
        const currentUser = await client.me();
        if (requestId.current !== current) return;
        if (currentUser === null) {
          setUser(null);
          setCsrfToken(null);
          setSelectedId(null);
          setDocuments([]);
          setMessage({ kind: 'error', text: 'Your session ended. Sign in again.' });
          return;
        }
      } catch {
        // Keep identity and report uncertainty when reconciliation is unavailable.
      }
    }
    setMessage({ kind: 'error', text: errorText(error) });
  }

  if (loading) {
    return (
      <main className="cases-page">
        <p role="status">Loading private cases…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="cases-page">
        <h1>Private cases</h1>
        <p role="alert">The private case page could not load. Check the session and try again.</p>
        <a href="/account">Return to account</a>
      </main>
    );
  }

  if (user === null) {
    return (
      <main className="cases-page">
        <p className="cases-banner">Fictional data only</p>
        <h1>Private cases</h1>
        <p role="alert">You are signed out. Sign in before accessing private cases.</p>
        <p>
          <a href="/account">Sign in</a>
        </p>
      </main>
    );
  }

  return (
    <main className="cases-page">
      <header>
        <p className="cases-banner">Fictional private data only</p>
        <h1>Private cases</h1>
        <p>
          Signed in as <strong>{user.email}</strong>. Only this account can access these cases and
          documents. Files are encrypted at rest; this is not a backup or production-security claim.
        </p>
        <p>
          <a href="/account">Back to account</a>
        </p>
      </header>

      {message !== null ? (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`cases-message cases-message--${message.kind}`}
        >
          {message.text}
        </p>
      ) : null}

      <section className="cases-panel" aria-labelledby="case-list-heading">
        <h2 id="case-list-heading">Your cases</h2>
        {cases.length === 0 ? <p>No cases yet. Create one below.</p> : null}
        <ul className="cases-list">
          {cases.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={item.id === selectedId ? 'cases-selected' : undefined}
                onClick={() => void openCase(item.id)}
              >
                {item.label}
                {item.jurisdiction === null ? '' : ` — ${item.jurisdiction}`}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="cases-panel" aria-labelledby="create-case-heading">
        <h2 id="create-case-heading">Create a case</h2>
        <form onSubmit={(event) => void handleCreate(event)}>
          <label htmlFor="case-label">Case label</label>
          <input
            id="case-label"
            maxLength={120}
            required
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          <label htmlFor="case-jurisdiction">Jurisdiction (optional)</label>
          <input
            id="case-jurisdiction"
            maxLength={80}
            value={jurisdiction}
            onChange={(event) => setJurisdiction(event.target.value)}
          />
          <button type="submit" disabled={busy !== null || label.trim() === ''}>
            {busy === 'create-case' ? 'Creating…' : 'Create case'}
          </button>
        </form>
      </section>

      {selected !== null ? (
        <section className="cases-panel" aria-labelledby="case-detail-heading">
          <h2 id="case-detail-heading">Case: {selected.label}</h2>
          <form
            onSubmit={(event) => void handleEdit(event)}
            onFocus={() => {
              if (editLabel === '') {
                setEditLabel(selected.label);
                setEditJurisdiction(selected.jurisdiction ?? '');
              }
            }}
          >
            <label htmlFor="edit-case-label">Edit case label</label>
            <input
              id="edit-case-label"
              maxLength={120}
              value={editLabel}
              onChange={(event) => setEditLabel(event.target.value)}
            />
            <label htmlFor="edit-case-jurisdiction">Edit jurisdiction</label>
            <input
              id="edit-case-jurisdiction"
              maxLength={80}
              value={editJurisdiction}
              onChange={(event) => setEditJurisdiction(event.target.value)}
            />
            <button
              type="submit"
              disabled={busy !== null || editLabel.trim() === ''}
            >
              {busy === 'edit-case' ? 'Saving…' : 'Save case details'}
            </button>
          </form>

          <h3>Documents</h3>
          {documents.length === 0 ? <p>No documents uploaded.</p> : null}
          <ul className="documents-list">
            {documents.map((document) => (
              <li key={document.id}>
                <span>
                  {document.originalName} — {document.mimeType} — {document.size} bytes
                </span>
                <button
                  type="button"
                  disabled={busy !== null || document.status !== 'ready'}
                  onClick={() => void handleDownload(document)}
                >
                  {busy === `download-${document.id}` ? 'Preparing…' : 'Download'}
                </button>
                {confirmDocument === document.id ? (
                  <span>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void handleDeleteDocument(document)}
                    >
                      Confirm delete document
                    </button>
                    <button type="button" onClick={() => setConfirmDocument(null)}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmDocument(document.id)}>
                    Delete document
                  </button>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={(event) => void handleUpload(event)}>
            <label htmlFor="document-file">Upload a PDF, PNG or JPEG (max 5 MiB)</label>
            <input
              id="document-file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <button type="submit" disabled={busy !== null || file === null}>
              {busy === 'upload' ? 'Uploading…' : 'Upload encrypted document'}
            </button>
          </form>

          {confirmCase ? (
            <p>
              <button type="button" disabled={busy !== null} onClick={() => void handleDeleteCase()}>
                {busy === 'delete-case' ? 'Deleting…' : 'Confirm delete case and documents'}
              </button>
              <button type="button" onClick={() => setConfirmCase(false)}>
                Cancel
              </button>
            </p>
          ) : (
            <button type="button" onClick={() => setConfirmCase(true)}>
              Delete case
            </button>
          )}
        </section>
      ) : null}

      <footer className="cases-footer">
        <p>
          Live deletion only from this local store; backup/retention recovery remains a later gate.
          Fictional data only.
        </p>
      </footer>
    </main>
  );
}
