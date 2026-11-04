import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';
import { executable } from './launch.js';

/**
 * The version bridge of the Dev shell (ADR 0023), through the real packaged shells: the Dev shell
 * answers it for the page of the version it shows; the release shell has neither the bridge nor a
 * Version menu. Only the `dev` version can be loaded here (the shell is pointed at a local server);
 * the other addresses are the allowlist unit tests' business.
 */
const web = resolve(import.meta.dirname, '..', '..', 'mobile', 'dist');
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

let server: Server;
let address: string;

test.beforeAll(async () => {
  server = createServer((request, response) => {
    const path = normalize(
      join(web, decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname)),
    );
    const file =
      path.startsWith(web + sep) && existsSync(path) && statSync(path).isFile()
        ? path
        : join(web, 'index.html');
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(readFileSync(file));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  address = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
});

test.afterAll(() => new Promise<void>((done) => server.close(() => done())));

const args = [...(process.platform === 'linux' ? ['--no-sandbox'] : []), '--lang=en-US'];

test('the Dev shell answers the version bridge for its own page only', async () => {
  const app = await electron.launch({
    executablePath: executable('dev'),
    args,
    env: {
      ...process.env,
      FLOURPRINT_USER_DATA: mkdtempSync(join(tmpdir(), 'flourprint-versions-')),
      FLOURPRINT_DEV_URL: address,
    },
  });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.url()).toContain(address);
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();

    const bridge = (script: string) =>
      page.evaluate(async (source) => {
        const shell = (window as unknown as Record<string, Record<string, Function>>)
          .flourprintDevShell as Record<string, (...a: unknown[]) => Promise<unknown>>;
        const run = new Function('shell', `return (async () => { ${source} })();`);
        try {
          return { ok: await run(shell) };
        } catch (cause) {
          return { error: String((cause as Error).message) };
        }
      }, script);

    expect(await page.evaluate(() => 'flourprintDesktop' in window)).toBe(false);
    expect(await bridge('return shell.current();')).toEqual({ ok: 'dev' });

    // A copy is kept for its target only, released once.
    expect(
      await bridge("await shell.stashTransfer('pr-5', '{\"a\":1}'); return shell.takeTransfer();"),
    ).toEqual({});
    expect(
      await bridge(
        "await shell.stashTransfer('dev', '{\"a\":1}'); return [await shell.takeTransfer(), await shell.takeTransfer() ?? null];",
      ),
    ).toEqual({ ok: ['{"a":1}', null] });

    // Anything but an allowlisted version id is refused.
    for (const bad of ['evil', 'pr-0', '../dev', 'release', '']) {
      const refused = await bridge(`return shell.select(${JSON.stringify(bad)});`);
      expect(refused, bad).toHaveProperty('error');
      expect(await bridge(`return shell.deleteData(${JSON.stringify(bad)});`), bad).toHaveProperty(
        'error',
      );
    }
    expect(await page.evaluate(() => window.location.href)).toContain(address);

    // The menu offers the named versions, with the one shown checked.
    const menu = await app.evaluate(({ Menu }) =>
      Menu.getApplicationMenu()
        ?.items.find((item) => item.label === 'Version')
        ?.submenu?.items.map((item) => [item.label, item.checked]),
    );
    expect(menu).toEqual([
      ['Dev', true],
      ['Canary', false],
      ['Release (main)', false],
    ]);

    // Deleting the shown version clears its stored data and starts the page again, empty.
    await expect
      .poll(async () => ((await bridge('return shell.listData();')) as { ok: unknown[] }).ok)
      .toEqual(expect.arrayContaining([expect.objectContaining({ version: 'dev' })]));
    expect(await bridge("return shell.deleteData('dev');")).toEqual({});
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();
    await expect
      .poll(async () => ((await bridge('return shell.listData();')) as { ok: unknown[] }).ok)
      .toEqual([]);
  } finally {
    await app.close();
  }
});

test('the release shell has no version bridge and no Version menu', async () => {
  const app = await electron.launch({
    executablePath: executable('release'),
    args,
    env: { ...process.env, FLOURPRINT_USER_DATA: mkdtempSync(join(tmpdir(), 'flourprint-rel-')) },
  });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.url()).toContain('app://flourprint/');
    expect(
      await page.evaluate(() => ({
        devShell: 'flourprintDevShell' in window,
        sql: 'flourprintDesktop' in window,
      })),
    ).toEqual({ devShell: false, sql: true });
    const labels = await app.evaluate(({ Menu }) =>
      Menu.getApplicationMenu()?.items.map((item) => item.label),
    );
    expect(labels).not.toContain('Version');
  } finally {
    await app.close();
  }
});
