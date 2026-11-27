import { accountClient, type AccountUser } from '../account/accountClient';

export interface PrivateCase {
  id: string;
  label: string;
  jurisdiction: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface PrivateDocument {
  id: string;
  caseId: string;
  originalName: string;
  mimeType: string;
  size: number;
  sha256: string;
  status: string;
  createdAt: number;
}

export interface PrivateCaseSnapshot {
  accountId: string;
  cases: PrivateCase[];
}

export interface CasesClient {
  csrf(): Promise<string>;
  me(): Promise<AccountUser | null>;
  listCases(): Promise<PrivateCase[]>;
  /** Authenticated provenance required at every reconciliation boundary. */
  listCasesWithProvenance(): Promise<PrivateCaseSnapshot>;
  createCase(label: string, jurisdiction: string | null, csrfToken: string): Promise<PrivateCase>;
  updateCase(
    id: string,
    label: string,
    jurisdiction: string | null,
    csrfToken: string,
  ): Promise<PrivateCase>;
  deleteCase(id: string, csrfToken: string): Promise<void>;
  listDocuments(caseId: string): Promise<PrivateDocument[]>;
  uploadDocument(caseId: string, file: File, csrfToken: string): Promise<PrivateDocument>;
  downloadDocument(caseId: string, documentId: string): Promise<{ blob: Blob; filename: string }>;
  deleteDocument(caseId: string, documentId: string, csrfToken: string): Promise<void>;
}

const JSON_BUDGET_MS = 10_000;
const FILE_BUDGET_MS = 30_000;

export class CasesRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'CasesRequestError';
  }
}

function timeout(status = 0): CasesRequestError {
  return new CasesRequestError(status, 'timeout');
}

async function withBudget<T>(budget: number, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(timeout());
    }, budget);
  });
  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } catch (error) {
    if (error instanceof CasesRequestError) throw error;
    throw new CasesRequestError(0, controller.signal.aborted ? 'timeout' : 'network-error');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
  }
}

async function parseBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const text = await response.text();
    if (text.length === 0) return {};
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function requestJson(
  path: string,
  init: RequestInit,
  budget = JSON_BUDGET_MS,
): Promise<Record<string, unknown>> {
  return withBudget(budget, async (signal) => {
    const response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    });
    const body = await parseBody(response);
    if (!response.ok) {
      throw new CasesRequestError(
        response.status,
        typeof body['error'] === 'string' ? body['error'] : 'request-failed',
      );
    }
    return body;
  });
}

function headers(csrfToken: string, json = true): Record<string, string> {
  return {
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'x-csrf-token': csrfToken,
  };
}

function caseFrom(value: unknown): PrivateCase {
  if (typeof value !== 'object' || value === null) throw new CasesRequestError(200, 'invalid-response');
  const record = value as Record<string, unknown>;
  if (typeof record['id'] !== 'string' || typeof record['label'] !== 'string') {
    throw new CasesRequestError(200, 'invalid-response');
  }
  return {
    id: record['id'],
    label: record['label'],
    jurisdiction: typeof record['jurisdiction'] === 'string' ? record['jurisdiction'] : null,
    status: typeof record['status'] === 'string' ? record['status'] : 'ready',
    createdAt: typeof record['createdAt'] === 'number' ? record['createdAt'] : 0,
    updatedAt: typeof record['updatedAt'] === 'number' ? record['updatedAt'] : 0,
  };
}

function documentFrom(value: unknown): PrivateDocument {
  if (typeof value !== 'object' || value === null) throw new CasesRequestError(200, 'invalid-response');
  const record = value as Record<string, unknown>;
  if (typeof record['id'] !== 'string' || typeof record['originalName'] !== 'string') {
    throw new CasesRequestError(200, 'invalid-response');
  }
  return {
    id: record['id'],
    caseId: typeof record['caseId'] === 'string' ? record['caseId'] : '',
    originalName: record['originalName'],
    mimeType: typeof record['mimeType'] === 'string' ? record['mimeType'] : 'application/octet-stream',
    size: typeof record['size'] === 'number' ? record['size'] : 0,
    sha256: typeof record['sha256'] === 'string' ? record['sha256'] : '',
    status: typeof record['status'] === 'string' ? record['status'] : 'ready',
    createdAt: typeof record['createdAt'] === 'number' ? record['createdAt'] : 0,
  };
}

