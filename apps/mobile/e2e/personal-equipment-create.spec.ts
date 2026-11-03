import { expect, test, type Page } from '@playwright/test';
import type { EquipmentEntry, Process, StepEquipment } from '@flourprint/core/domain';
import { enterEditor, expectRecipeRevision, routed } from './ui-actions';

const recipeId = 'personal-equipment-fixture';
const recipeName = 'Personal equipment fixture';
const panel = (page: Page) => page.getByTestId('step-equipment-fields').filter({ visible: true });
const items = (page: Page) => page.getByTestId('step-equipment-items').filter({ visible: true });
const sheet = (page: Page) => page.locator('ion-modal').filter({ visible: true });
const footer = (page: Page) => routed(page).locator('ion-footer');
const save = (page: Page) => footer(page).getByRole('button', { name: /^(Save|Enregistrer)$/ });
const close = (page: Page) => sheet(page).getByRole('button', { name: /^(Close|Fermer)$/ });
const support = /^(Baking support|Support de cuisson),/;
const vessel = /^(Baking vessel|Récipient de cuisson),/;
const cover = /^(Vessel cover|Couverture du récipient),/;
const steelRef = { id: 'baking-steel', version: 1 };

async function edit(page: Page) {
  await enterEditor(page);
  await routed(page)
    .getByTestId('recipe-method')
    .getByRole('button', {
      name: /^(Edit step|Modifier l’étape) Cook fixture$/,
    })
    .click();
  await expect(items(page)).toBeVisible();
}

