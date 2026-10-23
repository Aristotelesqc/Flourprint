import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
const epoch = Date.parse('2026-10-23T12:00:00Z');
const address =
  '/mockup.html?screen=preparation&recipe=shokupan&prep=fresh&nav=A&lang=en&theme=dark&motion=reduce&capture=1';
const current = (page) => page.getByTestId('prep-current-step');

test('L127 Next and Previous record completion and retraction without eagerly starting the successor', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(epoch));
  await page.goto(address);
  await expect(current(page)).toHaveAttribute('data-step', 'tangzhong');
  await page.clock.setFixedTime(new Date(epoch + 60_000));
  await page.getByTestId('prep-next-btn').click();
  await expect(current(page)).toHaveAttribute('data-step', 'tangzhong-cool');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByTestId('prep-prev-btn').click();
  await expect(current(page)).toHaveAttribute('data-step', 'tangzhong');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('recorded-outcome')).toHaveCount(0);
});

test('L127 a real adjustment blocks retraction and offers correction or a deliberate repetition', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(epoch));
  await page.goto(address);
  await page.clock.setFixedTime(new Date(epoch + 60_000));
  await page.getByTestId('prep-next-btn').click();
  await page.clock.setFixedTime(new Date(epoch + 120_000));
  await page.getByTestId('prep-adjust-plus').click();
  await expect(page.getByTestId('prep-step-adjustment')).toContainText('+15 min');
  await page.getByTestId('prep-prev-btn').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(/already|recorded/i);
  await expect(dialog.getByRole('button', { name: /correct.*time/i })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /again|repeat/i })).toBeVisible();
  await expect(current(page)).toHaveAttribute('data-step', 'tangzhong-cool');
  await page.keyboard.press('Escape');
  await expect(current(page)).toHaveAttribute('data-step', 'tangzhong-cool');
});

test('L127 pause freezes the countdown across navigation and resume uses the same recorded step', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(epoch));
  await page.goto(address);
  await page.clock.setFixedTime(new Date(epoch + 60_000));
  const timer = page.getByTestId('prep-countdown-digits');
  const pause = page.getByTestId('prep-pause-btn');
  await expect(timer).toHaveText('00:03:00');
  await pause.click();
  await expect(pause).toHaveText('Resume');
  const frozen = await timer.textContent();
  await page.clock.setFixedTime(new Date(epoch + 360_000));
  // Trigger a render with a real app navigation, not a timing delay.
  await page.getByRole('banner').getByRole('button', { name: 'Navigation', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Recipes', exact: true }).click();
  await page.getByRole('main').getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(timer).toHaveText(frozen);
  await expect(pause).toHaveText('Resume');
  await pause.click();
  await expect(pause).toHaveText('Pause');
  await expect(timer).toHaveText(frozen);
  await expect(current(page)).toHaveAttribute('data-step', 'tangzhong');
});

test('L127 recording the first real action keeps an ASAP step’s implicit projected end', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(epoch));
  // The shokupan's first scald is ALAP. PR165 deliberately marks only ASAP
  // steps as implicitly running; the baguette's poolish exercises that contract.
  await page.goto(
    address
      .replace('screen=preparation', 'screen=recipe')
      .replace('recipe=shokupan', 'recipe=baguette'),
  );
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(current(page)).toHaveAttribute('data-step', 'poolish');
  await page.clock.setFixedTime(new Date(epoch + 60_000));
  await expect(page.getByTestId('prep-countdown-digits')).toHaveText('13:59:00');
  const projectedEnd = page.getByTestId('prep-step-times').locator('span').last();
  const implicitEnd = await projectedEnd.textContent();
  await page.getByTestId('prep-pause-btn').click();
  await expect(page.getByTestId('prep-pause-btn')).toHaveText('Resume');
  await expect(projectedEnd).toHaveText(implicitEnd);
  await expect(page.getByTestId('prep-countdown-digits')).toHaveText('13:59:00');
});
test('a seeded preparation shows its actual recorded start once in the visible journal', async ({
  page,
}) => {
  await page.goto(
    '/mockup.html?screen=preparation&recipe=shokupan&lang=fr&capture=1&motion=reduce',
  );
  const start = page
    .getByTestId('prep-business-journal')
    .locator('li')
    .filter({ hasText: /Préparation lancée$/ });
  await expect(start).toHaveCount(1);
  await page.getByRole('button', { name: /^Journal d’événements techniques/ }).click();
  const recorded = page
    .getByTestId('prep-technical-journal')
    .locator('li')
    .filter({ hasText: /BakeStarted$/ });
  await expect(recorded).toHaveCount(1);
  await expect(start.locator('time')).toHaveText(await recorded.locator('time').innerText());
});
