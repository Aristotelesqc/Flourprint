import { createRequire } from 'node:module';
import { RECIPE_TEMPLATES } from '../../packages/core/dist/application/index.js';
import {
  projectProcess,
  relativeTimeline,
  anchorTimeline,
} from '../../packages/core/dist/domain/index.js';

const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
const template = RECIPE_TEMPLATES.find((item) => item.id === 'shokupan');
const start = '2026-10-24T05:49:00.000Z';
const projection = projectProcess(template.process, { mode: { kind: 'startAt', at: start } });
const relative = relativeTimeline(template.process, {
  components: new Set(template.formula.components.map((item) => item.id)),
});
if (!projection.ok || !relative.ok)
  throw new Error('The sourced Shokupan projection must be available.');
const anchored = anchorTimeline(relative.value, { kind: 'startAt', at: start });
if (!anchored.ok) throw new Error('The sourced timeline must accept the reference start.');

const route = (locale, extra = {}) =>
  `/mockup.html?${new URLSearchParams({
    screen: 'recipe',
    recipe: 'shokupan',
    nav: 'A',
    lang: locale,
    theme: 'dark',
    width: '393',
    scale: '100',
    motion: 'reduce',
    capture: '1',
    ...extra,
  })}`;
const compactClock = (instant) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  return ['hour', 'minute', 'second']
    .map((type) => parts.find((part) => part.type === type).value)
    .join(':');
};

for (const locale of ['fr', 'en']) {
  test(`L18/L118 ${locale}: the 1950 second bake and actual core-projected planning window retain their seconds`, async ({
    page,
  }) => {
    // Independent exact reference: 1950 seconds is 32 min 30 s, not 33 min.
    expect(template.process.steps.find((step) => step.id === 'bake').plannedDurationS).toBe(1950);
    expect(projection.value.steps.bake.end).toBe('2026-10-24T10:00:30.000Z');
    expect(projection.value.steps.cool.start).toBe(projection.value.steps.bake.end);
    await page.goto(route(locale));
    const bake = page.locator('[data-sortable-id="bake"]').filter({ visible: true });
    await bake.scrollIntoViewIfNeeded();
    await expect(bake).toContainText('32 min 30 s');
    await expect(bake).not.toContainText('33 min');
    await page
      .getByRole('tab', { name: locale === 'fr' ? 'Planification' : 'Planning', exact: true })
      .click();
    const planning = page.locator('[data-process-root="planning"]');
    await planning.locator('input[type="datetime-local"]').fill('2026-10-24T01:49');
    const cooking = anchored.value.groups.find((group) => group.id === 'cooking').window;
    expect(cooking.status).toBe('complete');
    expect(cooking.elapsedS).toBe(7350);
    await expect(planning).toContainText(compactClock(cooking.end));
    await expect(planning).toContainText('2 h 02 min 30 s');
    await expect(planning).not.toContainText('2 h 03');
  });

  test(`L18/L118 ${locale}: Preparation bake end and upcoming cooling start show the same core instant`, async ({
    page,
  }) => {
    const now = new Date(start);
    await page.clock.setFixedTime(now);
    const expected = projectProcess(template.process, {
      mode: { kind: 'startAt', at: '2026-10-24T01:00:00.000Z' },
      facts: { bake: { startedAt: '2026-10-24T05:39:00.000Z' } },
    });
    expect(expected.ok).toBe(true);
    expect(expected.value.steps.bake.end).toBe('2026-10-24T06:11:30.000Z');
    expect(expected.value.steps.cool.start).toBe(expected.value.steps.bake.end);
    await page.goto(route(locale, { screen: 'preparation', prep: 'cooking' }));
    await expect(page.getByTestId('prep-current-step')).toHaveAttribute('data-step', 'bake');
    const boundary = compactClock(expected.value.steps.bake.end);
    await expect(page.getByTestId('prep-step-times')).toContainText(boundary);
    const cooling = page.locator('[data-fp-component="fp.step-node"]').filter({
      has: page.locator('.step-title').filter({ hasText: locale === 'fr' ? /Ressuage$/ : /Cool$/ }),
    });
    await expect(cooling).toContainText(boundary);
  });

  for (const [width, scale] of [
    [393, 100],
    [360, 130],
  ]) {
    test(`L123 ${locale} ${width}/${scale}: header, search and quiet build label have real 48 px targets`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 852 });
      for (const theme of ['light', 'dark', 'amoled']) {
        await page.goto(
          route(locale, { mode: 'edit', theme, width: String(width), scale: String(scale) }),
        );
        const name = page.getByTestId('recipe-name');
        expect((await name.boundingBox()).height).toBeGreaterThanOrEqual(48);
        const build = page.getByTestId('visible-build');
        const bounds = await build.boundingBox();
        expect(bounds.height).toBeGreaterThanOrEqual(48);
        expect(
          await build.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
        ).toBeLessThan(bounds.height / 2);
        await build.focus();
        const focus = await build.evaluate((element) => {
          const style = getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          const frame = element.closest('.phone-frame').getBoundingClientRect();
          const extent =
            Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
          return {
            outline: Number.parseFloat(style.outlineWidth),
            offset: Number.parseFloat(style.outlineOffset),
            inside: bounds.left - extent >= frame.left && bounds.right + extent <= frame.right,
          };
        });
        expect(focus.outline).toBeGreaterThanOrEqual(2);
        expect(focus.offset).toBeGreaterThanOrEqual(0);
        expect(focus.inside).toBe(true);
        await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + 2);
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(build).toBeFocused();
        await page.goto(
          route(locale, { screen: 'library', theme, width: String(width), scale: String(scale) }),
        );
        const search = page.locator('input[type="search"]');
        expect((await search.boundingBox()).height).toBeGreaterThanOrEqual(48);
      }
    });
  }
}
