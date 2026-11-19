import { expect, test, type Page } from '@playwright/test';
import type { EquipmentEntry, Instant, Process, StepEquipment } from '@flourprint/core/domain';
import { enterEditor, expectRecipeRevision, routed } from './ui-actions';

const recipeId = 'equipment-items-fixture';
const recipeName = 'Equipment items fixture';
const panel = (page: Page) => page.getByTestId('step-equipment-fields').filter({ visible: true });
const items = (page: Page) => page.getByTestId('step-equipment-items').filter({ visible: true });
const sheet = (page: Page) => page.locator('ion-modal').filter({ visible: true });
const footer = (page: Page) => routed(page).locator('ion-footer, [data-testid="recipe-draft-bar"]');
const save = (page: Page) => footer(page).getByRole('button', { name: /^(Save|Enregistrer)$/ });
const close = (page: Page) => sheet(page).getByRole('button', { name: /^(Close|Fermer)$/ });
const support = /^(Baking support|Support de cuisson),/;
const vessel = /^(Baking vessel|Récipient de cuisson),/;
const cover = /^(Vessel cover|Couverture du récipient),/;
const appliancePreheat = /^(Appliance preheat|Préchauffage de l’appareil),/;
const supportPreheat = /^(Support preheat|Préchauffage du support),/;
const vesselPreheat = /^(Vessel preheat|Préchauffage du récipient),/;
const steel = /^(Baking steel|Plaque d’acier)$/;
const pot = /^(Cast-iron Dutch oven|Cocotte en fonte)$/;
const skillet = /^(Cast iron skillet|Poêle en fonte)$/;
const unset = /^(Not specified|Non renseigné)$/;
const unknown = /^(Unknown|Inconnu|Inconnue)$/;
const hot = /^(Preheated \(hot\)|Préchauffé \(chaud\))$/;
const cold = /^(Placed cold|Départ à froid)$/;
const steelRef = { id: 'baking-steel', version: 1 };
const potRef = { id: 'dutch-oven-cast-iron', version: 1 };

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
      if (localStorage.getItem('equipment-items-loaded')) return;
      localStorage.setItem('equipment-items-loaded', '1');
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

async function commit(page: Page, version = 2) {
  await close(page).click();
  await save(page).click();
  await expectRecipeRevision(page, version);
  return (await storedProcess(page))?.steps[1];
}

