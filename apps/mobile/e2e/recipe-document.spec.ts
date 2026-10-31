import { test, expect } from './fixtures';
import { enterEditor, expectRecipeRevision, routed } from './ui-actions';

for (const en of [false, true]) {
  const suffix = en ? ' @en' : '';
  const labels = en
    ? {
        recipeName: 'Poolish + tangzhong',
        doughWeight: 'Dough weight (g)',
        water: 'Water',
        poolish: 'poolish',
        tangzhong: 'tangzhong',
        finalMix: 'Final mix',
        save: 'Save',
        cancel: 'Cancel',
        recipeTab: 'Recipe',
        planningTab: 'Planning',
        historyTab: 'History',
        discardConfirm: 'Discard changes',
        back: 'Back',
      }
    : {
        recipeName: 'Poolish + tangzhong',
        doughWeight: 'Poids de pâte (g)',
        water: 'Eau',
        poolish: 'poolish',
        tangzhong: 'tangzhong',
        finalMix: 'Mélange final',
        save: 'Enregistrer',
        cancel: 'Annuler',
        recipeTab: 'Recette',
        planningTab: 'Planification',
        historyTab: 'Historique',
        discardConfirm: 'Abandonner les modifications',
        back: 'Retour',
      };

  test.describe(`Recipe document${suffix}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/recipes');
      await routed(page).getByRole('heading', { name: labels.recipeName, level: 2 }).click();
      await expect(
        routed(page)
          .locator('ion-header')
          .getByRole('heading', { level: 1, name: labels.recipeName }),
      ).toBeVisible();
    });

    test(`One document while editing${suffix}`, async ({ page }) => {
      await enterEditor(page);

      // Verify the three always visible tabs
      const tabs = routed(page).getByRole('tab');
      await expect(tabs).toHaveCount(3);
      await expect(
        routed(page).getByRole('tab', { name: labels.recipeTab, exact: true }),
      ).toBeVisible();
      await expect(
        routed(page).getByRole('tab', { name: labels.planningTab, exact: true }),
      ).toBeVisible();
      await expect(
        routed(page).getByRole('tab', { name: labels.historyTab, exact: true }),
      ).toBeVisible();

      // Verify no inner navigation destinations exist for legacy separate sections
      await expect(
        routed(page).getByRole('tab', { name: /^(Composition|Components|Steps|Result)$/i }),
      ).toHaveCount(0);

      // Verify imported flourTotal recipe displays dough weight of 1774, not 1000
      const doughWeightInput = routed(page).getByRole('textbox', { name: labels.doughWeight });
      await expect(doughWeightInput).toBeVisible();
      await expect(doughWeightInput).toHaveValue('1774');

      // Final stage water raw input test
      const finalWaterInputName = `${labels.water}, ${labels.finalMix} (g)`;
      const finalWaterGroup = routed(page).getByRole('group', { name: labels.finalMix });
      const finalWaterInput = finalWaterGroup.getByRole('textbox', { name: finalWaterInputName });

      await expect(finalWaterInput).toBeVisible();
      await expect(finalWaterInput).toHaveValue('200');

      const saveButton = routed(page)
        .locator('ion-footer')
        .getByRole('button', { name: labels.save, exact: true });
      await expect(saveButton).toBeDisabled();
      await finalWaterInput.fill('201');
      await finalWaterInput.blur();
      await expect(saveButton).toBeEnabled();

      // Fill '-' and blur
      await finalWaterInput.fill('-');
      await finalWaterInput.blur();
      await expect(finalWaterInput).toHaveValue('-');
      await expect(saveButton).toBeDisabled();

      // Navigate to Planning tab and back to Recipe tab
      await routed(page).getByRole('tab', { name: labels.planningTab, exact: true }).click();
      await expect(
        routed(page).getByRole('tab', { name: labels.planningTab, exact: true }),
      ).toHaveAttribute('aria-selected', 'true');

      await routed(page).getByRole('tab', { name: labels.recipeTab, exact: true }).click();
      await expect(
        routed(page).getByRole('tab', { name: labels.recipeTab, exact: true }),
      ).toHaveAttribute('aria-selected', 'true');

      // Assert same raw text '-' remains and Save button is still disabled
      await expect(finalWaterInput).toHaveValue('-');
      await expect(saveButton).toBeDisabled();

      // Restore original raw value and commit
      await finalWaterInput.fill('201');
      await finalWaterInput.blur();
      await expect(finalWaterInput).toHaveValue('201');

      // A valid dirty value is saveable again
      await expect(saveButton).toBeEnabled();
    });

    test(`Stage edit${suffix}`, async ({ page }) => {
      await enterEditor(page);

      const poolishGroup = routed(page).getByRole('group', { name: labels.poolish });
      const tangzhongGroup = routed(page).getByRole('group', { name: labels.tangzhong });
      const finalGroup = routed(page).getByRole('group', { name: labels.finalMix });

      const poolishWaterInput = poolishGroup.getByRole('textbox', {
        name: `${labels.water}, ${labels.poolish} (g)`,
      });
      const tangzhongWaterInput = tangzhongGroup.getByRole('textbox', {
        name: `${labels.water}, ${labels.tangzhong} (g)`,
      });
      const finalWaterInput = finalGroup.getByRole('textbox', {
        name: `${labels.water}, ${labels.finalMix} (g)`,
      });

      // Verify baseline quantities
      await expect(poolishWaterInput).toHaveValue('300');
      await expect(tangzhongWaterInput).toHaveValue('250');
      await expect(finalWaterInput).toHaveValue('200');

      // Edit poolish water 300 -> 310
      await poolishWaterInput.fill('310');
      await poolishWaterInput.blur();

      // Tangzhong and final water remain fixed
      await expect(tangzhongWaterInput).toHaveValue('250');
      await expect(finalWaterInput).toHaveValue('200');

      // Save changes
      const saveButton = routed(page)
        .locator('ion-footer')
        .getByRole('button', { name: labels.save, exact: true });
      await saveButton.click();

      // Assert actual stored revision is 2 and no fake "Version 2" label exists
      await expectRecipeRevision(page, 2);

      // Return to Recipes view via ion-back-button
      const backButton = routed(page).locator('ion-header ion-back-button');
      await backButton.click();
      await expect(page).toHaveURL(/\/recipes$/);

      // Reopen recipe and re-enter editor
      await routed(page).getByRole('heading', { name: labels.recipeName, level: 2 }).click();
      await expect(
        routed(page)
          .locator('ion-header')
          .getByRole('heading', { level: 1, name: labels.recipeName }),
      ).toBeVisible();

      await enterEditor(page);

      // Assert persisted input values and updated total dough
      const reopenedPoolishGroup = routed(page).getByRole('group', { name: labels.poolish });
      const reopenedTangzhongGroup = routed(page).getByRole('group', { name: labels.tangzhong });
      const reopenedFinalGroup = routed(page).getByRole('group', { name: labels.finalMix });

      await expect(
        reopenedPoolishGroup.getByRole('textbox', {
          name: `${labels.water}, ${labels.poolish} (g)`,
        }),
      ).toHaveValue('310');
      await expect(
        reopenedTangzhongGroup.getByRole('textbox', {
          name: `${labels.water}, ${labels.tangzhong} (g)`,
        }),
      ).toHaveValue('250');
      await expect(
        reopenedFinalGroup.getByRole('textbox', {
          name: `${labels.water}, ${labels.finalMix} (g)`,
        }),
      ).toHaveValue('200');

      const doughWeightInput = routed(page).getByRole('textbox', { name: labels.doughWeight });
      await expect(doughWeightInput).toHaveValue('1784');
    });

    test(`Disclosure state survives accepted history and save${suffix}`, async ({ page }) => {
      await enterEditor(page);
      const flours = routed(page).getByRole('button', { name: /^(Farines|Flours)\(/ });
      await flours.click();
      await expect(flours).toHaveAttribute('aria-expanded', 'false');
      const salt = routed(page).getByRole('textbox', {
        name: en ? 'Salt, Final mix (g)' : 'Sel, Mélange final (g)',
        exact: true,
      });
      await salt.fill('22');
      await salt.blur();
      const footer = routed(page).locator('ion-footer');
      await footer
        .getByRole('button', {
          name: en ? 'Undo last change' : 'Annuler la dernière modification',
          exact: true,
        })
        .click();
      await expect(salt).toHaveValue('20');
      await expect(flours).toHaveAttribute('aria-expanded', 'false');
      await footer.getByRole('button', { name: en ? 'Redo' : 'Rétablir', exact: true }).click();
      await expect(salt).toHaveValue('22');
      await expect(flours).toHaveAttribute('aria-expanded', 'false');
      await footer.getByRole('button', { name: labels.save, exact: true }).click();
      await expectRecipeRevision(page, 2);
      await expect(flours).toHaveAttribute('aria-expanded', 'false');
    });

    test(`Enlarged editor keeps controls and complete words in view${suffix}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 851 });
      await page.addStyleTag({ content: 'html,body{font-size:20.8px!important}' });
      await enterEditor(page);
      const final = routed(page).getByRole('group', { name: labels.finalMix, exact: true });
      await final.scrollIntoViewIfNeeded();
      const words = await final.locator('label').evaluateAll((nodes) =>
        nodes.flatMap((label) => {
          const node = [...label.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
          if (!node?.textContent) return [];
          return [...node.textContent.matchAll(/\S+/g)].map((match) => {
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            return { word: match[0], lines: range.getClientRects().length };
          });
        }),
      );
      expect(words.length).toBeGreaterThan(0);
      expect(words.filter((item) => item.lines > 1)).toEqual([]);
      for (const button of await routed(page).locator('ion-footer').getByRole('button').all()) {
        const box = await button.boundingBox();
        if (!box) throw new Error('Editor action has no bounds');
        expect(box.width).toBeGreaterThanOrEqual(48 * 1.3 - 1);
        expect(box.height).toBeGreaterThanOrEqual(48 * 1.3 - 1);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(360);
      }
    });

    test(`Dirty Cancel${suffix}`, async ({ page }) => {
      await enterEditor(page);

      const poolishGroup = routed(page).getByRole('group', { name: labels.poolish });
      const poolishWaterInput = poolishGroup.getByRole('textbox', {
        name: `${labels.water}, ${labels.poolish} (g)`,
      });

      await expect(poolishWaterInput).toHaveValue('300');

      // Edit to 310 and blur
      await poolishWaterInput.fill('310');
      await poolishWaterInput.blur();
      await expect(poolishWaterInput).toHaveValue('310');

      // Cancel button in footer triggers confirmation alert
      await expect(routed(page)).toHaveCount(1);
      const cancelButton = routed(page)
        .locator('ion-footer')
        .getByRole('button', { name: labels.cancel, exact: true })
        .locator('visible=true');
      await cancelButton.click();

      const alert = page.locator('ion-alert');
      await expect(alert).toBeVisible();

      // Cancel the alert
      const alertCancelButton = alert
        .getByRole('button', { name: labels.cancel, exact: true })
        .locator('visible=true');
      await alertCancelButton.click();
      await expect(alert).toBeHidden();

      // Verify still editing with dirty input 310
      await expect(poolishWaterInput).toHaveValue('310');

      // Click Cancel again and accept discard
      await cancelButton.click();
      await expect(alert).toBeVisible();

      const discardButton = alert.getByRole('button', { name: labels.discardConfirm, exact: true });
      await discardButton.click();
      await expect(alert).toBeHidden();

      // Re-enter or inspect editor: original 300 preserved and revision remains 1
      await enterEditor(page);
      const restoredPoolishGroup = routed(page).getByRole('group', { name: labels.poolish });
      await expect(
        restoredPoolishGroup.getByRole('textbox', {
          name: `${labels.water}, ${labels.poolish} (g)`,
        }),
      ).toHaveValue('300');

      await expectRecipeRevision(page, 1);
    });
  });
}
