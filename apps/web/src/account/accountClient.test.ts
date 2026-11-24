import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountRequestError, accountClient } from './accountClient';

const USER = { id: 'usr_demo', email: 'denise@example.test' };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('accountClient', () => {
  it('loads a CSRF token with same-origin credentials and no-store', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { csrfToken: 'csrf-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(accountClient.csrf()).resolves.toBe('csrf-1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/csrf',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin', cache: 'no-store' }),
    );
  });

  it('treats 401 from current-account as signed out and parses a signed-in user', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: 'unauthenticated' }))
      .mockResolvedValueOnce(jsonResponse(200, { user: USER }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(accountClient.me()).resolves.toBeNull();
    await expect(accountClient.me()).resolves.toEqual(USER);
  });

  it('posts registration and login with the CSRF header and no URL credentials', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse(200, { user: USER, csrfToken: 'csrf-2' }));
    vi.stubGlobal('fetch', fetchMock);

    await accountClient.register('denise@example.test', 'correct horse battery staple', 'csrf-1');
    const login = await accountClient.login(
      'denise@example.test',
      'correct horse battery staple',
      'csrf-1',
    );
    expect(login).toEqual({ user: USER, csrfToken: 'csrf-2' });

    for (const call of fetchMock.mock.calls) {
      const [url, init] = call as unknown as [string, RequestInit];
      expect(url).not.toContain('password');
      expect(url).not.toContain('denise');
      expect(init).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        headers: expect.objectContaining({ 'x-csrf-token': 'csrf-1' }),
      });
      expect(String(init.body)).toContain('denise@example.test');
    }
  });

  it('surfaces a typed failure without echoing the response body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { error: 'invalid-credentials' })),
    );

    await expect(
      accountClient.login('denise@example.test', 'wrong password 123456', 'csrf-1'),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'AccountRequestError',
        status: 401,
        code: 'invalid-credentials',
      }),
    );
    await expect(
      accountClient.login('denise@example.test', 'wrong password 123456', 'csrf-1'),
    ).rejects.toBeInstanceOf(AccountRequestError);
  });

  it('logs out with a POST and no response body requirement', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(accountClient.logout('csrf-2')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'csrf-2' }),
      }),
    );
  });
});
