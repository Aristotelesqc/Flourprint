import type { Locator, Page } from '@playwright/test';
import type { Backup } from '@flourprint/core/application';
import { expect, test } from './fixtures';
import { menuAction, routed, showPlanning } from './ui-actions';

const applyPhoneScale = async (page: Page, english: boolean) => {
  await page.setViewportSize(english ? { width: 393, height: 851 } : { width: 360, height: 851 });
  if (!english) {
    await page.addStyleTag({ content: 'html, body { font-size: 20.8px !important; }' });
  }
};

const historyTab = (page: Page, english: boolean) =>
  routed(page).getByRole('tab', { name: english ? 'History' : 'Historique', exact: true });

const preparationsRegion = (page: Page, english: boolean) =>
  routed(page).getByRole('region', { name: english ? 'Preparations' : 'Préparations' });

const openHistory = async (page: Page, english: boolean) => {
  const tab = historyTab(page, english);
  await tab.tap();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(preparationsRegion(page, english)).toBeVisible();
};

const startPreparation = async (page: Page, english: boolean): Promise<string> => {
  await showPlanning(page);
  await routed(page)
    .getByRole('button', { name: english ? 'Start preparation' : 'Démarrer la préparation' })
    .tap();
  const alert = page.locator('ion-alert').filter({
    hasText: english ? 'Start the preparation now?' : 'Démarrer la préparation maintenant ?',
  });
  await expect(alert).toBeVisible();
  await alert.getByRole('button', { name: english ? 'Start' : 'Démarrer', exact: true }).tap();
  await expect(alert).toBeHidden();
  await expect(page).toHaveURL(/\/bakes\/[^/]+$/);
  await expect(routed(page)).toHaveCount(1);
  return page.url();
};

const goBackToRecipe = async (page: Page) => {
  await routed(page).locator('ion-back-button').click();
  await expect(page).toHaveURL(/\/recipes\/[^/]+$/);
  await expect(routed(page)).toHaveCount(1);
};

const expectHistoryRows = async (page: Page, english: boolean): Promise<Locator> => {
  const list = preparationsRegion(page, english).getByRole('list');
  await expect(list).toBeVisible();
  const items = list.getByRole('listitem');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0).getByRole('link')).toHaveCount(1);
  await expect(items.nth(1).getByRole('link')).toHaveCount(1);

  const activeRow = items.nth(0);
  await expect(activeRow).toContainText(english ? 'In progress' : 'En cours');
  await expect(activeRow).toContainText(english ? 'rev. 1' : 'rév. 1');
  await expect(activeRow).toContainText(english ? 'Started' : 'Démarrée');

  const finishedRow = items.nth(1);
  await expect(finishedRow).toContainText(english ? 'Finished' : 'Terminée');
  await expect(finishedRow).toContainText(english ? 'rev. 1' : 'rév. 1');
  await expect(finishedRow).toContainText(
    english ? 'Result: Raw dough, frozen' : 'Résultat : Pâte crue, congelée',
  );
  await expect(finishedRow).toContainText(
    english ? 'Total time: 1 h 15 min' : 'Durée totale : 1 h 15 min',
  );
  await expect(finishedRow).toContainText(english ? 'Not rated' : 'Non notée');
  await expect(finishedRow).not.toContainText(/\b(Cuit|Cooked)\b/);

  return list;
};

const expectNoHorizontalOverflow = async (page: Page, list: Locator) => {
  const viewportWidth = page.viewportSize()?.width ?? 360;
  const overflow = await list.evaluate((ul, maxWidth) => {
    const ionContent = ul.closest('ion-content');
    const inner = ionContent?.shadowRoot?.querySelector<HTMLElement>('.inner-scroll');
    const contentOverflow = inner ? inner.scrollWidth > inner.clientWidth + 1 : false;
    const docOverflow =
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const rows = Array.from(ul.querySelectorAll('li')).map((li) => {
      const liRect = li.getBoundingClientRect();
      const link = li.querySelector('a');
      const linkRect = link?.getBoundingClientRect();
      return {
        liScrollOverflow: li.scrollWidth > li.clientWidth + 1,
        linkScrollOverflow: link ? link.scrollWidth > link.clientWidth + 1 : false,
        exceedsViewport:
          liRect.right > maxWidth + 1 || (linkRect ? linkRect.right > maxWidth + 1 : false),
      };
    });
    return { contentOverflow, docOverflow, rows };
  }, viewportWidth);
  expect(overflow.docOverflow).toBe(false);
  expect(overflow.contentOverflow).toBe(false);
  for (const row of overflow.rows) {
    expect(row.liScrollOverflow).toBe(false);
    expect(row.linkScrollOverflow).toBe(false);
    expect(row.exceedsViewport).toBe(false);
  }
};

