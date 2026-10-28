import { expect, test } from './fixtures';
import { enterEditor, routed } from './ui-actions';

for (const english of [false, true]) {
  test(`three themes persist; explicit choice overrides OS and System follows it${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 851 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/advanced');
    const html = page.locator('html');
    const choice = (name: RegExp) => routed(page).getByRole('button', { name });
    await expect(html).toHaveAttribute('data-theme', 'light');
    await choice(/^AMOLED$/).click();
    await expect(html).toHaveAttribute('data-theme', 'amoled');
    await expect(choice(/^AMOLED$/)).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      .toBe('rgb(0, 0, 0)');
    await page.reload();
    await expect(choice(/^AMOLED$/)).toHaveAttribute('aria-pressed', 'true');
    await expect(html).toHaveAttribute('data-theme', 'amoled');
    await choice(/^(Sombre(?: chaud)?|(?:Warm )?[Dd]ark)$/).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'dark' });
    await choice(/^(Clair|Light)$/).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).not.toHaveClass(/ion-palette-dark/);
    await choice(/^(Système|System)$/).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html).toHaveAttribute('data-theme', 'light');
    await choice(/^AMOLED$/).click();
    await routed(page).locator('ion-back-button').click();
    await expect(page).toHaveURL(/\/recipes$/);
    await expect(routed(page)).toHaveCount(1);
    await routed(page).getByText('Poolish + tangzhong', { exact: true }).click();
    await enterEditor(page);
    const save = routed(page)
      .locator('ion-footer')
      .getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true });
    await expect(save).toBeDisabled();
    expect((await save.boundingBox())?.height).toBeGreaterThanOrEqual(48);
    const native = await save.evaluate((button) => {
      const style = getComputedStyle(button);
      const root = button.getRootNode();
      const host = root instanceof ShadowRoot ? root.host : button;
      return {
        color: style.color,
        background: getComputedStyle(button, '::before').backgroundColor,
        opacity: getComputedStyle(host).opacity,
      };
    });
    expect(native.opacity).toBe('1');
    expect(native.color).toBe('rgb(177, 170, 159)');
    expect(native.background).toBe('rgb(27, 25, 23)');
  });
}
