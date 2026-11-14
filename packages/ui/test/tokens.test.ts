import { describe, expect, it } from 'vitest';
import { tokens, tokensCss, tokensYaml } from '../src/tokens.ts';

describe('design tokens (ADR 0020, ADR 0022)', () => {
  const css = tokensCss();

  const COLOR_ROLES = [
    'primary',
    'on-primary',
    'background',
    'surface',
    'surface-container',
    'surface-container-high',
    'on-surface',
    'muted',
    'outline',
    'outline-subtle',
    'track',
    'field-outline',
    'field-background',
    'action-text',
    'primary-container',
    'error',
  ] as const;

  it('generates native Tailwind @theme static tokens without any --fp-* variables', () => {
    expect(css).toContain('@theme {');
    expect(css).not.toContain('--fp-');

    // Colors
    for (const role of COLOR_ROLES) {
      expect(css).toContain(`--color-${role}: ${tokens.colors[role]};`);
    }

    // Spacing: proper 4/6/8 numbering and semantic targets
    expect(css).toContain('--spacing-1: 0.25rem;');
    expect(css).toContain('--spacing-2: 0.5rem;');
    expect(css).toContain('--spacing-3: 0.75rem;');
    expect(css).toContain('--spacing-4: 1rem;');
    expect(css).toContain('--spacing-6: 1.5rem;');
    expect(css).toContain('--spacing-8: 2rem;');
    expect(css).toContain(`--spacing-touch: ${tokens.spacing.touch};`);
    expect(css).toContain(`--spacing-page-gutter: ${tokens.spacing['page-gutter']};`);
    expect(css).toContain(`--spacing-card-padding: ${tokens.spacing['card-padding']};`);
    expect(css).toContain(`--spacing-button-paint: ${tokens.spacing['button-paint']};`);

    // Radii
    expect(css).toContain(`--radius-card: ${tokens.rounded.card};`);
    expect(css).toContain(`--radius-pill: ${tokens.rounded.pill};`);
    expect(css).toContain(`--radius-segmented-option: ${tokens.rounded['segmented-option']};`);

    // Typography companions
    expect(css).toContain(`--text-page: ${tokens.typography.page.size};`);
    expect(css).toContain(`--text-page--line-height: ${tokens.typography.page.line};`);
    expect(css).toContain(`--text-page--font-weight: ${tokens.typography.page.weight};`);

    expect(css).toContain(`--text-title: ${tokens.typography.title.size};`);
    expect(css).toContain(`--text-title--line-height: ${tokens.typography.title.line};`);
    expect(css).toContain(`--text-title--font-weight: ${tokens.typography.title.weight};`);

    expect(css).toContain(`--text-body: ${tokens.typography.body.size};`);
    expect(css).toContain(`--text-body--line-height: ${tokens.typography.body.line};`);

    expect(css).toContain(`--text-timer: ${tokens.typography.timer.size};`);
    expect(css).toContain(`--text-timer--line-height: ${tokens.typography.timer.line};`);
    expect(css).toContain(`--text-timer--font-weight: ${tokens.typography.timer.weight};`);

    // Motion
    expect(css).toContain(`--duration-effect: ${tokens.motion['duration-effect']};`);
    expect(css).toContain(`--duration-spatial: ${tokens.motion['duration-spatial']};`);
    expect(css).toContain(`--duration-sheet: ${tokens.motion['duration-sheet']};`);
    expect(css).toContain(`--ease-standard: ${tokens.motion['easing-standard']};`);
    expect(css).toContain(`--ease-decelerate: ${tokens.motion['easing-decelerate']};`);
  });

  it('provides full role coverage in all themes without inherited light roles', () => {
    // Light explicit
    const lightBlock = css.slice(
      css.indexOf(":root,\n[data-theme='light'] {"),
      css.indexOf('}', css.indexOf(":root,\n[data-theme='light'] {")),
    );
    for (const role of COLOR_ROLES) {
      expect(lightBlock).toContain(`--color-${role}: ${tokens.colors[role]};`);
    }

    // Dark explicit
    const darkBlock = css.slice(
      css.indexOf("[data-theme='dark'] {"),
      css.indexOf('}', css.indexOf("[data-theme='dark'] {")),
    );
    for (const role of COLOR_ROLES) {
      expect(darkBlock).toContain(`--color-${role}: ${tokens.colors[`dark-${role}`]};`);
    }

    // AMOLED explicit
    const amoledBlock = css.slice(
      css.indexOf("[data-theme='amoled'] {"),
      css.indexOf('}', css.indexOf("[data-theme='amoled'] {")),
    );
    for (const role of COLOR_ROLES) {
      expect(amoledBlock).toContain(`--color-${role}: ${tokens.colors[`amoled-${role}`]};`);
    }

    // OS Dark fallback on :root:not([data-theme]) and [data-theme='system']
    const osDarkStart = css.indexOf('@media (prefers-color-scheme: dark)');
    const osDarkBlock = css.slice(osDarkStart, css.indexOf('}', css.indexOf('{', osDarkStart) + 1));
    expect(osDarkBlock).toContain(":root:not([data-theme]),\n  [data-theme='system']");
    for (const role of COLOR_ROLES) {
      expect(osDarkBlock).toContain(`--color-${role}: ${tokens.colors[`dark-${role}`]};`);
    }
  });

  it('zeroes every duration in reduced motion via OS media query and data-motion attribute', () => {
    for (const selector of ['@media (prefers-reduced-motion: reduce)', "[data-motion='reduced']"]) {
      const blockStart = css.indexOf(selector);
      expect(blockStart).toBeGreaterThan(-1);
      const blockEnd = css.indexOf('}', css.indexOf('{', blockStart) + 1);
      const block = css.slice(blockStart, blockEnd);
      for (const name of ['effect', 'spatial', 'sheet']) {
        expect(block).toContain(`--duration-${name}: 0ms;`);
      }
    }
  });

  it('declares scoped @utility fp-ionic without polluting global element selectors', () => {
    expect(css).toContain('@utility fp-ionic {');
    const ionicStart = css.indexOf('@utility fp-ionic {');
    const ionicBlock = css.slice(ionicStart, css.indexOf('}', ionicStart));

    expect(ionicBlock).toContain('--ion-color-primary: var(--color-primary);');
    expect(ionicBlock).toContain('--ion-color-primary-rgb: var(--ionic-primary-rgb);');
    expect(ionicBlock).toContain('--ion-color-primary-contrast: var(--color-on-primary);');
    expect(ionicBlock).toContain('--ion-background-color: var(--color-background);');
    expect(ionicBlock).toContain('--ion-background-color-rgb: var(--ionic-background-rgb);');
    expect(ionicBlock).toContain('--ion-text-color: var(--color-on-surface);');
    expect(ionicBlock).toContain('--ion-text-color-rgb: var(--ionic-text-rgb);');
    expect(ionicBlock).toContain('--ion-toolbar-background: var(--color-background);');
    expect(ionicBlock).toContain('--ion-toolbar-border-color: var(--color-outline);');
    expect(ionicBlock).toContain('--ion-item-background: transparent;');
    expect(ionicBlock).toContain('--ion-border-color: var(--color-outline);');
    expect(ionicBlock).toContain('--ion-card-background: var(--color-surface);');
    expect(ionicBlock).toContain('--ion-overlay-background-color: var(--color-surface);');

    // Verify absence of global element overrides
    expect(css).not.toMatch(/\bhtml\s*\{/);
    expect(css).not.toMatch(/\bbody\s*\{/);
    expect(css).not.toMatch(/\bion-[a-z-]+\s*\{/);
  });

  it('enforces 48px touch targets in rem and original typography scale', () => {
    expect(tokens.spacing.touch).toBe('3rem');
    expect(tokens.spacing['button-paint']).toBe('2.5rem');
    expect(tokens.typography.page.size).toBe('1.5rem');
    expect(tokens.typography.title.size).toBe('1.375rem');
    expect(tokens.typography.body.size).toBe('1rem');
    expect(tokens.typography.timer.size).toBe('3.25rem');
  });

  it('writes the DESIGN.md token sections in their existing format', () => {
    const yaml = tokensYaml();
    expect(yaml).toContain("  primary: '#a9490a'");
    expect(yaml).toContain("  surface-container-high: '#eae5dc'");
    expect(yaml).toContain("  dark-surface-container-high: '#3d3731'");
    expect(yaml).toContain("  amoled-surface-container-high: '#24211e'");
    expect(yaml).toContain('  pill: 9999px');
    expect(yaml).toContain('  scale: [0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem]');
    expect(yaml).toContain('  button-paint: 2.5rem');
    expect(yaml).toContain('  timer: { size: 3.25rem, line: 1.1, weight: 800 }');
    expect(yaml).toContain("  easing-standard: 'cubic-bezier(0.2, 0, 0, 1)'");
  });
});
