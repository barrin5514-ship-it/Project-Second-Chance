import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173';
const PASSWORD = 'correct horse battery staple';

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

async function createAccount(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/account');
  await page.locator('#create-email').fill(email);
  await page.locator('#create-password').fill(password);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByRole('status')).toContainText(/account created/i);
  await expect(page.locator('#signin-email')).toHaveValue(email);
}

async function signIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page.getByRole('heading', { name: /you are signed in/i })).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
}

async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page.getByRole('heading', { name: /create a fictional account/i })).toBeVisible();
}

async function openTwoAccounts(
  browser: import('@playwright/test').Browser,
): Promise<{ alice: { context: BrowserContext; page: Page; email: string }; bob: { context: BrowserContext; page: Page; email: string } }> {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();
  const aliceEmail = uniqueEmail('alice');
  const bobEmail = uniqueEmail('bob');

  await createAccount(alicePage, aliceEmail);
  await signIn(alicePage, aliceEmail);
  await createAccount(bobPage, bobEmail);
  await signIn(bobPage, bobEmail);

  return {
    alice: { context: aliceContext, page: alicePage, email: aliceEmail },
    bob: { context: bobContext, page: bobPage, email: bobEmail },
  };
}

test.describe('fictional-demo accounts', () => {
  test('creates, signs in, survives reload, signs out and leaves no credential in the URL', async ({
    page,
  }) => {
    const email = uniqueEmail('lifecycle');
    await createAccount(page, email);
    expect(page.url()).not.toContain(email);
    expect(page.url()).not.toContain('password');

    await signIn(page, email);
    expect(page.url()).not.toContain(email);

    await page.reload();
    await expect(page.getByRole('heading', { name: /you are signed in/i })).toBeVisible();
    await expect(page.getByText(email, { exact: true })).toBeVisible();

    await signOut(page);
    expect(await page.evaluate(() => window.localStorage.length)).toBe(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: /create a fictional account/i })).toBeVisible();
  });

  test('keeps two independent browser contexts isolated', async ({ browser }) => {
    const { alice, bob } = await openTwoAccounts(browser);
    try {
      await alice.page.reload();
      await bob.page.reload();
      await expect(alice.page.getByText(alice.email, { exact: true })).toBeVisible();
      await expect(bob.page.getByText(bob.email, { exact: true })).toBeVisible();
      await expect(alice.page.getByText(bob.email)).toHaveCount(0);
      await expect(bob.page.getByText(alice.email)).toHaveCount(0);

      const me = await alice.page.request.get('/api/auth/me');
      expect(me.status()).toBe(200);
      const body = (await me.json()) as { user: { email: string } };
      expect(body.user.email).toBe(alice.email);

      const other = await alice.page.request.get(`/api/auth/me?userId=${encodeURIComponent(bob.email)}`);
      const otherBody = (await other.json()) as { user: { email: string } };
      expect(otherBody.user.email).toBe(alice.email);
    } finally {
      await alice.context.close();
      await bob.context.close();
    }
  });

  test('rejects a logged-out session cookie replay', async ({ page, browser }) => {
    const email = uniqueEmail('replay');
    await createAccount(page, email);
    await signIn(page, email);

    const cookies = await page.context().cookies(BASE);
    const authCookie = cookies.find((cookie) => cookie.name === 'psc_auth_sid');
    expect(authCookie).toBeTruthy();

    await signOut(page);
    expect((await page.request.get('/api/auth/me')).status()).toBe(401);

    const replayContext = await browser.newContext();
    try {
      await replayContext.addCookies([authCookie!]);
      const replayPage = await replayContext.newPage();
      await replayPage.goto('/account');
      await expect(replayPage.getByRole('heading', { name: /create a fictional account/i })).toBeVisible();
      await expect(replayPage.getByRole('heading', { name: /you are signed in/i })).toHaveCount(0);
    } finally {
      await replayContext.close();
    }
  });

  test('rejects an account mutation without a CSRF token', async ({ page }) => {
    const response = await page.request.post('/api/auth/register', {
      headers: { Origin: BASE, 'Content-Type': 'application/json' },
      data: { email: uniqueEmail('no-csrf'), password: PASSWORD },
    });
    expect(response.status()).toBe(403);
    expect(await response.text()).not.toMatch(/stack|node_modules/i);
  });

  test('keeps account pages form-operable on a narrow viewport without horizontal scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto('/account');

    await expect(page.getByRole('heading', { name: /create a fictional account/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^sign in$/i })).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);

    await page.locator('#signin-email').focus();
    await expect(page.locator('#signin-email')).toBeFocused();
    await page.keyboard.type('keyboard@example.test');
    await expect(page.locator('#signin-email')).toHaveValue('keyboard@example.test');
  });

  test('does not contact Nuance or any external origin during account activity', async ({ page }) => {
    const external: string[] = [];
    const apiPaths: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('http') && !url.startsWith(BASE) && !url.startsWith('http://127.0.0.1:3001')) {
        external.push(url);
      }
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/api/')) apiPaths.push(parsed.pathname);
    });

    const email = uniqueEmail('network');
    await createAccount(page, email);
    await signIn(page, email);
    await signOut(page);

    expect(external).toEqual([]);
    expect(apiPaths.every((path) => path.startsWith('/api/auth/'))).toBe(true);
    expect(apiPaths.some((path) => /avatar|nuance/i.test(path))).toBe(false);
  });
});
