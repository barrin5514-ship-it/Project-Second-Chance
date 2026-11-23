import { test, expect, type Page } from '@playwright/test';

/**
 * These tests run against the real loopback servers with NO API key
 * (PSC_E2E_NO_KEY=1), so the provider is never contacted and no credit is
 * spent. They verify request protection, the disclosure and the failure UX.
 */

async function bootstrap(page: Page): Promise<{ csrfToken: string }> {
  const res = await page.request.get('/api/avatar/bootstrap');
  expect(res.status()).toBe(200);
  return (await res.json()) as { csrfToken: string };
}

test.describe('disclosure and no media before Start', () => {
  test('page states what it is and gives no legal advice', async ({ page }) => {
    await page.goto('/mira');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Project Second Chance/i);
    await expect(page.getByRole('main')).toContainText(/no legal advice/i);
    await expect(page.getByRole('main')).toContainText(/Mira is an AI, not a person/i);
  });

  test('starts no microphone and no camera on load', async ({ page }) => {
    let getUserMediaCalls = 0;
    await page.addInitScript(() => {
      (window as unknown as { __gum: number }).__gum = 0;
      const md = navigator.mediaDevices;
      if (md && typeof md.getUserMedia === 'function') {
        const original = md.getUserMedia.bind(md);
        md.getUserMedia = (constraints?: MediaStreamConstraints) => {
          (window as unknown as { __gum: number }).__gum += 1;
          return original(constraints);
        };
      }
    });

    await page.goto('/mira');
    await expect(page.getByRole('status')).toBeVisible();
    getUserMediaCalls = await page.evaluate(
      () => (window as unknown as { __gum: number }).__gum,
    );
    expect(getUserMediaCalls).toBe(0);
    await expect(page.getByRole('status')).toContainText(/not started/i);
  });

  test('links provider terms and the privacy/recording policy', async ({ page }) => {
    await page.goto('/mira');
    await expect(page.getByRole('link', { name: /terms/i })).toHaveAttribute(
      'href',
      'https://app.nuancelabs.ai/terms',
    );
    await expect(page.getByRole('link', { name: /privacy/i })).toHaveAttribute(
      'href',
      'https://app.nuancelabs.ai/privacy',
    );
  });
});

test.describe('request protection', () => {
  test('bootstrap rejects a foreign Origin and sets no permissive CORS', async ({ page }) => {
    const res = await page.request.get('/api/avatar/bootstrap', {
      headers: { Origin: 'https://evil.example' },
    });
    expect(res.status()).toBe(403);
    expect(res.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('token POST rejects a missing Origin', async ({ page }) => {
    const { csrfToken } = await bootstrap(page);
    const res = await page.request.post('/api/avatar/session-token', {
      headers: { 'x-psc-csrf': csrfToken },
      data: {},
    });
    // Playwright's APIRequestContext sends no Origin by default.
    expect(res.status()).toBe(403);
  });

  test('token POST rejects a foreign Origin', async ({ page }) => {
    const { csrfToken } = await bootstrap(page);
    const res = await page.request.post('/api/avatar/session-token', {
      headers: { Origin: 'https://evil.example', 'x-psc-csrf': csrfToken },
      data: {},
    });
    expect(res.status()).toBe(403);
  });

  test('token POST rejects a missing CSRF header even with a valid origin', async ({ page }) => {
    await bootstrap(page);
    const res = await page.request.post('/api/avatar/session-token', {
      headers: { Origin: 'http://127.0.0.1:5173' },
      data: {},
    });
    expect(res.status()).toBe(403);
  });

  test('GET on the token route is 405', async ({ page }) => {
    const res = await page.request.get('/api/avatar/session-token', {
      headers: { Origin: 'http://127.0.0.1:5173' },
    });
    expect(res.status()).toBe(405);
  });

  test('a fully valid request reports the missing key as 503, never a token', async ({ page }) => {
    const { csrfToken } = await bootstrap(page);
    const res = await page.request.post('/api/avatar/session-token', {
      headers: { Origin: 'http://127.0.0.1:5173', 'x-psc-csrf': csrfToken },
      data: {},
    });
    expect(res.status()).toBe(503);
    const body = await res.text();
    expect(body).not.toMatch(/st_|nk_/);
  });

  test('no CORS headers are emitted for a cross-origin preflight', async ({ page }) => {
    const res = await page.request.fetch('/api/avatar/session-token', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(res.headers()['access-control-allow-origin']).toBeUndefined();
  });
});

test.describe('failure state is honest, not a fake success', () => {
  test('Start without a key shows an unavailable state and no avatar', async ({ page }) => {
    await page.goto('/mira');
    await page.getByRole('button', { name: /start/i }).click();

    const status = page.getByRole('status');
    await expect(status).toContainText(/could not start/i, { timeout: 10_000 });
    // No simulated avatar is ever presented as live success.
    await expect(page.locator('[data-live-avatar]')).toHaveCount(0);
  });

  test('offers a retry after the failure and stays keyboard operable', async ({ page }) => {
    await page.goto('/mira');
    const start = page.getByRole('button', { name: /start/i });
    start.focus();
    await expect(start).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('status')).toContainText(/could not start/i, { timeout: 10_000 });
    const retry = page.getByRole('button', { name: /try again|start again/i });
    await expect(retry).toBeEnabled();
  });
});

test.describe('narrow viewport', () => {
  test('controls remain visible and operable on a phone-sized screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/mira');

    const start = page.getByRole('button', { name: /start/i });
    await expect(start).toBeInViewport();
    await expect(start).toBeEnabled();
    await expect(page.getByRole('main')).toContainText(/no legal advice/i);
  });
});
