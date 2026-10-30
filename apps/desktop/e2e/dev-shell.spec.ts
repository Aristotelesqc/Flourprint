import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { expect, test } from '@playwright/test';
import { executable, launch as launchShell, loadSample, quit, tap } from './launch.js';
import { expectRecipeRevision } from '../../mobile/e2e/ui-actions.js';

/**
 * Smoke test of the packaged dev shell (#113): it loads the dev address, here the web build
 * served locally in its place, without the SQLite bridge, and keeps its data as the browser
 * preview does, in its own folder.
 */
const web = resolve(import.meta.dirname, '..', '..', 'mobile', 'dist');
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

let server: Server;
let address: string;

test.beforeAll(async () => {
  server = createServer((request, response) => {
    const path = normalize(
      join(web, decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname)),
    );
    const inside = path.startsWith(web + sep);
    // Client-side routes fall back to the single page, as on Cloudflare Pages.
    const file =
      inside && existsSync(path) && statSync(path).isFile() ? path : join(web, 'index.html');
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(readFileSync(file));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const port = (server.address() as { port: number }).port;
  address = `http://127.0.0.1:${port}/`;
});

test.afterAll(() => new Promise<void>((done) => server.close(() => done())));

const launch = (userData: string) =>
  launchShell({
    executable: executable('dev'),
    userData,
    appUrl: address,
    env: { FLOURPRINT_DEV_URL: address },
  });

test('the dev shell loads the dev address as a phone, without the bridge, and keeps its data', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'flourprint-desktop-dev-'));
  let app = await launch(userData);
  expect(
    await app.page.evaluate(() => ({
      bridge: 'flourprintDesktop' in window,
      width: window.innerWidth,
      touch: navigator.maxTouchPoints > 0 && 'ontouchstart' in window,
      mobile: /Android/.test(navigator.userAgent),
    })),
  ).toEqual({ bridge: false, width: 448, touch: true, mobile: true });
  await loadSample(app.page);
  // Browser-preview storage, kept in this profile (ADR 0015).
  await tap(app.page, app.page.getByText('Pain simple').first());
  await expectRecipeRevision(app.page, 1);
  // The snapshot is saved every few seconds: wait for one that holds the recipe.
  await expect
    .poll(
      () =>
        app.page.evaluate(
          () =>
            new Promise<boolean>((done) => {
              const open = indexedDB.open('flourprint-preview');
              open.onsuccess = () => {
                const get = open.result
                  .transaction('snapshots')
                  .objectStore('snapshots')
                  .get('backup');
                get.onsuccess = () => {
                  open.result.close();
                  done(typeof get.result === 'string' && get.result.includes('Pain simple'));
                };
                get.onerror = () => done(false);
              };
              open.onerror = () => done(false);
            }),
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
  await quit(app);

  app = await launch(userData);
  await expect(app.page.getByRole('heading', { name: 'Recettes' })).toBeVisible();
  await expect(app.page.getByText('Pain simple').first()).toBeVisible();
  await quit(app);
});