const waitForBackupBakes = async (page: Page, session1Id: string, session2Id: string) => {
  await expect
    .poll(() =>
      page.evaluate(
        async ({ s1, s2 }) => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('flourprint-preview', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          try {
            const raw = await new Promise<string | undefined>((resolve, reject) => {
              const request = db.transaction('snapshots').objectStore('snapshots').get('backup');
              request.onsuccess = () => resolve(request.result as string | undefined);
              request.onerror = () => reject(request.error);
            });
            const backup = raw ? (JSON.parse(raw) as Backup) : undefined;
            if (!backup) return false;
            const bake1 = backup.bakes.find((bake) => bake.bakeId === s1);
            const bake2 = backup.bakes.find((bake) => bake.bakeId === s2);
            return Boolean(
              bake1?.events.some((event) => event.payload.type === 'BakeFinished') &&
              bake2?.events.some((event) => event.payload.type === 'BakeStarted'),
            );
          } finally {
            db.close();
          }
        },
        { s1: session1Id, s2: session2Id },
      ),
    )
    .toBe(true);
};

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';

  test(`recipe history lists active and past preparations and reopens each${suffix}`, async ({
    page,
  }) => {
    const t0 = Date.parse('2026-03-02T08:00:00-05:00');
    await page.clock.setFixedTime(t0);
    await page.setViewportSize(english ? { width: 393, height: 851 } : { width: 360, height: 851 });

    await page.goto('/recipes');
    await routed(page).getByRole('heading', { name: 'Poolish + tangzhong', level: 2 }).tap();
    await expect(routed(page)).toHaveCount(1);
    await applyPhoneScale(page, english);

    // 1. Empty state in History before any preparation starts.
    await openHistory(page, english);
    const region = preparationsRegion(page, english);
    await expect(region).toContainText(
      english
        ? 'No preparation yet. Start one with the Start preparation button.'
        : 'Aucune préparation pour l’instant. En démarrer une avec le bouton Démarrer la préparation.',
    );
    await expect(region.getByRole('listitem')).toHaveCount(0);

    // 2. Start Session 1 at T0 and finish early at T0 + 75 min as raw dough, frozen.
    const session1Url = await startPreparation(page, english);
    await page.clock.setFixedTime(t0 + 75 * 60_000);
    await menuAction(page, english ? /^Finish now/ : /^Terminer maintenant/);
    const outcomeAlert = page.locator('ion-alert').filter({
      hasText: english
        ? 'Choose what became of the dough, or abandon the preparation.'
        : 'Choisir le devenir de la pâte ou abandonner la préparation.',
    });
    await expect(outcomeAlert).toBeVisible();
    await outcomeAlert
      .getByRole('radio', {
        name: english ? 'Raw dough, frozen' : 'Pâte crue, congelée',
        exact: true,
      })
      .click();
    await outcomeAlert
      .getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true })
      .click();
    await expect(outcomeAlert).toBeHidden();
    await expect(routed(page).getByTestId('bake-outcome')).toHaveText(
      english ? 'Result: Raw dough, frozen' : 'Résultat : Pâte crue, congelée',
    );
    await expect(routed(page).getByTestId('bake-outcome')).not.toContainText(/\b(Cuit|Cooked)\b/);
    await expect(routed(page).getByTestId('bake-total-duration')).toHaveText(
      english ? 'Total time: 1 h 15 min' : 'Durée totale : 1 h 15 min',
    );
    await goBackToRecipe(page);

    // 3. Start Session 2 later and keep it active.
    await page.clock.setFixedTime(Date.parse('2026-03-02T11:00:00-05:00'));
    const session2Url = await startPreparation(page, english);
    expect(session2Url).not.toBe(session1Url);
    await expect(
      routed(page).getByRole('region', { name: english ? 'Countdown' : 'Compte à rebours' }),
    ).toBeVisible();
    await goBackToRecipe(page);

    // 4. History lists active first, finished second, without horizontal overflow.
    await openHistory(page, english);
    const list = await expectHistoryRows(page, english);
    await expectNoHorizontalOverflow(page, list);

    // 5. Reopen the finished row and return with History still selected.
    await list.getByRole('listitem').nth(1).getByRole('link').tap();
    await expect(page).toHaveURL(session1Url);
    await expect(routed(page)).toHaveCount(1);
    await expect(routed(page).getByTestId('bake-outcome')).toHaveText(
      english ? 'Result: Raw dough, frozen' : 'Résultat : Pâte crue, congelée',
    );
    await expect(routed(page).getByTestId('bake-total-duration')).toHaveText(
      english ? 'Total time: 1 h 15 min' : 'Durée totale : 1 h 15 min',
    );
    await goBackToRecipe(page);
    await expect(historyTab(page, english)).toHaveAttribute('aria-selected', 'true');

    // 6. Reopen the active row and verify active preparation controls/progression.
    await list.getByRole('listitem').nth(0).getByRole('link').tap();
    await expect(page).toHaveURL(session2Url);
    await expect(routed(page)).toHaveCount(1);
    await expect(
      routed(page).getByRole('region', { name: english ? 'Countdown' : 'Compte à rebours' }),
    ).toBeVisible();
    await expect(routed(page).getByRole('region', { name: 'Progression' })).toBeVisible();
    await goBackToRecipe(page);

    // 7. Wait for both bakes in IndexedDB snapshot, reload, and verify persistence & ordering.
    const session1Id = decodeURIComponent(new URL(session1Url).pathname.split('/').pop() ?? '');
    const session2Id = decodeURIComponent(new URL(session2Url).pathname.split('/').pop() ?? '');
    await waitForBackupBakes(page, session1Id, session2Id);

    await page.reload();
    await expect(routed(page)).toHaveCount(1);
    await applyPhoneScale(page, english);
    await openHistory(page, english);
    await expectHistoryRows(page, english);
  });
}
