import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * The version picker of the dev apps (ADR 0023). The browser has no host, so one test checks the
 * picker is absent there (as in every release build); the others install a fake Dev shell bridge
 * before the app starts and drive the real Advanced section against it. The native parts (APK,
 * Electron) are covered by their own suites and by the device checks.
 */
const HOST = 'flourprint-aristotelesqc.pages.dev';

const installShell = (page: Page, loaded: string) =>
  page.addInitScript((current: string) => {
    const calls: unknown[][] = [];
    (window as unknown as { __calls: unknown[][] }).__calls = calls;
    (window as unknown as { flourprintDevShell: unknown }).flourprintDevShell = {
      current: async () => current,
      select: async (version: string) => void calls.push(['select', version]),
      listData: async () => [
        { version: 'dev', bytes: 3 * 1024 * 1024 },
        { version: current, bytes: 40 * 1024 },
        { version: 'pr-9', bytes: 100 },
      ],
      deleteData: async (version: string) => void calls.push(['delete', version]),
      stashTransfer: async (version: string, json: string) =>
        void calls.push(['stash', version, JSON.parse(json).kind]),
      takeTransfer: async () => undefined,
    };
  }, loaded);

const routeGitHub = (page: Page, options: { offline?: boolean } = {}) =>
  page.route('https://api.github.com/**', async (route) => {
    if (options.offline) return route.abort();
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path.endsWith('/pulls')) {
      return json([
        { number: 5, title: 'Desktop bridge' },
        { number: 233, title: 'Engine: dough clock' },
      ]);
    }
    if (path.endsWith('/pulls/5/files')) return json([{ filename: 'apps/desktop/src/main.ts' }]);
    if (/\/pulls\/\d+\/files$/.test(path)) return json([{ filename: 'docs/readme.md' }]);
    return route.fulfill({ status: 404, body: '{}' });
  });

const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __calls: unknown[][] }).__calls);

test('the browser, like a release build, shows no version picker', async ({ page }) => {
  await page.goto('/advanced');
  // The page is there (a dev-build item that every non-release build shows)...
  await expect(
    page.getByText('Charger la dernière version dev').locator('visible=true'),
  ).toBeVisible();
  // ...and has no picker: no host, whatever the build channel.
  await expect(page.getByText('Version du web')).toHaveCount(0);
  await expect(page.getByText('Données conservées sur cet appareil')).toHaveCount(0);
});

test('shows the loaded version and its native-change notice, and returns to dev', async ({
  page,
}) => {
  await installShell(page, 'pr-5');
  await routeGitHub(page);
  await page.goto('/advanced');
  await expect(page.getByTestId('loaded-version').locator('visible=true')).toContainText(
    /^Chargée : PR n° 5 · v/,
  );
  await expect(page.getByText(/modifie du code natif/).locator('visible=true')).toBeVisible();
  await page.getByRole('button', { name: 'Revenir à dev' }).locator('visible=true').click();
  await expect.poll(() => calls(page)).toEqual([['select', 'dev']]);
});

test('lists the open pull requests, loads one, or copies the data there first', async ({
  page,
}) => {
  await installShell(page, 'dev');
  await routeGitHub(page);
  await page.goto('/advanced');
  const pull = page.locator('ion-item').filter({ hasText: 'PR n° 233' }).locator('visible=true');
  await expect(pull).toBeVisible();
  await expect(page.getByText('Engine: dough clock').locator('visible=true')).toBeVisible();
  // The loaded version cannot be chosen again.
  await expect(
    page.getByRole('button', { name: /Dev \(chargée\)/ }).locator('visible=true'),
  ).toBeDisabled();

  await pull.click();
  const sheet = page.locator('ion-action-sheet');
  await sheet.getByRole('button', { name: 'Charger cette version' }).click();
  await expect.poll(() => calls(page)).toEqual([['select', 'pr-233']]);

  await page.goto('/advanced');
  await page.locator('ion-item').filter({ hasText: 'PR n° 233' }).locator('visible=true').click();
  await sheet
    .getByRole('button', { name: 'Copier mes données vers cette version, puis la charger' })
    .click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      ['stash', 'pr-233', 'flourprint-backup'],
      ['select', 'pr-233'],
    ]);
});

test('loads a pull request by number and refuses anything else', async ({ page }) => {
  await installShell(page, 'dev');
  await routeGitHub(page, { offline: true });
  await page.goto('/advanced');
  await expect(
    page.getByText(/Liste des pull requests ouvertes indisponible/).locator('visible=true'),
  ).toBeVisible();
  const input = page.locator('ion-input input').locator('visible=true');
  const load = page.getByRole('button', { name: 'Charger', exact: true }).locator('visible=true');
  await input.fill('0233');
  await load.click();
  await expect(
    page.getByText(/Saisir un numéro de pull request/).locator('visible=true'),
  ).toBeVisible();
  await input.fill('https://evil.example/');
  await load.click();
  await expect(
    page.getByText(/Saisir un numéro de pull request/).locator('visible=true'),
  ).toBeVisible();
  expect(await calls(page)).toEqual([]);

  await input.fill('#12');
  await load.click();
  await page
    .locator('ion-action-sheet')
    .getByRole('button', { name: 'Charger cette version' })
    .click();
  await expect.poll(() => calls(page)).toEqual([['select', 'pr-12']]);
});

test('lists the data each version keeps and deletes one after a confirmation', async ({ page }) => {
  await installShell(page, 'pr-5');
  await routeGitHub(page);
  await page.goto('/advanced');
  const row = page.locator('ion-item').filter({ hasText: 'PR n° 9' }).filter({ hasText: /Ko|ko/ });
  await expect(row.locator('visible=true')).toBeVisible();
  await expect(
    page
      .locator('ion-item')
      .filter({ hasText: /^Dev\s*3\s*Mo/ })
      .locator('visible=true'),
  ).toBeVisible();
  await row
    .getByRole('button', { name: /Supprimer/ })
    .locator('visible=true')
    .click();
  const alert = page.locator('ion-alert');
  await expect(alert).toContainText('Supprimer les données de PR n° 9 ?');
  await alert.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect.poll(() => calls(page)).toEqual([['delete', 'pr-9']]);
});

test('names the loaded pull request and its build in English @en', async ({ page }) => {
  await installShell(page, 'pr-233');
  await routeGitHub(page);
  await page.goto('/advanced');
  await expect(page.getByTestId('loaded-version').locator('visible=true')).toContainText(
    /^Loaded: PR #233 · v/,
  );
  await expect(
    page.getByRole('button', { name: 'Return to dev' }).locator('visible=true'),
  ).toBeVisible();
  await expect(page.getByText('Data kept on this device').locator('visible=true')).toBeVisible();
});
