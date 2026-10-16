/**
 * Debug aids of the desktop shell's Debug menu (#113): overlays injected into the page as CSS,
 * and screenshot file names. Pure: no Electron import, so it is unit-tested.
 */
export type Overlay = 'grid' | 'outlines';

export const OVERLAYS: readonly Overlay[] = ['grid', 'outlines'];

/** Grid pitch in CSS pixels: the smallest steps of DESIGN.md's 4/8/12/16/24/32 px spacing scale. */
export const GRID_MINOR = 4;
export const GRID_MAJOR = 8;

/**
 * Overlays never take input and sit above everything, Ionic overlays included. The grid starts at
 * the page's top-left corner, as layout does.
 */
export const OVERLAY_CSS: Readonly<Record<Overlay, string>> = {
  grid: `html::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgb(255 0 128 / 0.25) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 0 128 / 0.25) 1px, transparent 1px),
    linear-gradient(to right, rgb(0 160 255 / 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(0 160 255 / 0.1) 1px, transparent 1px);
  background-size:
    ${GRID_MAJOR}px ${GRID_MAJOR}px,
    ${GRID_MAJOR}px ${GRID_MAJOR}px,
    ${GRID_MINOR}px ${GRID_MINOR}px,
    ${GRID_MINOR}px ${GRID_MINOR}px;
}`,
  outlines: `*, *::before, *::after {
  outline: 1px solid rgb(255 0 128 / 0.45) !important;
  outline-offset: -1px !important;
}`,
};

const two = (n: number) => String(n).padStart(2, '0');

/**
 * `flourprint-<version>-<YYYYMMDD-HHMMSS>.png` in local time, so screenshots sort by time and
 * say which version they show.
 */
export const screenshotName = (version: string, at: Date): string =>
  `flourprint-${version.replace(/[^a-z0-9-]/gi, '-')}-${at.getFullYear()}${two(at.getMonth() + 1)}${two(at.getDate())}-${two(at.getHours())}${two(at.getMinutes())}${two(at.getSeconds())}.png`;
