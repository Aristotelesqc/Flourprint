import { expect, test } from './fixtures';
import { menuAction, routed, showPlanning } from './ui-actions';

for (const english of [false, true]) {
  test(`preparation completes and retracts steps while preserving recorded work${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    test.slow();
    const start = new Date('2026-03-02T08:00:00-05:00');
    await page.clock.setFixedTime(start);
    await page.setViewportSize({ width: 360, height: 851 });
    await page.goto('/recipes');
    await routed(page).getByRole('heading', { name: 'Poolish + tangzhong', level: 2 }).tap();
    await page.addStyleTag({ content: 'html, body { font-size: 20.8px !important; }' });
    await showPlanning(page);
    const view = routed(page);
    await view
      .getByRole('button', { name: english ? 'Start preparation' : 'Démarrer la préparation' })
      .tap();
    await page
      .locator('ion-alert')
      .getByRole('button', { name: english ? 'Start' : 'Démarrer', exact: true })
      .tap();
    await expect(page).toHaveURL(/\/bakes\//);
    await expect(view).toHaveCount(1);
    const progression = view.getByRole('region', { name: 'Progression' });
    const next = progression.getByRole('button', {
      name: english ? 'Next' : 'Suivant',
      exact: true,
    });
    const previous = progression.getByRole('button', {
      name: english ? 'Previous' : 'Précédent',
      exact: true,
    });
    const focus = view.getByRole('heading', { level: 2, name: /^\d+ \/ \d+ · / });
    const journal = view.getByTestId('preparation-journal');
    await expect(previous).toBeDisabled();
    await expect(focus).toHaveText(english ? / · Preferment$/ : / · Préferment$/);

    // Start the parallel scald while the first step remains the explicit focus.
    await menuAction(page, english ? /^Start Preferment$/ : /^Commencer : Préferment$/);
    await view.getByRole('button', { name: english ? 'Start Scald' : 'Commencer Échaudage' }).tap();
    await expect(focus).toHaveText(english ? / · Preferment$/ : / · Préferment$/);
    await next.tap();
    const undo = page.getByRole('button', { name: english ? 'Undo' : 'Annuler', exact: true });
    await expect(undo).toBeVisible();
    await expect(focus).toHaveText(english ? / · Scald$/ : / · Échaudage$/);
    await expect(journal).not.toContainText(english ? 'Scald done' : 'Échaudage terminé');
    await undo.tap();
    await expect(focus).toHaveText(english ? / · Preferment$/ : / · Préferment$/);
    await expect(journal).not.toContainText(english ? 'Preferment done' : 'Préferment terminé');
    await view.getByRole('button', { name: english ? 'Done Scald' : 'Terminé Échaudage' }).tap();
    await next.tap();
    await expect(focus).toHaveText(english ? / · Mix$/ : / · Pétrissage$/);
    await next.tap();
    await expect(focus).toHaveText(english ? / · Bulk fermentation$/ : / · Pointage$/);
    await previous.tap();
    await expect(focus).toHaveText(english ? / · Mix$/ : / · Pétrissage$/);
    await expect(journal).not.toContainText(english ? 'Mix done' : 'Pétrissage terminé');
    await page.clock.setFixedTime(new Date('2026-03-02T08:08:00-05:00'));
    await next.tap();
    await menuAction(page, english ? /^Start Bulk fermentation$/ : /^Commencer : Pointage$/);
    await expect(undo).toBeHidden();
    await previous.tap();
    await expect(view.getByRole('alert')).toContainText(english ? 'Bulk fermentation' : 'Pointage');
    await expect(focus).toHaveText(english ? / · Bulk fermentation$/ : / · Pointage$/);

    const correctTime = english ? 'Correct time' : 'Corriger l’heure';
    const sheet = page.locator('ion-modal:not(.overlay-hidden)');
    const save = sheet.getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true });
    const time = sheet.getByLabel(english ? 'Recorded time' : 'Heure enregistrée');
    await progression.getByRole('button', { name: correctTime, exact: true }).tap();
    await time.fill('2026-03-02T08:09');
    await save.tap();
    await expect(sheet.getByRole('alert')).toHaveText(
      english
        ? 'The step cannot end after a following step started.'
        : 'Impossible de terminer après le début d’une étape suivante.',
    );
    await expect(time).toHaveValue(/2026-03-02T08:09/);
    await time.fill('2026-03-02T08:06');
    await save.tap();
    await expect(sheet).toHaveCount(0);
    await expect(journal).toContainText(
      english ? 'Time corrected (Mix, End)' : 'Heure corrigée (Pétrissage, Fin)',
    );
    await expect(journal).toContainText(english ? /08:06.*Mix done/ : /08:06 · Pétrissage terminé/);

    // Both recorded timestamps remain editable from a completed step.
    await view
      .getByRole('button', {
        name: english ? 'Correct time Mix' : 'Corriger l’heure Pétrissage',
        exact: true,
      })
      .tap();
    await sheet.getByRole('radio', { name: english ? 'Start' : 'Début', exact: true }).check();
    await time.fill('2026-03-02T08:01');
    await save.tap();
    await expect(sheet).toHaveCount(0);
    await expect(journal).toContainText(
      english ? 'Time corrected (Mix, Start)' : 'Heure corrigée (Pétrissage, Début)',
    );

    await previous.tap();
    await progression
      .getByRole('button', { name: english ? 'Repeat step' : 'Refaire l’étape', exact: true })
      .tap();
    await sheet.getByLabel(english ? 'Planned duration' : 'Durée prévue').fill('7 min');
    await save.tap();
    await expect(sheet).toHaveCount(0);
    await expect(view.getByText(english ? 'Mix (repeat)' : 'Pétrissage (reprise)')).toBeVisible();
    await next.tap();
    await expect(focus).toHaveText(english ? / · Mix \(repeat\)$/ : / · Pétrissage \(reprise\)$/);
    await expect(view.getByRole('timer')).toHaveText('00:07:00');
    await expect(journal).toContainText(english ? 'Mix done' : 'Pétrissage terminé');
  });
}
