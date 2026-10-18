import { captureComponentCatalogue } from './capture-component-catalogue.mjs';
import { captureMotion } from './capture-mockup-motion.mjs';
/* global document, requestAnimationFrame, getComputedStyle */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readFile, copyFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(repo, 'apps/mobile/package.json'));
const { chromium, expect } = require('@playwright/test');
const compiled = path.join(repo, 'docs/mockups/0.3-ux/dist');
const output = path.join(repo, 'docs/mockups/0.3-ux/restoration/dist');
const pages = path.resolve(process.env.FLOURPRINT_COMPARISON_PAGES ?? '../flourprint-pr-133-pages');
const historical = path.join(pages, 'review-2026-10-16-0.3-comparison');
const build = JSON.parse(await readFile(path.join(compiled, 'review-build.json'), 'utf8'));
const before = JSON.parse(await readFile(path.join(historical, 'manifest.json'), 'utf8'));
const frozenAppRevision = '7dd74bf435047f0982f2fe2ab10765600b3eb4bf';
if (before.comparisons.length !== 26) throw Error('Expected the 26 frozen comparison states');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const esc = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const browser = await chromium.launch({
  headless: true,
  args: ['--no-proxy-server'],
  ...(process.env.FLOURPRINT_TEST_BROWSER
    ? { executablePath: process.env.FLOURPRINT_TEST_BROWSER }
    : {}),
});
if (
  path.resolve(output) !== path.resolve(repo, 'docs/mockups/0.3-ux/restoration/dist') ||
  !path.resolve(output).startsWith(path.resolve(repo) + path.sep)
)
  throw Error('Unsafe evidence output');
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'screenshots'), { recursive: true });
for (const file of ['mockup.html', 'mark.svg', 'review-build.json'])
  await copyFile(path.join(compiled, file), path.join(output, file));
await mkdir(path.join(output, 'assets'), { recursive: true });
for (const file of await readdir(path.join(compiled, 'assets'))) {
  if (!/^[A-Za-z0-9_.-]+\.(js|css)$/.test(file)) throw Error('Unexpected compiled asset');
  await copyFile(path.join(compiled, 'assets', file), path.join(output, 'assets', file));
}
await writeFile(
  path.join(output, 'index.html'),
  '<title>Preparing restored mockup evidence</title>',
);
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(output, `.${pathname}`);
    if (pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!file.startsWith(output + path.sep)) throw Error('Invalid path');
    const bytes = await readFile(file);
    res.writeHead(200, {
      'content-type':
        {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
        }[path.extname(file)] ?? 'application/octet-stream',
    });
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(4282, '127.0.0.1', resolve);
});
const origin = 'http://127.0.0.1:4282/';
const images = [],
  comparisons = [];
const comparisonNote = (entry) =>
  entry.version === 'restored'
    ? 'Round 2 baseline with mandatory corrections; current core-backed state and explicit preparation outcomes. Visual acceptance pending.'
    : `${entry.availability && entry.availability !== 'available' ? `${entry.availability}: ` : ''}${entry.note ?? ''}${entry.version === 'app' ? ' Frozen actual-app reference at 7dd74bf; not the current dev channel.' : ''}`;
