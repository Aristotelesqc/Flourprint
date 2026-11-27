import { expect, test } from './fixtures';
import { routed, showPlanning } from './ui-actions';

for (const english of [false, true]) {
  test(`the active preparation counts down from the implicit start and stays active after zero${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    const startedAt = new Date('2026-03-02T08:00:00-05:00');
    await page.clock.setFixedTime(startedAt);
    await page.setViewportSize({ width: english ? 393 : 360, height: 851 });
    await page.goto('/recipes');
    await routed(page).getByRole('heading', { name: 'Poolish + tangzhong', level: 2 }).tap();
    if (!english) {
      await page.addStyleTag({ content: 'html, body { font-size: 20.8px !important; }' });
    }
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
    const timer = view.getByRole('timer', {
      name: english ? /Estimated remaining time|Overrun/ : /Temps restant estimé|Dépassement/,
    });
    const elapsed = view.getByRole('timer', {
      name: english ? 'Elapsed time' : 'Temps écoulé',
    });
    const heading = view.getByRole('heading', {
      name: english ? /1 \/ \d+ · Preferment/ : /1 \/ \d+ · Préferment/,
    });
    await expect(heading).toBeVisible();
    await expect(timer).toHaveAccessibleName(
      english ? 'Estimated remaining time' : 'Temps restant estimé',
    );
    await expect(timer).toHaveText('12:00:00');
    await expect(elapsed).toHaveText('00:00:00');
    await expect(
      view.getByText(english ? /Adjustment\s*:\s*\+0 min/ : /Ajustement\s*:\s*\+0 min/),
    ).toBeVisible();

    await page.clock.setFixedTime(new Date(startedAt.getTime() + 1_000));
    await expect(timer).toHaveText('11:59:59', { timeout: 5_000 });
    await expect(elapsed).toHaveText('00:00:01', { timeout: 5_000 });
    await page.clock.setFixedTime(new Date(startedAt.getTime() + 12 * 3_600_000 + 120_000));
    await expect(timer).toHaveText('+00:02:00');
    await expect(timer).toHaveAccessibleName(english ? 'Overrun' : 'Dépassement');
    await expect(elapsed).toHaveText('12:02:00');
    await page.clock.setFixedTime(new Date(startedAt.getTime() + 12 * 3_600_000 + 121_000));
    await expect(timer).toHaveText('+00:02:01', { timeout: 5_000 });
    await expect(elapsed).toHaveText('12:02:01', { timeout: 5_000 });
    await expect(heading).toBeVisible();
    await expect(page).toHaveURL(/\/bakes\//);
  });
}
