import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountPage from './AccountPage';
import { AccountRequestError, type AccountClient } from './accountClient';

const PASSWORD = 'correct horse battery staple';

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
    expect(screen.getByRole('status')).toHaveTextContent(/account created/i);
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

    expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable/i);
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
});
