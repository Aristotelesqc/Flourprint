import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = fileURLToPath(new URL('../', import.meta.url));
const mobile = path.join(repo, 'apps/mobile');
const requireMobile = createRequire(path.join(mobile, 'package.json'));
const { chromium, expect } = requireMobile('@playwright/test');
const root = path.join(repo, 'docs/mockups/0.3-ux');
const output = path.join(root, 'dist');
const build = JSON.parse(await readFile(path.join(output, 'review-build.json'), 'utf8'));
const { RECIPE_TEMPLATES } = await import(
  pathToFileURL(path.join(repo, 'packages/core/dist/application/index.js')).href
);
const port = Number(process.env.FLOURPRINT_MOCKUP_PORT ?? 4263);
const baselinePort = Number(process.env.FLOURPRINT_BASELINE_PORT ?? 4266);
const servers = [];
async function startServer(command, args, cwd, url) {
  const child = spawn(command, args, { cwd, stdio: 'ignore', windowsHide: true });
  servers.push(child);
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error('Preview server exited');
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* Wait for this owned preview to bind. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('Preview server unavailable');
}
const browser = await chromium.launch({
  headless: true,
  args: ['--no-proxy-server'],
  ...(process.env.FLOURPRINT_TEST_BROWSER
    ? { executablePath: process.env.FLOURPRINT_TEST_BROWSER }
    : {}),
});
const images = [];
async function capture(page, meta) {
  const filename = `${meta.baseline ? 'before' : 'proposal'}-${meta.screen}-${meta.state}-${meta.navigation}-${meta.theme}-${meta.locale}-${meta.width}-${meta.textScale}.png`;
  const relative = `screenshots/${filename}`;
  const dest = path.join(output, relative);
  await page.screenshot({ path: dest, animations: 'disabled' });
  const bytes = await readFile(dest);
  images.push({
    ...meta,
    path: relative,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sourceRevision: build.revision,
    prototypeHash: meta.baseline ? 'production-app-baseline' : build.sourceSha256,
    fixture: 'core template: shokupan',
    height: 852,
    ...(!meta.baseline ? { interactive: `mockup.html?${new URL(page.url()).searchParams}` } : {}),
  });
  console.log(relative);
}
async function context(locale, width = 360) {
  const c = await browser.newContext({
    viewport: { width, height: 852 },
    locale: locale === 'fr' ? 'fr-CA' : 'en-CA',
    timezoneId: 'America/Toronto',
    reducedMotion: 'reduce',
  });
  return c;
}
try {
  await mkdir(path.join(output, 'screenshots'), { recursive: true });
  await startServer(
    process.execPath,
    ['scripts/mockup-review.mjs', 'preview'],
    repo,
    `http://127.0.0.1:${port}/mockup.html`,
  );
  for (const theme of ['light', 'dark', 'amoled'])
    for (const navigation of ['A', 'B']) {
      const c = await context('fr'),
        page = await c.newPage();
      await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
      for (const screen of ['library', 'recipe', 'edit', 'preparation']) {
        const params = new URLSearchParams({
          screen: screen === 'edit' ? 'recipe' : screen,
          lang: 'fr',
          theme,
          nav: navigation,
          width: '360',
          capture: '1',
          ...(screen === 'edit' ? { mode: 'edit' } : {}),
        });
        await page.goto(`http://127.0.0.1:${port}/mockup.html?${params}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await capture(page, {
          screen: screen === 'edit' ? 'recipe' : screen,
          state:
            screen === 'edit' ? 'editing' : screen === 'preparation' ? 'fermenting' : 'reading',
          navigation,
          theme,
          locale: 'fr',
          width: 360,
          textScale: 100,
        });
      }
      if (navigation === 'B') {
        await page.goto(
          `http://127.0.0.1:${port}/mockup.html?screen=recipe&mode=edit&lang=fr&theme=${theme}&nav=B&width=360&capture=1`,
        );
        await page.getByTestId('ingredient-grams-milk').scrollIntoViewIfNeeded();
        await capture(page, {
          screen: 'recipe',
          state: 'editing-quantities',
          navigation,
          theme,
          locale: 'fr',
          width: 360,
          textScale: 100,
        });
        await page.getByTestId('component-ratio-tangzhong').scrollIntoViewIfNeeded();
        await capture(page, {
          screen: 'recipe',
          state: 'editing-ratio',
          navigation,
          theme,
          locale: 'fr',
          width: 360,
          textScale: 100,
        });

        await page.goto(
          `http://127.0.0.1:${port}/mockup.html?screen=recipe&section=steps&lang=fr&theme=${theme}&nav=B&width=360&capture=1`,
        );
        await expect(page.locator('.step-title:visible')).toHaveCount(10);
        await capture(page, {
          screen: 'steps',
          state: 'timeline',
          navigation,
          theme,
          locale: 'fr',
          width: 360,
          textScale: 100,
        });
        await page.getByRole('button', { name: 'Étapes groupées', exact: true }).click();
        await capture(page, {
          screen: 'steps',
          state: 'grouped',
          navigation,
          theme,
          locale: 'fr',
          width: 360,
          textScale: 100,
        });
        await page.getByRole('tab', { name: 'Planification', exact: true }).click();
        await capture(page, {
          screen: 'planning',
          state: 'generated',
          navigation,
          theme,
          locale: 'fr',
          width: 360,
          textScale: 100,
        });
        await page.getByRole('tab', { name: 'Ingrédients', exact: true }).click();
        await page.getByRole('button', { name: 'Détail de l’hydratation', exact: true }).click();
        await capture(page, {
          screen: 'recipe',
          state: 'hydration-sheet',
          navigation,
          theme,
          locale: 'fr',
          width: 360,
          textScale: 100,
        });
      }
      await c.close();
    }
  for (const spec of [
    {
      screen: 'recipe',
      theme: 'amoled',
      locale: 'fr',
      width: 360,
      textScale: 130,
      navigation: 'B',
    },
    { screen: 'recipe', theme: 'light', locale: 'en', width: 320, textScale: 200, navigation: 'A' },
    {
      screen: 'preparation',
      theme: 'dark',
      locale: 'en',
      width: 360,
      textScale: 130,
      navigation: 'B',
    },
    {
      screen: 'catalogue',
      theme: 'dark',
      locale: 'en',
      width: 393,
      textScale: 100,
      navigation: 'A',
    },
  ]) {
    const c = await context(spec.locale, spec.width),
      page = await c.newPage();
    await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
    await page.goto(
      `http://127.0.0.1:${port}/mockup.html?${new URLSearchParams({ screen: spec.screen, theme: spec.theme, lang: spec.locale, width: String(spec.width), scale: String(spec.textScale), nav: spec.navigation, capture: '1' })}`,
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await capture(page, { ...spec, state: 'larger-text' });
    await c.close();
  }
  // Capture a fresh preparation from the same actual user journey as the baseline.
  {
    const c = await context('fr'),
      page = await c.newPage();
    await page.goto(
      `http://127.0.0.1:${port}/mockup.html?screen=recipe&lang=fr&theme=light&nav=A&width=360&capture=1`,
    );
    await page.getByRole('button', { name: 'Lancer', exact: true }).click();
    await capture(page, {
      screen: 'preparation',
      state: 'fresh-start',
      navigation: 'A',
      theme: 'light',
      locale: 'fr',
      width: 360,
      textScale: 100,
    });
    await c.close();
  }
  await startServer(
    process.execPath,
    [
      path.join(mobile, 'node_modules/vite/bin/vite.js'),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(baselinePort),
      '--strictPort',
    ],
    mobile,
    `http://127.0.0.1:${baselinePort}/`,
  );
  for (const theme of ['light', 'dark', 'amoled']) {
    const c = await context('fr');
    await c.addInitScript((theme) => {
      localStorage.setItem('flourprint.device-preferences', JSON.stringify({ theme }));
    }, theme);
    const page = await c.newPage();
    const template = RECIPE_TEMPLATES.find((t) => t.id === 'shokupan');
    if (!template) throw Error('Missing template');
    const file = {
      kind: 'flourprint-recipes',
      schemaVersion: 1,
      exportedAt: '2026-10-16T12:00:00Z',
      families: [],
      recipes: [
        {
          id: 'review-shokupan',
          name: 'Shokupan',
          revisions: [
            {
              recipeId: 'review-shokupan',
              version: 1,
              createdAt: '2026-10-16T12:00:00Z',
              formula: template.formula,
              process: template.process,
            },
          ],
        },
      ],
    };
    await page.goto(`http://127.0.0.1:${baselinePort}/advanced`);
    await page.locator('input[type=file]').setInputFiles({
      name: 'review.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(file)),
    });
    await expect(page.getByText('1 recette importée.', { exact: true })).toBeVisible();
    await page.locator('ion-back-button:visible').click();
    await expect(page.getByText('Shokupan', { exact: true })).toBeVisible();
    const meta = {
      baseline: true,
      navigation: 'production',
      theme,
      locale: 'fr',
      width: 360,
      textScale: 100,
    };
    await capture(page, { ...meta, screen: 'library', state: 'reading' });
    await page.getByText('Shokupan', { exact: true }).click();
    const active = () => page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
    await expect(active().getByText('Version 1', { exact: true })).toBeVisible();
    await capture(page, { ...meta, screen: 'recipe', state: 'reading' });
    await active()
      .locator('ion-header')
      .getByRole('button', { name: 'Actions sur la recette', exact: true })
      .click();
    await page
      .locator('ion-action-sheet')
      .getByRole('button', { name: 'Modifier la recette', exact: true })
      .click();
    await expect(active().getByRole('button', { name: 'Composition', exact: true })).toBeVisible();
    await capture(page, { ...meta, screen: 'recipe', state: 'editing' });
    await active().getByRole('button', { name: 'Lire la recette', exact: true }).click();
    await expect(active().getByRole('button', { name: 'Recette', exact: true })).toBeVisible();
    await active()
      .locator('ion-footer,ion-header')
      .getByRole('button', { name: /Démarrer/ })
      .first()
      .click();
    await page.locator('ion-alert').getByRole('button', { name: 'Démarrer', exact: true }).click();
    await expect(page).toHaveURL(/\/bakes\//);
    await expect(active()).toHaveCount(1);
    await capture(page, { ...meta, screen: 'preparation', state: 'fresh-start' });
    await c.close();
  }
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    revision: build.revision,
    sourceSha256: build.sourceSha256,
    browser: await browser.version(),
    baselineRevision: build.revision,
    notes: [
      'Synthetic data only. Baseline is the unchanged production app at this source revision.',
      'Navigation A/B and weighing lifetime remain owner decisions. Larger-text coverage is targeted, not a full Cartesian matrix.',
      'No Android/system-back/camera/persistence acceptance is claimed.',
    ],
    images,
  };
  const json = JSON.stringify(manifest, null, 2) + '\n';
  await writeFile(path.join(output, 'manifest.json'), json);
  await writeFile(path.join(root, 'manifest.json'), json);
  console.log(`Captured ${images.length} images`);
} finally {
  await browser.close();
  for (const child of servers) child.kill();
}
