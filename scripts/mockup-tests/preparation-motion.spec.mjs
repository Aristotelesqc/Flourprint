import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');

for (const mode of ['standard', 'system-reduced', 'manual-reduced']) {
  test(`Preparation step change gives tonal feedback without moving focus: ${mode}`, async ({
    page,
  }) => {
    await page.emulateMedia({
      reducedMotion: mode === 'system-reduced' ? 'reduce' : 'no-preference',
    });
    await page.goto(
      `/mockup.html?screen=preparation&recipe=shokupan&nav=A&lang=en&theme=dark&capture=1&motion=${mode === 'manual-reduced' ? 'reduce' : 'standard'}`,
    );
    const step = page.getByTestId('prep-step-line');
    const previousName = await step.innerText();
    await page.evaluate(() => {
      const initial = document.querySelector('[data-testid="prep-step-line"]').textContent;
      window.__stepMotionFrames = [];
      const observer = new MutationObserver(() => {
        const line = document.querySelector('[data-testid="prep-step-line"]');
        if (!line || line.textContent === initial) return;
        observer.disconnect();
        const sample = () => {
          window.__stepMotionFrames.push({
            text: line.textContent,
            background: getComputedStyle(line).backgroundColor,
            durations: line
              .getAnimations()
              .map((animation) => Number(animation.effect.getComputedTiming().duration)),
          });
          if (window.__stepMotionFrames.length < 12) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      observer.observe(document.querySelector('[data-testid="prep-current-step"]'), {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });
    const next = page.getByTestId('prep-next-btn');
    await next.click();
    await expect(step).not.toHaveText(previousName);
    await expect(next).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.__stepMotionFrames.length)).toBe(12);
    const frames = await page.evaluate(() => window.__stepMotionFrames);
    const durations = frames.flatMap((frame) => frame.durations);
    if (mode === 'standard') {
      expect(
        durations.some((duration) => duration > 0),
        JSON.stringify(frames),
      ).toBe(true);
      expect(new Set(frames.map((frame) => frame.background)).size).toBeGreaterThan(1);
    } else {
      expect(durations, JSON.stringify(frames)).toEqual([]);
    }
  });
}
