import { expect, test } from './fixtures';
import { expectRecipeRevision, enterEditor, menuAction, routed } from './ui-actions';

for (const english of [false, true]) {
  for (const theme of ['light', 'dark', 'amoled'] as const) {
    for (const large of [false, true]) {
      test(`reading shell keeps full title, scrollable tabs and compact actions ${theme} ${large ? '360/130' : '393/100'}${english ? ' @en' : ''}`, async ({
        page,
      }, testInfo) => {
        const width = large ? 360 : 393;
        const scale = large ? 1.3 : 1;
        await page.setViewportSize({ width, height: 851 });
        await page.goto('/advanced');
        await routed(page)
          .getByRole('button', {
            name:
              theme === 'amoled'
                ? 'AMOLED'
                : theme === 'dark'
                  ? /^(Sombre(?: chaud)?|(?:Warm )?[Dd]ark)$/
                  : /^(Clair|Light)$/,
            exact: true,
          })
          .click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await routed(page).locator('ion-back-button').click();
        await expect(page).toHaveURL(/\/recipes$/);
        await routed(page)
          .getByRole('heading', { name: 'Poolish + tangzhong', exact: true })
          .click();
        await expectRecipeRevision(page, 1);
        // A normal rename creates the long synthetic title; no product DOM is replaced.
        await enterEditor(page);
        await menuAction(page, /^(Renommer|Rename)$/);
        const rename = page.locator('ion-alert:not(.overlay-hidden)');
        const title = english
          ? 'Bread for a long quiet weekend with poolish and tangzhong'
          : 'Pain du long week-end au poolish et au tangzhong';
        await rename.locator('input').fill(title);
        await rename
          .getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true })
          .click();
        await expect(rename).toHaveCount(0);
        await routed(page)
          .locator('ion-footer')
          .getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true })
          .click();
        await expectRecipeRevision(page, 1);
        await expect(
          routed(page)
            .locator('ion-footer')
            .getByRole('button', {
              name: english ? 'Start preparation' : 'Démarrer la préparation',
              exact: true,
            }),
        ).toBeVisible();
        await page.addStyleTag({
          content: `html, body { font-size: ${16 * scale}px !important; }`,
        });
        expect(await page.locator('html').evaluate((host) => getComputedStyle(host).fontSize)).toBe(
          large ? '20.8px' : '16px',
        );
        const heading = routed(page)
          .locator('ion-header')
          .getByRole('heading', { level: 1, name: title, exact: true });
        await expect(heading).toBeVisible();
        const titleMetrics = await heading.evaluate((host) => ({
          scroll: host.scrollHeight,
          height: host.clientHeight,
          overflow: getComputedStyle(host).textOverflow,
          clamp: getComputedStyle(host).getPropertyValue('-webkit-line-clamp'),
        }));
        expect(titleMetrics.scroll).toBeLessThanOrEqual(titleMetrics.height + 1);
        expect(titleMetrics.overflow).not.toBe('ellipsis');
        expect(['none', ''].includes(titleMetrics.clamp)).toBe(true);
        await expect(
          routed(page).getByRole('heading', { level: 1, name: title, exact: true }),
        ).toHaveCount(1);
        const tabs = routed(page).getByRole('tablist');
        await expect(tabs.getByRole('tab')).toHaveCount(3);
        const tabBoxes = await tabs.getByRole('tab').evaluateAll((items) =>
          items.map((item) => ({
            top: item.getBoundingClientRect().top,
            height: item.getBoundingClientRect().height,
            nowrap: getComputedStyle(item).whiteSpace,
          })),
        );
        expect(new Set(tabBoxes.map((item) => item.top)).size).toBe(1);
        expect(
          tabBoxes.every((item) => item.height >= 48 * scale - 1 && item.nowrap === 'nowrap'),
        ).toBe(true);
        const recipe = tabs.getByRole('tab', { name: english ? 'Recipe' : 'Recette', exact: true });
        await recipe.focus();
        await recipe.press('End');
        const history = tabs.getByRole('tab', {
          name: english ? 'History' : 'Historique',
          exact: true,
        });
        await expect(history).toHaveAttribute('aria-selected', 'true');
        await expect(history).toBeFocused();
        const visibleTab = await history.evaluate((host) => {
          const bounds = host.getBoundingClientRect();
          const tablist = host.closest('[role="tablist"]');
          if (!tablist) throw new Error('Expected the selected tab inside its tab list');
          const strip = tablist.getBoundingClientRect();
          return bounds.left >= strip.left - 1 && bounds.right <= strip.right + 1;
        });
        expect(visibleTab).toBe(true);
        await history.press('Home');
        await expect(recipe).toHaveAttribute('aria-selected', 'true');
        const footer = routed(page).locator('ion-footer');
        const edit = footer.getByRole('button', {
          name: english ? 'Edit recipe' : 'Modifier la recette',
          exact: true,
        });
        const start = footer.getByRole('button', {
          name: english ? 'Start preparation' : 'Démarrer la préparation',
          exact: true,
        });
        const overflow = footer.getByRole('button', {
          name: english ? 'Recipe actions' : 'Actions sur la recette',
          exact: true,
        });
        await expect(footer.getByRole('button')).toHaveCount(3);
        await expect(start).toHaveText(english ? 'Start' : 'Démarrer');
        await expect(
          routed(page)
            .locator('ion-header')
            .getByRole('button', {
              name: english ? 'Recipe actions' : 'Actions sur la recette',
              exact: true,
            }),
        ).toHaveCount(0);
        const controls = [];
        for (const control of [edit, start, overflow]) {
          await expect(control).toBeVisible();
          const box = await control.boundingBox();
          if (!box) throw new Error('Expected visible reading action bounds');
          expect(box.width).toBeGreaterThanOrEqual(48 * scale - 1);
          expect(box.height).toBeGreaterThanOrEqual(48 * scale - 1);
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
          controls.push(box);
        }
        const [editBox, startBox, overflowBox] = controls;
        if (!editBox || !startBox || !overflowBox)
          throw new Error('Expected all three action bounds');
        expect(editBox.x + editBox.width).toBeLessThanOrEqual(startBox.x + 1);
        expect(startBox.x + startBox.width).toBeLessThanOrEqual(overflowBox.x + 1);
        expect(startBox.width).toBeLessThan(width - editBox.width - overflowBox.width + 1);
        await page.screenshot({ path: testInfo.outputPath('reading-shell.png') });
        const visualHeight = await start.evaluate((host) => {
          const pill = getComputedStyle(host, '::before');
          return (
            host.getBoundingClientRect().height - parseFloat(pill.top) - parseFloat(pill.bottom)
          );
        });
        expect(visualHeight).toBeCloseTo(40 * scale, 0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        );
        await overflow.click();
        const menu = page.getByRole('menu');
        await expect(
          menu.getByRole('menuitem', {
            name: english ? 'Edit recipe' : 'Modifier la recette',
            exact: true,
          }),
        ).toHaveCount(0);
        const moveToTrash = menu.getByRole('menuitem', {
          name: english ? 'Move to trash' : 'Mettre à la corbeille',
          exact: true,
        });
        await expect(moveToTrash).toBeInViewport({ ratio: 1 });
        await moveToTrash.click();
        const trash = page.locator('ion-alert:not(.overlay-hidden)');
        await expect(trash).toBeVisible();
        await trash
          .getByRole('button', { name: english ? 'Cancel' : 'Annuler', exact: true })
          .click();
        await expect(trash).toHaveCount(0);
        await expect(heading).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('reading-shell.png') });
        await tabs
          .getByRole('tab', { name: english ? 'Planning' : 'Planification', exact: true })
          .click();
        await expect(
          tabs.getByRole('tab', { name: english ? 'Planning' : 'Planification', exact: true }),
        ).toHaveAttribute('aria-selected', 'true');
        await expect(
          routed(page).getByRole('button', {
            name: english ? 'Start at' : 'Commencer à',
            exact: true,
          }),
        ).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('planning-shell.png') });
        await edit.click();
        await expect(
          routed(page)
            .locator('ion-footer')
            .getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true }),
        ).toBeVisible();
      });
    }
  }
}
