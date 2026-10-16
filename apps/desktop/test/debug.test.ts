import { describe, expect, it } from 'vitest';
import { OVERLAY_CSS, OVERLAYS, screenshotName } from '../src/debug.js';

describe('desktop shell debug aids', () => {
  it('names screenshots by version and local time, sortable', () => {
    expect(screenshotName('canary', new Date(2026, 9, 6, 7, 5, 9))).toBe(
      'flourprint-canary-20261006-070509.png',
    );
    expect(screenshotName('v0.3/../x', new Date(2026, 0, 1))).toBe(
      'flourprint-v0-3----x-20260101-000000.png',
    );
  });

  it('draws overlays that never take input', () => {
    expect(OVERLAY_CSS.grid).toContain('pointer-events: none');
    expect(OVERLAY_CSS.grid).toContain('8px 8px');
    expect(OVERLAY_CSS.grid).toContain('4px 4px');
    for (const overlay of OVERLAYS) expect(OVERLAY_CSS[overlay]).not.toBe('');
  });
});
