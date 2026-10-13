import { expect, test, type Page } from '@playwright/test';

const routed = (page: Page) => page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
const equipmentRecipe = (equipment: Record<string, unknown>) => ({
  id: 'equipment-display-test',
  name: 'Equipment display fixture',
  revisions: [
    {
      recipeId: 'equipment-display-test',
      version: 1,
      createdAt: '2026-10-12T12:00:00.000Z',
      formula: {
        flours: [{ id: 'bread-flour', sharePct: 100 }],
        ingredients: [{ id: 'water', kind: 'water', bakerPct: 70, role: 'dough' }],
        components: [],
        anchor: { kind: 'flourTotal', grams: 500 },
      },
      process: {
        steps: [
          { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 600 },
          {
            id: 'bake',
            operation: 'bake',
            dependsOn: ['mix'],
            schedule: 'asap',
            plannedDurationS: 1200,
            equipment,
          },
        ],
      },
    },
  ],
});
const importFixture = async (page: Page, equipment: Record<string, unknown>, english: boolean) => {
  await page.setViewportSize({ width: 360, height: 851 });
  await page.goto('/advanced');
  await routed(page)
    .locator('input[type=file]')
    .setInputFiles({
      name: 'synthetic-equipment.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          kind: 'flourprint-recipes',
          schemaVersion: 1,
          exportedAt: '2026-10-12T12:00:00.000Z',
          recipes: [equipmentRecipe(equipment)],
          families: [],
        }),
      ),
    });
  await expect(
    routed(page).getByText(english ? '1 recipe imported.' : '1 recette importée.', { exact: true }),
  ).toBeVisible();
  await routed(page).locator('ion-back-button').click();
  await expect(page).toHaveURL(/\/recipes$/);
  await page.getByText('Equipment display fixture', { exact: true }).click();
  await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
  await expect(routed(page)).toHaveCount(1);
};

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';
  test(`Recipe and Planning retain every explicit cooking setting without requiring a profile${suffix}`, async ({
    page,
  }) => {
    await importFixture(
      page,
      {
        appliance: 'oven',
        mode: 'broil',
        nativeMode: 'Home broil',
        setpointC: 250,
        level: { value: 3, of: 5 },
        fan: 'unknown',
        steam: { source: 'none' },
        support: { item: { id: 'baking-steel', version: 1 } },
        vessel: { item: { id: 'cast-iron-skillet', version: 1 }, cover: 'unknown' },
        preheated: { appliance: 'unknown', support: 'hot', vessel: 'cold' },
        rack: 'middle',
        load: { pieces: 1, massG: 400 },
      },
      english,
    );
    const details = routed(page).getByTestId('step-equipment').filter({ visible: true });
    await expect(details).toHaveCount(1);
    await page.addStyleTag({ content: 'html, body { font-size: 20px !important; }' });
    await details.locator('summary').first().click();
    await expect(details).toContainText('Home broil');
    await expect(details).toContainText('250');
    await expect(details).toContainText(/3.*5/);
    await expect(details).toContainText('400');
    await expect(details).toContainText(english ? 'Fan' : 'Ventilation');
    await expect(details).toContainText(english ? 'Steam' : 'Vapeur');
    await expect(details).toContainText(english ? 'Baking steel' : 'Plaque d’acier');
    await expect(details).toContainText(english ? 'Cast iron skillet' : 'Poêle en fonte');
    await expect(routed(page).locator('input:not([type=checkbox]):visible')).toHaveCount(0);
    const assertNoOverflow = async () => {
      const dimensions = await routed(page)
        .locator('ion-content')
        .evaluate(async (host) => {
          const scroll = await (
            host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
          ).getScrollElement();
          const view = host.getBoundingClientRect();
          const outside =
            scroll.scrollWidth > scroll.clientWidth
              ? [...host.querySelectorAll('*')]
                  .filter((element) => {
                    const rect = element.getBoundingClientRect();
                    return (
                      rect.width > 0 && (rect.right > view.right + 1 || rect.left < view.left - 1)
                    );
                  })
                  .slice(0, 8)
                  .map((element) => ({
                    tag: element.tagName,
                    classes: element.getAttribute('class'),
                    text: element.textContent?.slice(0, 80),
                    bounds: element.getBoundingClientRect().toJSON(),
                  }))
              : [];
          return { width: scroll.clientWidth, scrollWidth: scroll.scrollWidth, outside };
        });
      expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
        dimensions.width,
      );
    };
    await assertNoOverflow();
    const text = await details.innerText();
    await routed(page)
      .getByRole('button', { name: english ? 'Planning' : 'Planification', exact: true })
      .click();
    await details.locator('summary').first().click();
    expect(await details.innerText()).toBe(text);
    await assertNoOverflow();
  });

  test(`A missing equipment profile stays unresolved and does not invent an appliance name${suffix}`, async ({
    page,
  }) => {
    await importFixture(
      page,
      {
        appliance: 'oven',
        mode: 'bottom',
        profile: { id: 'missing-profile', version: 1 },
        preheated: { appliance: 'unknown' },
      },
      english,
    );
    const details = routed(page).getByTestId('step-equipment').filter({ visible: true });
    await details.locator('summary').first().click();
    await expect(details).toContainText(english ? 'Unresolved item' : 'Élément introuvable');
    await expect(details).not.toContainText('missing-profile');
  });
}
