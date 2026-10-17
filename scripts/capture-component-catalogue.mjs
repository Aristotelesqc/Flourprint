/* global document */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const hash = (b) => createHash('sha256').update(b).digest('hex');
export async function captureComponentCatalogue({ browser, origin, output, build }) {
  const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage(),
    records = [];
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(new URL('mockup.html?screen=catalogue&lang=en', origin).href);
    await page.getByTestId('catalogue-fp.recipe-card-v1').waitFor();
    for (const [width, scale] of [
      [393, 100],
      [360, 130],
    ]) {
      await page
        .getByRole('group', { name: 'Width', exact: true })
        .getByRole('radio', { name: `${width} px`, exact: true })
        .check();
      await page
        .getByRole('group', { name: 'Text', exact: true })
        .getByRole('radio', { name: `${scale} %`, exact: true })
        .check();
      await page.evaluate(() => document.fonts.ready);
      const versions = page.locator('article[data-testid^="catalogue-fp."]');
      for (let i = 0; i < (await versions.count()); i++) {
        const node = versions.nth(i),
          name = (await node.getAttribute('data-testid')).replace('catalogue-', '');
        const file = `screenshots/component-${name}-${width}-${scale}.png`;
        await mkdir(path.join(output, 'screenshots'), { recursive: true });
        await node.screenshot({ path: path.join(output, file), animations: 'disabled' });
        records.push({
          id: name,
          frameWidth: width,
          textScale: scale,
          themes: ['light', 'dark', 'amoled'],
          locale: 'en',
          outerViewport: { width: 1280, height: 900 },
          path: file,
          sha256: hash(await readFile(path.join(output, file))),
          sourceRevision: build.revision,
          sourceSha256: build.sourceSha256,
        });
      }
    }
    if (errors.length) throw Error(errors.join('\n'));
  } finally {
    await context.close();
  }
  await writeFile(
    path.join(output, 'components.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shared v1 component screenshots</title><style>body{max-width:1300px;margin:auto;padding:16px;background:#faf7f1;color:#2c231c;font:16px/1.5 system-ui}a{color:#8c3a10}img{width:100%;height:auto;display:block}article{margin:32px 0;border-top:1px solid #ccc;padding-top:12px}code{overflow-wrap:anywhere}</style><h1>Actual component catalogue captures</h1><p>Every version currently in the registry, at 393px / 100% and 360px / 130%, in Light, Dark and AMOLED. Sample text is illustrative. These are the same version modules selected by the prototype manifest.</p><p><a href="./">Screen comparisons</a> · <a href="mockup.html?screen=catalogue">Interactive catalogue</a> · <a href="motion/">Motion evidence</a></p><p>Source <code>${build.revision}</code> · <code>${build.sourceSha256}</code></p>${records.map((r) => `<article><h2>${r.id} · ${r.frameWidth}px / ${r.textScale}%</h2><a href="${r.path}"><img loading="lazy" src="${r.path}" alt="${r.id} Light Dark AMOLED"></a><a href="mockup.html?screen=catalogue#${r.id.replace(/-v\d+$/, '')}">Inspect this component</a></article>`).join('')}</html>`,
  );
  console.log(`Component catalogue: ${records.length} captures`);
  return records;
}
