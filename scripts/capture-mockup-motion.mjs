/* global document, Element, requestAnimationFrame, getComputedStyle */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const cases = [
  {
    id: 'button-press',
    screen: 'recipe',
    press: true,
    target: (p) => p.getByRole('button', { name: 'Modifier', exact: true }),
  },
  {
    id: 'toolbar-press',
    screen: 'recipe',
    press: true,
    target: (p) => p.getByRole('button', { name: 'Actions sur la recette', exact: true }),
  },
  {
    id: 'pill-selection',
    screen: 'library',
    target: (p) => p.getByRole('tab', { name: /^En cours \(/ }),
  },
  {
    id: 'weighing-row-and-check',
    screen: 'recipe',
    target: (p) => p.getByTestId('ingredient-row-final:salt').getByRole('checkbox'),
  },
  {
    id: 'accordion-and-chevron-close',
    screen: 'recipe',
    target: (p) => p.locator('.disclosure-header').first(),
  },
  {
    id: 'accordion-and-chevron-open',
    screen: 'recipe',
    setup: async (p) => p.locator('.disclosure-header').first().click(),
    target: (p) => p.locator('.disclosure-header').first(),
  },
  {
    id: 'menu-open',
    screen: 'recipe',
    target: (p) => p.getByRole('button', { name: 'Actions sur la recette', exact: true }),
  },
  {
    id: 'menu-close',
    screen: 'recipe',
    setup: async (p) =>
      p.getByRole('button', { name: 'Actions sur la recette', exact: true }).click(),
    action: async (p) => p.keyboard.press('Escape'),
  },
  {
    id: 'sheet-open',
    screen: 'recipe',
    target: (p) => p.getByRole('button', { name: 'Détail de l’hydratation', exact: true }),
  },
  {
    id: 'sheet-close',
    screen: 'recipe',
    setup: async (p) =>
      p.getByRole('button', { name: 'Détail de l’hydratation', exact: true }).click(),
    action: async (p) => p.keyboard.press('Escape'),
  },
  {
    id: 'tab-change',
    screen: 'recipe',
    target: (p) => p.getByRole('tab', { name: 'Étapes', exact: true }),
  },
  {
    id: 'screen-change',
    screen: 'library',
    target: (p) => p.locator('.recipe-card-title').first(),
  },
  {
    id: 'preparation-step-complete',
    screen: 'preparation',
    target: (p) => p.getByTestId('prep-complete-btn'),
  },
];
const settle = (p) =>
  p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
export async function captureMotion({ browser, origin, output, build }) {
  const dir = path.join(output, 'motion');
  await mkdir(dir, { recursive: true });
  const records = [];
  for (const mode of ['normal', 'system-reduced', 'manual-reduced'])
    for (const spec of cases) {
      const context = await browser.newContext({
        viewport: { width: 393, height: 852 },
        locale: 'fr-CA',
        timezoneId: 'America/Toronto',
        reducedMotion: mode === 'system-reduced' ? 'reduce' : 'no-preference',
      });
      const p = await context.newPage();
      const errors = [];
      p.on('pageerror', (e) => errors.push(e.message));
      await p.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
      const query = new URLSearchParams({
        screen: spec.screen,
        lang: 'fr',
        theme: 'dark',
        nav: 'A',
        capture: '1',
        motion: mode === 'manual-reduced' ? 'reduce' : 'standard',
      });
      try {
        await p.goto(new URL('mockup.html?' + query, origin).href);
        await p.locator('.phone-frame').waitFor();
        await settle(p);
        if (spec.setup) {
          await spec.setup(p);
          await settle(p);
        }
        const target = spec.target?.(p);
        if (target) await target.scrollIntoViewIfNeeded();
        await settle(p);
        const frames = [];
        async function shot(phase) {
          const filename = `${spec.id}-${mode}-${phase}.png`;
          await p.screenshot({ path: path.join(dir, filename), animations: 'allow' });
          const entry = {
            phase,
            path: `motion/${filename}`,
            sha256: sha(await readFile(path.join(dir, filename))),
          };
          frames.push(entry);
        }
        await shot('before');
        if (spec.press) {
          const box = await target.boundingBox();
          if (!box) throw Error('Missing press target');
          await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await p.mouse.down();
        } else if (target) await target.click();
        else await spec.action(p);
        const animations = await p.evaluate(async () => {
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          return document
            .getAnimations()
            .filter(
              (a) =>
                a.playState === 'running' && Number(a.effect?.getComputedTiming().duration) > 0,
            )
            .map((a) => {
              const timing = a.effect.getComputedTiming();
              const duration = Number(timing.duration);
              const element = a.effect.target;
              a.pause();
              a.currentTime = duration / 2;
              return {
                name: a.animationName ?? a.transitionProperty ?? 'animation',
                duration,
                easing: a.effect.getTiming().easing,
                target: element instanceof Element ? element.className : 'pseudo',
                keyframes: a.effect
                  .getKeyframes()
                  .map((k) =>
                    Object.fromEntries(
                      Object.entries(k).filter(
                        ([key]) => !['computedOffset', 'offset', 'composite'].includes(key),
                      ),
                    ),
                  ),
              };
            });
        });
        const tokens = await p.evaluate(() => {
          const s = getComputedStyle(document.documentElement);
          return Object.fromEntries(
            ['--dur-effect', '--dur-spatial', '--dur-sheet'].map((k) => [
              k,
              s.getPropertyValue(k).trim(),
            ]),
          );
        });
        if (mode === 'normal') {
          if (!animations.length) throw Error(`No motion observed: ${spec.id}`);
          await shot('during');
        } else {
          if (animations.length || Object.values(tokens).some((v) => parseFloat(v) !== 0))
            throw Error(`Reduced motion is not immediate: ${spec.id}`);
        }
        await p.evaluate(() => {
          for (const a of document.getAnimations()) if (a.playState === 'paused') a.finish();
        });
        if (spec.press) await p.mouse.up();
        await settle(p);
        await shot('after');
        if (errors.length) throw Error(errors.join('\n'));
        records.push({
          id: spec.id,
          mode,
          viewport: { width: 393, height: 852 },
          locale: 'fr-CA',
          theme: 'dark',
          frames,
          animations,
          tokens,
          errors,
          interactive: `../mockup.html?${query}`,
        });
        console.log(`motion ${spec.id} ${mode}`);
      } finally {
        await context.close();
      }
    }
  const manifest = {
    revision: build.revision,
    sourceSha256: build.sourceSha256,
    sampling:
      'Actual CSS Web Animations sampled at 50% of their duration; no fabricated interface frames. Reduced motion has before/after only because it has no intermediate state.',
    records,
  };
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(
    path.join(dir, 'index.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flourprint motion evidence</title><style>body{margin:auto;padding:16px;max-width:1300px;background:#faf7f1;color:#2c231c;font:16px/1.5 system-ui}a{color:#8c3a10}.frames{display:flex;overflow-x:auto;gap:12px}.frame{flex:0 0 min(393px,calc(100vw - 32px))}img{width:100%;display:block}article{border-top:1px solid #ccc;margin-top:24px;padding-top:12px}code{overflow-wrap:anywhere}</style><h1>Actual interface motion</h1><p>${esc(manifest.sampling)}</p><p>Source <code>${esc(build.revision)}</code> · <code>${esc(build.sourceSha256)}</code></p><nav><a href="../">Restoration gallery</a> · <a href="manifest.json">Timings, keyframes and hashes</a></nav>${records.map((r) => `<article id="${r.id}-${r.mode}"><h2>${r.id} · ${r.mode}</h2><p>${r.animations.length ? r.animations.map((a) => esc(a.name) + ' ' + a.duration + 'ms').join(' · ') : '0ms; no intermediate animation'} · <a href="${r.interactive}">Interactive</a></p><div class="frames">${r.frames.map((f) => `<div class="frame"><h3>${f.phase}</h3><a href="${path.basename(f.path)}"><img loading="lazy" src="${path.basename(f.path)}" alt="${esc(r.id)} ${r.mode} ${f.phase}"></a></div>`).join('')}</div></article>`).join('')}</html>`,
  );
  return manifest;
}
