import { test, expect } from '@playwright/test';

/**
 * E0-S1 foundation acceptance. The API is started with no provider key and the
 * page may request only the same-origin health contract. Failure is injected
 * deterministically with Playwright routing; no external outage is required.
 */

const BASE = 'http://127.0.0.1:5173';

test.describe('foundation landing', () => {
  test('states the fictional boundary and incomplete foundation without a form', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Project Second Chance');
    await expect(page.getByText('Fictional data only', { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        'Development foundation — accounts and protected uploads are not available yet.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole('main')).toContainText(/legal information, not legal advice/i);
    await expect(page.getByRole('main')).toContainText(/does not decide eligibility/i);
    await expect(page.locator('form, input, textarea, select')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /mira/i })).toHaveAttribute('href', '/mira');
  });

  test('reports the health contract and makes only foundation API requests', async ({ page }) => {
    const external: string[] = [];
    const apiPaths: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('http') && !url.startsWith(BASE)) external.push(url);
      const path = new URL(url).pathname;
      if (path.startsWith('/api/')) apiPaths.push(path);
    });

    await page.goto('/');

    await expect(page.getByRole('status')).toContainText(/local api is available/i);
    await expect(page.getByRole('status')).toContainText(/fictional-demo/i);
    // The foundation flow must never contact an AI provider, court source or
    // the optional Mira avatar API; only the health contract is allowed.
    expect(external).toEqual([]);
    expect(apiPaths.length).toBeGreaterThan(0);
    expect(apiPaths.every((path) => path === '/api/health')).toBe(true);
    expect(apiPaths.some((path) => /avatar|nuance/i.test(path))).toBe(false);
  });

  test('shows an actionable keyboard retry after API failure and recovers', async ({ page }) => {
    let failing = true;
    await page.route('**/api/health', async (route) => {
      if (failing) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'unavailable' }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/');

    await expect(page.getByRole('status')).toContainText(/local api is unavailable/i);
    // Failure must not imply the app is ready.
    await expect(page.getByRole('status')).not.toContainText(/available in fictional-demo/i);

    const retry = page.getByRole('button', { name: /retry/i });
    await expect(retry).toBeEnabled();
    retry.focus();
    await expect(retry).toBeFocused();

    failing = false;
    await page.keyboard.press('Enter');

    await expect(page.getByRole('status')).toContainText(/local api is available/i);
    await expect(page.getByRole('button', { name: /retry/i })).toHaveCount(0);
  });

  test('treats a malformed health body as unavailable', async ({ page }) => {
    await page.route('**/api/health', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', mode: 'production' }),
      }),
    );

    await page.goto('/');
    await expect(page.getByRole('status')).toContainText(/local api is unavailable/i);
  });

  test('is readable and operable on a phone viewport without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Fictional data only', { exact: true })).toBeInViewport();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });

  test('keeps Mira as an explicit optional page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /mira/i }).click();

    await expect(page).toHaveURL(/\/mira$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /Mira connection prototype/i,
    );
    await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
    // Landing on the opt-in page still starts no conversation or media.
    await expect(page.getByRole('status')).toContainText(/not started/i);
  });
});
