import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import AccountPage from './AccountPage';
import { AccountRequestError, accountClient, ACCOUNT_REQUEST_BUDGET_MS, type AccountClient } from './accountClient';

const PASSWORD = 'correct horse battery staple';
const USER = { id: 'usr_demo', email: 'denise@example.test' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeClient(overrides: Partial<AccountClient> = {}): AccountClient {
  return {
    csrf: vi.fn(async () => 'csrf-1'),
    me: vi.fn(async () => null),
    register: vi.fn(async () => undefined),
    login: vi.fn(async () => ({
      user: { id: 'usr_a', email: 'denise@example.test' },
      csrfToken: 'csrf-2',
    })),
    logout: vi.fn(async () => undefined),
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function fillCreate(
  user: ReturnType<typeof userEvent.setup>,
  email = 'denise@example.test',
  password = PASSWORD,
): Promise<void> {
  await user.type(screen.getByLabelText('Email', { selector: '#create-email' }), email);
  await user.type(screen.getByLabelText('Password', { selector: '#create-password' }), password);
}

async function fillSignIn(
  user: ReturnType<typeof userEvent.setup>,
  email = 'denise@example.test',
  password = PASSWORD,
): Promise<void> {
  await user.type(screen.getByLabelText('Email', { selector: '#signin-email' }), email);
  await user.type(screen.getByLabelText('Password', { selector: '#signin-password' }), password);
}

describe('account page', () => {
  it('shares one initial CSRF request across the StrictMode effect replay', async () => {
    const client = makeClient();
    render(
      <StrictMode>
        <AccountPage client={client} />
      </StrictMode>,
    );

    expect(await screen.findByRole('heading', { name: /create a fictional account/i })).toBeInTheDocument();
    expect(client.csrf).toHaveBeenCalledTimes(1);
    expect(client.me).toHaveBeenCalledTimes(1);
  });

  it('uses a fresh CSRF token after logout rather than the bootstrap result', async () => {
    const csrf = vi
      .fn()
      .mockResolvedValueOnce('csrf-bootstrap')
      .mockResolvedValueOnce('csrf-after-logout');
    const client = makeClient({
      csrf,
      me: vi.fn(async () => USER),
    });
    const user = userEvent.setup();
    render(<AccountPage client={client} />);
    await screen.findByRole('heading', { name: /you are signed in/i });

    await user.click(screen.getByRole('button', { name: /sign out/i }));
    expect(await screen.findByRole('heading', { name: /create a fictional account/i })).toBeInTheDocument();
    expect(csrf).toHaveBeenCalledTimes(2);

    await fillSignIn(user, USER.email);
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(client.login).toHaveBeenCalledWith(USER.email, PASSWORD, 'csrf-after-logout');
  });

  it('re-runs bootstrap only after Retry and does not cache the rejected attempt', async () => {
    let first = true;
    const client = makeClient({
      csrf: vi.fn(async () => {
        if (first) {
          first = false;
          throw new AccountRequestError(503, 'unavailable');
        }
        return 'csrf-retry';
      }),
      me: vi.fn(async () => null),
    });
    render(
      <StrictMode>
        <AccountPage client={client} />
      </StrictMode>,
    );

    expect(await screen.findByRole('button', { name: /retry loading the account page/i })).toBeInTheDocument();
    expect(client.csrf).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /retry loading the account page/i }));
    expect(await screen.findByRole('heading', { name: /create a fictional account/i })).toBeInTheDocument();
    expect(client.csrf).toHaveBeenCalledTimes(2);
  });

  it('shares one delayed initial CSRF request across the StrictMode replay', async () => {
    let resolveToken!: (token: string) => void;
    const client = makeClient({
      csrf: vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveToken = resolve;
          }),
      ),
      me: vi.fn(async () => null),
    });
    render(
      <StrictMode>
        <AccountPage client={client} />
      </StrictMode>,
    );

    await waitFor(() => expect(client.csrf).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveToken('csrf-delayed');
      await Promise.resolve();
    });
    expect(await screen.findByRole('heading', { name: /create a fictional account/i })).toBeInTheDocument();
    expect(client.csrf).toHaveBeenCalledTimes(1);
  });

  it('does not update an unmounted account page when bootstrap resolves late', async () => {
    let resolveToken!: (token: string) => void;
    const client = makeClient({
      csrf: vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveToken = resolve;
          }),
      ),
      me: vi.fn(async () => null),
    });
    const { unmount, container } = render(<AccountPage client={client} />);
    await waitFor(() => expect(client.csrf).toHaveBeenCalledTimes(1));
    unmount();

    await act(async () => {
      resolveToken('csrf-late');
      await Promise.resolve();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('offers labeled create-account and sign-in forms for signed-out visitors', async () => {
    const client = {
      csrf: vi.fn(async () => 'csrf-1'),
      me: vi.fn(async () => null),
      register: vi.fn(async () => undefined),
      login: vi.fn(async () => ({ user: { id: 'usr_a', email: 'a@example.test' }, csrfToken: 'csrf-2' })),
      logout: vi.fn(async () => undefined),
    };
    render(<AccountPage client={client} />);

    expect(await screen.findByRole('heading', { name: /create a fictional account/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^email$/i)).toHaveLength(2);
    expect(screen.getAllByLabelText(/^password$/i)).toHaveLength(2);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent(/no email is sent/i);
    expect(screen.getByRole('main')).toHaveTextContent(/password recovery/i);
  });

  it('creates an account without signing in, clears the password and prepares sign-in', async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(<AccountPage client={client} />);
    await screen.findByRole('heading', { name: /create a fictional account/i });

    await fillCreate(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(client.register).toHaveBeenCalledWith('denise@example.test', PASSWORD, 'csrf-1'),
    );
    expect(
      (screen.getByLabelText('Password', { selector: '#create-password' }) as HTMLInputElement)
        .value,
    ).toBe('');
    expect(screen.getByRole('status')).toHaveTextContent(/account request accepted/i);
    expect(
      (screen.getByLabelText('Email', { selector: '#signin-email' }) as HTMLInputElement).value,
    ).toBe('denise@example.test');
    expect(client.login).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('signs in, shows only the current fictional account and signs out', async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(<AccountPage client={client} />);
    await screen.findByRole('heading', { name: /^sign in$/i });

    await fillSignIn(user);
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByRole('heading', { name: /you are signed in/i })).toBeInTheDocument();
    expect(screen.getByText('denise@example.test')).toBeInTheDocument();
    expect(client.login).toHaveBeenCalledWith('denise@example.test', PASSWORD, 'csrf-1');

    await user.click(screen.getByRole('button', { name: /sign out/i }));
    await waitFor(() => expect(client.logout).toHaveBeenCalledWith('csrf-2'));
    expect(await screen.findByRole('heading', { name: /create a fictional account/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/signed out/i);
    expect(client.csrf).toHaveBeenCalledTimes(2);
  });

  it('shows an existing signed-in account on load', async () => {
    const client = makeClient({
      me: vi.fn(async () => ({ id: 'usr_a', email: 'existing@example.test' })),
    });
    render(<AccountPage client={client} />);

    expect(await screen.findByRole('heading', { name: /you are signed in/i })).toBeInTheDocument();
    expect(screen.getByText('existing@example.test')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email', { selector: '#signin-email' })).not.toBeInTheDocument();
  });

  it('disables both account actions while a sign-in is pending', async () => {
    let release!: (value: { user: { id: string; email: string }; csrfToken: string }) => void;
    const login = vi.fn(
      () =>
        new Promise<{ user: { id: string; email: string }; csrfToken: string }>((resolve) => {
          release = resolve;
        }),
    );
    const user = userEvent.setup();
    const client = makeClient({ login });
    render(<AccountPage client={client} />);
    await screen.findByRole('heading', { name: /^sign in$/i });

    await fillSignIn(user);
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();

    release({ user: { id: 'usr_a', email: 'denise@example.test' }, csrfToken: 'csrf-2' });
    expect(await screen.findByRole('heading', { name: /you are signed in/i })).toBeInTheDocument();
  });

  it('maps throttling to an actionable generic message without echoing credentials', async () => {
    const user = userEvent.setup();
    const client = makeClient({
      login: vi.fn(async () => {
        throw new AccountRequestError(429, 'rate-limited');
      }),
    });
    render(<AccountPage client={client} />);
    await screen.findByRole('heading', { name: /^sign in$/i });

    await fillSignIn(user, 'denise@example.test', 'wrong password 123456');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/too many attempts/i);
    expect(alert).not.toHaveTextContent(/wrong password|denise@example/i);
    expect(screen.getByLabelText('Password', { selector: '#signin-password' })).toHaveValue(
      'wrong password 123456',
    );
  });

  it('refuses a short fictional password before calling the API', async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(<AccountPage client={client} />);
    await screen.findByRole('heading', { name: /create a fictional account/i });

    await fillCreate(user, 'denise@example.test', 'too short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 15 characters/i);
    expect(client.register).not.toHaveBeenCalled();
  });

  it('keeps the signed-in state when sign-out fails rather than claiming success', async () => {
    const user = userEvent.setup();
    const client = makeClient({
      me: vi.fn(async () => ({ id: 'usr_a', email: 'denise@example.test' })),
      logout: vi.fn(async () => {
        throw new AccountRequestError(503, 'unavailable');
      }),
    });
    render(<AccountPage client={client} />);
    await screen.findByRole('heading', { name: /you are signed in/i });

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be confirmed/i);
    expect(screen.getByRole('heading', { name: /you are signed in/i })).toBeInTheDocument();
    expect(screen.getByText('denise@example.test')).toBeInTheDocument();
  });

  it('ignores a stale sign-in response after a newer attempt succeeds', async () => {
    let resolveFirst!: (value: { user: { id: string; email: string }; csrfToken: string }) => void;
    let resolveSecond!: (value: { user: { id: string; email: string }; csrfToken: string }) => void;
    const login = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );
    const user = userEvent.setup();
    const client = makeClient({ login });
    render(<AccountPage client={client} />);
    await screen.findByRole('heading', { name: /^sign in$/i });
    await fillSignIn(user);

    const button = screen.getByRole('button', { name: /^sign in$/i });
    const form = button.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    fireEvent.submit(form!);
    expect(login).toHaveBeenCalledTimes(2);

    resolveSecond({ user: { id: 'usr_b', email: 'newer@example.test' }, csrfToken: 'csrf-2' });
    expect(await screen.findByText('newer@example.test')).toBeInTheDocument();

    resolveFirst({ user: { id: 'usr_a', email: 'stale@example.test' }, csrfToken: 'csrf-1' });
    await waitFor(() => expect(screen.queryByText('stale@example.test')).not.toBeInTheDocument());
    expect(screen.getByText('newer@example.test')).toBeInTheDocument();
  });

  it('bounds the real bootstrap request from headers through body and exposes Retry', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (String(url).endsWith('/me')) return Promise.resolve(json({ error: 'unauthenticated' }, 401));
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        });
      }),
    );
    render(<AccountPage client={accountClient} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACCOUNT_REQUEST_BUDGET_MS);
    });

    expect(screen.getByRole('button', { name: /retry loading the account page/i })).toBeInTheDocument();
    expect(screen.queryByText(/loading account/i)).not.toBeInTheDocument();
  });

  it('recovers a timed-out sign-in to an actionable error and a usable button', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (String(url).endsWith('/csrf')) return Promise.resolve(json({ csrfToken: 'csrf-1' }));
        if (String(url).endsWith('/me')) return Promise.resolve(json({ error: 'unauthenticated' }, 401));
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        });
      }),
    );
    render(<AccountPage client={accountClient} />);
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText('Email', { selector: '#signin-email' }), {
      target: { value: USER.email },
    });
    fireEvent.change(screen.getByLabelText('Password', { selector: '#signin-password' }), {
      target: { value: PASSWORD },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Sign in$/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACCOUNT_REQUEST_BUDGET_MS);
    });

    expect(screen.getByRole('button', { name: /^Sign in$/ })).toBeEnabled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /you are signed in/i })).not.toBeInTheDocument();
  });

  it('ignores a stale re-bootstrap response after the client changes', async () => {
    const staleUser = { id: 'usr_a', email: 'stale-bootstrap@example.test' };
    let resolveFirstToken!: (token: string) => void;
    const firstClient = makeClient({
      csrf: vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveFirstToken = resolve;
          }),
      ),
      me: vi.fn(async () => staleUser),
    });
    const secondUser = { id: 'usr_b', email: 'second@example.test' };
    const secondClient = makeClient({
      csrf: vi.fn(async () => 'csrf-b'),
      me: vi.fn(async () => secondUser),
    });

    const { rerender } = render(<AccountPage client={firstClient} />);
    await waitFor(() => expect(firstClient.csrf).toHaveBeenCalled());
    rerender(<AccountPage client={secondClient} />);
    expect(await screen.findByText(secondUser.email, { exact: true })).toBeInTheDocument();

    resolveFirstToken('csrf-a');
    await waitFor(() => expect(screen.getByText(secondUser.email, { exact: true })).toBeInTheDocument());
    expect(screen.queryByText(staleUser.email)).not.toBeInTheDocument();
  });

  it('keeps sign-in unavailable while sign-out is pending, then exposes it after completion', async () => {
    let finishLogout!: () => void;
    const client = makeClient({
      me: vi.fn(async () => USER),
      logout: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishLogout = resolve;
          }),
      ),
    });
    const user = userEvent.setup();
    render(<AccountPage client={client} />);
    await screen.findByRole('heading', { name: /you are signed in/i });

    await user.click(screen.getByRole('button', { name: /sign out/i }));
    expect(screen.getByRole('button', { name: /signing out/i })).toBeDisabled();
    expect(screen.queryByLabelText('Email', { selector: '#signin-email' })).not.toBeInTheDocument();

    finishLogout();
    expect(await screen.findByRole('heading', { name: /create a fictional account/i })).toBeInTheDocument();
  });

  it('reconciles an uncertain timed-out sign-in to the authoritative session when one exists', async () => {
    vi.useFakeTimers();
    let signedIn = false;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (String(url).endsWith('/csrf')) return Promise.resolve(json({ csrfToken: 'csrf-1' }));
        if (String(url).endsWith('/me')) {
          return Promise.resolve(
            signedIn ? json({ user: USER }) : json({ error: 'unauthenticated' }, 401),
          );
        }
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            signedIn = true;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }),
    );
    render(<AccountPage client={accountClient} />);
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText('Email', { selector: '#signin-email' }), {
      target: { value: USER.email },
    });
    fireEvent.change(screen.getByLabelText('Password', { selector: '#signin-password' }), {
      target: { value: PASSWORD },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Sign in$/ }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACCOUNT_REQUEST_BUDGET_MS);
    });

    expect(screen.getByRole('heading', { name: /you are signed in/i })).toBeInTheDocument();
    expect(screen.getByText(USER.email, { exact: true })).toBeInTheDocument();
  });

  it('reconciles an expired-session logout instead of leaving a stale signed-in view', async () => {
    let expired = false;
    let csrfCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).endsWith('/csrf')) {
          csrfCalls += 1;
          return Promise.resolve(json({ csrfToken: 'csrf-1' }));
        }
        if (String(url).endsWith('/me')) {
          return Promise.resolve(
            expired ? json({ error: 'unauthenticated' }, 401) : json({ user: USER }),
          );
        }
        return Promise.resolve(json({ error: 'forbidden' }, 403));
      }),
    );
    render(<AccountPage client={accountClient} />);
    await screen.findByRole('heading', { name: /you are signed in/i });

    expired = true;
    fireEvent.click(screen.getByRole('button', { name: /^Sign out$/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/session ended|sign in again/i);
    expect(screen.queryByRole('heading', { name: /you are signed in/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /create a fictional account/i })).toBeInTheDocument();
    expect(csrfCalls).toBeGreaterThanOrEqual(2);
  });

  it('keeps a still-valid identity on a 403 logout and refreshes its CSRF state', async () => {
    let csrfCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).endsWith('/csrf')) {
          csrfCalls += 1;
          return Promise.resolve(json({ csrfToken: 'csrf-1' }));
        }
        if (String(url).endsWith('/me')) return Promise.resolve(json({ user: USER }));
        return Promise.resolve(json({ error: 'forbidden' }, 403));
      }),
    );
    render(<AccountPage client={accountClient} />);
    await screen.findByRole('heading', { name: /you are signed in/i });

    fireEvent.click(screen.getByRole('button', { name: /^Sign out$/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be confirmed|try again/i);
    expect(screen.getByRole('heading', { name: /you are signed in/i })).toBeInTheDocument();
    expect(screen.getByText(USER.email, { exact: true })).toBeInTheDocument();
    expect(csrfCalls).toBeGreaterThanOrEqual(2);
  });
});
