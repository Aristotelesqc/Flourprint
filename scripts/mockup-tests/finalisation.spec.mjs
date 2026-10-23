import { createRequire } from 'node:module';
import { setTimeout as gesturePause } from 'node:timers/promises';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');

const address = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'shokupan', nav: 'A', lang: 'fr', theme: 'dark', width: '393', scale: '100', motion: 'standard', capture: '1', ...extra })}`;

test.describe('finalisation: measured actions and actual commit motion', () => {
  test.use({ hasTouch: true });
  test('L108: exactly three destinations retain ingredients and steps in one Recipe pane', async ({
    page,
  }) => {
    await page.goto(address());
    const tabs = page.getByRole('tablist', { name: 'Navigation', exact: true }).getByRole('tab');
    await expect(tabs).toHaveText(['Recette', 'Planification', 'Historique']);
    const active = page.locator('.section-carousel-pane.is-active');
    await expect(active.getByTestId('formula-dough-weight')).toHaveCount(1);
    await expect(active.getByTestId('recipe-steps')).toHaveCount(1);
    await expect(
      page
        .locator('[data-fp-component="fp.bottom-bar"]')
        .getByRole('button', { name: 'Planification', exact: true }),
    ).toHaveCount(0);
  });

  test('L108: an old steps link opens Recipe and brings the step section into the viewport', async ({
    page,
  }) => {
    await page.goto(address({ section: 'steps', motion: 'reduce' }));
    await expect(page.getByRole('tab', { name: 'Recette', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const section = page.getByTestId('recipe-steps');
    await expect
      .poll(async () => {
        const box = await section.boundingBox();
        const pane = await page.locator('.section-carousel-pane.is-active').boundingBox();
        return box.y < pane.y + pane.height && box.y + box.height > pane.y;
      })
      .toBe(true);
  });

  test('L108: edit in Recipe then visit Planning without changing the draft or opening an editor', async ({
    page,
  }) => {
    await page.goto(address({ mode: 'edit' }));
    const name = page.getByTestId('recipe-name');
    await name.fill('Shokupan — draft continuity');
    await page.getByRole('tab', { name: 'Planification', exact: true }).click();
    await expect(page.locator('dialog:modal')).toHaveCount(0);
    const planning = page.locator('.section-carousel-pane.is-active');
    await expect(
      planning.getByRole('button', {
        name: /Modifier.*étape|Edit.*step|Appliquer au brouillon|Apply to draft/i,
      }),
    ).toHaveCount(0);
    await page.getByRole('tab', { name: 'Recette', exact: true }).click();
    await expect(name).toHaveValue('Shokupan — draft continuity');
    await expect(page.getByTestId('save-recipe')).toBeVisible();
  });
  for (const [width, scale] of [
    [393, 100],
    [360, 130],
  ]) {
    for (const lang of ['fr', 'en']) {
      for (const mode of ['read', 'edit']) {
        test(`L115 ${lang} ${mode} ${width}/${scale}: every toolbar action is reachable`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height: 852 });
          await page.goto(address({ width: String(width), scale: String(scale), lang, mode }));
          const actions = page.locator('[data-fp-component="fp.bottom-bar"] button:visible');
          await expect(actions.first()).toBeVisible();
          const metrics = await actions.evaluateAll((buttons) =>
            buttons.map((button) => {
              const r = button.getBoundingClientRect();
              const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
              return {
                label: button.textContent.trim() || button.getAttribute('aria-label'),
                disabled: button.disabled,
                x: r.x,
                y: r.y,
                right: r.right,
                bottom: r.bottom,
                width: r.width,
                height: r.height,
                hittable: Boolean(hit && button.contains(hit)),
              };
            }),
          );
          expect(metrics.length).toBeGreaterThanOrEqual(3);
          for (const metric of metrics) {
            expect(metric.x, JSON.stringify(metric)).toBeGreaterThanOrEqual(0);
            expect(metric.right, JSON.stringify(metric)).toBeLessThanOrEqual(width + 0.5);
            expect(metric.bottom, JSON.stringify(metric)).toBeLessThanOrEqual(852);
            expect(metric.width, JSON.stringify(metric)).toBeGreaterThanOrEqual(48);
            expect(metric.height, JSON.stringify(metric)).toBeGreaterThanOrEqual(48);
            if (!metric.disabled) expect(metric.hittable, JSON.stringify(metric)).toBe(true);
          }
          for (let i = 1; i < metrics.length; i++) {
            const a = metrics[i - 1],
              b = metrics[i];
            if (Math.abs(a.y - b.y) < 1) expect(a.right).toBeLessThanOrEqual(b.x + 0.5);
          }
        });
      }
    }
  }

  test('L123: selecting another top tab never shifts its neighbours', async ({ page }) => {
    await page.goto(address({ motion: 'reduce' }));
    const tabs = page.getByRole('tablist', { name: 'Navigation', exact: true }).getByRole('tab');
    const geometry = () =>
      tabs.evaluateAll((nodes) =>
        nodes.map((node) => ({
          x: node.getBoundingClientRect().x,
          width: node.getBoundingClientRect().width,
        })),
      );
    await expect(tabs.first()).toBeVisible();
    const before = await geometry();
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    const after = await geometry();
    for (let i = 0; i < before.length; i++) {
      expect(Math.abs(before[i].x - after[i].x)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(before[i].width - after[i].width)).toBeLessThanOrEqual(0.5);
    }
  });

  for (const kind of ['slow', 'flick']) {
    test(`L106/L117 ${kind}: committing touch release has intermediate rendered frames`, async ({
      page,
      context,
    }) => {
      await page.goto(address());
      const area = await page.locator('.section-carousel-container').boundingBox();
      const tabs = page.getByRole('tablist', { name: 'Navigation', exact: true }).getByRole('tab');
      const cdp = await context.newCDPSession(page);
      await page.evaluate(() => {
        window.__releaseFrames = [];
        window.__gestureSamples = [];
        for (const type of ['pointerdown', 'pointermove', 'pointerup'])
          document.addEventListener(
            type,
            (event) => {
              window.__gestureSamples.push({ type, x: event.clientX, time: event.timeStamp });
            },
            true,
          );
        document.addEventListener(
          'pointerup',
          () => {
            const track = document.querySelector('.section-carousel-track');
            const read = () => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
            window.__releaseStart = read();
            let count = 0;
            const sample = () => {
              window.__releaseFrames.push({ t: performance.now(), x: read() });
              if (++count < 45) requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
          },
          { capture: true, once: true },
        );
      });
      const startX = area.x + area.width - 40;
      const distance = kind === 'slow' ? area.width * 0.65 : 85;
      const y = area.y + 130;
      // CDP round trips can stall on a loaded host. Explicit native input timestamps
      // describe the intended physical gesture independently of transport latency.
      const gestureEpoch = Date.now() / 1000;
      const sampleSeconds = kind === 'slow' ? 0.09 : 0.005;
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        timestamp: gestureEpoch,
        touchPoints: [{ id: 1, x: startX, y }],
      });
      for (let i = 1; i <= 6; i++) {
        await gesturePause(kind === 'slow' ? 90 : 5);
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          timestamp: gestureEpoch + sampleSeconds * i,
          touchPoints: [{ id: 1, x: startX - (distance * i) / 6, y }],
        });
      }
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
        timestamp: gestureEpoch + sampleSeconds * 6 + 0.005,
      });
      const samples = await page.evaluate(() => window.__gestureSamples);
      const moves = samples.filter((sample) => sample.type === 'pointermove');
      expect(moves.length, JSON.stringify(samples)).toBeGreaterThanOrEqual(2);
      const end = samples.findLast((sample) => sample.type === 'pointerup');
      const first = samples.find((sample) => sample.type === 'pointerdown');
      expect(Math.abs(moves.at(-1).x - first.x)).toBeCloseTo(distance, 0);
      if (kind === 'flick') expect(end.time - first.time).toBeLessThan(50);
      else expect(end.time - first.time).toBeGreaterThan(500);
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect
        .poll(() => page.evaluate(() => window.__releaseFrames.length))
        .toBeGreaterThanOrEqual(20);
      const evidence = await page.evaluate(() => ({
        start: window.__releaseStart,
        frames: window.__releaseFrames,
      }));
      const endX = -area.width;
      const intermediate = evidence.frames.filter(
        (frame) => frame.x < evidence.start - 2 && frame.x > endX + 2,
      );
      expect(intermediate.length, JSON.stringify(evidence)).toBeGreaterThanOrEqual(2);
      expect(Math.abs(evidence.frames.at(-1).x - endX)).toBeLessThan(1);
      await cdp.detach();
    });
  }
});