async function open(
  page: Page,
  equipment?: StepEquipment,
  entries: readonly EquipmentEntry[] = [],
  theme = 'light',
  large = false,
) {
  const snapshot = JSON.stringify({
    kind: 'flourprint-backup',
    schemaVersion: 3,
    exportedAt: '2026-11-01T12:00:00.000Z',
    families: [],
    bakes: [],
    equipment: entries,
    recipes: [
      {
        id: recipeId,
        name: recipeName,
        revisions: [
          {
            recipeId,
            version: 1,
            createdAt: '2026-11-01T12:00:00.000Z',
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
  });
  // Synthetic registry fixture, restored by the normal preview backup path once per context.
  await page.addInitScript((backup: string) => {
    try {
      if (localStorage.getItem('personal-equipment-loaded')) return;
      localStorage.setItem('personal-equipment-loaded', '1');
      const request = indexedDB.open('flourprint-preview', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('snapshots', 'readwrite');
        tx.objectStore('snapshots').add(backup, 'backup');
        tx.oncomplete = () => db.close();
        tx.onabort = () => db.close();
      };
    } catch {
      /* Opaque browser origins have no storage. */
    }
  }, snapshot);
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
  await routed(page).locator('ion-back-button').click();
  await routed(page).getByRole('heading', { name: recipeName, level: 2 }).click();
  await expectRecipeRevision(page, 1);
  if (large) await page.addStyleTag({ content: 'html,body{font-size:20.8px!important}' });
  await edit(page);
}

async function choose(page: Page, label: RegExp, option: RegExp) {
  await items(page).getByRole('button', { name: label }).press('Space');
  await page.getByRole('radio', { name: option, exact: true }).click();
  await expect(page.locator('ion-popover:visible')).toHaveCount(0);
}

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

async function storedEquipment(page: Page): Promise<EquipmentEntry[]> {
  return page.evaluate(async () => {
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
      return typeof snapshot === 'string'
        ? ((JSON.parse(snapshot) as { equipment?: EquipmentEntry[] }).equipment ?? [])
        : [];
    } finally {
      db.close();
    }
  });
}

const createArea = (page: Page) => sheet(page).getByRole('region', { name: /personal|personnel/i });
const addSupport = (page: Page) =>
  items(page).getByRole('button', {
    name: /^(Add personal support|Ajouter un support personnel)$/,
  });
const addVessel = (page: Page) =>
  items(page).getByRole('button', {
    name: /^(Add personal vessel|Ajouter un récipient personnel)$/,
  });
const create = (page: Page) =>
  createArea(page).getByRole('button', { name: /^(Create equipment|Créer l’équipement)$/ });
const cancelCreate = (page: Page) =>
  createArea(page).getByRole('button', { name: /^(Cancel|Annuler)$/ });
const itemName = (page: Page) => createArea(page).getByRole('textbox', { name: /^(Name|Nom)$/ });

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';
  test(`Personal vessel creation is independent, explicitly selected and retained after reload${suffix}`, async ({
    page,
  }) => {
    await open(page, {
      support: { item: steelRef },
      preheated: { vessel: 'cold', support: 'hot' },
      level: { value: 0, of: 5 },
    });
    await addVessel(page).click();
    await itemName(page).fill('Cocotte personnelle / My pot');
    await create(page).click();
    await expect(createArea(page)).toBeHidden();
    await expect(addVessel(page)).toBeFocused();
    await expect(items(page).getByRole('button', { name: vessel })).not.toHaveAccessibleName(
      /My pot/,
    );
    await expect.poll(async () => (await storedEquipment(page)).length).toBe(1);
    const entry = (await storedEquipment(page))[0];
    if (!entry) throw new Error('Created equipment missing from backup');
    expect(entry).toMatchObject({
      name: 'Cocotte personnelle / My pot',
      kind: 'vessel',
      version: 1,
      builtIn: false,
      archived: false,
    });
    for (const field of [
      'shape',
      'material',
      'coating',
      'volumeMl',
      'interior',
      'appliance',
      'notes',
      'lid',
    ])
      expect(entry).not.toHaveProperty(field);
    await choose(page, vessel, /^Cocotte personnelle \/ My pot$/);
    await expect(items(page).getByRole('button', { name: cover })).toHaveAccessibleName(
      english ? /Unknown/ : /Inconnue/,
    );
    await close(page).click();
    await footer(page)
      .getByRole('button', { name: /^(Undo last change|Annuler la dernière modification)$/ })
      .click();
    await edit(page);
    await expect(items(page).getByRole('button', { name: vessel })).not.toHaveAccessibleName(
      /My pot/,
    );
    expect(await storedEquipment(page)).toHaveLength(1);
    await close(page).click();
    await footer(page)
      .getByRole('button', { name: /^(Redo|Rétablir)$/ })
      .click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]?.equipment).toEqual({
      support: { item: steelRef },
      preheated: { vessel: 'cold', support: 'hot' },
      level: { value: 0, of: 5 },
      vessel: { item: { id: entry.id, version: 1 }, cover: 'unknown' },
    });
    await page.reload();
    await expectRecipeRevision(page, 2);
    await edit(page);
    await expect(items(page).getByRole('button', { name: vessel })).toHaveAccessibleName(/My pot/);
    await items(page).getByRole('button', { name: support }).press('Space');
    await expect(
      page.getByRole('radio', { name: 'Cocotte personnelle / My pot', exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('ion-popover:visible')).toHaveCount(0);
  });

  test(`Creation guards dirty input and Cancel writes nothing; blank name is refused once${suffix}`, async ({
    page,
  }) => {
    await open(page);
    await addSupport(page).click();
    await create(page).click();
    await expect(createArea(page).getByRole('alert')).toHaveCount(1);
    await itemName(page).fill('Support non enregistré');
    await expect(
      sheet(page).getByRole('button', { name: /^(Duplicate step|Dupliquer l[’']étape)$/ }),
    ).toBeDisabled();
    await expect(
      sheet(page).getByRole('button', { name: /^(Delete step|Supprimer l’étape)$/ }),
    ).toBeDisabled();
    await close(page).click();
    await expect(itemName(page)).toHaveValue('Support non enregistré');
    await page.keyboard.press('Escape');
    await expect(itemName(page)).toHaveValue('Support non enregistré');
    await cancelCreate(page).click();
    await expect(createArea(page)).toBeHidden();
    await expect(addSupport(page)).toBeFocused();
    await close(page).click();
    await expect(save(page)).toBeDisabled();
    expect(await storedEquipment(page)).toEqual([]);
  });

  test(`Creating a support never clears unrelated invalid raw input${suffix}`, async ({ page }) => {
    await open(page);
    const power = panel(page).getByRole('textbox', { name: /^(Power level|Niveau de puissance)$/ });
    await power.fill('bad');
    await addSupport(page).click();
    await itemName(page).fill('Support à garder');
    await create(page).click();
    await expect(createArea(page)).toBeHidden();
    await close(page).click();
    await expect(power).toHaveValue('bad');
    await expect(sheet(page)).toBeVisible();
    await power.fill('3');
    await power.press('Tab');
    await close(page).click();
    await expect(sheet(page)).toBeHidden();
  });
}

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';
  test(`Personal support characteristics remain literal and a version conflict is retryable${suffix}`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      Object.defineProperty(crypto, 'randomUUID', {
        configurable: true,
        value: () => 'personal-conflict-item',
      }),
    );
    await open(page, { support: { item: steelRef } });
    await addSupport(page).click();
    await itemName(page).fill('  Pierre personnelle  ');
    const select = async (label: RegExp, option: RegExp) => {
      await createArea(page).getByRole('button', { name: label }).press('Space');
      await page.getByRole('radio', { name: option, exact: true }).click();
      await expect(page.locator('ion-popover:visible')).toHaveCount(0);
    };
    await select(/^(Shape|Forme),/, /^(Baking stone|Pierre de cuisson)$/);
    await select(/^(Material|Matériau),/, /^(Cordierite|Cordiérite)$/);
    await select(/^(Coating|Revêtement),/, /^(Unknown coating|Revêtement inconnu)$/);
    await createArea(page)
      .getByRole('textbox', { name: /^(Notes|Remarques)$/ })
      .fill('  Observation littérale  ');
    await create(page).evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect(createArea(page)).toBeHidden();
    await expect.poll(async () => (await storedEquipment(page)).length).toBe(1);
    expect((await storedEquipment(page))[0]).toMatchObject({
      id: 'personal-conflict-item',
      name: 'Pierre personnelle',
      kind: 'support',
      version: 1,
      shape: 'stone',
      material: 'cordierite',
      coating: 'unknown',
      notes: '  Observation littérale  ',
    });
    await expect(items(page).getByRole('button', { name: support })).toHaveAccessibleName(
      /Baking steel|Plaque d’acier/,
    );
    await addSupport(page).click();
    await itemName(page).fill('Deuxième support');
    await create(page).click();
    await expect(createArea(page).getByRole('alert')).toHaveText(
      english ? /equipment.*another session/ : /équipement.*autre session/,
    );
    await expect(itemName(page)).toHaveValue('Deuxième support');
    await page.evaluate(() =>
      Object.defineProperty(crypto, 'randomUUID', {
        configurable: true,
        value: () => 'personal-retry-item',
      }),
    );
    await create(page).click();
    await expect(createArea(page)).toBeHidden();
    await expect.poll(async () => (await storedEquipment(page)).length).toBe(2);
    await close(page).click();
    await expect(save(page)).toBeDisabled();
    await page.reload();
    await expectRecipeRevision(page, 1);
    await edit(page);
    await choose(page, support, /^Deuxième support$/);
  });

  for (const theme of ['light', 'dark', 'amoled'])
    for (const large of [false, true]) {
      test(`Personal equipment layout ${theme} ${large ? '360-130' : '393-100'}${suffix}`, async ({
        page,
      }) => {
        await open(page, undefined, [], theme, large);
        await addVessel(page).click();
        await itemName(page).fill('Grande cocotte personnelle pour une recette au nom très long');
        await expect(sheet(page).getByRole('button', { name: /^(Close|Fermer)$/ })).toBeVisible();
        const form = createArea(page);
        expect(await form.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await create(page).scrollIntoViewIfNeeded();
        const box = await create(page).boundingBox();
        if (!box) throw new Error('Create action has no layout');
        expect(box.height).toBeGreaterThanOrEqual(48);
        expect(await create(page).evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('nowrap');
        await create(page).screenshot({
          path: `../../.agy-runs/personal-items-169/captures/${english ? 'en' : 'fr'}-${theme}-${large ? '360-130' : '393-100'}-actions.png`,
        });
        await form.screenshot({
          path: `../../.agy-runs/personal-items-169/captures/${english ? 'en' : 'fr'}-${theme}-${large ? '360-130' : '393-100'}-form.png`,
        });
        await cancelCreate(page).click();
        await expect(form).toBeHidden();
        await expect(addVessel(page)).toBeFocused();
        await close(page).click();
        await expect(sheet(page)).toBeHidden();
      });
    }
}
