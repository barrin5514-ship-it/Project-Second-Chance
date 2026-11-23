import { describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import type { AvatarConnection, ConnectionState } from './avatar/connection';

/** A controllable fake connection so the UI is tested without any SDK or media. */
function makeFakeConnection(initial: ConnectionState = 'idle') {
  let state: ConnectionState = initial;
  const listeners = new Set<(s: ConnectionState) => void>();
  const start = vi.fn(async () => {
    setState('connecting');
  });
  const stop = vi.fn(() => {
    setState('stopped');
  });
  function setState(next: ConnectionState) {
    state = next;
    for (const l of listeners) l(next);
  }
  const connection: AvatarConnection = {
    start,
    stop,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    lastTokenRequestAttemptId: null,
    setMediaElements: vi.fn(),
  };
  return { connection, start, stop, setState };
}

function renderApp(connection: AvatarConnection) {
  return render(<App connectionFactory={() => connection} />);
}

describe('disclosure before any Start', () => {
  it('states what the prototype is and that it gives no legal advice', () => {
    const { connection } = makeFakeConnection();
    renderApp(connection);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Project Second Chance/i);
    expect(screen.getByText(/AI connection prototype/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).closest('main')).toHaveTextContent(/no legal advice/i);
    // Mira is explicitly labelled as an AI, not a person.
    expect(screen.getByRole('main')).toHaveTextContent(/Mira is an AI, not a person/i);
  });

  it('starts no conversation and no media before the user clicks Start', () => {
    const { connection, start } = makeFakeConnection();
    renderApp(connection);

    expect(start).not.toHaveBeenCalled();
    expect(connection.getState()).toBe('idle');
  });

  it('shows provider terms and the recording/privacy disclosure as links', () => {
    const { connection } = makeFakeConnection();
    renderApp(connection);

    const terms = screen.getByRole('link', { name: /terms/i });
    expect(terms).toHaveAttribute('href', 'https://app.nuancelabs.ai/terms');

    const privacy = screen.getByRole('link', { name: /privacy/i });
    expect(privacy).toHaveAttribute('href', 'https://app.nuancelabs.ai/privacy');
  });

  it('does not promise that audio is unrecorded', () => {
    const { connection } = makeFakeConnection();
    const { container } = renderApp(connection);
    const text = container.textContent?.toLowerCase() ?? '';

    expect(text).not.toContain('not recorded');
    expect(text).not.toContain('unrecorded');
    expect(text).not.toContain('nothing is recorded');
    // The honest statement is that THIS app saves nothing.
    expect(text).toContain('nothing you say is saved by this');
  });

  it('explains microphone audio is sent before the call, usable without starting', () => {
    const { connection } = makeFakeConnection();
    renderApp(connection);

    expect(screen.getByText(/microphone/i)).toBeInTheDocument();
    expect(screen.getByText(/sent to Nuance/i)).toBeInTheDocument();
  });

  it('states the prototype has no forms, case files or sending', () => {
    const { connection } = makeFakeConnection();
    renderApp(connection);

    expect(screen.getByText(/no\s+case files/i)).toBeInTheDocument();
  });
});