function personal(
  id: string,
  version: number,
  kind: 'support' | 'vessel',
  name: string,
  archived = false,
): EquipmentEntry {
  return {
    id,
    version,
    kind,
    name,
    archived,
    builtIn: false,
    createdAt: '2026-11-01T12:00:00.000Z' as Instant,
  };
}

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';
  test(`Equipment items save independently, undo redo and survive reload${suffix}`, async ({
    page,
  }) => {
    await open(page);
    await expect(items(page).getByRole('button', { name: cover })).toBeDisabled();
    await choose(page, support, steel);
    await choose(page, vessel, pot);
    await expect(items(page).getByRole('button', { name: cover })).toHaveAccessibleName(
      english ? /Unknown/ : /Inconnue/,
    );
    await choose(page, appliancePreheat, cold);
    await choose(page, supportPreheat, hot);
    await choose(page, vesselPreheat, unknown);
    await choose(page, cover, /^(Covered|Couvert)$/);
    await close(page).click();
    await footer(page)
      .getByRole('button', { name: /^(Undo last change|Annuler la dernière modification)$/ })
      .click();
    await edit(page);
    await expect(items(page).getByRole('button', { name: cover })).toHaveAccessibleName(
      english ? /Unknown/ : /Inconnue/,
    );
    await close(page).click();
    await footer(page)
      .getByRole('button', { name: /^(Redo|Rétablir)$/ })
      .click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    expect((await storedProcess(page))?.steps[1]).toMatchObject({
      conditions: { temperatureC: 24 },
      plannedDurationS: 1200,
      equipment: {
        support: { item: steelRef },
        vessel: { item: potRef, cover: 'covered' },
        preheated: { appliance: 'cold', support: 'hot', vessel: 'unknown' },
      },
    });
    expect((await storedProcess(page))?.steps[1]?.equipment).not.toHaveProperty('appliance');
    expect((await storedProcess(page))?.steps[1]?.equipment).not.toHaveProperty('thermalProfile');
    await page.reload();
    await expectRecipeRevision(page, 2);
    await edit(page);
    await expect(items(page).getByRole('button', { name: support })).toHaveAccessibleName(
      english ? /Baking steel/ : /Plaque d’acier/,
    );
    await expect(items(page).getByRole('button', { name: cover })).toHaveAccessibleName(
      english ? /Covered/ : /Couvert/,
    );
    await close(page).click();
    await expect(save(page)).toBeDisabled();
  });

  test(`Replacing and clearing items preserves cover and independent preheat facts${suffix}`, async ({
    page,
  }) => {
    const untouched = {
      level: { value: 0, of: 5 },
      fan: 'unknown',
      steam: { source: 'none' },
      rack: 'middle',
    } as const;
    await open(page, {
      ...untouched,
      support: { item: steelRef },
      vessel: { item: potRef, cover: 'closed' },
      preheated: { appliance: 'unknown', support: 'hot', vessel: 'cold' },
    });
    await choose(page, vessel, skillet);
    await expect(items(page).getByRole('button', { name: cover })).toHaveAccessibleName(
      english ? /Closed/ : /Fermé/,
    );
    await choose(page, support, unset);
    await choose(page, vessel, unset);
    await expect(items(page).getByRole('button', { name: cover })).toBeDisabled();
    expect((await commit(page))?.equipment).toEqual({
      ...untouched,
      preheated: { appliance: 'unknown', support: 'hot', vessel: 'cold' },
    });
    await edit(page);
    for (const label of [appliancePreheat, supportPreheat, vesselPreheat])
      await choose(page, label, unset);
    expect((await commit(page, 3))?.equipment).toEqual(untouched);
  });

  test(`Personal equipment pins old versions and excludes archived and wrong-kind new choices${suffix}`, async ({
    page,
  }) => {
    await open(
      page,
      {
        support: { item: { id: 'personal-steel', version: 1 } },
        vessel: { item: { id: 'personal-pot', version: 1 }, cover: 'open' },
      },
      [
        personal('personal-steel', 1, 'support', 'Old steel'),
        personal('personal-steel', 2, 'support', 'New steel'),
        personal('personal-pot', 1, 'vessel', 'Old pot'),
        personal('personal-pot', 2, 'vessel', 'Archived pot', true),
        personal('hidden-steel', 1, 'support', 'Archived steel', true),
        personal('active-pot', 1, 'vessel', 'Active pot'),
      ],
    );
    await expect(items(page).getByRole('button', { name: support })).toHaveAccessibleName(
      /Old steel/,
    );
    await expect(items(page).getByRole('button', { name: vessel })).toHaveAccessibleName(/Old pot/);
    await close(page).click();
    await expect(save(page)).toBeDisabled();
    await edit(page);
    await items(page).getByRole('button', { name: support }).press('Space');
    await expect(page.getByRole('radio', { name: 'New steel', exact: true })).toBeVisible();
    for (const label of ['Archived steel', 'Active pot', 'Archived pot'])
      await expect(page.getByRole('radio', { name: label, exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('ion-popover:visible')).toHaveCount(0);
    await choose(page, cover, /^(Covered|Couvert)$/);
    expect((await commit(page))?.equipment).toEqual({
      support: { item: { id: 'personal-steel', version: 1 } },
      vessel: { item: { id: 'personal-pot', version: 1 }, cover: 'covered' },
    });
    await edit(page);
    await choose(page, support, /^New steel$/);
    expect((await commit(page, 3))?.equipment?.support?.item).toEqual({
      id: 'personal-steel',
      version: 2,
    });
  });

  test(`Unresolved and wrong-kind references remain intact until explicit replacement${suffix}`, async ({
    page,
  }) => {
    await open(page, {
      support: { item: { id: 'unresolved-private-id', version: 7 } },
      vessel: { item: steelRef, cover: 'unknown' },
      preheated: { vessel: 'cold' },
    });
    for (const label of [support, vessel])
      await expect(items(page).getByRole('button', { name: label })).toHaveAccessibleName(
        english ? /Unresolved item/ : /introuvable|indisponible/i,
      );
    await expect(items(page)).not.toContainText('unresolved-private-id');
    await close(page).click();
    await expect(save(page)).toBeDisabled();
    await edit(page);
    await choose(page, support, steel);
    await choose(page, vessel, pot);
    expect((await commit(page))?.equipment).toEqual({
      support: { item: steelRef },
      vessel: { item: potRef, cover: 'unknown' },
      preheated: { vessel: 'cold' },
    });
  });

  test(`Item edits retain unrelated invalid raw power and its dismissal guard${suffix}`, async ({
    page,
  }) => {
    await open(page, { level: { value: 3, of: 5 } });
    const level = panel(page).getByRole('textbox', { name: /^(Power level|Niveau de puissance)$/ });
    await level.fill('-');
    await level.blur();
    await choose(page, support, steel);
    await choose(page, supportPreheat, hot);
    await expect(level).toHaveValue('-');
    await expect(level).toHaveAttribute('aria-invalid', 'true');
    await close(page).click();
    await expect(items(page)).toBeVisible();
    await level.fill('4');
    await level.press('Enter');
    expect((await commit(page))?.equipment).toEqual({
      level: { value: 4, of: 5 },
      support: { item: steelRef },
      preheated: { support: 'hot' },
    });
  });

  for (const theme of ['light', 'dark', 'amoled'])
    for (const large of [false, true]) {
      test(`Equipment items fit ${theme} ${large ? '360/130' : '393/100'}${suffix}`, async ({
        page,
      }, testInfo) => {
        await open(page, undefined, [], theme, large);
        await choose(page, support, steel);
        await choose(page, vessel, pot);
        await choose(page, cover, /^(Covered|Couvert)$/);
        await choose(page, appliancePreheat, cold);
        await choose(page, supportPreheat, hot);
        await choose(page, vesselPreheat, unknown);
        for (const label of [
          support,
          vessel,
          cover,
          appliancePreheat,
          supportPreheat,
          vesselPreheat,
        ]) {
          const control = items(page).getByRole('button', { name: label });
          await control.scrollIntoViewIfNeeded();
          const bounds = await control.boundingBox();
          if (!bounds) throw new Error('Equipment item control has no bounds');
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(large ? 360 : 393);
          expect(bounds.height).toBeGreaterThanOrEqual(48);
        }
        const capture = testInfo.outputPath('equipment-items.png');
        await page.screenshot({ path: capture });
        await testInfo.attach('Equipment items', { path: capture, contentType: 'image/png' });
        expect((await commit(page))?.equipment?.vessel?.cover).toBe('covered');
      });
    }
}
