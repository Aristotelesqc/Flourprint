// Renders the legacy launcher PNGs (Android 7.x, before adaptive icons) from resources/mark.svg
// and mark-dev.svg: the central 72 x 72 that launchers show, square with rounded corners and round.
// Run from apps/mobile after changing the logo: node resources/render-icons.mjs
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const res = new URL('../android/app/src/main/res/', import.meta.url);
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const variants = { ic_launcher: 'mark.svg', ic_launcher_dev: 'mark-dev.svg' };

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, file] of Object.entries(variants)) {
  const svg = readFileSync(new URL(file, import.meta.url), 'utf8')
    .replace(/<!--[\s\S]*?-->/, '')
    .replace('viewBox="0 0 108 108"', 'viewBox="18 18 72 72"');
  for (const [density, size] of Object.entries(densities)) {
    for (const [suffix, radius] of [
      ['', '22%'],
      ['_round', '50%'],
    ]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(
        `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px;border-radius:${radius};overflow:hidden}</style>${svg}`,
      );
      const path = new URL(`mipmap-${density}/${name}${suffix}.png`, res);
      await page.screenshot({ path: path.pathname, omitBackground: true });
    }
  }
}
await browser.close();
