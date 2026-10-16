import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';
import { executable } from './launch.js';

/**
 * The dev shell's Debug menu (#113), driven through its real menu items in the main process:
 * the screenshot must save a PNG of the page and leave the shell running (it crashed on Windows,
 * owner reports of 2026-10-16). Playwright's Electron launcher is used here only because the menu
 * lives in the main process.
 */
const web = resolve(import.meta.dirname, '..', '..', 'mobile', 'dist');
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
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

test('the Debug menu draws the grid and saves a screenshot without stopping the shell', async () => {
  const app = await electron.launch({
    executablePath: executable('dev'),
    args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), '--lang=fr-CA'],
    env: {
      ...process.env,
      FLOURPRINT_USER_DATA: mkdtempSync(join(tmpdir(), 'flourprint-debug-')),
      FLOURPRINT_DEV_URL: address,
    },
  });
  const page = await app.firstWindow();
  await expect.poll(() => page.url()).toContain(address);
  await expect(page.getByRole('heading', { name: 'Recettes' })).toBeVisible();

  const click = (label: string) =>
    app.evaluate(({ BrowserWindow, Menu }, label) => {
      const window = BrowserWindow.getAllWindows()[0];
      const debug = Menu.getApplicationMenu()?.items.find((item) => item.label === 'Débogage');
      const item = debug?.submenu?.items.find((entry) => entry.label === label);
      if (!window || !item) throw new Error(`no menu item ${label}`);
      item.click(undefined, window, window.webContents);
    }, label);
  const title = () =>
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getTitle());

  await click('Grille d’alignement (4 et 8 px)');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement, '::after').position))
    .toBe('fixed');

  const folder = join(await app.evaluate(({ app }) => app.getPath('pictures')), 'Flourprint');
  const before = existsSync(folder) ? readdirSync(folder) : [];
  await click('Capture d’écran de l’app');
  await expect.poll(title).toBe('Flourprint Dev — Dev — Capture enregistrée');
  const added = readdirSync(folder).filter((name) => !before.includes(name));
  expect(added).toHaveLength(1);
  const png = readFileSync(join(folder, added[0] as string));
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  // Still running: the main process answers and the page is alive.
  await expect(page.getByRole('heading', { name: 'Recettes' })).toBeVisible();
  await app.close();
});
