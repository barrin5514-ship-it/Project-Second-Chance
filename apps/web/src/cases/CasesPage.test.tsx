import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CasesPage from './CasesPage';
import {
  CasesRequestError,
  type CasesClient,
  type PrivateCase,
  type PrivateDocument,
} from './casesClient';

const USER = { id: 'usr_a', email: 'owner@example.test' };
const CASE: PrivateCase = {
  id: 'case_a',
  label: 'Fictional case',
  jurisdiction: 'Georgia',
  status: 'ready',
  createdAt: 1,
  updatedAt: 1,
};
const DOC: PrivateDocument = {
  id: 'doc_a',
  caseId: 'case_a',
  originalName: 'fictional.pdf',
  mimeType: 'application/pdf',
  size: 42,
  sha256: 'hash',
  status: 'ready',
  createdAt: 1,
};

function makeClient(overrides: Partial<CasesClient> = {}): CasesClient {
  return {
    csrf: vi.fn(async () => 'csrf-1'),
    me: vi.fn(async () => USER),
    listCases: vi.fn(async () => []),
    createCase: vi.fn(async () => CASE),
    updateCase: vi.fn(async () => CASE),
    deleteCase: vi.fn(async () => undefined),
    listDocuments: vi.fn(async () => []),
    uploadDocument: vi.fn(async () => DOC),
    downloadDocument: vi.fn(async () => ({
      blob: new Blob(['fictional']),
      filename: 'fictional.pdf',
    })),
    deleteDocument: vi.fn(async () => undefined),
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('private cases page', () => {
  it('returns to sign-in when the initial private-case load says the session is gone', async () => {
    const client = makeClient({
      listCases: vi.fn(async () => {
        throw new CasesRequestError(401, 'unauthenticated');
      }),
    });
    render(<CasesPage client={client} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/signed out|session ended/i);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/account');
    expect(screen.queryByText(/could not load/i)).not.toBeInTheDocument();
  });

  it('asks a signed-out visitor to sign in without showing private content', async () => {
    const client = makeClient({ me: vi.fn(async () => null) });
    render(<CasesPage client={client} />);

    expect(await screen.findByRole('heading', { name: /private cases/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/signed out/i);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/account');
    expect(screen.queryByText(CASE.label)).not.toBeInTheDocument();
  });

  it('lists owned cases and documents and opens one case', async () => {
    const client = makeClient({
      listCases: vi.fn(async () => [CASE]),
      listDocuments: vi.fn(async () => [DOC]),
    });
    const user = userEvent.setup();
    render(<CasesPage client={client} />);

    const caseButton = await screen.findByRole('button', { name: /Fictional case/i });
    await user.click(caseButton);

    expect(await screen.findByRole('heading', { name: /Case: Fictional case/i })).toBeInTheDocument();
    expect(screen.getByText(/fictional\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/application\/pdf/)).toBeInTheDocument();
  });

  it('creates a case only after a successful response and refreshes the list', async () => {
    const client = makeClient({
      listCases: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([CASE]),
      listDocuments: vi.fn(async () => []),
    });
    const user = userEvent.setup();
    render(<CasesPage client={client} />);
    await screen.findByRole('heading', { name: /create a case/i });

    await user.type(screen.getByLabelText(/case label/i), 'Fictional case');
    await user.type(screen.getByLabelText(/jurisdiction/i), 'Georgia');
    await user.click(screen.getByRole('button', { name: /create case/i }));

    await waitFor(() =>
      expect(client.createCase).toHaveBeenCalledWith('Fictional case', 'Georgia', 'csrf-1'),
    );
    expect(await screen.findByText(/case created/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Case: Fictional case/i })).toBeInTheDocument();
  });

  it('uploads a selected file and reports success only after the client resolves', async () => {
    const client = makeClient({
      listCases: vi.fn(async () => [CASE]),
      listDocuments: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([DOC]),
    });
    const user = userEvent.setup();
    render(<CasesPage client={client} />);
    await user.click(await screen.findByRole('button', { name: /Fictional case/i }));

    const file = new File(['fictional pdf bytes'], 'fictional.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/upload a pdf/i), file);
    await user.click(screen.getByRole('button', { name: /upload encrypted document/i }));

    await waitFor(() =>
      expect(client.uploadDocument).toHaveBeenCalledWith('case_a', file, 'csrf-1'),
    );
    expect(await screen.findByText(/document uploaded and encrypted/i)).toBeInTheDocument();
  });

  it('returns to a sign-in state when an action reports session loss', async () => {
    const client = makeClient({
      listCases: vi.fn(async () => [CASE]),
      listDocuments: vi.fn(async () => []),
      uploadDocument: vi.fn(async () => {
        throw new CasesRequestError(401, 'unauthenticated');
      }),
      me: vi
        .fn()
        .mockResolvedValueOnce(USER)
        .mockResolvedValueOnce(null),
    });
    const user = userEvent.setup();
    render(<CasesPage client={client} />);
    await user.click(await screen.findByRole('button', { name: /Fictional case/i }));

    await user.upload(
      screen.getByLabelText(/upload a pdf/i),
      new File(['x'], 'fictional.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: /upload encrypted document/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/session ended|signed out/i);
    expect(screen.queryByText(/your cases/i)).not.toBeInTheDocument();
  });

  it('requires explicit confirmation before deleting a case', async () => {
    const client = makeClient({
      listCases: vi.fn().mockResolvedValueOnce([CASE]).mockResolvedValueOnce([]),
      listDocuments: vi.fn(async () => []),
    });
    const user = userEvent.setup();
    render(<CasesPage client={client} />);
    await user.click(await screen.findByRole('button', { name: /Fictional case/i }));

    await user.click(screen.getByRole('button', { name: /^Delete case$/i }));
    expect(client.deleteCase).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirm delete case/i }));
    await waitFor(() => expect(client.deleteCase).toHaveBeenCalledWith('case_a', 'csrf-1'));
    expect(await screen.findByText(/deleted from live storage/i)).toBeInTheDocument();
  });
});

const CASE_B: PrivateCase = {
  ...CASE,
  id: 'case_b',
  label: 'Second case',
  jurisdiction: 'Nebraska',
};
const DOC_B: PrivateDocument = {
  ...DOC,
  id: 'doc_b',
  caseId: 'case_b',
  originalName: 'second.pdf',
};

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function openTwoCases(client: CasesClient) {
  const user = userEvent.setup();
  render(<CasesPage client={client} />);
  const first = await screen.findByRole('button', { name: /Fictional case/i });
  const second = screen.getByRole('button', { name: /Second case/i });
  return { user, first, second };
}

describe('private cases page: switching and session safety', () => {
  it('never saves one case with the edit fields of another', async () => {
    const client = makeClient({ listCases: vi.fn(async () => [CASE, CASE_B]) });
    const { user, first, second } = await openTwoCases(client);

    await user.click(first);
    await user.click(screen.getByLabelText(/edit case label/i));
    await user.click(second);
    await user.click(screen.getByLabelText(/edit case label/i));
    expect(screen.getByLabelText(/edit case label/i)).toHaveValue('Second case');
    expect(screen.getByLabelText(/edit jurisdiction/i)).toHaveValue('Nebraska');

    await user.click(screen.getByRole('button', { name: /save case details/i }));
    await waitFor(() =>
      expect(client.updateCase).toHaveBeenCalledWith('case_b', 'Second case', 'Nebraska', 'csrf-1'),
    );
  });

  it('ignores a late document list from a previously selected case', async () => {
    const slow = deferred<PrivateDocument[]>();
    const client = makeClient({
      listCases: vi.fn(async () => [CASE, CASE_B]),
      listDocuments: vi.fn((id: string) =>
        id === 'case_a' ? slow.promise : Promise.resolve([DOC_B]),
      ),
    });
    const { user, first, second } = await openTwoCases(client);

    await user.click(first);
    await user.click(second);
    expect(await screen.findByText(/second\.pdf/)).toBeInTheDocument();
    await act(async () => slow.resolve([DOC]));

    expect(screen.queryByText(/fictional\.pdf/)).not.toBeInTheDocument();
    expect(screen.getByText(/second\.pdf/)).toBeInTheDocument();
  });

  it('clears the previous documents when the next case cannot load', async () => {
    const client = makeClient({
      listCases: vi.fn(async () => [CASE, CASE_B]),
      listDocuments: vi.fn(async (id: string) => {
        if (id === 'case_b') throw new CasesRequestError(503, 'unavailable');
        return [DOC];
      }),
    });
    const { user, first, second } = await openTwoCases(client);

    await user.click(first);
    expect(await screen.findByText(/fictional\.pdf/)).toBeInTheDocument();
    await user.click(second);

    expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable/i);
    expect(screen.queryByText(/fictional\.pdf/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no documents uploaded/i)).not.toBeInTheDocument();
  });

  it('drops a chosen file when the selected case changes', async () => {
    const client = makeClient({ listCases: vi.fn(async () => [CASE, CASE_B]) });
    const { user, first, second } = await openTwoCases(client);

    await user.click(first);
    await user.upload(
      screen.getByLabelText(/upload a pdf/i),
      new File(['x'], 'for-first.pdf', { type: 'application/pdf' }),
    );
    await user.click(second);

    expect(screen.getByRole('button', { name: /upload encrypted document/i })).toBeDisabled();
    expect((screen.getByLabelText(/upload a pdf/i) as HTMLInputElement).files).toHaveLength(0);
  });

  it('does not show an upload result under a case selected while it was pending', async () => {
    const slow = deferred<PrivateDocument>();
    let uploaded = false;
    const client = makeClient({
      listCases: vi.fn(async () => [CASE, CASE_B]),
      listDocuments: vi.fn(async (id: string) => {
        if (id === 'case_b') return [DOC_B];
        return uploaded ? [DOC] : [];
      }),
      uploadDocument: vi.fn(() => slow.promise),
    });
    const { user, first, second } = await openTwoCases(client);

    await user.click(first);
    await user.upload(
      screen.getByLabelText(/upload a pdf/i),
      new File(['x'], 'fictional.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: /upload encrypted document/i }));
    await user.click(second);
    expect(await screen.findByText(/second\.pdf/)).toBeInTheDocument();
    await act(async () => {
      uploaded = true;
      slow.resolve(DOC);
    });

    expect(screen.queryByText(/fictional\.pdf/)).not.toBeInTheDocument();
    expect(screen.getByText(/second\.pdf/)).toBeInTheDocument();
    expect(screen.queryByText(/document uploaded and encrypted/i)).not.toBeInTheDocument();
  });

  it('returns to sign-in when opening a case finds the session gone', async () => {
    const client = makeClient({
      listCases: vi.fn(async () => [CASE]),
      listDocuments: vi.fn(async () => {
        throw new CasesRequestError(401, 'unauthenticated');
      }),
      me: vi.fn().mockResolvedValueOnce(USER).mockResolvedValue(null),
    });
    const user = userEvent.setup();
    render(<CasesPage client={client} />);
    await user.click(await screen.findByRole('button', { name: /Fictional case/i }));

    expect(await screen.findByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(CASE.label)).not.toBeInTheDocument();
  });

  it('stops showing private content when a different account now holds the session', async () => {
    const client = makeClient({
      listCases: vi.fn(async () => [CASE]),
      createCase: vi.fn(async () => {
        throw new CasesRequestError(403, 'forbidden');
      }),
      me: vi
        .fn()
        .mockResolvedValueOnce(USER)
        .mockResolvedValue({ id: 'usr_b', email: 'second@example.test' }),
    });
    const user = userEvent.setup();
    render(<CasesPage client={client} />);
    await user.type(await screen.findByLabelText(/^case label/i), 'Another case');
    await user.click(screen.getByRole('button', { name: /create case/i }));

    expect(await screen.findByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(CASE.label)).not.toBeInTheDocument();
  });

  it('refreshes to the failed state when a case deletion does not finish', async () => {
    const client = makeClient({
      listCases: vi
        .fn()
        .mockResolvedValueOnce([CASE])
        .mockResolvedValue([{ ...CASE, status: 'error' }]),
      deleteCase: vi.fn(async () => {
        throw new CasesRequestError(503, 'unavailable');
      }),
    });
    const user = userEvent.setup();
    render(<CasesPage client={client} />);
    await user.click(await screen.findByRole('button', { name: /Fictional case/i }));
    await user.click(screen.getByRole('button', { name: /^Delete case$/i }));
    await user.click(screen.getByRole('button', { name: /confirm delete case/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable/i);
    expect(
      await screen.findByRole('button', { name: /Fictional case.*incomplete/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/deleted from live storage/i)).not.toBeInTheDocument();
  });

  it('says plainly when a deletion is incomplete', async () => {
    const client = makeClient({
      listCases: vi.fn(async () => [{ ...CASE, status: 'error' }]),
      listDocuments: vi.fn(async () => [{ ...DOC, status: 'error' }]),
    });
    const user = userEvent.setup();
    render(<CasesPage client={client} />);

    const caseButton = await screen.findByRole('button', { name: /Fictional case/i });
    expect(caseButton).toHaveTextContent(/incomplete/i);
    await user.click(caseButton);

    expect(await screen.findByText(/fictional\.pdf/)).toHaveTextContent(/unavailable/i);
  });
});
