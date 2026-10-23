/* global document, requestAnimationFrame, getComputedStyle */
// Current-only evidence: never compose historical screenshots with different fixtures/stages.
import { captureMotion } from '../../../../scripts/capture-mockup-motion.mjs';
import { captureComponentCatalogue } from '../../../../scripts/capture-component-catalogue.mjs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const require = createRequire(path.join(repo, 'apps/mobile/package.json'));
const { chromium, expect } = require('@playwright/test');
const origin = process.env.FLOURPRINT_REVIEW_ORIGIN;
if (!origin) throw Error('Set FLOURPRINT_REVIEW_ORIGIN to the built prototype');
const compiled = path.join(repo, 'docs/mockups/0.3-ux/dist');
const output = path.join(repo, 'docs/mockups/0.3-ux/review/dist');
const pages = path.resolve(
  process.env.FLOURPRINT_COMPARISON_PAGES ?? path.join(repo, '../flourprint-pr-133-pages'),
);
const before = JSON.parse(
  await readFile(path.join(pages, 'review-2026-10-16-0.3-comparison/manifest.json'), 'utf8'),
);
if (before.comparisons.length !== 26) throw Error('Expected the 26 established review states');
const build = JSON.parse(await readFile(path.join(compiled, 'review-build.json'), 'utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
await mkdir(path.join(output, 'screenshots'), { recursive: true });
await mkdir(path.join(output, 'assets'), { recursive: true });
for (const file of ['mockup.html', 'mark.svg', 'review-build.json'])
  await copyFile(path.join(compiled, file), path.join(output, file));
for (const file of await readdir(path.join(compiled, 'assets'))) {
  if (!/^[A-Za-z0-9_.-]+\.(js|css)$/.test(file)) throw Error('Unexpected compiled asset');
  await copyFile(path.join(compiled, 'assets', file), path.join(output, 'assets', file));
}
const browser = await chromium.launch({
  headless: true,
  args: ['--no-proxy-server'],
  ...(process.env.FLOURPRINT_TEST_BROWSER
    ? { executablePath: process.env.FLOURPRINT_TEST_BROWSER }
    : {}),
});
const images = [];
async function capture(spec) {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: 852 },
    locale: 'fr-CA',
    timezoneId: 'America/Toronto',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
  const completionStates = ['completion-ready', 'outcome', 'completed', 'completion-history'];
  const screen = [
    'edit',
    'menu',
    'hydration',
    'steps',
    'timeline',
    'planning',
    'diagnostics',
    'history',
    'component-edit',
    'diagnostics-closed',
  ].includes(spec.state)
    ? 'recipe'
    : completionStates.includes(spec.state)
      ? 'preparation'
      : spec.state === 'creation'
        ? 'library'
        : spec.state;
  const query = new URLSearchParams({
    screen,
    nav: spec.navigation,
    lang: 'fr',
    theme: spec.theme,
    width: String(spec.width),
    scale: String(spec.textScale),
    capture: '1',
  });
  if (spec.state === 'edit' || spec.state === 'component-edit') query.set('mode', 'edit');
  if (['steps', 'timeline', 'planning', 'diagnostics', 'diagnostics-closed'].includes(spec.state))
    query.set('section', spec.state === 'planning' ? 'planning' : 'steps');
  if (spec.state === 'steps' || spec.state === 'timeline')
    query.set('view', spec.state === 'steps' ? 'grouped' : 'timeline');
  if (spec.cooking) query.set('prep', 'cooking');
  if (spec.scenario) {
    query.set('scenario', spec.scenario);
    query.set('diagnostics', spec.state === 'diagnostics-closed' ? '0' : '1');
  }
  const replay = [];
  try {
    await page.goto(new URL(`mockup.html?${query}`, origin).href);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (spec.state === 'history') {
      await page.getByRole('button', { name: 'Modifier', exact: true }).click();
      await page.getByTestId('recipe-name').fill('Shokupan · Révision');
      await page.getByTestId('save-recipe').click();
      await page.getByRole('tab', { name: 'Historique', exact: true }).click();
      replay.push('Edit the recipe name to Shokupan · Révision, Save, then open History.');
    }
    if (spec.state === 'menu')
      await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
    if (spec.state === 'hydration')
      await page.getByRole('button', { name: 'Détail de l’hydratation', exact: true }).click();
    if (spec.state === 'creation')
      await page.getByRole('button', { name: 'Nouvelle recette', exact: true }).click();
    if (spec.state === 'diagnostics')
      await page
        .locator('.status-panel:visible')
        .evaluate((node) => node.scrollIntoView({ block: 'start' }));
    if (spec.state === 'diagnostics-closed') {
      // The stable group-card title is a user-facing disclosure button; no state injection.
      const trigger = page.getByRole('button', { name: /^Fermentation/ });
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.scrollIntoViewIfNeeded();
      replay.push('The Fermentation disclosure is closed; its state summary remains visible.');
    }
    if (spec.state === 'component-edit') {
      await page.getByTestId('component-share-tangzhong').scrollIntoViewIfNeeded();
      replay.push(
        'Open Recipe editing, then scroll to the inline tangzhong flour-share and ratio controls.',
      );
    }
    if (completionStates.includes(spec.state)) {
      let completions = 0;
      while (await page.getByTestId('prep-complete-btn').isVisible()) {
        if (++completions > 30) throw Error('Preparation did not reach explicit completion');
        const active = await page.locator('.current-step-hero').getAttribute('data-step');
        await page.getByTestId('prep-complete-btn').click();
        await page.waitForFunction(
          (previous) =>
            document.querySelector('.current-step-hero')?.getAttribute('data-step') !== previous,
          active,
        );
      }
      await expect(page.getByTestId('finish-preparation')).toBeVisible();
      replay.push(
        `Complete ${completions} remaining stages through the visible Step complete action; the separate Finish preparation action appears.`,
      );
      if (spec.state !== 'completion-ready') {
        await page.getByRole('button', { name: /Choisir le résultat/ }).click();
        const outcomeDialog = page.getByRole('dialog');
        await expect(outcomeDialog).toBeVisible();
        await outcomeDialog
          .getByRole('combobox', { name: 'Résultat', exact: true })
          .selectOption('dough');
        await outcomeDialog
          .getByRole('combobox', { name: 'Destination de la pâte', exact: true })
          .selectOption('frozen');
        replay.push('Open Choose outcome; select Prepared dough and Frozen without finishing.');
        if (spec.state !== 'outcome') {
          await outcomeDialog.getByRole('button', { name: 'Appliquer', exact: true }).click();
          await page.getByTestId('finish-preparation').click();
          await expect(page.getByTestId('recorded-outcome')).toContainText('Pâte préparée');
          await expect(page.getByTestId('recorded-outcome')).toContainText('Congelée');
          replay.push(
            'Apply the outcome, then explicitly Finish preparation; Prepared dough · Frozen is recorded.',
          );
          if (spec.state === 'completion-history') {
            await page.getByRole('button', { name: 'Navigation', exact: true }).click();
            await page
              .getByRole('dialog')
              .getByRole('button', { name: 'Recettes', exact: true })
              .click();
            await page
              .getByRole('button', { name: /Shokupan/ })
              .first()
              .click();
            await page.getByRole('tab', { name: 'Historique', exact: true }).click();
            await expect(page.locator('.phone-content')).toContainText('Pâte préparée');
            await expect(page.locator('.phone-content')).toContainText('Congelée');
            replay.push(
              'Use Navigation → Recipes → Shokupan → History; inspect the explicit preparation outcome, separate from recipe versions.',
            );
          }
        }
      }
    }
    if (['menu', 'hydration', 'creation'].includes(spec.state))
      await expect(page.getByRole('dialog')).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
    );
    const rootFontPx = await page.evaluate(
      () => getComputedStyle(document.documentElement).fontSize,
    );
    if (parseFloat(rootFontPx) !== (16 * spec.textScale) / 100) throw Error('Incorrect text scale');
    const name = `restored-${spec.state}-${spec.navigation}-${spec.theme}-${spec.width}-${spec.textScale}${spec.cooking ? '-cooking' : ''}${spec.scenario ? `-${spec.scenario}` : ''}.png`;
    const relative = `screenshots/${name}`;
    await page.screenshot({ path: path.join(output, relative), animations: 'disabled' });
    const entry = {
      ...spec,
      version: 'restored',
      title: 'Corrected proposal — visual acceptance pending',
      sourceRevision: build.revision,
      sourceSha256: build.sourceSha256,
      locale: 'fr-CA',
      height: 852,
      fixture: completionStates.includes(spec.state)
        ? `core Shokupan; remaining stages completed through UI; ${spec.state === 'completion-ready' ? 'preparation not finished' : spec.state === 'outcome' ? 'prepared-dough/frozen selection not yet applied' : 'explicit prepared-dough/frozen outcome recorded in memory'}`
        : spec.cooking
          ? 'core Shokupan, frozen seeded cooking'
          : spec.state === 'preparation'
            ? 'core Shokupan, frozen seeded fermentation'
            : spec.scenario
              ? `core diagnostic reference ${spec.scenario}`
              : 'core Shokupan / real core catalogue',
      path: relative,
      sha256: sha(await readFile(path.join(output, relative))),
      rootFontPx,
      errors,
      interactive: `mockup.html?${query}`,
      ...(replay.length ? { replay } : {}),
    };
    if (errors.length) throw Error(errors.join('\n'));
    images.push(entry);
    console.log(name);
    return entry;
  } finally {
    await context.close();
  }
}
try {
  for (const spec of before.comparisons) await capture({ ...spec, theme: 'dark' });
  for (const theme of ['light', 'amoled'])
    for (const navigation of ['A', 'B'])
      for (const state of ['library', 'recipe', 'edit', 'preparation'])
        for (const [width, textScale] of [
          [393, 100],
          [360, 130],
        ])
          await capture({ state, navigation, theme, width, textScale });
  for (const navigation of ['A', 'B'])
    for (const textScale of [100, 130])
      await capture({ state: 'component-edit', navigation, theme: 'dark', width: 360, textScale });
  for (const theme of ['light', 'dark', 'amoled'])
    for (const navigation of ['A', 'B'])
      await capture({
        state: 'preparation',
        navigation,
        theme,
        width: 360,
        textScale: 100,
        cooking: true,
      });
  for (const scenario of ['valid', 'out', 'noResult'])
    for (const state of ['diagnostics', 'diagnostics-closed'])
      await capture({
        state,
        scenario,
        navigation: 'B',
        theme: 'dark',
        width: 360,
        textScale: 100,
      });
  for (const state of ['completion-ready', 'outcome', 'completed', 'completion-history'])
    for (const navigation of ['A', 'B'])
      await capture({ state, navigation, theme: 'dark', width: 360, textScale: 100 });
  for (const state of ['history', 'registry', 'settings'])
    for (const navigation of ['A', 'B'])
      await capture({ state, navigation, theme: 'dark', width: 360, textScale: 100 });
  const motion = await captureMotion({ browser, origin, output, build });
  const catalogue = await captureComponentCatalogue({ browser, origin, output, build });
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    build,
    images,
    motion,
    catalogue,
    comparisonPolicy:
      'Current screenshots only. No historical pair with different fixture data or preparation stage is presented as a design-only comparison.',
  };
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(
    path.join(output, 'index.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Flourprint · interactive component review</title><style>body{margin:auto;padding:16px;max-width:960px;background:#211d19;color:#eee7de;font:16px/1.5 system-ui}a{color:#f2b085}h1{font-size:24px}.links{display:flex;flex-wrap:wrap;gap:12px}.links a{padding:12px;border:1px solid #a77452;border-radius:16px}summary{cursor:pointer;padding:12px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px}figure{margin:0;min-width:0}img{display:block;width:100%;max-width:393px;height:auto}code{overflow-wrap:anywhere}figcaption{font-size:14px}p{max-width:75ch}</style><h1>Try the interactive prototype</h1><div class="links"><a href="mockup.html?screen=library&nav=A&lang=fr&theme=dark">Open A</a><a href="mockup.html?screen=library&nav=B&lang=fr&theme=dark">Open B</a><a href="mockup.html?screen=catalogue">Component and motion catalogue</a></div><p>Unapproved review prototype. A/B remain owner choices. Warm light, dark and AMOLED are available in the review controls. Recipe values are calculated by core; preparation state is a frozen synthetic demonstration.</p><p>Build <code>${esc(build.revision)}</code> · source digest <code>${esc(build.sourceSha256)}</code>. <a href="manifest.json">Evidence manifest</a> · <a href="motion/index.html">Motion frames</a> · <a href="components.html">Component captures</a>.</p><p>These are current-build screenshots. The <a href="../review-2026-10-15-0.3-ux/mockup.html">historical round 2</a> uses different fixture data and is not paired here as if only the design differed.</p><h2>Screenshot evidence</h2>${[
      'dark',
      'light',
      'amoled',
    ]
      .map(
        (theme) =>
          `<details ${theme === 'dark' ? 'open' : ''}><summary>${esc(theme)} · current phone states</summary><div class="grid">${images
            .filter((i) => i.theme === theme)
            .map(
              (i) =>
                `<figure><a href="${esc(i.path)}"><img src="${esc(i.path)}" loading="lazy" alt="${esc(i.state)} ${esc(i.navigation)} ${i.width}px ${i.textScale}%"></a><figcaption>${esc(i.state)} · ${esc(i.navigation)} · FR · ${i.width}px / ${i.textScale}%<br><a href="${esc(i.interactive)}">Interact</a> · <a href="${esc(i.path)}">Full image</a></figcaption></figure>`,
            )
            .join('')}</div></details>`,
      )
      .join('')}</html>`,
  );
  console.log(`Published evidence ready: ${images.length} phone screenshots, motion and catalogue`);
} finally {
  await browser.close();
}
