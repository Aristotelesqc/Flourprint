import { expect, test } from './fixtures';
import { editorSection, enterEditor, routed } from './ui-actions';

for (const english of [false, true]) {
  for (const theme of ['light', 'dark', 'amoled'] as const) {
    test(`active preparation actions reflow and work at 360px with long names and 20px text: ${theme}${english ? ' @en' : ''}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/advanced');
      await routed(page)
        .getByRole('button', {
          name:
            theme === 'amoled'
              ? /^AMOLED$/
              : theme === 'light'
                ? /^(Clair|Light)$/
                : /^(Sombre|Dark)$/,
        })
        .click();
      await routed(page).locator('ion-back-button').click();
      await routed(page).getByText('Poolish + tangzhong', { exact: true }).click();
      await expect(routed(page)).toHaveCount(1);
      await enterEditor(page);
      await editorSection(page, 'steps');
      await routed(page)
        .getByRole('button', {
          name: english ? 'Edit step Preferment' : 'Modifier l’étape Préferment',
          exact: true,
        })
        .click();
      const modal = page.locator('ion-modal:not(.overlay-hidden)');
      const longName = english
        ? 'QA — Long preferment stage with instructions for resting and folding the dough'
        : 'QA — Préferment avec une longue description de repos et de rabats';
      await modal
        .getByLabel(english ? 'Step name (optional)' : 'Nom de l’étape (facultatif)', {
          exact: true,
        })
        .fill(longName);
      await modal.getByRole('button', { name: english ? 'Close' : 'Fermer', exact: true }).click();
      await expect(modal).toHaveCount(0);
      await routed(page)
        .locator('ion-footer')
        .getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true })
        .click();
      await expect(routed(page).getByText('Version 2', { exact: true })).toBeVisible();
      await routed(page)
        .getByRole('button', {
          name: english ? 'Start preparation' : 'Démarrer la préparation',
          exact: true,
        })
        .click();
      await page
        .locator('ion-alert')
        .getByRole('button', { name: english ? 'Start' : 'Démarrer', exact: true })
        .click();
      await expect(page).toHaveURL(/\/bakes\//);
      await expect(routed(page)).toHaveCount(1);
      // Return through the app after the write; no reload can race browser snapshot persistence.
      await routed(page).locator('ion-back-button').click();
      await expect(routed(page)).toHaveCount(1);
      await expect(routed(page).getByText('Version 2', { exact: true })).toBeVisible();
      await routed(page).locator('ion-back-button').click();
      await expect(page).toHaveURL(/\/recipes$/);
      await expect(routed(page)).toHaveCount(1);
      await routed(page)
        .getByRole('link', {
          name: english ? 'Preparations in progress' : 'Préparations en cours',
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(/\/bakes$/);
      await expect(routed(page)).toHaveCount(1);
      const card = routed(page).getByRole('region', { name: 'Poolish + tangzhong', exact: true });
      const open = card.locator('ion-button').filter({ hasText: english ? /^Open$/ : /^Ouvrir$/ });
      const actions = card.locator('div').filter({
        has: page.locator('ion-button').filter({ hasText: english ? /^Open$/ : /^Ouvrir$/ }),
      });
      for (const fontSize of [16, 20]) {
        await page.addStyleTag({ content: `html, body { font-size: ${fontSize}px !important; }` });
        await expect(actions).toHaveCount(1);
        await expect
          .poll(() => actions.evaluate((el) => el.scrollWidth - el.clientWidth))
          .toBeLessThanOrEqual(1);
        const bounds = await actions.boundingBox();
        if (!bounds) throw new Error('Preparation actions must have rendered bounds');
        const controls = actions.getByRole('button').or(actions.getByRole('link'));
        await expect(controls).toHaveCount(3);
        for (const control of await controls.all()) {
          const box = await control.boundingBox();
          if (!box) throw new Error('Each preparation action must have a rendered target');
          // Transformed Chromium bounds can be 47.99997 for a 48px target.
          expect(box.height).toBeGreaterThanOrEqual(48 - 0.01);
          expect(box.x).toBeGreaterThanOrEqual(bounds.x - 1);
          expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
        }
      }
      await card
        .getByRole('button', {
          name: english ? `Start ${longName}` : `Commencer : ${longName}`,
          exact: true,
        })
        .click();
      await expect(
        card.getByRole('button', {
          name: english ? `${longName} done` : `${longName} terminé`,
          exact: true,
        }),
      ).toBeVisible();
      await card.getByRole('button', { name: 'Note', exact: true }).click();
      await expect(modal).toBeVisible();
      await modal
        .getByRole('button', { name: english ? 'Cancel' : 'Annuler', exact: true })
        .click();
      await expect(modal).toHaveCount(0);
      await open.click();
      await expect(page).toHaveURL(/\/bakes\//);
      await expect(routed(page)).toHaveCount(1);
      await expect(
        routed(page).getByRole('heading', { name: longName, exact: true }),
      ).toBeVisible();
      await expect(routed(page)).toHaveCount(1);
    });
  }
}
