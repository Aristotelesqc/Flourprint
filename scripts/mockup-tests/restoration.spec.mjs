import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { auditMockupStyles } from '../mockup-style-audit.mjs';
const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');

for (const navigation of ['A', 'B'])
  test(`round 2 action placement remains distinct: ${navigation}`, async ({ page }) => {
    await page.goto(`/mockup.html?screen=library&nav=${navigation}&capture=1&motion=reduce`);
    await expect(page.getByRole('searchbox')).toHaveCount(1);
    const create = page.getByRole('button', { name: 'Nouvelle recette', exact: true });
    expect(await create.evaluate((el) => Boolean(el.closest('header')))).toBe(navigation === 'B');
    await expect(page.getByRole('tab', { name: /^Toutes \(/ })).toBeVisible();
    await page.getByRole('searchbox').fill('shoku');
    await page.getByRole('button', { name: 'Shokupan', exact: true }).click();
    const start = page.getByRole('button', { name: 'Lancer', exact: true });
    expect(await start.evaluate((el) => Boolean(el.closest('header')))).toBe(navigation === 'B');
    await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Dupliquer', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Shokupan · Copie', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  });

test('library density retains four complete cards without an extra active-preparation block', async ({
  page,
}) => {
  await page.goto('/mockup.html?screen=library&nav=B&capture=1&motion=reduce');
  const cards = page.locator('[data-fp-component="fp.recipe-card"]');
  expect(await cards.first().evaluate((el) => el.getBoundingClientRect().height)).toBeLessThan(160);
  expect(await cards.nth(3).evaluate((el) => el.getBoundingClientRect().bottom)).toBeLessThan(
    await page.locator('.phone-content').evaluate((el) => el.getBoundingClientRect().bottom),
  );
  await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
  await expect(page.getByTestId('prep-complete-btn')).toBeVisible();
});

test('every finite component style is defined and screens bind ids instead of implementations', () => {
  const audit = auditMockupStyles();
  expect(audit.classes).toBeGreaterThan(150);
  expect(audit.missing).toEqual([]);
  for (const name of ['ui.tsx', 'components.tsx']) {
    const source = readFileSync(
      new URL('../../docs/mockups/0.3-ux/src/' + name, import.meta.url),
      'utf8',
    );
    expect(source).toContain('<Ui component=');
    expect(source).not.toContain('<svg');
    expect(source).not.toContain('<button');
    expect(source).not.toContain('/components/');
  }
});

for (const theme of ['light', 'dark', 'amoled'])
  test(`shared v1 title, atomic hydration, navigation and sheet at 360/130: ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 852 });
    await page.goto(
      `/mockup.html?screen=recipe&lang=fr&nav=B&width=360&scale=130&capture=1&theme=${theme}`,
    );
    await expect(page.getByRole('heading', { name: 'Shokupan', exact: true })).toBeVisible();
    expect(
      await page.locator('.header-heading').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(
      '20.8px',
    );
    await expect(page.locator('[data-fp-component="fp.bottom-bar"] nav')).toHaveCount(0); // The bar itself owns its navigation root.
    await expect(page.locator('nav[data-fp-component="fp.bottom-bar"] button')).toHaveCount(4);
    expect(
      await page.locator('.hydration-value').evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getClientRects().length;
      }),
    ).toBe(1);
    const info = page.getByRole('button', { name: 'Détail de l’hydratation', exact: true });
    await info.click();
    await expect(page.locator('dialog[open][data-fp-component="fp.bottom-sheet"]')).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('dialog[open] .modal-sheet')
          .evaluate((el) => Math.abs(el.getBoundingClientRect().bottom - innerHeight)),
      )
      .toBeLessThan(2);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(info).toBeFocused();
  });

test('inspector identifies the actual version and links its generated catalogue without activating product actions', async ({
  page,
}) => {
  await page.goto('/mockup.html?screen=recipe&lang=en');
  await page.getByRole('button', { name: 'Inspect components', exact: true }).click();
  await page.locator('.recipe-summary-box').click({ position: { x: 8, y: 8 } });
  await expect(
    page
      .locator('.component-inspector')
      .getByRole('link', { name: 'fp.hero-summary · v1', exact: true }),
  ).toHaveAttribute('href', /screen=catalogue#fp.hero-summary/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect components', exact: true }).click();
  await page.getByRole('button', { name: 'Hydration breakdown', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

for (const mode of ['system', 'manual'])
  test(`reduced motion is zero for ${mode} preference`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: mode === 'system' ? 'reduce' : 'no-preference' });
    await page.goto(
      `/mockup.html?screen=recipe&capture=1&motion=${mode === 'manual' ? 'reduce' : 'standard'}`,
    );
    expect(
      await page.evaluate(() =>
        ['--dur-effect', '--dur-spatial', '--dur-sheet'].map((name) =>
          parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)),
        ),
      ),
    ).toEqual([0, 0, 0]);
    await page.getByRole('button', { name: 'Détail de l’hydratation', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

for (const prep of ['fermentation', 'cooking'])
  test(`Preparation controls are visible and unobstructed at 360px / 130%: ${prep}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 852 });
    await page.goto(
      `/mockup.html?screen=preparation&lang=fr&nav=B&width=360&scale=130&capture=1${prep === 'cooking' ? '&prep=cooking' : ''}`,
    );
    for (const name of [
      '+15 min',
      'Durée',
      'Note',
      ...(prep === 'fermentation' ? ['Prête à façonner'] : []),
      'Étape terminée',
    ]) {
      const control = page.getByRole('button', { name, exact: true });
      await expect(control).toBeVisible();
      expect(
        await control.evaluate((el) => {
          const b = el.getBoundingClientRect();
          return (
            document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('button') ===
            el
          );
        }),
      ).toBe(true);
    }
  });
