import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CasesPage from './CasesPage';
import {
  CasesRequestError,
  type CasesClient,
  type PrivateCase,
  type PrivateDocument,
} from './casesClient';

const A = { id: 'usr_a', email: 'account-a@example.test' };
const B = { id: 'usr_b', email: 'account-b@example.test' };
const mk = (id: string, label: string): PrivateCase => ({
  id,
  label,
  jurisdiction: null,
  status: 'ready',
  createdAt: 1,
  updatedAt: 1,
});
const ONE = mk('case_one', 'Alpha fictional');
const TWO = mk('case_two', 'Beta fictional');
const DOC: PrivateDocument = {
  id: 'doc_a',
  caseId: ONE.id,
  originalName: 'fictional-secret.pdf',
  mimeType: 'application/pdf',
  size: 4,
  sha256: 'x',
  status: 'ready',
  createdAt: 1,
};

type Stage = 'list-401' | 'documents-401' | 'documents-404-other-account' | 'control-503';
type Op = 'create' | 'edit' | 'upload' | 'delete-document' | 'delete-case';

function setup(stage: Stage) {
  const state = { armed: false, fired: 0, me: A as typeof A | null };
  const lose = () => {
    state.me = stage === 'documents-404-other-account' ? B : stage === 'control-503' ? A : null;
  };
  const mutate = async () => {
    state.armed = true;
  };
  const listFails = async () => {
    if (state.armed && (stage === 'list-401' || stage === 'control-503')) {
      state.fired += 1;
      lose();
      throw new CasesRequestError(
        stage === 'list-401' ? 401 : 503,
        stage === 'list-401' ? 'unauthenticated' : 'unavailable',
      );
    }
    return [ONE, TWO];
  };
  const client: CasesClient = {
    csrf: vi.fn(async () => 'csrf'),
    me: vi.fn(async () => state.me),
    listCases: vi.fn(listFails),
    listCasesWithProvenance: vi.fn(async () => ({ accountId: A.id, cases: await listFails() })),
    createCase: vi.fn(async () => {
      await mutate();
      return ONE;
    }),
    updateCase: vi.fn(async () => {
      await mutate();
      return ONE;
    }),
    deleteCase: vi.fn(mutate),
    deleteDocument: vi.fn(mutate),
    uploadDocument: vi.fn(async () => {
      await mutate();
      return DOC;
    }),
    listDocuments: vi.fn(async (id: string) => {
      if (state.armed && stage.startsWith('documents-')) {
        state.fired += 1;
        lose();
        const status = stage === 'documents-401' ? 401 : 404;
        throw new CasesRequestError(status, status === 401 ? 'unauthenticated' : 'not-found');
      }
      return id === ONE.id ? [DOC] : [];
    }),
    downloadDocument: vi.fn(async () => ({ blob: new Blob(['x']), filename: 'x.pdf' })),
  };
  return { client, state, user: userEvent.setup() };
}

async function perform(op: Op, user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole('button', { name: /^Alpha fictional/ }));
  await screen.findByText(/fictional-secret\.pdf/);
  if (op === 'create') {
    await user.type(screen.getByLabelText('Case label'), 'New fictional');
    await user.click(screen.getByRole('button', { name: /^create case$/i }));
  } else if (op === 'edit') {
    await user.click(screen.getByRole('button', { name: /save case details/i }));
  } else if (op === 'upload') {
    await user.upload(
      screen.getByLabelText(/upload a pdf/i),
      new File(['%PDF'], 'f.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: /upload encrypted document/i }));
  } else if (op === 'delete-document') {
    await user.click(screen.getByRole('button', { name: /^delete document$/i }));
    await user.click(screen.getByRole('button', { name: /confirm delete document/i }));
  } else {
    await user.click(screen.getByRole('button', { name: /^delete case$/i }));
    await user.click(screen.getByRole('button', { name: /confirm delete case/i }));
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const stages: Stage[] = ['list-401', 'documents-401', 'documents-404-other-account', 'control-503'];
for (const stage of stages) {
  describe(stage, () => {
    const ops: Op[] = stage.startsWith('documents-')
      ? ['create', 'edit', 'upload', 'delete-document']
      : ['create', 'edit', 'upload', 'delete-document', 'delete-case'];
    for (const op of ops) {
      it(`${stage} after confirmed ${op}`, async () => {
        const { client, state, user } = setup(stage);
        render(<CasesPage client={client} />);
        await perform(op, user);
        await waitFor(() => expect(state.fired).toBeGreaterThan(0));
        await new Promise((resolve) => setTimeout(resolve, 60));
        const shown = screen.queryByText(A.email) !== null;
        // All 13 lost/changed-session cases must end the private view. The five
        // ordinary 503 controls keep the known view because identity is unchanged.
        expect(shown).toBe(stage === 'control-503');
        if (stage !== 'control-503') {
          expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
        }
      });
    }
  });
}
