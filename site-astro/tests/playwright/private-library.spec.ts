import { test, expect } from '@playwright/test';
import { createCipheriv, randomBytes } from 'node:crypto';

const vaultId = 'a'.repeat(32), key = 'b'.repeat(64), token = 'github_pat_test';
const code = `JG1.${vaultId}.${key}`;
function encryptedBlob(text = 'Passage saved on phone') {
  const snapshot = { version: 1, vaultId, tables: {
    books: { rows: [{ id: 'book', title: 'Atomic Habits', author: 'James Clear' }] },
    book_annotations: { rows: [{ id: 'h', book_id: 'book', kind: 'highlight', selected_text: text, note: 'Private note', locator: 'page:3' }] }
  } };
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const bytes = Buffer.concat([iv, cipher.update(JSON.stringify(snapshot)), cipher.final(), cipher.getAuthTag()]);
  return { encoding: 'base64', content: bytes.toString('base64'), size: bytes.length };
}
test('private highlights unlock, refresh, search and lock without browser persistence or public writes', async ({ page }) => {
  let blob = encryptedBlob('<img src=x onerror="window.exposed=true"> Saved on phone'), fail = false;
  const requests: string[] = [];
  await page.route('https://api.github.com/repos/JGOLD43/jgold-publishing-inbox**', async route => {
    const request = route.request(); requests.push(request.url());
    expect(request.method()).toBe('GET'); expect(request.headers().authorization).toBe(`Bearer ${token}`);
    expect(request.url()).not.toContain(key);
    if (fail) return route.fulfill({ status: 503, body: '{}' });
    const path = new URL(request.url()).pathname;
    const body = path.endsWith('jgold-publishing-inbox') ? { private: true, full_name: 'JGOLD43/jgold-publishing-inbox' }
      : path.includes('/git/ref/') ? { object: { sha: '1'.repeat(40) } }
      : path.includes('/git/commits/') ? { tree: { sha: '2'.repeat(40) } }
      : path.includes('/git/trees/') ? { tree: [{ path: `sync/${vaultId}/state.enc`, type: 'blob', sha: '3'.repeat(40) }] }
      : blob;
    await route.fulfill({ json: body });
  });
  await page.goto('/private-library.html');
  await page.getByLabel('Connection code').fill(code); await page.getByLabel('GitHub read-only token').fill(token);
  await page.getByRole('button', { name: 'Open private library' }).click();
  await expect(page.getByRole('heading', { name: 'Atomic Habits' })).toBeVisible();
  await expect(page.locator('blockquote')).toContainText('<img src=x');
  expect(await page.locator('#books img').count()).toBe(0);
  await page.getByLabel('Search books').fill('missing'); await expect(page.getByText('No matching books or passages.')).toBeVisible();
  await page.getByLabel('Search books').fill('Private note'); await expect(page.locator('blockquote')).toBeVisible();
  blob = encryptedBlob('A newer synced highlight'); await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('blockquote')).toHaveText('A newer synced highlight');
  fail = true; await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('last loaded library is still shown');
  await expect(page.locator('blockquote')).toHaveText('A newer synced highlight');
  expect(requests.length).toBeGreaterThan(10);
  const stored = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]));
  expect(stored).not.toContain(key); expect(stored).not.toContain(token); expect(stored).not.toContain('A newer synced highlight');
  await page.getByRole('button', { name: 'Lock', exact: true }).click();
  await expect(page.locator('#library')).toBeHidden(); await expect(page.locator('#books')).toBeEmpty();
  await expect(page.getByLabel('Connection code')).toHaveValue('');
  await page.reload(); await expect(page.getByRole('button', { name: 'Open private library' })).toBeVisible();
});
test('locking during a download prevents decrypted results from reopening the library', async ({ page }) => {
  let release: () => void = () => {};
  const paused = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.github.com/**', async route => {
    await paused; await route.fulfill({ json: { private: true, full_name: 'JGOLD43/jgold-publishing-inbox' } });
  });
  await page.goto('/private-library.html');
  await page.getByLabel('Connection code').fill(code); await page.getByLabel('GitHub read-only token').fill(token);
  await page.getByRole('button', { name: 'Open private library' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  release(); await expect(page.getByRole('status')).toHaveText('Locked. Enter your connection details to open again.');
  await expect(page.locator('#library')).toBeHidden();
});
