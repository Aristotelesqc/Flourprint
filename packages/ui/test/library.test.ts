import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Catalogue, catalogue as flourprintCatalogue } from '../src/catalogue/index.ts';
import { checkCatalogue, createLibrary, createUi, parseOverrides } from '../src/library.ts';
import badgeV1 from './fixtures/badge/v1.ts';
import badgeV2 from './fixtures/badge/v2.ts';
import cardV1 from './fixtures/card-v1.ts';
import { testCatalogue } from './fixtures/catalogue.ts';
import { testLibrary, type TestComponents } from './fixtures/components.ts';
import { testManifest } from './fixtures/manifest.ts';

const render = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(element);

describe('rendering by id (ADR 0020)', () => {
  it('renders the version the manifest selects, with the remaining props', () => {
    const { Ui, versionOf } = createUi(testManifest);
    const html = render(createElement(Ui, { component: 'fp.badge', label: 'Partial' }));
    expect(html).toBe('<span data-version="BADGE_V1_MARKER">Partial</span>');
    expect(versionOf('fp.badge')).toBe('v1');
  });

  it('switches a version through the manifest only, leaving the call unchanged', () => {
    const manifest = testLibrary.manifest({ ...testManifest, 'fp.badge': badgeV2 });
    const { Ui } = createUi(manifest);
    const html = render(createElement(Ui, { component: 'fp.badge', label: 'Partial' }));
    expect(html).toContain('BADGE_V2_MARKER');
  });

  it('applies comparison overrides on top of the manifest', () => {
    const { overrides } = parseOverrides('?ui=fp.badge:v2', testCatalogue);
    const { Ui, versionOf } = createUi(testManifest, overrides);
    expect(versionOf('fp.badge')).toBe('v2');
    expect(versionOf('fp.card')).toBe('v1');
    expect(render(createElement(Ui, { component: 'fp.card', title: 'T' }))).toContain(
      'CARD_V1_MARKER',
    );
  });
});

describe('comparison overrides', () => {
  it('reads one or several ui parameters, comma separated', () => {
    const { overrides, rejected } = parseOverrides(
      '?lang=fr&ui=fp.badge:v2,fp.card:v1&ui=',
      testCatalogue,
    );
    expect(overrides).toEqual({ 'fp.badge': badgeV2, 'fp.card': cardV1 });
    expect(rejected).toEqual([]);
  });

  it('rejects unknown ids and versions instead of guessing', () => {
    const { overrides, rejected } = parseOverrides(
      '?ui=fp.badge:v9,fp.nope:v1,fp.badge,__proto__:v1,fp.card:v1',
      testCatalogue,
    );
    expect(overrides).toEqual({ 'fp.card': cardV1 });
    expect(rejected).toEqual(['fp.badge:v9', 'fp.nope:v1', 'fp.badge', '__proto__:v1']);
  });
});

describe('catalogue consistency', () => {
  it('accepts a consistent catalogue and manifest', () => {
    expect(checkCatalogue(testCatalogue, testManifest)).toEqual([]);
  });

  it('reports a version filed under another id, a repeated version and an unlisted selection', () => {
    const broken = {
      'fp.badge': [badgeV1, badgeV1],
      'fp.card': [cardV1, badgeV2],
    } as unknown as typeof testCatalogue;
    const manifest = testLibrary.manifest({ 'fp.badge': badgeV2, 'fp.card': cardV1 });
    expect(checkCatalogue(broken, manifest)).toEqual([
      { id: 'fp.badge', problem: 'repeats v1' },
      { id: 'fp.badge', problem: 'manifest selects a version the catalogue does not list' },
      { id: 'fp.card', problem: 'lists fp.badge v2' },
    ]);
  });

  it("holds for Flourprint's own catalogue", () => {
    expect(checkCatalogue(flourprintCatalogue)).toEqual([]);
  });
});

describe('catalogue page', () => {
  it('shows every version with its examples in the three themes and marks the selection', () => {
    const html = render(
      createElement(Catalogue<TestComponents>, {
        catalogue: testCatalogue,
        manifest: testManifest,
      }),
    );
    for (const id of ['fp.badge-v1', 'fp.badge-v2', 'fp.card-v1']) {
      expect(html).toContain(`data-testid="catalogue-${id}"`);
    }
    expect(html.match(/>selected</g)).toHaveLength(2);
    expect(html.match(/BADGE_V2_MARKER/g)).toHaveLength(2 * 3);
    expect(html).toContain('data-tone="warning"');
    for (const theme of ['light', 'dark', 'amoled'])
      expect(html).toContain(`data-theme="${theme}"`);
  });

  it('says so for an empty catalogue', () => {
    const html = render(createElement(Catalogue<Record<never, never>>, { catalogue: {} }));
    expect(html).toContain('data-testid="catalogue-empty"');
  });
});

describe('nested selection', () => {
  it('switches nested components through one manifest entry without changing their parent', () => {
    type Parts = { 'fp.parent': object; 'fp.child': { label: string } };
    const kit = createLibrary<Parts>();
    const parent = kit.version({
      id: 'fp.parent',
      version: 'v1',
      component: () => createElement(kit.Slot, { component: 'fp.child', label: 'Nested' }),
      notes: 'Parent unchanged',
      examples: [{ name: 'Parent', props: {} }],
    });
    const v1 = kit.version({
      id: 'fp.child',
      version: 'v1',
      component: ({ label }) => createElement('span', null, 'CHILD_V1 ' + label),
      notes: 'First',
      examples: [{ name: 'First', props: { label: 'One' } }],
    });
    const v2 = kit.version({
      id: 'fp.child',
      version: 'v2',
      component: ({ label }) => createElement('span', null, 'CHILD_V2 ' + label),
      notes: 'Second',
      examples: [{ name: 'Second', props: { label: 'Two' } }],
    });
    const first = createUi(kit.manifest({ 'fp.parent': parent, 'fp.child': v1 }));
    const second = createUi(kit.manifest({ 'fp.parent': parent, 'fp.child': v2 }));
    expect(render(createElement(first.Ui, { component: 'fp.parent' }))).toContain(
      'CHILD_V1 Nested',
    );
    const changed = render(createElement(second.Ui, { component: 'fp.parent' }));
    expect(changed).toContain('CHILD_V2 Nested');
    expect(changed).not.toContain('CHILD_V1');
  });
});
