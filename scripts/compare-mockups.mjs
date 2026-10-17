import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Evidence tooling only. Never modifies either historical prototype or app source.
const repo = fileURLToPath(new URL('../', import.meta.url));
const pages = path.resolve(process.env.FLOURPRINT_COMPARISON_PAGES ?? '../flourprint-pr-133-pages');
const output = path.resolve(
  process.env.FLOURPRINT_COMPARISON_OUTPUT ?? 'docs/mockups/0.3-ux/comparison/dist',
);
const mobile = path.join(repo, 'apps/mobile');
const requireMobile = createRequire(path.join(mobile, 'package.json'));
const { chromium, expect } = requireMobile('@playwright/test');
const { RECIPE_TEMPLATES } = await import(
  pathToFileURL(path.join(repo, 'packages/core/dist/application/index.js')).href
);
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const baselineRevision = '7dd74bf435047f0982f2fe2ab10765600b3eb4bf';
if (git('diff', '--name-only', baselineRevision, 'HEAD', '--', 'apps/mobile', 'packages/core')) {
  throw Error(
    'App/core sources differ from the pinned current-app reference; build that reference separately.',
  );
}
const versions = [
  {
    id: 'round2',
    title: 'Round 2',
    directory: 'review-2026-10-15-0.3-ux',
    sourceRevision: '22db38688059337402dbbb5e1bd42213bfac6c0f',
    publishedRevision: 'a7ea5e60901efcf692542d2d473a5e0d1a98cea7',
  },
  {
    id: 'round3',
    title: 'Round 3',
    directory: 'review-2026-10-16-0.3-ux',
    sourceRevision: '419c70b0e1a89842d21d72254636127cb8b4a48d',
    prRevision: '7c7c2e782aa4a01bc8c49a6bcfaade83cdf0ed3c',
    publishedRevision: '233c1cebde32ac45be3e01a63c584e0fb5ab982f',
  },
  {
    id: 'app',
    title: 'Current app',
    sourceRevision: baselineRevision,
    navigation: 'production; no A/B variants',
  },
];
const round3Build = JSON.parse(
  await readFile(path.join(pages, versions[1].directory, 'review-build.json'), 'utf8'),
);
if (round3Build.revision !== versions[1].sourceRevision) throw Error('Unexpected round 3 build');
versions[1].sourceSha256 = round3Build.sourceSha256;
for (const version of versions.slice(0, 2)) {
  version.entrySha256 = createHash('sha256')
    .update(await readFile(path.join(pages, version.directory, 'mockup.html')))
    .digest('hex');
}
versions[2].build = JSON.parse(await readFile(path.join(mobile, 'dist/build.json'), 'utf8'));
versions[2].appTree = git('rev-parse', `${baselineRevision}:apps/mobile`);
versions[2].coreTree = git('rev-parse', `${baselineRevision}:packages/core`);

