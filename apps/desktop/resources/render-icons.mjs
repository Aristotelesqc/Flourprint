// Renders the desktop shell's icons from the app logo (apps/mobile/resources/mark.svg and
// mark-dev.svg): the central 72 x 72 that launchers show, square with rounded corners. Writes
// icon.ico (sizes 16 to 256, PNG-compressed) for the Windows executable and icon.png for the
// window. Run from apps/desktop after changing the logo: node resources/render-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];
const variants = { icon: 'mark.svg', 'icon-dev': 'mark-dev.svg' };

/** An ICO file holding one PNG per size (Windows Vista and later). */
const ico = (images) => {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
};

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, file] of Object.entries(variants)) {
  const svg = readFileSync(new URL(`../../mobile/resources/${file}`, import.meta.url), 'utf8')
    .replace(/<!--[\s\S]*?-->/, '')
    .replace('viewBox="0 0 108 108"', 'viewBox="18 18 72 72"');
  const images = [];
  for (const size of SIZES) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px;border-radius:22%;overflow:hidden}</style>${svg}`,
    );
    images.push({ size, png: await page.screenshot({ omitBackground: true }) });
  }
  writeFileSync(new URL(`${name}.ico`, import.meta.url), ico(images));
  writeFileSync(new URL(`${name}.png`, import.meta.url), images.at(-1).png);
}
await browser.close();
