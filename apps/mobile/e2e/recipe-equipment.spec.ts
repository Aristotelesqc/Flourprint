import { expectRecipeRevision } from './ui-actions';
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
const importFixture = async (
  page: Page,
  equipment: Record<string, unknown>,
  english: boolean,
  theme = 'light',
  large = false,
) => {
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
  await expectRecipeRevision(page, 1);
  await expect(routed(page)).toHaveCount(1);
  if (large) await page.addStyleTag({ content: 'html,body{font-size:20.8px!important}' });
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
    await details
      .getByRole('button', {
        name: english ? 'Equipment details' : 'Détails de l’équipement',
        exact: true,
      })
      .click();
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
      .getByRole('tab', { name: english ? 'Planning' : 'Planification', exact: true })
      .click();
    await details
      .getByRole('button', {
        name: english ? 'Equipment details' : 'Détails de l’équipement',
        exact: true,
      })
      .click();
    expect(await details.innerText()).toBe(text);
    await assertNoOverflow();
  });

  for (const theme of ['light', 'dark', 'amoled']) {
    for (const large of [false, true]) {
      test(`Shared equipment disclosures support keyboard and touch ${theme} ${large ? '360/130' : '393/100'}${suffix}`, async ({
        page,
      }, testInfo) => {
        await importFixture(
          page,
          {
            appliance: 'oven',
            mode: 'broil',
            setpointC: 250,
            fan: 'unknown',
            steam: { source: 'none' },
            rack: 'middle',
          },
          english,
          theme,
          large,
        );
        const equipment = routed(page).getByTestId('step-equipment').filter({ visible: true });
        const details = equipment.getByRole('button', {
          name: english ? 'Equipment details' : 'Détails de l’équipement',
          exact: true,
        });
        const help = equipment.getByRole('button', {
          name: english ? 'Broil' : 'Griller',
          exact: true,
        });
        await expect(details).toHaveAttribute('aria-expanded', 'false');
        await expect(help).toHaveAttribute('aria-expanded', 'false');
        await details.focus();
        await details.press('Enter');
        await expect(details).toHaveAttribute('aria-expanded', 'true');
        await expect(help).toHaveAttribute('aria-expanded', 'false');
        await help.focus();
        await help.press('Space');
        await expect(help).toHaveAttribute('aria-expanded', 'true');
        await expect(
          equipment.getByText(
            english
              ? 'Only the top element runs, with direct radiant heat; distinct from an outdoor barbecue grill.'
              : 'Seul l’élément du haut chauffe, par rayonnement direct ; distinct d’un gril de barbecue.',
            { exact: true },
          ),
        ).toBeVisible();
        await expect(details).toHaveAttribute('aria-expanded', 'true');
        await expect(equipment).toContainText('250');
        await details.click();
        await expect(details).toHaveAttribute('aria-expanded', 'false');
        await expect(help).toHaveAttribute('aria-expanded', 'true');
        await details.click();
        for (const trigger of [details, help]) {
          await trigger.scrollIntoViewIfNeeded();
          const bounds = await trigger.boundingBox();
          if (!bounds) throw new Error('Equipment disclosure trigger has no bounds');
          expect(bounds.height).toBeGreaterThanOrEqual(48 * (large ? 1.3 : 1) - 1);
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(large ? 360 : 393);
        }
        const content = routed(page).locator('ion-content');
        expect(
          await content.evaluate(async (host) => {
            const scroll = await (
              host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
            ).getScrollElement();
            return scroll.scrollWidth <= scroll.clientWidth;
          }),
        ).toBe(true);
        const capture = testInfo.outputPath('equipment-disclosures.png');
        await page.screenshot({ path: capture });
        await testInfo.attach('Equipment details and mode help', {
          path: capture,
          contentType: 'image/png',
        });
      });
    }
  }

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
    await details
      .getByRole('button', {
        name: english ? 'Equipment details' : 'Détails de l’équipement',
        exact: true,
      })
      .click();
    await expect(details).toContainText(english ? 'Unresolved item' : 'Élément introuvable');
    await expect(details).not.toContainText('missing-profile');
  });
}
