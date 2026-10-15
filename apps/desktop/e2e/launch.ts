import { spawn, type ChildProcess } from 'node:child_process';
import { join, resolve } from 'node:path';
import { chromium, expect, type Browser, type Locator, type Page } from '@playwright/test';

/**
 * Launches a packaged shell (ADR 0011) and drives it over the DevTools protocol rather than
 * Playwright's Electron launcher, which does not follow every Electron release.
 */
export const executable = (channel: 'release' | 'dev'): string =>
  join(
    resolve(
      import.meta.dirname,
      '..',
      'out',
      `${channel === 'dev' ? 'Flourprint-Dev' : 'Flourprint'}-${process.platform}-${process.arch}`,
    ),
    process.platform === 'win32'
      ? channel === 'dev'
        ? 'FlourprintDev.exe'
        : 'Flourprint.exe'
      : channel === 'dev'
        ? 'flourprint-dev'
        : 'flourprint',
  );

export interface Running {
  readonly process: ChildProcess;
  readonly browser: Browser;
  readonly page: Page;
}

export const launch = async (options: {
  readonly executable: string;
  readonly userData: string;
  /** The app page's address starts with it. */
  readonly appUrl: string;
  readonly env?: Readonly<Record<string, string>>;
}): Promise<Running> => {
  const child = spawn(
    options.executable,
    [
      ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
      '--lang=fr-CA',
      '--remote-debugging-port=0',
    ],
    { env: { ...process.env, ...options.env, FLOURPRINT_USER_DATA: options.userData } },
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
  const appPage = () => context.pages().find((p) => p.url().startsWith(options.appUrl));
  await expect.poll(() => appPage() !== undefined).toBe(true);
  const page = appPage() as Page;
  return { process: child, browser, page };
};

export const quit = async ({ process: child, browser }: Running) => {
  await browser.close();
  const exited = new Promise((done) => child.once('exit', done));
  child.kill();
  await exited;
};

/**
 * A real mouse press and release at the element's centre, through the DevTools input domain:
 * the shell turns it into touch, as for the owner's mouse. Playwright's own click waits for an
 * acknowledgement that touch emulation never sends, so the events are sent without waiting; the
 * element must be visible and enabled, and the test then waits for the effect.
 */
export const tap = async (page: Page, target: Locator) => {
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  // CDP mouse events bypass Playwright's click actionability checks. Wait for finite Ionic
  // overlay/page movement before taking coordinates, so a release cannot hit the backdrop.
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map((animation) => animation.finished.catch(() => undefined)),
    );
    await new Promise(requestAnimationFrame);
  });
  const box = await target.boundingBox();
  if (!box) throw new Error('no box');
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2, button: 'left' as const };
  const cdp = await page.context().newCDPSession(page);
  void cdp
    .send('Input.dispatchMouseEvent', { type: 'mousePressed', clickCount: 1, ...at })
    .catch(() => undefined);
  await new Promise((done) => setTimeout(done, 80));
  void cdp
    .send('Input.dispatchMouseEvent', { type: 'mouseReleased', clickCount: 1, ...at })
    .catch(() => undefined);
};

/**
 * The app seeds no recipe (persistence.md, Recipe trash): the test imports the reference recipe
 * through Advanced unless the database already holds it (second launch).
 */
const recipesFile = {
  kind: 'flourprint-recipes',
  schemaVersion: 1,
  exportedAt: '2026-10-01T12:00:00.000Z',
  families: [],
  recipes: [
    {
      id: 'pain-simple',
      name: 'Pain simple',
      revisions: [
        {
          recipeId: 'pain-simple',
          version: 1,
          createdAt: '2026-10-01T12:00:00.000Z',
          formula: {
            flours: [{ id: 'bread', sharePct: 100 }],
            ingredients: [
              { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
              { id: 'salt', kind: 'other', bakerPct: 2, role: 'dough' },
            ],
            components: [],
            anchor: { kind: 'flourTotal', grams: 1000 },
          },
          process: {
            steps: [
              {
                id: 'mix',
                operation: 'mix',
                dependsOn: [],
                schedule: 'asap',
                plannedDurationS: 600,
              },
            ],
          },
        },
      ],
    },
  ],
};

export const loadSample = async (page: Page): Promise<void> => {
  await expect(page.getByRole('heading', { name: 'Recettes' })).toBeVisible();
  // The list loads after the heading: wait a moment for the recipe before deciding to import it.
  const present = await page
    .getByText('Pain simple')
    .first()
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (present) return;
  await page.evaluate(() => {
    window.history.pushState({}, '', '/advanced');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.locator('input[type=file]').setInputFiles({
    name: 'recettes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(recipesFile)),
  });
  // Imported now, or already there if the list was only slow to show it.
  await expect(
    page.getByText(/^(1 recette importée|Aucune nouvelle recette, 1 déjà présente)\.$/),
  ).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/recipes');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
};
