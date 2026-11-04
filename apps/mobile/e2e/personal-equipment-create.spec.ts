import { expect, test, type Page } from '@playwright/test';
import type { EquipmentEntry, Process, StepEquipment } from '@flourprint/core/domain';
import { enterEditor, expectRecipeRevision, routed } from './ui-actions';

const recipeId = 'personal-equipment-fixture';
const recipeName = 'Personal equipment fixture';
const panel = (page: Page) => page.getByTestId('step-equipment-fields').filter({ visible: true });
const items = (page: Page) => page.getByTestId('step-equipment-items').filter({ visible: true });
const sheet = (page: Page) => page.locator('ion-modal').filter({ visible: true });
const footer = (page: Page) => routed(page).locator('ion-footer, [data-testid="recipe-draft-bar"]');
const save = (page: Page) => footer(page).getByRole('button', { name: /^(Save|Enregistrer)$/ });
const close = (page: Page) => sheet(page).getByRole('button', { name: /^(Close|Fermer)$/ });
const support = /^(Baking support|Support de cuisson),/;
const vessel = /^(Baking vessel|Récipient de cuisson),/;
const cover = /^(Vessel cover|Couverture du récipient),/;
const steelRef = { id: 'baking-steel', version: 1 };

const equipmentGroup = (page: Page, kind: 'support' | 'vessel') =>
  items(page).getByRole('group', {
    name:
      kind === 'support'
        ? /^(Baking support|Support de cuisson)$/
        : /^(Baking vessel|Récipient de cuisson)$/,
  });

async function expectCreationFeedback(page: Page, kind: 'support' | 'vessel', name: string) {
  const group = equipmentGroup(page, kind);
  const status = group.getByRole('status');
  await expect(status).toContainText(name);
  await expect(
    equipmentGroup(page, kind === 'support' ? 'vessel' : 'support').getByRole('status'),
  ).toHaveCount(0);
  const action = kind === 'support' ? addSupport(page) : addVessel(page);
  const [actionBox, statusBox, groupBox] = await Promise.all([
    action.boundingBox(),
    status.boundingBox(),
    group.boundingBox(),
  ]);
  if (!actionBox || !statusBox || !groupBox) throw new Error('Creation feedback has no layout');
  expect(statusBox.y).toBeGreaterThanOrEqual(actionBox.y + actionBox.height - 1);
  expect(statusBox.x).toBeGreaterThanOrEqual(groupBox.x - 1);
  expect(statusBox.x + statusBox.width).toBeLessThanOrEqual(groupBox.x + groupBox.width + 1);
  expect(await status.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
}

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

const createArea = (page: Page) =>
  sheet(page).getByRole('region', { name: /personal|personnel|profile|profil/i });
const addSupport = (page: Page) =>
  items(page).getByRole('button', {
    name: /^(Add personal support|Ajouter un support personnel)$/,
  });
const addVessel = (page: Page) =>
  items(page).getByRole('button', {
    name: /^(Add personal vessel|Ajouter un récipient personnel)$/,
  });
const create = (page: Page) =>
  createArea(page).getByRole('button', {
    name: /^(Create equipment|Créer l’équipement|Create profile|Créer le profil)$/,
  });
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
    await expectCreationFeedback(page, 'vessel', 'Cocotte personnelle / My pot');
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
    const popover = page.locator('ion-popover:visible');
    await expect(popover).toBeVisible();
    await popover.evaluate(async (element) => {
      await (element as HTMLElement & { present(): Promise<void> }).present();
    });
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
    await expectCreationFeedback(page, 'support', 'Deuxième support');
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
        for (const kind of ['support', 'vessel'] as const) {
          await (kind === 'support' ? addSupport(page) : addVessel(page)).click();
          const name = `${kind === 'support' ? 'Support personnel' : 'Récipient personnel'} — ${theme}`;
          await itemName(page).fill(name);
          await create(page).click();
          await expect(createArea(page)).toBeHidden();
          await expectCreationFeedback(page, kind, name);
          await equipmentGroup(page, kind).screenshot({
            path: `../../.agy-runs/personal-items-169/feedback-fix/${english ? 'en' : 'fr'}-${theme}-${large ? '360-130' : '393-100'}-${kind}.png`,
          });
        }
        await close(page).click();
        await expect(sheet(page)).toBeHidden();
      });
    }
}

