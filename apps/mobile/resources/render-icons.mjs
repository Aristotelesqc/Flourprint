// Renders the legacy launcher PNGs (Android 7.x, before adaptive icons) from resources/mark.svg.
// Run from apps/mobile after changing the mark: node resources/render-icons.mjs
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const mark = readFileSync(new URL('mark.svg', import.meta.url), 'utf8');
const res = new URL('../android/app/src/main/res/', import.meta.url);
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const variants = { ic_launcher: '#a9490a', ic_launcher_dev: '#2e5e4e' };

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, color] of Object.entries(variants)) {
  const svg = mark.replace(/<!--[\s\S]*?-->/, '').replace('#a9490a', color);
  for (const [density, size] of Object.entries(densities)) {
    for (const [suffix, radius] of [
      ['', '22%'],
      ['_round', '50%'],
    ]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(
        `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px;border-radius:${radius};overflow:hidden}</style>${svg.replace('rx="8"', 'rx="0"')}`,
      );
      const path = new URL(`mipmap-${density}/${name}${suffix}.png`, res);
      await page.screenshot({ path: path.pathname, omitBackground: true });
    }
  }
}
await browser.close();