const proposalOf = (comparison) => {
  const proposal = images.find(
    (image) => image.version === 'restored' && comparison.images.includes(image.path),
  );
  if (!proposal) throw Error('Missing interactive proposal for ' + comparison.id);
  return proposal;
};
async function copyFrozen(spec, version) {
  const entry = before.images.find(
    (image) =>
      image.version === version &&
      image.state === spec.state &&
      image.navigation === spec.navigation &&
      image.width === spec.width &&
      image.textScale === spec.textScale,
  );
  if (!entry) throw Error('Missing frozen comparison: ' + version);
  if (version === 'app' && entry.sourceRevision !== frozenAppRevision)
    throw Error('Unexpected frozen actual-app revision');
  const bytes = await readFile(path.join(historical, entry.path));
  if (sha(bytes) !== entry.sha256) throw Error('Frozen comparison hash mismatch');
  await copyFile(path.join(historical, entry.path), path.join(output, entry.path));
  const copied =
    version === 'app'
      ? { ...entry, historicalTitle: entry.title, title: 'Actual app — frozen 7dd74bf' }
      : entry;
  images.push(copied);
  return copied;
}
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
  const composition = await browser.newContext(),
    page = await composition.newPage();
  for (const spec of before.comparisons) {
    const entries = [];
    for (const version of ['round2', 'round3']) entries.push(await copyFrozen(spec, version));
    entries.push(await capture({ ...spec, theme: 'dark' }));
    entries.push(await copyFrozen(spec, 'app'));
    const id = `${spec.state}-${spec.navigation}-${spec.width}-${spec.textScale}`;
    await page.setViewportSize({ width: spec.width * 4 + 88, height: 1100 });
    await page.goto(origin);
    await page.setContent(
      `<!doctype html><html lang="en"><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#eee9e1;color:#211b16;font:14px/1.4 system-ui}h1{font-size:20px;margin:0 0 12px}.row{display:flex;gap:16px}.column{width:${spec.width}px}h2{font-size:18px;margin:0}p{min-height:100px;margin:4px 0 12px}img{display:block;width:${spec.width}px;height:852px;object-fit:contain;object-position:top}</style><h1>Round 2 baseline and tuned proposal · ${esc(spec.state)} · ${spec.navigation} · FR / Dark / ${spec.width}px / ${spec.textScale}%</h1><div class="row">${entries.map((e) => `<div class="column"><h2>${esc(e.title)}</h2><p>${esc(e.sourceRevision.slice(0, 7))}<br>${esc(comparisonNote(e))}</p><img src="/${e.path}"></div>`).join('')}</div></html>`,
    );
    await page.locator('.column p').evaluateAll((ps) => {
      const h = Math.max(...ps.map((p) => p.getBoundingClientRect().height));
      for (const p of ps) p.style.height = `${h}px`;
    });
    await page.locator('img').evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
    const relative = `comparison-${id}.png`;
    await page.screenshot({ path: path.join(output, relative), fullPage: true });
    comparisons.push({
      ...spec,
      id,
      path: relative,
      sha256: sha(await readFile(path.join(output, relative))),
      images: entries.map((e) => e.path),
    });
  }
  for (const theme of ['light', 'amoled'])
    for (const navigation of ['A', 'B'])
      for (const state of ['library', 'recipe', 'edit', 'preparation'])
        for (const textScale of [100, 130])
          await capture({ state, navigation, theme, width: 360, textScale });
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
    for (const theme of ['light', 'dark', 'amoled'])
      for (const navigation of ['A', 'B'])
        await capture({ state, theme, navigation, width: 393, textScale: 100 });
  const components = await captureComponentCatalogue({ browser, origin, output, build });
  const motion = await captureMotion({ browser, origin, output, build });
  const manifest = {
    motionCases: motion.records.length,
    components,
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    revision: build.revision,
    sourceSha256: build.sourceSha256,
    build: build.build,
    label: build.label,
    browser: await browser.version(),
    images,
    comparisons,
    frozenAppRevision,
    comparisonOrder: ['round2', 'round3', 'restored', 'app'],
    notes: [
      'Owner visual acceptance pending; no merge or production adoption.',
      'Round 2 is the visual baseline; round 3 is the numerical/behavior foundation. Argon is supplemental only.',
      'Historical files/data/failures remain unchanged. Each comparison includes the frozen actual app at 7dd74bf, not the current dev channel; unavailable/nearest-view notes are retained.',
      'Terminal preparation and history captures use ordinary UI actions; their replay steps are recorded because in-memory state is not encoded by the starting URL.',
      'No native, persistence or predictive-model validation is claimed.',
    ],
  };
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(
    path.join(output, 'index.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Flourprint — round 2 baseline and tuned proposal</title><style>body{margin:auto;max-width:1400px;padding:16px;background:#faf7f1;color:#2c231c;font:16px/1.5 system-ui}a{color:#8c3a10}nav{display:flex;gap:12px;flex-wrap:wrap}.columns{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x proximity}.column{flex:0 0 auto;scroll-snap-align:start;width:min(393px,calc(100vw - 32px))}.column img{width:100%;display:block}article{margin:32px 0;border-top:1px solid #ccc;padding-top:12px}h1,h2{line-height:1.25}.extras{display:flex;flex-wrap:wrap;gap:16px}.extras figure{margin:0;width:min(360px,100%)}img{max-width:100%;height:auto}code{overflow-wrap:anywhere}</style><h1>Round 2 baseline and tuned proposal</h1><p>Owner review proposal. No merge or production adoption. Swipe the columns sideways on a phone; tap a screen for the original PNG. The same 26 comparisons show round 2, round 3, the tuned proposal and the frozen actual app at 7dd74bf, at matching viewport and text size. The app column is not the current dev channel.</p><nav><a href="mockup.html?screen=library&nav=A&lang=fr&capture=1">Interactive A</a><a href="mockup.html?screen=library&nav=B&lang=fr&capture=1">Interactive B</a><a href="mockup.html?screen=catalogue&lang=en">Interactive shared components</a><a href="components.html">Every component: companion screenshots</a><a href="motion/index.html">Motion: before / during / after, normal and reduced</a><a href="mockup.html?screen=library&lang=fr">Studio and component inspector</a><a href="manifest.json">Capture manifest</a><a href="../review-2026-10-17-four-way/">Earlier four-way reference</a><a href="../review-2026-10-17-0.3-restored/">First restoration (owner rejected)</a></nav><p>Source <code>${esc(build.revision)}</code> · <code>${esc(build.sourceSha256)}</code>. Historical availability and fixture differences are retained in every comparison caption and the manifest; numerical differences are never a visual success criterion. Round 2 remains a starting point with mandatory corrections, not a pixel-perfect acceptance claim.</p><nav>${comparisons.map((c) => `<a href="#${c.id}">${c.state} ${c.navigation} ${c.width}/${c.textScale}%</a>`).join('')}</nav>${comparisons
      .map(
        (c) =>
          `<article id="${c.id}"><h2>${c.state} · ${c.navigation} · ${c.width}px / ${c.textScale}%</h2><div class="columns">${c.images
            .map((file) => {
              const s = images.find((i) => i.path === file);
              return `<div class="column" style="width:min(${c.width}px,calc(100vw - 32px))"><h3>${esc(s.title)}</h3><p><code>${esc(s.sourceRevision.slice(0, 7))}</code> · ${esc(comparisonNote(s))}</p><a href="${file}"><img loading="lazy" src="${file}" alt="${esc(s.title)} ${c.state} ${c.navigation}"></a></div>`;
            })
            .join(
              '',
            )}</div><p><a href="${c.path}">Full-resolution four-column comparison PNG</a> · <a href="${proposalOf(c).interactive}">Open this proposal state</a></p></article>`,
      )
      .join(
        '',
      )}<article><h2>Theme and larger-text stress, inline editing, diagnostics and explicit preparation outcomes</h2><p>Captures reached through actions include replay instructions. Their links open the starting state; in-memory completion/history is not encoded in a URL.</p><div class="extras">${images
      .filter(
        (i) => i.version === 'restored' && !comparisons.some((c) => c.images.includes(i.path)),
      )
      .map(
        (s) =>
          `<figure><a href="${s.path}"><img loading="lazy" src="${s.path}" alt="${s.state} ${s.theme} ${s.navigation} ${s.width}px ${s.textScale}%"></a><figcaption>${s.state} · ${s.theme} · ${s.navigation} · ${s.width}px / ${s.textScale}%${s.cooking ? ' · cooking' : ''}${s.scenario ? ` · ${s.scenario}` : ''} · <a href="${s.interactive}">${s.replay?.length ? 'Open starting state' : 'Interactive'}</a>${s.replay?.length ? `<ol>${s.replay.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>` : ''}</figcaption></figure>`,
      )
      .join('')}</div></article></html>`,
  );
  console.log(
    `Restoration: ${comparisons.length} comparisons, ${images.filter((i) => i.version === 'restored').length} new captures`,
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