const servers = [];
async function serve(root, port) {
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
  };
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let file = path.resolve(root, `.${pathname}`);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      if (pathname.endsWith('/')) file = path.join(file, 'index.html');
      else if (!path.extname(file)) file = path.join(root, 'index.html');
      const bytes = await readFile(file);
      res.writeHead(200, {
        'content-type': types[path.extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  servers.push(server);
  return `http://127.0.0.1:${port}`;
}
const browser = await chromium.launch({
  headless: true,
  args: ['--no-proxy-server'],
  ...(process.env.FLOURPRINT_TEST_BROWSER
    ? { executablePath: process.env.FLOURPRINT_TEST_BROWSER }
    : {}),
});
const shots = [],
  comparisons = [],
  checks = [],
  supplements = [];
const height = 852;
async function settle(page, app = false) {
  if (app)
    await expect(page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)')).toHaveCount(
      1,
    );
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.effect?.getTiming().iterations === Infinity || a.playState !== 'running'),
  );
}
const active = (page) => page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
async function importRecipe(page, origin) {
  const template = RECIPE_TEMPLATES.find((t) => t.id === 'shokupan');
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
  await page.goto(`${origin}/advanced`);
  await page.locator('input[type=file]').setInputFiles({
    name: 'review.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByText('1 recette importée.', { exact: true })).toBeVisible();
  await page.locator('ion-back-button:visible').click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(active(page).getByRole('heading', { name: 'Recettes', exact: true })).toBeVisible();
  await expect(active(page).getByText('Shokupan', { exact: true })).toBeVisible();
  await settle(page, true);
}
async function round2(page, origin, spec) {
  const screen =
    { library: 's3', steps: 's2', timeline: 's2', preparation: 's4', creation: 's3' }[spec.state] ??
    's1';
  const params = new URLSearchParams({
    screen,
    nav: spec.navigation,
    lang: 'fr',
    theme: 'dark',
    w: String(spec.width),
    capture: '1',
    rem: '16',
  });
  await page.goto(`${origin}/${versions[0].directory}/mockup.html?${params}`);
  // The archived parser supports 125%, not 130%. Apply the exact requested root text size
  // in this disposable test context, never rewrite the archived HTML/CSS.
  if (spec.textScale !== 100)
    await page.evaluate(
      (scale) => (document.documentElement.style.fontSize = `${(16 * scale) / 100}px`),
      spec.textScale,
    );
  const frame = page.locator(`#phone-${screen}`);
  let availability = 'available',
    note = 'Historical static Shokupan fixture; quantities differ from the current core template.';
  if (spec.state === 'edit') {
    if (spec.navigation === 'A')
      await frame.getByRole('button', { name: 'Modifier', exact: true }).click();
    else {
      await frame.getByRole('button', { name: 'Menu', exact: true }).click();
      await frame.getByRole('button', { name: 'Modifier sur place', exact: true }).click();
    }
  }
  if (spec.state === 'menu')
    await frame
      .getByRole('button', { name: spec.navigation === 'A' ? 'More options' : 'Menu', exact: true })
      .click();
  if (spec.state === 'hydration')
    await frame.getByRole('button', { name: /Détail de l.hydratation/ }).click();
  if (spec.state === 'timeline')
    await frame.getByRole('button', { name: /Ligne de temps/ }).click();
  if (spec.state === 'creation') await frame.getByRole('button', { name: /Nouvelle/ }).click();
  if (spec.state === 'planning') {
    await frame.getByRole('button', { name: 'Planification', exact: true }).click();
    availability = 'unreachable';
    note =
      'Clicked Planning. The archived tab does not switch; this is the actual unchanged Recipe view, not a Planning mockup.';
  }
  if (spec.state === 'preparation')
    note =
      'Historical static cooking stage, 28 min remaining. Different phase from round 3 and the fresh current-app session; compare hierarchy, not timings.';
  if (spec.state === 'timeline')
    note =
      'Historical illustrative lane bars with hardcoded positions; not a validated schedule or implementation of #106.';
  return {
    frame,
    availability,
    note,
    fixture:
      spec.state === 'library' || spec.state === 'creation'
        ? 'historical mixed synthetic library'
        : 'historical Shokupan, static and numerically inconsistent',
  };
}
async function round3(page, origin, spec) {
  const screen = ['steps', 'timeline', 'planning', 'edit', 'menu', 'hydration'].includes(spec.state)
    ? 'recipe'
    : spec.state === 'creation'
      ? 'library'
      : spec.state;
  const params = new URLSearchParams({
    screen,
    nav: spec.navigation,
    lang: 'fr',
    theme: 'dark',
    width: String(spec.width),
    scale: String(spec.textScale),
    capture: '1',
  });
  await page.goto(`${origin}/${versions[1].directory}/mockup.html?${params}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  if (spec.state === 'edit') {
    await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
    await page.getByRole('button', { name: 'Modifier', exact: true }).click();
  }
  if (spec.state === 'menu')
    await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
  if (spec.state === 'hydration')
    await page.getByRole('button', { name: 'Détail de l’hydratation', exact: true }).click();
  if (spec.state === 'steps' || spec.state === 'timeline') {
    await page.getByRole('tab', { name: 'Étapes', exact: true }).click();
    if (spec.state === 'steps')
      await page.getByRole('button', { name: 'Étapes groupées', exact: true }).click();
  }
  if (spec.state === 'planning')
    await page.getByRole('tab', { name: 'Planification', exact: true }).click();
  if (spec.state === 'creation')
    await page.getByRole('button', { name: 'Nouvelle recette', exact: true }).click();
  let availability = 'available',
    note = 'Live core Shokupan template and in-memory prototype state.';
  if (spec.state === 'timeline') {
    availability = 'nearest-view';
    note =
      'The control opens a flat list of relative starts. It has no lanes or visible overlaps; not the requested timeline.';
  }
  if (spec.state === 'library')
    note =
      '15 real core templates; all lack cooking history. Different inventory and states from round 2; no fictional history injected.';
  if (spec.state === 'preparation')
    note =
      'Seeded illustrative fermentation stage. Different phase from historical cooking and the fresh current-app session; no numerical/timer equivalence claimed.';
  return {
    availability,
    note,
    fixture:
      spec.state === 'preparation'
        ? 'illustrative frozen fermentation session'
        : 'current core Shokupan template / full core template catalogue',
  };
}
async function app(page, origin, spec) {
  await importRecipe(page, origin);
  let availability = 'available',
    note =
      'Production navigation, repeated unchanged in the A/B comparisons. Actual app sources match dev 7dd74bf; locally rebuilt, not a remote dev-channel capture.';
  if (spec.state === 'library')
    return { availability, note, fixture: 'single imported current core Shokupan; no history' };
  if (spec.state === 'creation') {
    await active(page)
      .getByRole('button', { name: /Nouvelle recette/ })
      .click();
    await page.waitForFunction(() => window.__reviewPresented === 'modal');
    return {
      availability,
      note,
      fixture: 'production creation chooser; imported Shokupan in background',
    };
  }
  await active(page).getByText('Shokupan', { exact: true }).click();
  await expect(active(page).getByText('Version 1', { exact: true })).toBeVisible();
  await settle(page, true);
  // The app restores panel scroll over two layout frames after recipe loading.
  // Wait for that restoration before intentionally scrolling a comparison anchor.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  if (spec.state === 'menu' || spec.state === 'edit') {
    await active(page)
      .locator('ion-header')
      .getByRole('button', { name: 'Actions sur la recette', exact: true })
      .click();
    await page.waitForFunction(() => window.__reviewPresented === 'action-sheet');
    if (spec.state === 'edit') {
      await page
        .locator('ion-action-sheet')
        .getByRole('button', { name: 'Modifier la recette', exact: true })
        .click();
      await expect(
        active(page).getByRole('button', { name: 'Composition', exact: true }),
      ).toBeVisible();
    }
  }
  if (spec.state === 'hydration') {
    await active(page).getByRole('button', { name: 'D’où vient l’eau', exact: true }).click();
    await page.waitForFunction(() => window.__reviewPresented === 'modal');
  }
  if (spec.state === 'steps') {
    await active(page)
      .getByTestId('recipe-method')
      .evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect(active(page).getByText('Étapes de préparation', { exact: true })).toBeInViewport();
    note += ' Recipe method scrolled into view; no separate grouped Steps destination.';
  }
  if (spec.state === 'planning' || spec.state === 'timeline') {
    await active(page).getByRole('button', { name: 'Planification', exact: true }).click();
    if (spec.state === 'timeline') {
      availability = 'nearest-view';
      note +=
        ' No equivalent lane timeline. Showing the actual Planning view, not an invented replacement.';
    }
  }
  if (spec.state === 'preparation') {
    await active(page)
      .locator('ion-footer')
      .getByRole('button', { name: /Démarrer/ })
      .click();
    await page.locator('ion-alert').getByRole('button', { name: 'Démarrer', exact: true }).click();
    await expect(page).toHaveURL(/\/bakes\//);
    note +=
      ' Fresh preparation, before the first step starts. Different phase from the two seeded historical prototypes.';
  }
  return {
    availability,
    note,
    fixture: 'single imported current core Shokupan; fresh session for Preparation',
  };
}

function escape(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
function renderReport(markdown) {
  const inline = (value) =>
    escape(value)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return markdown
    .trim()
    .split(/\r?\n\r?\n/)
    .map((block) => {
      const heading = /^(#{1,3}) (.*)$/.exec(block);
      if (heading) return `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
      if (block.startsWith('- '))
        return `<ul>${block
          .split(/\r?\n/)
          .map((line) => `<li>${inline(line.replace(/^- /, ''))}</li>`)
          .join('')}</ul>`;
      return `<p>${inline(block)}</p>`;
    })
    .join('\n');
}
async function compose(page, spec, entries) {
  const id = `${spec.state}-${spec.navigation}-${spec.width}-${spec.textScale}`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#eee9e1;color:#211b16;font:14px/1.4 system-ui}h1{font-size:20px;margin:0 0 12px}.row{display:flex;gap:16px}.column{width:${spec.width}px}h2{font-size:18px;margin:0 0 4px}p{margin:0 0 12px;height:116px;overflow:hidden}img{display:block;width:${spec.width}px;height:${height}px;object-fit:contain;object-position:top;background:#151311}.source{font:12px/1.4 monospace;display:block}.status{font-weight:700}</style><h1>${escape(spec.state)} · ${spec.navigation} · FR / Dark / ${spec.width} × ${height} / ${spec.textScale}% text</h1><div class="row">${entries.map((e) => `<div class="column"><h2>${escape(e.title)}</h2><p><span class="source">${escape(e.sourceRevision.slice(0, 7))}</span><span class="status">${escape(e.availability)}</span> — ${escape(e.note)}</p><img src="/${e.path}"></div>`).join('')}</div></html>`;
  await page.setViewportSize({ width: spec.width * 3 + 72, height: height + 240 });
  await page.goto(`${comparisonOrigin}/`);
  await page.setContent(html);
  await page.addStyleTag({ content: 'p{height:auto;min-height:116px;overflow:visible}' });
  await page.locator('.column p').evaluateAll((paragraphs) => {
    const captionHeight = Math.ceil(
      Math.max(...paragraphs.map((p) => p.getBoundingClientRect().height)),
    );
    for (const p of paragraphs) p.style.height = `${captionHeight}px`;
  });
  await page.locator('img').evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
  await page.screenshot({ path: path.join(output, `comparison-${id}.png`), fullPage: true });
  return {
    ...spec,
    id,
    path: `comparison-${id}.png`,
    sha256: createHash('sha256')
      .update(await readFile(path.join(output, `comparison-${id}.png`)))
      .digest('hex'),
    images: entries.map((e) => e.path),
  };
}
let comparisonOrigin;
try {
  await mkdir(path.join(output, 'screenshots'), { recursive: true });
  await writeFile(
    path.join(output, 'index.html'),
    '<!doctype html><title>Building comparison evidence</title>',
  );
  const historicalOrigin = await serve(pages, 4271);
  const appOrigin = await serve(path.join(mobile, 'dist'), 4272);
  comparisonOrigin = await serve(output, 4273);
  const specs = [];
  for (const navigation of ['A', 'B']) {
    for (const state of [
      'library',
      'recipe',
      'edit',
      'menu',
      'hydration',
      'steps',
      'timeline',
      'planning',
      'preparation',
      'creation',
    ])
      specs.push({ state, navigation, width: 393, textScale: 100 });
    for (const state of ['recipe', 'planning', 'preparation'])
      specs.push({ state, navigation, width: 360, textScale: 130 });
  }
  const composeContext = await browser.newContext();
  const comparisonPage = await composeContext.newPage();
  for (const spec of specs) {
    const entries = [];
    for (const version of versions) {
      const context = await browser.newContext({
        viewport: { width: spec.width, height },
        locale: 'fr-CA',
        timezoneId: 'America/Toronto',
        reducedMotion: 'reduce',
        deviceScaleFactor: 1,
      });
      if (version.id === 'app')
        await context.addInitScript(
          ({ scale }) => {
            document.addEventListener(
              'ionModalDidPresent',
              () => (window.__reviewPresented = 'modal'),
            );
            document.addEventListener(
              'ionActionSheetDidPresent',
              () => (window.__reviewPresented = 'action-sheet'),
            );
            localStorage.setItem(
              'flourprint.device-preferences',
              JSON.stringify({ theme: 'dark' }),
            );
            if (scale !== 100) {
              const apply = () =>
                (document.documentElement.style.fontSize = `${(16 * scale) / 100}px`);
              document.addEventListener('DOMContentLoaded', apply, { once: true });
            }
          },
          { scale: spec.textScale },
        );
      const page = await context.newPage();
      await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        const result = await { round2, round3, app }[version.id](
          page,
          version.id === 'app' ? appOrigin : historicalOrigin,
          spec,
        );
        await settle(page, version.id === 'app');
        const filename = `${version.id}-${spec.state}-${spec.navigation}-${spec.width}-${spec.textScale}.png`;
        const relative = `screenshots/${filename}`;
        if (result.frame)
          await result.frame.screenshot({
            path: path.join(output, relative),
            animations: 'disabled',
          });
        else await page.screenshot({ path: path.join(output, relative), animations: 'disabled' });
        const metrics = await page.evaluate(() => ({
          rootFontPx: getComputedStyle(document.documentElement).fontSize,
          recipeTitleColors: [...document.querySelectorAll('.recipe-card-title')]
            .slice(0, 3)
            .map((el) => ({
              text: el.textContent,
              color: getComputedStyle(el).color,
              cardBackground: getComputedStyle(el.closest('.recipe-card')).backgroundColor,
            })),
          documentWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollAnchors: [...document.querySelectorAll('.fp-scroll,.screen,ion-content')]
            .filter((e) => e.getBoundingClientRect().width)
            .map((e) => ({
              tag: e.tagName,
              className: e.className,
              top: e.scrollTop,
              width: e.clientWidth,
              scrollWidth: e.scrollWidth,
            })),
        }));
        if (Math.abs(parseFloat(metrics.rootFontPx) - (16 * spec.textScale) / 100) > 0.01)
          throw Error('Requested text scale was not applied');
        const entry = {
          ...spec,
          version: version.id,
          title: version.title,
          sourceRevision: version.sourceRevision,
          theme: 'dark',
          locale: 'fr-CA',
          height,
          path: relative,
          sha256: createHash('sha256')
            .update(await readFile(path.join(output, relative)))
            .digest('hex'),
          availability: result.availability,
          note: result.note,
          fixture: result.fixture,
          metrics,
          errors,
        };
        shots.push(entry);
        entries.push(entry);
        checks.push({
          id: `${version.id}-${spec.state}-${spec.navigation}-${spec.width}-${spec.textScale}`,
          result: 'captured',
          availability: result.availability,
          errors,
        });
        console.log(`Captured ${filename} (${result.availability})`);
        if (
          version.id === 'round3' &&
          spec.width === 393 &&
          ['edit', 'steps'].includes(spec.state)
        ) {
          if (spec.state === 'edit')
            await page.getByTestId('ingredient-grams-milk').scrollIntoViewIfNeeded();
          else {
            await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
            await page.getByRole('button', { name: 'Modifier', exact: true }).click();
          }
          await settle(page);
          const relative = `screenshots/round3-${spec.state}-detail-${spec.navigation}-393-100.png`;
          await page.screenshot({ path: path.join(output, relative), animations: 'disabled' });
          supplements.push({
            ...entry,
            path: relative,
            state: `${spec.state}-detail`,
            metrics: {
              rootFontPx: metrics.rootFontPx,
              scrollAnchor: spec.state === 'edit' ? 'milk grams field' : 'grouped steps, top',
            },
            sha256: createHash('sha256')
              .update(await readFile(path.join(output, relative)))
              .digest('hex'),
            note:
              spec.state === 'edit'
                ? 'Editor scrolled to the milk row, to inspect repeated field labels.'
                : 'Grouped steps after entering editing, to inspect per-row actions.',
          });
        }
      } catch (error) {
        await page
          .screenshot({
            path: path.join(output, `FAILED-${version.id}-${spec.state}-${spec.navigation}.png`),
          })
          .catch(() => {});
        throw error;
      } finally {
        await context.close();
      }
    }
    comparisons.push(await compose(comparisonPage, spec, entries));
    await writeFile(
      path.join(output, 'progress.json'),
      JSON.stringify({ shots, comparisons, checks }, null, 2),
    );
  }
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    browser: await browser.version(),
    captureToolRevision: git('rev-parse', 'HEAD'),
    captureToolSha256: createHash('sha256')
      .update(await readFile(fileURLToPath(import.meta.url)))
      .digest('hex'),
    versions,
    images: shots,
    supplements,
    comparisons,
    checks,
    limitations: [
      'Historical controls and figures are preserved, not repaired.',
      'A/B apply to the prototypes only; production is repeated as a fixed reference.',
      '130% means a computed 20.8px root font; for round 2 this is applied by the test context because its URL parser only supports 125%.',
      'Preparation phases differ and are explicitly captioned. No timing or quantity equivalence is claimed.',
      'No native, durability or new model validation. This is the pre-restoration owner review gate.',
    ],
  };
  const report = await readFile(
    path.join(repo, 'docs/mockups/0.3-ux/comparison-report.md'),
    'utf8',
  );
  await writeFile(path.join(output, 'report.md'), report);
  await writeFile(
    path.join(output, 'report.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Flourprint #133 — comparative UX/UI report</title><style>body{max-width:900px;margin:auto;padding:20px;background:#faf7f1;color:#2c231c;font:17px/1.6 system-ui}h1,h2,h3{line-height:1.25;margin-top:1.5em}li{margin-bottom:.6em}code{overflow-wrap:anywhere;font-size:.85em}a{color:#8c3a10}</style><a href="index.html">Back to the 26 comparisons</a> · <a href="report.md">Markdown source</a>${renderReport(report)}</html>`,
  );
  manifest.report = {
    path: 'report.md',
    sha256: createHash('sha256').update(report).digest('hex'),
  };
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const gallery = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Flourprint #133 — comparison before restoration</title><style>body{margin:auto;max-width:1400px;padding:20px;background:#faf7f1;color:#2c231c;font:16px/1.5 system-ui}a{color:#8c3a10}h1{line-height:1.2}nav{display:flex;gap:12px;flex-wrap:wrap}article{margin:32px 0;padding-top:12px;border-top:1px solid #ccc}img{display:block;width:100%;height:auto}ul{padding-left:20px}.links{display:flex;gap:16px;flex-wrap:wrap}small{display:block}</style><h1>Flourprint #133: comparison before restoration</h1><p><strong>Owner review gate. No visual restoration has been implemented.</strong> 26 triptychs, 78 source captures. French / Dark. The screenshots are actual browser renders; captions identify missing views and differences in fixtures or preparation phases.</p><nav><a href="report.html">Screen-by-screen UX/UI report and restoration ledger</a><a href="manifest.json">Capture manifest</a><a href="../${versions[0].directory}/mockup.html">Historical round 2 interactive</a><a href="../${versions[1].directory}/mockup.html">Round 3 interactive</a><a href="https://dev.flourprint-aristotelesqc.pages.dev">Live dev app (may move)</a></nav><p>Sources: round 2 <code>22db386</code>; round 3 rendered source <code>419c70b</code> (PR head <code>7c7c2e7</code>); current-app source <code>7dd74bf</code>, rebuilt locally. Production has no A/B alternatives and is deliberately repeated. Round 2 Planning is unreachable; round 3 and the current app lack an equivalent lane timeline. Preparation phases differ. Numerical differences are not visual improvements.</p><nav>${comparisons.map((c) => `<a href="#${c.id}">${c.state} ${c.navigation} ${c.width}/${c.textScale}%</a>`).join('')}</nav>${comparisons
    .map(
      (c) =>
        `<article id="${c.id}"><h2>${c.state} · ${c.navigation} · ${c.width}px · ${c.textScale}%</h2><a href="${c.path}"><img loading="lazy" src="${c.path}" alt="Three-version comparison: ${c.state}, navigation ${c.navigation}, ${c.width}px, ${c.textScale}% text"></a><p><a href="${c.path}">Open full-resolution triptych</a></p><div class="links">${c.images
          .map((file) => {
            const s = shots.find((s) => s.path === file);
            return `<div><a href="${file}">${s.title}: original PNG</a><small>${escape(s.availability)} — ${escape(s.note)}</small></div>`;
          })
          .join('')}</div></article>`,
    )
    .join('')}</html>`;
  const supplementGallery = `<article><h2>Additional editor details</h2><p>These captures inspect repeated quantity labels and per-step editing actions below the initial viewport. They are round 3 only, not matched three-version comparisons.</p>${supplements.map((s) => `<a href="${s.path}">${escape(s.state)} · ${s.navigation} · original PNG</a><p>${escape(s.note)}</p><a href="${s.path}"><img loading="lazy" src="${s.path}" style="max-width:393px" alt="${escape(s.state)} navigation ${s.navigation}"></a>`).join('')}</article>`;
  await writeFile(
    path.join(output, 'index.html'),
    gallery.replace('</html>', `${supplementGallery}</html>`),
  );
  console.log(
    `Complete: ${comparisons.length} comparisons; ${shots.length} original renders. ${output}`,
  );
} finally {
  await browser.close();
  for (const server of servers) server.closeAllConnections();
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
}
