# @flourprint/ui

Flourprint's versioned component library ([ADR 0020](../../docs/adr/0020-versioned-component-library.md)).
Screens (the layout engine) render components **by id**. A manifest picks the version of each
id, so switching a version is one line in the manifest. The screens and the library are not
touched.

The library imports React only. Components receive display-ready props: localized text,
formatted quantities, states and callbacks. The layout engine calls `@flourprint/core` and
maps its results to props. There is no baking math here.

## Layout

```text
src/library.ts           mechanism: versions, manifests, <Ui>, overrides, consistency check
src/components.ts        the component map: each id with the props all its versions implement
src/components/<name>/   one file per version: v1.tsx, v2.tsx, …
src/catalogue/           catalogue page and registry of every version
src/tokens.ts            design token values, the only source (DESIGN.md + tokens.css are generated)
src/tokens.css           generated: --fp-* custom properties for Light, Dark, AMOLED, motion
```

## Adding a component or a version

1. Add the id and its props type to `src/components.ts`:
   `'fp.recipe-card': RecipeCardProps`. Every version of the id implements those props. Adding
   an optional prop is fine. An incompatible change updates every version in the same pull
   request, or becomes a new id.
2. Add `src/components/recipe-card/v1.tsx`:

   ```tsx
   import { library } from '../../index.ts';

   export default library.version({
     id: 'fp.recipe-card',
     version: 'v1',
     component: RecipeCard,
     notes: 'Restores round 2 card hierarchy.',
     examples: [{ name: 'Active', props: { title: 'Shokupan', status: 'In progress' } }],
   });
   ```

3. List it in `src/catalogue/registry.ts`, the catalogue registry of every version. A test fails
   if a version file is missing there.
4. Select it in each consumer's manifest.

A new look is a new version beside the old one (`v2.tsx`). Once a version is selected on
`main`, it is frozen: further changes go into a new version. A version that no manifest on
`main`, `dev` or `canary` selects may be deleted.

## Using it from screens

The consumer's manifest imports exactly the versions it uses. That is what keeps unselected
versions out of release bundles:

```ts
// ui.manifest.ts
import { library } from '@flourprint/ui';
import recipeCard from '@flourprint/ui/components/recipe-card/v1';

export const manifest = library.manifest({ 'fp.recipe-card': recipeCard });
```

```ts
// ui.ts
import { createUi, parseOverrides, type FlourprintComponents, type Manifest } from '@flourprint/ui';
import { manifest } from './ui.manifest';

let overrides: Partial<Manifest<FlourprintComponents>> = {};
// Set VITE_UI_OVERRIDES=true for development, dev, canary and preview builds only.
if (import.meta.env.VITE_UI_OVERRIDES === 'true') {
  const { catalogue } = await import('@flourprint/ui/catalogue');
  overrides = parseOverrides(window.location.search, catalogue).overrides;
}
export const { Ui, versionOf } = createUi(manifest, overrides);
```

```tsx
<Ui component="fp.recipe-card" title={name} status={statusLabel} />
```

The manifest must list every id, and each entry must be a version of that id. The props of
`<Ui>` are checked against the id's props type. `test/type-guarantees.tsx` keeps these errors
in force.

In builds that allow overrides, `?ui=fp.recipe-card:v2` (or several entries,
comma-separated) renders another version for comparison. An override is never stored.
`test/release-bundle.test.ts` builds the pattern above with Vite to prove that a release bundle
without the flag holds only the selected versions.

Load `@flourprint/ui/tokens.css` once in the consumer. Themes follow `data-theme`
(`light`, `dark`, `amoled`) on any ancestor. Reduced motion follows the system setting or
`data-motion="reduced"`.

## Motions (ADR 0021)

Every animation is a versioned item, `fp.motion.<name>`, in `src/motions/<name>/v<N>.ts`, with a
guide in `guide.ts`. An item names its duration and easing by token (`effect`, `spatial`,
`sheet`; `standard`, `decelerate`). It also gives a **required** reduced-motion form: `'none'`,
or a lighter form.

- `keyframes` items run with `playMotion(motion, element)`. For Ionic overlays they run through
  `ionicAnimation(motion, createAnimation, '.modal-wrapper')`, passed to `enterAnimation` or
  `leaveAnimation`.
- `transition` items set a CSS `transition` with `transitionCss(motion, reduced)` for changes
  driven by styles: colour, rotation, accordion height.
- Components read motions with `useMotion('fp.motion.sheet-enter')` under a
  `<MotionProvider value={motionManifest}>`. They never write transitions themselves.
- `v1` of every id is round 2's motion. `defaultMotionManifest` selects it until the owner
  approves another version in the catalogue.
- `?ui=fp.motion.sheet-enter:v2` overrides a motion, as for components.

## Guides and the agent index (ADR 0021)

Every component id and motion id has a guide:

- purpose;
- when to use it and when not;
- every prop, which the type checks;
- accessibility;
- related ids;
- owner decisions.

Component guides go in `src/catalogue/registry.ts`, motion guides in each motion's `guide.ts`.
The catalogue shows them. `CATALOGUE.md` is generated from them as the index agents read
first. A test fails when a guide is missing or blank, or when the index is stale. Run
`pnpm ui:index` after changing a guide or a version.

## Tokens

Change values in `src/tokens.ts` only, then run `pnpm tokens`. That rewrites `src/tokens.css`
and the token sections of `DESIGN.md`'s front matter. `pnpm check` runs `pnpm tokens:check` and
fails when either file differs.

## Catalogue

```bash
pnpm catalogue        # serve on http://127.0.0.1:4271/catalogue.html (FLOURPRINT_CATALOGUE_PORT)
pnpm build:catalogue  # packages/ui/dist/catalogue
```

The catalogue shows every version of every id, with its examples. It renders them in Light,
Dark and AMOLED, at 393 px or 360 px, at 100 % or 130 % text, and with standard or reduced
motion.

## Ownership

Components and their versions belong to the interface writers (AGENTS.md: Gemini under
Codex). The mechanism, tests, token generation and catalogue build belong to Claude unless
the owner reassigns them.
