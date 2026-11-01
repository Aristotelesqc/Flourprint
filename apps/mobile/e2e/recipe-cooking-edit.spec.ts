import { expect, test, type Page } from '@playwright/test';
import type { Process, StepEquipment } from '@flourprint/core/domain';
import { enterEditor, expectRecipeRevision, routed } from './ui-actions';

const recipeId = 'cooking-authoring-fixture';
const recipeName = 'Independent cooking authoring';
const panel = (page: Page) => page.getByTestId('step-equipment-fields').filter({ visible: true });
const sheet = (page: Page) => page.locator('ion-modal').filter({ visible: true });
const footer = (page: Page) => routed(page).locator('ion-footer');
const save = (page: Page) =>
  footer(page).getByRole('button', { name: /^(Save|Enregistrer)$/, exact: true });
const close = (page: Page) =>
  sheet(page).getByRole('button', { name: /^(Close|Fermer)$/, exact: true });
const setpoint = (page: Page) =>
  panel(page).getByRole('textbox', { name: /^(Setpoint|Consigne) \(°[CF]\)$/ });

async function editCooking(page: Page) {
  await enterEditor(page);
  await routed(page)
    .getByTestId('recipe-method')
    .getByRole('button', {
      name: /^(Edit step|Modifier l’étape) Cook fixture$/,
      exact: true,
    })
    .click();
  await expect(panel(page)).toBeVisible();
}