async function listCases(): Promise<PrivateCase[]> {
  const body = await requestJson('/api/cases', { method: 'GET', headers: { Accept: 'application/json' } });
  return Array.isArray(body['cases']) ? body['cases'].map(caseFrom) : [];
}

async function listCasesWithProvenance(): Promise<PrivateCaseSnapshot> {
  const body = await requestJson('/api/cases', { method: 'GET', headers: { Accept: 'application/json' } });
  if (typeof body['accountId'] !== 'string' || !Array.isArray(body['cases'])) {
    throw new CasesRequestError(200, 'invalid-response');
  }
  return { accountId: body['accountId'], cases: body['cases'].map(caseFrom) };
}

async function createCase(
  label: string,
  jurisdiction: string | null,
  csrfToken: string,
): Promise<PrivateCase> {
  const body = await requestJson('/api/cases', {
    method: 'POST',
    headers: headers(csrfToken),
    body: JSON.stringify({ label, jurisdiction }),
  });
  return caseFrom(body['case']);
}

async function updateCase(
  id: string,
  label: string,
  jurisdiction: string | null,
  csrfToken: string,
): Promise<PrivateCase> {
  const body = await requestJson(`/api/cases/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(csrfToken),
    body: JSON.stringify({ label, jurisdiction }),
  });
  return caseFrom(body['case']);
}

async function deleteCase(id: string, csrfToken: string): Promise<void> {
  await requestJson(`/api/cases/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(csrfToken),
    body: JSON.stringify({ confirm: true }),
  });
}

async function listDocuments(caseId: string): Promise<PrivateDocument[]> {
  const body = await requestJson(`/api/cases/${encodeURIComponent(caseId)}/documents`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return Array.isArray(body['documents']) ? body['documents'].map(documentFrom) : [];
}

async function uploadDocument(
  caseId: string,
  file: File,
  csrfToken: string,
): Promise<PrivateDocument> {
  const form = new FormData();
  form.append('file', file, file.name);
  const body = await requestJson(
    `/api/cases/${encodeURIComponent(caseId)}/documents`,
    {
      method: 'POST',
      headers: headers(csrfToken, false),
      body: form,
    },
    FILE_BUDGET_MS,
  );
  return documentFrom(body['document']);
}

function filenameFromDisposition(value: string | null): string {
  if (value === null) return 'document';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1];
  if (encoded !== undefined) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return 'document';
    }
  }
  return /filename="([^"]+)"/i.exec(value)?.[1] ?? 'document';
}

async function downloadDocument(
  caseId: string,
  documentId: string,
): Promise<{ blob: Blob; filename: string }> {
  return withBudget(FILE_BUDGET_MS, async (signal) => {
    const response = await fetch(
      `/api/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(documentId)}/download`,
      { method: 'GET', credentials: 'same-origin', cache: 'no-store', signal },
    );
    if (!response.ok) {
      const body = await parseBody(response);
      throw new CasesRequestError(
        response.status,
        typeof body['error'] === 'string' ? body['error'] : 'request-failed',
      );
    }
    return {
      blob: await response.blob(),
      filename: filenameFromDisposition(response.headers.get('content-disposition')),
    };
  });
}

async function deleteDocument(
  caseId: string,
  documentId: string,
  csrfToken: string,
): Promise<void> {
  await requestJson(
    `/api/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(documentId)}`,
    {
      method: 'DELETE',
      headers: headers(csrfToken),
      body: JSON.stringify({ confirm: true }),
    },
  );
}

export const casesClient: CasesClient = {
  csrf: accountClient.csrf,
  me: accountClient.me,
  listCases,
  listCasesWithProvenance,
  createCase,
  updateCase,
  deleteCase,
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
};
