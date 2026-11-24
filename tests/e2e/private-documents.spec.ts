import { test, expect, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

const BASE = 'http://127.0.0.1:5173';
const PASSWORD = 'correct horse battery staple';

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

async function fictionalPdf(text = 'Fictional private document'): Promise<Buffer> {
  const document = await PDFDocument.create();
  document.setTitle(text);
  document.addPage();
  return Buffer.from(await document.save());
}

async function createAccount(page: Page, email: string): Promise<void> {
  await page.goto('/account');
  await page.locator('#create-email').fill(email);
  await page.locator('#create-password').fill(PASSWORD);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByRole('status')).toContainText(/account request accepted/i);
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(PASSWORD);
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await expect(page.getByRole('heading', { name: /you are signed in/i })).toBeVisible();
}

async function createCase(page: Page, label: string): Promise<string> {
  await page.goto('/cases');
  await expect(page.getByRole('heading', { name: /private cases/i })).toBeVisible();
  await page.getByLabel('Case label').fill(label);
  await page.getByLabel(/jurisdiction/i).fill('Georgia');
  await page.getByRole('button', { name: /^Create case$/ }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`Case: ${label}`) })).toBeVisible();
  const response = await page.request.get('/api/cases');
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { cases: Array<{ id: string; label: string }> };
  return body.cases.find((item) => item.label === label)!.id;
}

test.describe('private cases and encrypted documents', () => {
  test('creates a case, uploads/downloads a PDF, and performs confirmed live deletion', async ({
    page,
  }) => {
    const email = uniqueEmail('private-lifecycle');
    await createAccount(page, email);
    const caseId = await createCase(page, 'Fictional private case');
    expect(page.url()).not.toContain(email);
    expect(page.url()).not.toContain(caseId);

    const file = await fictionalPdf('E2E fictional canary');
    await page.locator('#document-file').setInputFiles({
      name: 'fictional.pdf',
      mimeType: 'application/pdf',
      buffer: file,
    });
    await page.getByRole('button', { name: /upload encrypted document/i }).click();
    await expect(page.getByRole('status')).toContainText(/document uploaded and encrypted/i);
    await expect(page.getByText(/fictional\.pdf/)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Download$/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('fictional.pdf');
    const docsResponse = await page.request.get(`/api/cases/${caseId}/documents`);
    expect(docsResponse.status()).toBe(200);
    const docsBody = (await docsResponse.json()) as { documents: Array<{ id: string }> };
    const downloadResponse = await page.request.get(
      `/api/cases/${caseId}/documents/${docsBody.documents[0]!.id}/download`,
    );
    expect(downloadResponse.status()).toBe(200);
    expect(Buffer.from(await downloadResponse.body()).equals(file)).toBe(true);

    await page.getByRole('button', { name: /^Delete document$/ }).click();
    await page.getByRole('button', { name: /confirm delete document/i }).click();
    await expect(page.getByText(/document deleted from live storage/i)).toBeVisible();
    await expect(page.getByText(/fictional\.pdf/)).toHaveCount(0);

    await page.getByRole('button', { name: /^Delete case$/ }).click();
    await page.getByRole('button', { name: /confirm delete case/i }).click();
    await expect(page.getByText(/case and its documents were deleted/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Case: Fictional private case/i })).toHaveCount(0);
  });

  test('keeps two accounts and their private cases isolated', async ({ browser }) => {
    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();
    try {
      const alice = await aliceContext.newPage();
      const bob = await bobContext.newPage();
      const aliceEmail = uniqueEmail('alice-private');
      const bobEmail = uniqueEmail('bob-private');
      await createAccount(alice, aliceEmail);
      const aliceCaseId = await createCase(alice, 'Alice-only fictional case');
      await createAccount(bob, bobEmail);
      await bob.goto('/cases');
      await expect(bob.getByRole('heading', { name: /private cases/i })).toBeVisible();
      await expect(bob.getByText('Alice-only fictional case')).toHaveCount(0);

      const direct = await bob.request.get(`/api/cases/${aliceCaseId}`);
      expect(direct.status()).toBe(404);
      const list = await bob.request.get('/api/cases');
      expect(list.status()).toBe(200);
      const body = (await list.json()) as { cases: unknown[] };
      expect(body.cases).toEqual([]);
    } finally {
      await aliceContext.close();
      await bobContext.close();
    }
  });

  test('keeps the private case forms operable on a narrow viewport without horizontal scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 760 });
    await createAccount(page, uniqueEmail('narrow-private'));
    await page.goto('/cases');
    await expect(page.getByRole('heading', { name: /private cases/i })).toBeVisible();
    await expect(page.getByLabel('Case label')).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
    await page.getByLabel('Case label').focus();
    await page.keyboard.type('Keyboard case');
    await expect(page.getByLabel('Case label')).toHaveValue('Keyboard case');
  });
});