async function open(
  page: Page,
  equipment?: StepEquipment,
  theme = 'light',
  large = false,
  fahrenheit = false,
) {
  await page.setViewportSize({ width: large ? 360 : 393, height: 900 });
  await page.goto('/advanced');
  await routed(page)
    .getByRole('button', {
      name:
        theme === 'amoled'
          ? /^AMOLED$/
          : theme === 'dark'
            ? /^(Sombre(?: chaud)?|(?:Warm )?[Dd]ark)$/
            : /^(Clair|Light)$/,
    })
    .click();
  if (fahrenheit)
    await routed(page)
      .getByRole('group', { name: /^(Oven|Four)$/, exact: true })
      .getByRole('button', { name: '°F', exact: true })
      .click();
  await routed(page)
    .locator('input[type=file]')
    .setInputFiles({
      name: 'cooking-authoring.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          kind: 'flourprint-recipes',
          schemaVersion: 1,
          exportedAt: '2026-10-30T12:00:00.000Z',
          families: [],
          recipes: [
            {
              id: recipeId,
              name: recipeName,
              revisions: [
                {
                  recipeId,
                  version: 1,
                  createdAt: '2026-10-30T12:00:00.000Z',
                  formula: {
                    flours: [{ id: 'bread-flour', sharePct: 100 }],
                    ingredients: [{ id: 'water', kind: 'water', bakerPct: 70, role: 'dough' }],
                    components: [],
                    anchor: { kind: 'flourTotal', grams: 500 },
                  },
                  process: {
                    steps: [
                      {
                        id: 'mix',
                        operation: 'mix',
                        label: 'Mix fixture',
                        dependsOn: [],
                        schedule: 'asap',
                        plannedDurationS: 300,
                      },
                      {
                        id: 'cook',
                        operation: 'bake',
                        label: 'Cook fixture',
                        dependsOn: ['mix'],
                        schedule: 'asap',
                        plannedDurationS: 1200,
                        conditions: { temperatureC: 24 },
                        ...(equipment ? { equipment } : {}),
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      ),
    });
  await expect(
    routed(page).getByText(/^(1 recipe imported\.|1 recette importée\.)$/),
  ).toBeVisible();
  await routed(page).locator('ion-back-button').click();
  await routed(page).getByRole('heading', { name: recipeName, level: 2 }).click();
  await expectRecipeRevision(page, 1);
  if (large) await page.addStyleTag({ content: 'html,body{font-size:20.8px!important}' });
  await editCooking(page);
}

async function choose(page: Page, label: RegExp, option: RegExp) {
  await panel(page).getByRole('button', { name: label }).press('Space');
  await page.getByRole('radio', { name: option, exact: true }).click();
  await expect(page.locator('ion-popover:visible')).toHaveCount(0);
}

const applianceLabel = /^(Appliance|Appareil),/;
const modeLabel = /^(Oven mode|Mode du four),/;
const ovenOption = /^(Oven|Four)$/;
const broilOption = /^(Broil|Griller)$/;
const unsetOption = /^(Not specified|Non renseigné)$/;

async function storedProcess(page: Page): Promise<Process | undefined> {
  return page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('flourprint-preview', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const snapshot = await new Promise<unknown>((resolve, reject) => {
        const request = db.transaction('snapshots').objectStore('snapshots').get('backup');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (typeof snapshot !== 'string') return undefined;
      const backup = JSON.parse(snapshot) as {
        recipes: { id: string; revisions: { process: Process }[] }[];
      };
      return backup.recipes.find((recipe) => recipe.id === id)?.revisions.at(-1)?.process;
    } finally {
      db.close();
    }
  }, recipeId);
}

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';
  test(`Cooking settings save without a profile and support undo redo and reload${suffix}`, async ({
    page,
  }) => {
    await open(page);
    await expect(setpoint(page)).toHaveValue('');
    await choose(page, applianceLabel, ovenOption);
    await choose(page, modeLabel, broilOption);
    await expect(
      panel(page).getByText(
        english
          ? 'Only the top element runs, with direct radiant heat; distinct from an outdoor barbecue grill.'
          : 'Seul l’élément du haut chauffe, par rayonnement direct ; distinct d’un gril de barbecue.',
        { exact: true },
      ),
    ).toBeVisible();
    await setpoint(page).fill('230');
    await setpoint(page).press('Enter');
    await close(page).click();
    await footer(page)
      .getByRole('button', {
        name: /^(Undo last change|Annuler la dernière modification)$/,
        exact: true,
      })
      .click();
    await editCooking(page);
    await expect(setpoint(page)).toHaveValue('');
    await close(page).click();
    await footer(page)
      .getByRole('button', { name: /^(Redo|Rétablir)$/, exact: true })
      .click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    const saved = (await storedProcess(page))?.steps[1];
    expect(saved?.equipment).toEqual({ appliance: 'oven', mode: 'broil', setpointC: 230 });
    expect(saved).toMatchObject({
      operation: 'bake',
      plannedDurationS: 1200,
      conditions: { temperatureC: 24 },
    });
    await page.reload();
    await expectRecipeRevision(page, 2);
    await editCooking(page);
    await expect(setpoint(page)).toHaveValue('230');
  });

  test(`Cooking edits preserve unexposed settings and use the existing Fahrenheit conversion${suffix}`, async ({
    page,
  }) => {
    const equipment: StepEquipment = {
      appliance: 'oven',
      mode: 'broil',
      nativeMode: 'Personal broil',
      setpointC: 250,
      level: { value: 3, of: 5 },
      fan: 'unknown',
      steam: { source: 'manual', detail: 'Water tray' },
      support: { item: { id: 'baking-steel', version: 1 } },
      vessel: { item: { id: 'cast-iron-skillet', version: 1 }, cover: 'unknown' },
      preheated: { appliance: 'cold' },
      rack: 'middle',
      load: { pieces: 1, massG: 400 },
    };
    await open(page, equipment, 'light', false, true);
    await expect(setpoint(page)).toHaveValue('482');
    await setpoint(page).focus();
    await setpoint(page).blur();
    await setpoint(page).fill('212');
    await setpoint(page).press('Enter');
    await close(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]?.equipment).toEqual({
      ...equipment,
      setpointC: 100,
    });
    expect((await storedProcess(page))?.steps[1]?.conditions).toEqual({ temperatureC: 24 });
  });

  test(`Cooking refusals are atomic and custom heat is cleared explicitly${suffix}`, async ({
    page,
  }) => {
    await open(page, { appliance: 'oven', mode: 'custom', heat: ['top'] });
    await choose(page, applianceLabel, /^(Stovetop|Plaque de cuisson)$/);
    await expect(sheet(page).getByRole('alert')).toHaveCount(1);
    await expect(sheet(page).getByRole('alert')).toContainText(english ? /oven/ : /four/);
    await expect(panel(page).locator('ion-select').first()).toHaveJSProperty('value', 'oven');
    await choose(page, modeLabel, broilOption);
    await expect(sheet(page).getByRole('alert')).toHaveCount(1);
    await expect(sheet(page).getByRole('alert')).toContainText(english ? /custom/ : /personnalis/);
    await expect(panel(page).locator('ion-select').nth(1)).toHaveJSProperty('value', 'custom');
    const top = panel(page).getByRole('checkbox', {
      name: /^(Top element|Élément du haut)$/,
      exact: true,
    });
    await expect(top).toBeChecked();
    await top.uncheck();
    await choose(page, modeLabel, broilOption);
    await expect(sheet(page).getByRole('alert')).toHaveCount(0);
    await choose(page, modeLabel, unsetOption);
    await choose(page, applianceLabel, /^(Stovetop|Plaque de cuisson)$/);
    await close(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]?.equipment).toEqual({ appliance: 'stovetop' });
  });

  test(`Clearing the optional cooking settings removes equipment rather than inventing defaults${suffix}`, async ({
    page,
  }) => {
    await open(page, { appliance: 'oven', mode: 'broil', setpointC: 200 });
    await setpoint(page).fill('');
    await setpoint(page).press('Enter');
    await choose(page, modeLabel, unsetOption);
    await choose(page, applianceLabel, unsetOption);
    await close(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]).not.toHaveProperty('equipment');
  });

  test(`Incomplete setpoint remains visible when closing is attempted and can be cleared to unknown${suffix}`, async ({
    page,
  }) => {
    await open(page, { appliance: 'oven', setpointC: 200 });
    await setpoint(page).fill('-');
    await setpoint(page).blur();
    await expect(setpoint(page)).toHaveAttribute('aria-invalid', 'true');
    await close(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(setpoint(page)).toHaveValue('-');
    await setpoint(page).fill('');
    await setpoint(page).press('Enter');
    await close(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]?.equipment).toEqual({ appliance: 'oven' });
  });

  test(`Power fan and steam keep exact edits without a profile through undo and reload${suffix}`, async ({
    page,
  }) => {
    const equipment: StepEquipment = {
      appliance: 'oven',
      mode: 'broil',
      support: { item: { id: 'baking-steel', version: 1 } },
      vessel: { item: { id: 'cast-iron-skillet', version: 1 }, cover: 'covered' },
      preheated: { appliance: 'cold', vessel: 'hot' },
      rack: 'middle',
    };
    await open(page, equipment);
    const level = panel(page).getByRole('textbox', { name: /^(Power level|Niveau de puissance)$/ });
    const scale = panel(page).getByRole('textbox', {
      name: /^(Scale maximum|Maximum de l’échelle)$/,
    });
    await expect(scale).toBeDisabled();
    await level.fill(english ? '3.25' : '3,25');
    await level.press('Enter');
    await scale.fill('5');
    await scale.press('Enter');
    await choose(page, /^(Fan state|Ventilation),/, /^(Off|Désactivée)$/);
    await choose(page, /^(Steam source|Source de vapeur),/, /^(Manual addition|Ajout manuel)$/);
    const detail = panel(page).getByRole('textbox', {
      name: /^(Steam detail|Détail de la vapeur)$/,
    });
    await detail.fill('Ice cubes in a tray');
    await detail.blur();
    await choose(
      page,
      /^(Steam source|Source de vapeur),/,
      /^(Appliance function|Fonction de l’appareil)$/,
    );
    await expect(detail).toHaveValue('Ice cubes in a tray');
    await close(page).click();
    await footer(page)
      .getByRole('button', { name: /^(Undo last change|Annuler la dernière modification)$/ })
      .click();
    await editCooking(page);
    await expect(
      panel(page).getByRole('button', { name: /^(Steam source|Source de vapeur),/ }),
    ).toHaveAccessibleName(
      english ? 'Steam source, Manual addition' : 'Source de vapeur, Ajout manuel',
    );
    await close(page).click();
    await footer(page)
      .getByRole('button', { name: /^(Redo|Rétablir)$/ })
      .click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]).toMatchObject({
      operation: 'bake',
      conditions: { temperatureC: 24 },
      equipment: {
        ...equipment,
        level: { value: 3.25, of: 5 },
        fan: 'off',
        steam: { source: 'function', detail: 'Ice cubes in a tray' },
      },
    });
    expect((await storedProcess(page))?.steps[1]?.equipment).not.toHaveProperty('setpointC');
    expect((await storedProcess(page))?.steps[1]?.equipment).not.toHaveProperty('profile');
    await page.reload();
    await expectRecipeRevision(page, 2);
    await editCooking(page);
    await expect(level).toHaveValue(english ? '3.25' : '3,25');
    await expect(scale).toHaveValue('5');
    await expect(detail).toHaveValue('Ice cubes in a tray');
  });

  test(`Power refusals keep raw input and multiple invalid fields keep dismissal blocked${suffix}`, async ({
    page,
  }) => {
    await open(page, { level: { value: 3, of: 5 } });
    const level = panel(page).getByRole('textbox', { name: /^(Power level|Niveau de puissance)$/ });
    const scale = panel(page).getByRole('textbox', {
      name: /^(Scale maximum|Maximum de l’échelle)$/,
    });
    await level.fill('7');
    await level.press('Enter');
    await expect(level).toHaveValue('7');
    await expect(level).toHaveAttribute('aria-invalid', 'true');
    await expect(sheet(page).getByRole('status')).toHaveCount(1);
    await expect(sheet(page).getByRole('status')).toContainText(english ? /scale/ : /échelle/);
    await close(page).click();
    await expect(panel(page)).toBeVisible();
    await level.fill('-1');
    await level.press('Enter');
    await expect(sheet(page).getByRole('status')).toHaveCount(1);
    await expect(sheet(page).getByRole('status')).toContainText(english ? /zero/ : /zéro/);
    await level.fill('-');
    await level.blur();
    await setpoint(page).fill('-');
    await setpoint(page).blur();
    await level.fill('3');
    await level.press('Enter');
    await close(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(setpoint(page)).toHaveValue('-');
    await setpoint(page).fill('');
    await setpoint(page).press('Enter');
    await scale.fill('0');
    await scale.press('Enter');
    await expect(scale).toHaveAttribute('aria-invalid', 'true');
    await expect(sheet(page).getByRole('status')).toHaveCount(1);
    await expect(sheet(page).getByRole('status')).toContainText(
      english ? /greater than zero/ : /supérieur à zéro/,
    );
    await scale.fill('2');
    await scale.press('Enter');
    await expect(sheet(page).getByRole('status')).toContainText(english ? /scale/ : /échelle/);
    await scale.fill('10');
    await scale.press('Enter');
    await close(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]?.equipment).toEqual({
      level: { value: 3, of: 10 },
    });
  });

  test(`Explicit unknown fan and no steam differ from clearing equipment${suffix}`, async ({
    page,
  }) => {
    await open(page, { level: { value: 3, of: 5 }, steam: { source: 'manual', detail: 'Tray' } });
    await choose(page, /^(Fan state|Ventilation),/, /^(Unknown|Inconnue)$/);
    await choose(page, /^(Steam source|Source de vapeur),/, /^(No steam|Sans vapeur)$/);
    await close(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]?.equipment).toEqual({
      level: { value: 3, of: 5 },
      fan: 'unknown',
      steam: { source: 'none', detail: 'Tray' },
    });
    await editCooking(page);
    const level = panel(page).getByRole('textbox', { name: /^(Power level|Niveau de puissance)$/ });
    await level.fill('');
    await level.press('Enter');
    await choose(page, /^(Fan state|Ventilation),/, unsetOption);
    await choose(page, /^(Steam source|Source de vapeur),/, unsetOption);
    await close(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 3);
    expect((await storedProcess(page))?.steps[1]).not.toHaveProperty('equipment');
  });

  for (const theme of ['light', 'dark', 'amoled']) {
    for (const large of [false, true]) {
      test(`Cooking authoring fits ${theme} ${large ? '360/130' : '393/100'}${suffix}`, async ({
        page,
      }, testInfo) => {
        await open(
          page,
          {
            appliance: 'oven',
            mode: 'broil',
            setpointC: 250,
            level: { value: 7, of: 10 },
            fan: 'unknown',
            steam: { source: 'manual', detail: 'Ice cubes in a tray / Glaçons dans un plat' },
          },
          theme,
          large,
        );
        for (const control of [
          panel(page).locator('ion-select').first(),
          panel(page).locator('ion-select').nth(1),
          setpoint(page),
          panel(page).getByRole('textbox', { name: /^(Power level|Niveau de puissance)$/ }),
          panel(page).getByRole('textbox', { name: /^(Scale maximum|Maximum de l’échelle)$/ }),
          panel(page).getByRole('button', { name: /^(Fan state|Ventilation),/ }),
          panel(page).getByRole('button', { name: /^(Steam source|Source de vapeur),/ }),
          panel(page).getByRole('textbox', { name: /^(Steam detail|Détail de la vapeur)$/ }),
        ]) {
          await control.scrollIntoViewIfNeeded();
          const bounds = await control.boundingBox();
          if (!bounds) throw new Error('Cooking control has no bounds');
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(large ? 360 : 393);
        }
        await expect(panel(page)).toContainText(english ? /radiant heat/ : /rayonnement direct/);
        const unit = panel(page).getByText('°C', { exact: true });
        const unitDimensions = await unit.evaluate((element) => ({
          height: element.getBoundingClientRect().height,
          lineHeight: parseFloat(getComputedStyle(element).lineHeight),
        }));
        expect(unitDimensions.height).toBeLessThanOrEqual(unitDimensions.lineHeight + 1);
        const capture = testInfo.outputPath('cooking-authoring.png');
        await page.screenshot({ path: capture });
        await testInfo.attach('Cooking controls', { path: capture, contentType: 'image/png' });
        await close(page).click();
        await expect(save(page)).toBeDisabled();
      });
    }
  }
}