const profilePicker = (page: Page) =>
  panel(page).getByRole('button', { name: /^(Appliance profile|Profil d[’']appareil),/ });
const addProfile = (page: Page) =>
  panel(page).getByRole('button', {
    name: /^(Add appliance profile|Ajouter un profil d[’']appareil)$/,
  });
async function chooseProfile(page: Page, name: RegExp) {
  await profilePicker(page).press('Space');
  await page.getByRole('radio', { name, exact: true }).click();
  await expect(page.locator('ion-popover:visible')).toHaveCount(0);
}

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';
  test(`Appliance profile creation stays independent and selection changes only the exact profile ref${suffix}`, async ({
    page,
  }) => {
    const original = {
      appliance: 'oven',
      mode: 'topBottom',
      nativeMode: 'Literal factory label',
      setpointC: 232,
      level: { value: 3, of: 5 },
      fan: 'on',
      steam: { source: 'manual', detail: 'Literal steam note' },
      support: { item: steelRef },
      preheated: { appliance: 'cold', support: 'hot' },
      rack: 'middle',
    } as const;
    await open(page, original);
    await addProfile(page).click();
    await expect(addSupport(page)).toBeDisabled();
    await expect(addVessel(page)).toBeDisabled();
    await itemName(page).fill('Profil personnel de cuisine');
    await create(page).click();
    await expect(createArea(page)).toBeHidden();
    await expect(addProfile(page)).toBeFocused();
    await expect(profilePicker(page)).not.toHaveAccessibleName(/Profil personnel de cuisine/);
    await expect.poll(async () => (await storedEquipment(page)).length).toBe(1);
    const entry = (await storedEquipment(page))[0];
    if (!entry) throw new Error('Profile missing from stored backup');
    expect(entry).toMatchObject({
      kind: 'appliance',
      name: 'Profil personnel de cuisine',
      version: 1,
      builtIn: false,
      archived: false,
    });
    for (const key of [
      'appliance',
      'modes',
      'shape',
      'material',
      'coating',
      'interior',
      'volumeMl',
    ])
      expect(entry).not.toHaveProperty(key);
    await close(page).click();
    await expect(save(page)).toBeDisabled();
    await edit(page);
    await chooseProfile(page, /^Profil personnel de cuisine$/);
    await close(page).click();
    await footer(page)
      .getByRole('button', { name: /^(Undo last change|Annuler la dernière modification)$/ })
      .click();
    await edit(page);
    await expect(profilePicker(page)).not.toHaveAccessibleName(/Profil personnel de cuisine/);
    await close(page).click();
    await footer(page)
      .getByRole('button', { name: /^(Redo|Rétablir)$/ })
      .click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]?.equipment).toEqual({
      ...original,
      profile: { id: entry.id, version: 1 },
    });
    await page.reload();
    await expectRecipeRevision(page, 2);
    await edit(page);
    await expect(profilePicker(page)).toHaveAccessibleName(/Profil personnel de cuisine/);
    await chooseProfile(page, /^(Not specified|Non renseigné)$/);
    await close(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 3);
    expect((await storedProcess(page))?.steps[1]?.equipment).toEqual(original);
  });

  test(`Profile uses saved old archived versions, and selecting a different appliance type leaves step intent unchanged${suffix}`, async ({
    page,
  }) => {
    const entry = (
      id: string,
      version: number,
      name: string,
      archived = false,
    ): EquipmentEntry => ({
      id,
      version,
      name,
      kind: 'appliance',
      appliance: 'stovetop',
      builtIn: false,
      archived,
      createdAt: '2026-11-04T00:00:00.000Z' as EquipmentEntry['createdAt'],
    });
    await open(
      page,
      {
        appliance: 'oven',
        mode: 'convection',
        setpointC: 210,
        profile: { id: 'personal-oven', version: 1 },
      },
      [
        entry('personal-oven', 1, 'Old profile'),
        entry('personal-oven', 2, 'New profile'),
        entry('archived-oven', 1, 'Hidden archived', true),
      ],
    );
    await expect(profilePicker(page)).toHaveAccessibleName(/Old profile/);
    await close(page).click();
    await expect(save(page)).toBeDisabled();
    await edit(page);
    await profilePicker(page).press('Space');
    await expect(page.getByRole('radio', { name: 'New profile', exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Hidden archived', exact: true })).toHaveCount(0);
    await page.getByRole('radio', { name: 'New profile', exact: true }).click();
    await expect(page.locator('ion-popover:visible')).toHaveCount(0);
    await close(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]?.equipment).toEqual({
      appliance: 'oven',
      mode: 'convection',
      setpointC: 210,
      profile: { id: 'personal-oven', version: 2 },
    });
  });

  test(`Profile creation dirty guards coexist with cooking raw guards and scoped Cancel${suffix}`, async ({
    page,
  }) => {
    await open(page);
    const power = panel(page).getByRole('textbox', { name: /^(Power level|Niveau de puissance)$/ });
    await power.fill('-');
    await addProfile(page).click();
    await create(page).click();
    await expect(createArea(page).getByRole('alert')).toHaveCount(1);
    await itemName(page).fill('Unfinished profile');
    await close(page).click();
    await expect(itemName(page)).toHaveValue('Unfinished profile');
    await page.keyboard.press('Escape');
    await expect(itemName(page)).toHaveValue('Unfinished profile');
    await cancelCreate(page).click();
    await expect(addProfile(page)).toBeFocused();
    await close(page).click();
    await expect(power).toHaveValue('-');
    await power.fill('3');
    await power.press('Tab');
    await close(page).click();
    await expect(sheet(page)).toBeHidden();
    expect(await storedEquipment(page)).toHaveLength(0);
  });
}

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';
  for (const state of ['archived', 'missing', 'wrong-kind'] as const) {
    test(`Appliance profile ${state} reference stays exact until explicit clearing${suffix}`, async ({
      page,
    }) => {
      const entry: EquipmentEntry = {
        id: 'archived-profile',
        version: 1,
        name: 'Archived kitchen profile',
        kind: 'appliance',
        appliance: 'oven',
        builtIn: false,
        archived: true,
        createdAt: '2026-11-04T00:00:00.000Z' as EquipmentEntry['createdAt'],
      };
      const ref =
        state === 'archived'
          ? { id: entry.id, version: 1 }
          : state === 'wrong-kind'
            ? steelRef
            : { id: 'private-unresolved-profile', version: 7 };
      await open(page, { profile: ref }, state === 'archived' ? [entry] : []);
      await expect(profilePicker(page)).toHaveAccessibleName(
        state === 'archived'
          ? /Archived kitchen profile/
          : /Unresolved item|introuvable|indisponible/i,
      );
      await expect(panel(page)).not.toContainText('private-unresolved-profile');
      await close(page).click();
      await expect(save(page)).toBeDisabled();
      expect((await storedProcess(page))?.steps[1]?.equipment).toEqual({ profile: ref });
      await edit(page);
      await chooseProfile(page, /^(Not specified|Non renseigné)$/);
      await close(page).click();
      await save(page).click();
      await expectRecipeRevision(page, 2);
      expect((await storedProcess(page))?.steps[1]?.equipment).toBeUndefined();
    });
  }
  for (const theme of ['light', 'dark', 'amoled'])
    for (const large of [false, true]) {
      test(`Appliance profile layout and no-default selection ${theme} ${large ? '360-130' : '393-100'}${suffix}`, async ({
        page,
      }) => {
        await open(page, undefined, [], theme, large);
        await addProfile(page).click();
        await itemName(page).fill('Profil personnel du grand four de cuisine');
        await createArea(page)
          .getByRole('button', { name: /^(Appliance|Appareil|Type|Profile appliance)/ })
          .press('Space');
        await page.getByRole('radio', { name: /^(Oven|Four)$/, exact: true }).click();
        await expect(page.locator('ion-popover:visible')).toHaveCount(0);
        await create(page).click();
        await expect(createArea(page)).toBeHidden();
        await expect(profilePicker(page)).not.toHaveAccessibleName(
          /Profil personnel du grand four/,
        );
        const group = panel(page).getByRole('group', {
          name: /^(Appliance profile|Profil d[’']appareil)$/,
        });
        await expect(group.getByRole('status')).toContainText('Profil personnel du grand four');
        expect(await group.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await group.screenshot({
          path: `../../.agy-runs/appliance-profiles-169/captures/${english ? 'en' : 'fr'}-${theme}-${large ? '360-130' : '393-100'}-created.png`,
        });
        await chooseProfile(page, /^Profil personnel du grand four de cuisine$/);
        await expect(
          panel(page).getByRole('button', { name: /^(Appliance|Appareil),/ }),
        ).toHaveAccessibleName(/Not specified|Non renseigné/);
        await group.screenshot({
          path: `../../.agy-runs/appliance-profiles-169/captures/${english ? 'en' : 'fr'}-${theme}-${large ? '360-130' : '393-100'}-selected.png`,
        });
        await close(page).click();
        await save(page).click();
        await expectRecipeRevision(page, 2);
        const eq = (await storedProcess(page))?.steps[1]?.equipment;
        expect(eq).toHaveProperty('profile');
        for (const key of ['appliance', 'mode', 'nativeMode', 'setpointC', 'heat', 'fan', 'steam'])
          expect(eq).not.toHaveProperty(key);
      });
    }
}