describe('explicit Start and consent', () => {
  it('starts only after the Start button is activated', async () => {
    const user = userEvent.setup();
    const { connection, start } = makeFakeConnection();
    renderApp(connection);

    await user.click(screen.getByRole('button', { name: /start/i }));
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('is operable by keyboard alone', async () => {
    const user = userEvent.setup();
    const { connection, start } = makeFakeConnection();
    renderApp(connection);

    const startButton = screen.getByRole('button', { name: /start/i });
    startButton.focus();
    expect(startButton).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(start).toHaveBeenCalledTimes(1);
  });
});

describe('distinguishable states', () => {
  const stateCopy: Array<[ConnectionState, RegExp]> = [
    ['connecting', /connecting/i],
    ['ready', /connected/i],
    ['mic-denied', /microphone.*(blocked|denied)/i],
    ['mic-unavailable', /microphone.*(unavailable|not found|missing)/i],
    ['mic-busy', /microphone.*(in use|busy)/i],
    ['camera-unavailable', /camera/i],
    ['unavailable', /(unavailable|could not)/i],
    ['ended', /(ended|finished)/i],
    ['stopped', /(stopped|stopped the test)/i],
  ];

  it.each(stateCopy)('renders a distinct labelled result for %s', (state, pattern) => {
    const { connection, setState } = makeFakeConnection();
    renderApp(connection);

    act(() => setState(state));
    expect(screen.getByRole('status')).toHaveTextContent(pattern);
  });

  it('announces state changes politely to assistive technology', () => {
    const { connection, setState } = makeFakeConnection();
    renderApp(connection);

    act(() => setState('ready'));
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent(/connected/i);
  });

  it('never shows a simulated avatar as live success', () => {
    const { connection, setState } = makeFakeConnection();
    const { container } = renderApp(connection);

    act(() => setState('unavailable'));
    // No avatar placeholder is rendered unless the SDK actually presented one.
    expect(container.querySelector('[data-live-avatar]')).toBeNull();
  });

  it('offers a recoverable retry after a failure', () => {
    const { connection, setState } = makeFakeConnection();
    renderApp(connection);

    act(() => setState('unavailable'));
    const retry = screen.getByRole('button', { name: /try again|start again/i });
    expect(retry).toBeEnabled();
  });

  it('shows the AI role label on the conversation surface when connected', () => {
    const { connection, setState } = makeFakeConnection();
    renderApp(connection);

    act(() => setState('ready'));
    const surface = screen.getByRole('status').closest('section');
    expect(surface).toHaveTextContent(/Mira \(AI\)/i);
  });
});

describe('Stop and the 60 second timer', () => {
  it('disables Start while a call is active', () => {
    const { connection, setState } = makeFakeConnection();
    renderApp(connection);

    act(() => setState('ready'));
    expect(screen.queryByRole('button', { name: /^start/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('calls stop when the Stop control is used', async () => {
    const user = userEvent.setup();
    const { connection, setState, stop } = makeFakeConnection();
    renderApp(connection);

    act(() => setState('ready'));
    await user.click(screen.getByRole('button', { name: /stop/i }));

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('calls stop automatically when the 60 second limit elapses', () => {
    vi.useFakeTimers();
    try {
      const { connection, setState, stop } = makeFakeConnection();
      renderApp(connection);

      act(() => setState('ready'));
      act(() => {
        vi.advanceTimersByTime(59_000);
      });
      expect(stop).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1_000);
      });
      expect(stop).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops on unmount so media is released when the page is left', () => {
    const { connection, setState, stop } = makeFakeConnection();
    const { unmount } = renderApp(connection);

    act(() => setState('ready'));
    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('shows no failure alert when the user stops while connecting', async () => {
    const user = userEvent.setup();
    let rejectStart!: (error: Error) => void;
    const pendingStart = new Promise<void>((_resolve, reject) => {
      rejectStart = reject;
    });
    let state: ConnectionState = 'idle';
    const listeners = new Set<(next: ConnectionState) => void>();
    function setState(next: ConnectionState): void {
      state = next;
      for (const listener of listeners) listener(next);
    }
    const connection: AvatarConnection = {
      start: vi.fn(async () => {
        setState('connecting');
        await pendingStart;
      }),
      stop: vi.fn(() => setState('stopped')),
      getState: () => state,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      lastTokenRequestAttemptId: null,
      setMediaElements: vi.fn(),
    };
    renderApp(connection);

    await user.click(screen.getByRole('button', { name: /start/i }));
    await user.click(screen.getByRole('button', { name: /stop/i }));
    await act(async () => {
      rejectStart(new Error('Start cancelled.'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Stopping is a user choice, not a failure to report.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/stopped/i);
  });
});
