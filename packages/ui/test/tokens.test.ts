import { describe, expect, it } from 'vitest';
import { tokens, tokensCss, tokensYaml } from '../src/tokens.ts';

describe('design tokens (ADR 0020)', () => {
  const css = tokensCss();

  it('declares the primary colour for Light, Dark and AMOLED', () => {
    expect(css).toContain(`--fp-color-primary: ${tokens.colors.primary};`);
    for (const theme of ['dark', 'amoled'] as const) {
      const block = css.slice(css.indexOf(`[data-theme='${theme}'] {`));
      expect(block).toContain(`--fp-color-primary: ${tokens.colors[`${theme}-primary`]};`);
    }
  });

  it('keeps round 2 motion and zeroes every duration in reduced motion', () => {
    expect(css).toContain('--fp-duration-effect: 150ms;');
    expect(css).toContain('--fp-easing-standard: cubic-bezier(0.2, 0, 0, 1);');
    for (const selector of ['@media (prefers-reduced-motion: reduce)', "[data-motion='reduced']"]) {
      const block = css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)));
      for (const name of ['effect', 'spatial', 'sheet']) {
        expect(block).toContain(`--fp-duration-${name}: 0ms;`);
      }
    }
  });

  it('writes the DESIGN.md token sections in their existing format', () => {
    const yaml = tokensYaml();
    expect(yaml).toContain("  primary: '#a9490a'");
    expect(yaml).toContain('  scale: [0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem]');
    expect(yaml).toContain('  timer: { size: 3.25rem, line: 1.1, weight: 800 }');
    expect(yaml).toContain("  easing-standard: 'cubic-bezier(0.2, 0, 0, 1)'");
  });
});
