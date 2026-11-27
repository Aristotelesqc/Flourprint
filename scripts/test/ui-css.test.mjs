import { describe, expect, it } from 'vitest';
import { validateCss } from '../ui-css.mjs';

describe('ADR 0022 UI CSS boundary', () => {
  it('rejects a new component or screen stylesheet', () => {
    expect(
      validateCss('packages/ui/src/components/button/v1.css', '.button { color: red; }'),
    ).toHaveLength(1);
    expect(validateCss('apps/mobile/src/pages/Recipe.css', '.recipe {}')).toHaveLength(1);
  });
  it('accepts cross-cutting utilities but rejects global resets and screen classes', () => {
    expect(
      validateCss(
        'packages/ui/src/patterns.css',
        '@import "./tokens.css"; @utility fp-focus { &:focus-visible { outline: var(--color-primary); } }',
      ),
    ).toEqual([]);
    expect(validateCss('packages/ui/src/patterns.css', ':root { --x: 1; }')).not.toEqual([]);
    expect(validateCss('packages/ui/src/patterns.css', 'button { margin: 0; }')).not.toEqual([]);
    expect(validateCss('packages/ui/src/patterns.css', '.recipe-card {}')).not.toEqual([]);
  });
  it('requires a Tailwind capability/version rationale for a nonempty exception file', () => {
    expect(validateCss('packages/ui/src/exceptions.css', '/* No exceptions. */')).toEqual([]);
    expect(
      validateCss('packages/ui/src/exceptions.css', '.overlay::part(content) { x: 1; }'),
    ).toHaveLength(1);
  });
  it('keeps the catalogue host import-only', () => {
    expect(
      validateCss('packages/ui/catalogue.css', '@import "tailwindcss"; @source "./src";'),
    ).toEqual([]);
    expect(validateCss('packages/ui/catalogue.css', 'body { margin: 0; }')).toHaveLength(1);
  });
});
