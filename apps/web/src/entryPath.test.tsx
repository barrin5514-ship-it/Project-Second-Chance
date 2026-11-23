import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * Entry-path tests: they render App with NO injected fakes, exactly as
 * main.tsx does in the browser. This must not throw, and must not touch the SDK
 * or the network before the user presses Start.
 */
describe('real entry path (no injection)', () => {
  it('renders a nonblank page without an injected connection', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Project Second Change|Project Second Chance/i);
    expect(screen.getByRole('button', { name: /start/i })).toBeEnabled();
  });

  it('does not resolve or call the SDK during render', () => {
    const globalRecord = globalThis as { __pscSdkLoads?: number };
    delete globalRecord.__pscSdkLoads;

    render(<App />);

    // Deferred until Start: nothing was loaded merely by showing the page.
    expect(globalRecord.__pscSdkLoads).toBeUndefined();
    expect(screen.getByRole('status')).toHaveTextContent(/not started/i);
  });
});
