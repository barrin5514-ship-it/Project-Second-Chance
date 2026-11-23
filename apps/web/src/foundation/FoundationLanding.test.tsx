import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoundationLanding from './FoundationLanding';
import type { HealthResponse } from '../api/health';

const HEALTHY: HealthResponse = { status: 'ok', mode: 'fictional-demo' };

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (e: Error) => void } {
  let resolve!: (value: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('foundation landing', () => {
  it('states the project, fictional-data boundary and incomplete foundation without any active form', () => {
    const loadHealth = vi.fn(() => new Promise<HealthResponse>(() => {}));
    const { container } = render(<FoundationLanding loadHealth={loadHealth} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Project Second Chance');
    expect(screen.getByText('Fictional data only')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Development foundation — accounts and protected uploads are not available yet.',
      ),
    ).toBeInTheDocument();
    // No False Hope: information, not advice and not eligibility decisions.
    expect(screen.getByRole('main')).toHaveTextContent(/legal information, not legal advice/i);
    expect(screen.getByRole('main')).toHaveTextContent(/does not decide eligibility/i);
    // No sign-in, upload or sensitive-input form is active.
    expect(container.querySelector('form, input, textarea, select')).toBeNull();
    // Mira stays available only as an explicit optional connection test.
    expect(screen.getByRole('link', { name: /mira/i })).toHaveAttribute('href', '/mira');
  });

  it('reports that the local API check is in progress', () => {
    const loadHealth = vi.fn(() => deferred<HealthResponse>().promise);
    render(<FoundationLanding loadHealth={loadHealth} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/checking the local api/i);
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('reports the API available only after the health contract resolves', async () => {
    render(<FoundationLanding loadHealth={async () => HEALTHY} />);

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/local api is available/i),
    );
    expect(screen.getByRole('status')).toHaveTextContent(/fictional-demo/i);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('reports unavailable and offers an actionable retry when health fails', async () => {
    render(
      <FoundationLanding loadHealth={async () => Promise.reject(new Error('503'))} />,
    );

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/local api is unavailable/i),
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeEnabled();
    // Failure must not imply the app is ready.
    expect(screen.getByRole('status')).not.toHaveTextContent(/available in fictional-demo/i);
  });

  it('retries with a fresh request and clears the failure when health then succeeds', async () => {
    const user = userEvent.setup();
    const loadHealth = vi
      .fn<() => Promise<HealthResponse>>()
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce(HEALTHY);
    render(<FoundationLanding loadHealth={loadHealth} />);

    const retry = await screen.findByRole('button', { name: /retry/i });
    await user.click(retry);

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/local api is available/i),
    );
    expect(loadHealth).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('keeps the retry control keyboard operable', async () => {
    const user = userEvent.setup();
    const loadHealth = vi
      .fn<() => Promise<HealthResponse>>()
      .mockRejectedValueOnce(new Error('403'))
      .mockResolvedValueOnce(HEALTHY);
    render(<FoundationLanding loadHealth={loadHealth} />);

    const retry = await screen.findByRole('button', { name: /retry/i });
    retry.focus();
    expect(retry).toHaveFocus();
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/local api is available/i),
    );
  });

  it('offers Retry when the production health request never settles', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(Object.assign(new Error('synthetic abort'), { name: 'AbortError' })),
            { once: true },
          );
        });
      }),
    );

    render(<FoundationLanding />);
    expect(screen.getByRole('status')).toHaveTextContent(/checking the local api/i);

    // No injected loader: this exercises the production fetchHealth timeout.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(screen.getByRole('status')).toHaveTextContent(/local api is unavailable/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeEnabled();
  });
});
