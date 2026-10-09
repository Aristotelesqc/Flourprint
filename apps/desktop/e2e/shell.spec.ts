import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Smoke test of the packaged shell (ADR 0011). It drives the app over the DevTools protocol
 * rather than Playwright's Electron launcher, which does not follow every Electron release.
 */
const executable = join(
  resolve(import.meta.dirname, '..', 'out', `Flourprint-${process.platform}-${process.arch}`),
  process.platform === 'win32' ? 'Flourprint.exe' : 'flourprint',
);

interface Running {
  readonly process: ChildProcess;
  readonly browser: Browser;
  readonly page: Page;
}

const launch = async (userData: string): Promise<Running> => {
  const child = spawn(
    executable,
    [
      ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
      '--lang=fr-CA',
      '--remote-debugging-port=0',
    ],
    { env: { ...process.env, FLOURPRINT_USER_DATA: userData } },
  );
  const endpoint = await new Promise<string>((resolveEndpoint, reject) => {
    let output = '';
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(output);
      if (match?.[1]) resolveEndpoint(match[1]);
    });
    child.on('exit', (code) => reject(new Error(`exited with ${code}: ${output}`)));
  });
  const browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0];
  if (!context) throw new Error('no browser context');
  const appPage = () => context.pages().find((p) => p.url().startsWith('app://flourprint/'));
  await expect.poll(() => appPage() !== undefined).toBe(true);
  const page = appPage() as Page;
  return { process: child, browser, page };
};

// Mouse input becomes touch in this window, so Playwright's mouse clicks never complete: the
// test dispatches click events instead.
const quit = async ({ process: child, browser }: Running) => {
  await browser.close();
  const exited = new Promise((done) => child.once('exit', done));
  child.kill();
  await exited;
};

test('a phone-sized window, touch from the mouse, and data that survives a restart', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'flourprint-desktop-'));
  let app = await launch(userData);
  await app.page.getByText('Poolish + tangzhong').first().dispatchEvent('click');
  await expect(app.page.getByText('Version 1', { exact: true })).toBeVisible();
  // SQLite, not the browser's memory stores.
  await expect(app.page.getByText(/Aperçu navigateur/)).toHaveCount(0);
  expect(
    await app.page.evaluate(() => ({
      width: window.innerWidth,
      touch: navigator.maxTouchPoints > 0 && 'ontouchstart' in window,
      mobile: /Android/.test(navigator.userAgent),
    })),
  ).toEqual({ width: 448, touch: true, mobile: true });

  const salt = app.page.getByLabel('Sel (g)', { exact: true });
  await salt.fill('25');
  await salt.press('Enter');
  await app.page.getByRole('button', { name: 'Enregistrer v2' }).dispatchEvent('click');
  await expect(app.page.getByText('Version 2', { exact: true })).toBeVisible();
  await quit(app);

  app = await launch(userData);
  await app.page.getByText('Poolish + tangzhong').first().dispatchEvent('click');
  await expect(app.page.getByText('Version 2', { exact: true })).toBeVisible();
  await quit(app);
});
