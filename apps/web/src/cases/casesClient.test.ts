import { afterEach, describe, expect, it, vi } from 'vitest';
import { CasesRequestError, casesClient } from './casesClient';

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('casesClient', () => {
  it('lists owner cases with same-origin credentials and no-store', async () => {
    const fetchMock = vi.fn(async () =>
      json(200, {
        cases: [{ id: 'case_a', label: 'Private', jurisdiction: null, status: 'ready' }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(casesClient.listCases()).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cases',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin', cache: 'no-store' }),
    );
  });

  it('exposes authenticated account provenance for reconciliation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(200, {
          accountId: 'usr_a',
          cases: [{ id: 'case_a', label: 'Private', jurisdiction: null, status: 'ready' }],
        }),
      ),
    );

    await expect(casesClient.listCasesWithProvenance()).resolves.toMatchObject({
      accountId: 'usr_a',
      cases: [{ id: 'case_a' }],
    });
  });

  it('uploads multipart with the CSRF header and does not set a JSON content type', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      json(201, {
        document: {
          id: 'doc_a',
          caseId: 'case_a',
          originalName: 'fictional.pdf',
          mimeType: 'application/pdf',
          size: 10,
          sha256: 'hash',
          status: 'ready',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['fictional'], 'fictional.pdf', { type: 'application/pdf' });

    const document = await casesClient.uploadDocument('case_a', file, 'csrf-1');
    expect(document.id).toBe('doc_a');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers).toMatchObject({ 'x-csrf-token': 'csrf-1' });
    expect(init.headers).not.toHaveProperty('Content-Type');
  });

  it('returns a typed generic failure for a tampered/unauthorized download', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(503, { error: 'unavailable' })));
    await expect(
      casesClient.downloadDocument('case_a', 'doc_a'),
    ).rejects.toMatchObject({ name: 'CasesRequestError', status: 503, code: 'unavailable' });
  });

  it('rejects a malformed successful document response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(201, { document: { id: 'doc_a' } })));
    await expect(
      casesClient.uploadDocument('case_a', new File(['x'], 'x.pdf'), 'csrf-1'),
    ).rejects.toBeInstanceOf(CasesRequestError);
  });
});
