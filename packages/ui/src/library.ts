/**
 * The versioned component library mechanism (ADR 0020).
 *
 * A component map `C` lists every component id with its props type. Each version of an id is a
 * separate module that implements those props. A consumer's manifest picks one version per id;
 * screens render by id and never import a version themselves. Everything here is generic over
 * `C`, so tests can exercise the mechanism with their own components.
 */
import {
  createContext,
  createElement,
  useContext,
  type ComponentType,
  type ReactElement,
} from 'react';

// Private erased transport; public Ui/Slot entry points retain the id-specific props contract.
const SelectedRenderer = createContext<((id: string, props: object) => ReactElement) | null>(null);

/** `v1`, `v2`, … */
export type VersionName = `v${number}`;

/** A component map: component id (`fp.<name>`) to the props every version implements. */
export type ComponentMap = { readonly [id: `fp.${string}`]: object };

export type ComponentId<C extends ComponentMap> = keyof C & `fp.${string}`;

/** One rendered example of a version in the catalogue. Sample text may be fixed here. */
export interface Example<P> {
  readonly name: string;
  readonly props: P;
}

/** One version of one component. */
export interface Version<
  C extends ComponentMap,
  K extends ComponentId<C> = ComponentId<C>,
  V extends VersionName = VersionName,
> {
  readonly id: K;
  readonly version: V;
  readonly component: ComponentType<C[K]>;
  /** What this version changes, shown in the catalogue. */
  readonly notes: string;
  /** Variants and states shown in the catalogue; at least one. */
  readonly examples: readonly [Example<C[K]>, ...Example<C[K]>[]];
}

/** The version a consumer selects for each id. Every id must have an entry. */
export type Manifest<C extends ComponentMap> = {
  readonly [K in ComponentId<C>]: Version<C, K>;
};

/** Every version of every id, for the catalogue and for comparison overrides. */
export type Catalogue<C extends ComponentMap> = {
  readonly [K in ComponentId<C>]: readonly [Version<C, K>, ...Version<C, K>[]];
};

/** Props of `<Ui>`: the component id plus that id's props. */
export type UiProps<C extends ComponentMap, K extends ComponentId<C>> = {
  readonly component: K;
} & C[K];

/** Typed helpers bound to one component map. */
export const createLibrary = <C extends ComponentMap>() => ({
  Slot: <K extends ComponentId<C>>(props: UiProps<C, K>): ReactElement => {
    const render = useContext(SelectedRenderer);
    if (!render) throw new Error('A library Slot must be rendered through a consumer Ui manifest');
    const { component, ...rest } = props;
    return render(component, rest);
  },
  version: <K extends ComponentId<C>, V extends VersionName>(version: Version<C, K, V>) => version,
  manifest: (manifest: Manifest<C>) => manifest,
  catalogue: (catalogue: Catalogue<C>) => catalogue,
});

export interface UiRenderer<C extends ComponentMap> {
  /** Renders the selected version of `component` with the remaining props. */
  readonly Ui: <K extends ComponentId<C>>(props: UiProps<C, K>) => ReactElement;
  /** The version rendered for an id, overrides included. */
  readonly versionOf: (id: ComponentId<C>) => VersionName;
}

/**
 * Binds screens to a manifest. `overrides` replace manifest entries for comparison in
 * development, `dev`, `canary` and preview builds only; nothing here persists them.
 */
export const createUi = <C extends ComponentMap>(
  manifest: Manifest<C>,
  overrides: Partial<Manifest<C>> = {},
): UiRenderer<C> => {
  const selected: Manifest<C> = { ...manifest, ...overrides };
  const pick = <K extends ComponentId<C>>(id: K): Version<C, K> => {
    const version = selected[id];
    if (!version) throw new Error(`No version selected for ${id}`);
    return version as Version<C, K>;
  };
  const renderSelected = (id: string, props: object): ReactElement =>
    createElement(pick(id as ComponentId<C>).component, props as C[ComponentId<C>]);
  const Ui = <K extends ComponentId<C>>(props: UiProps<C, K>): ReactElement => {
    const { component: id, ...rest } = props;
    return createElement(
      SelectedRenderer.Provider,
      { value: renderSelected },
      renderSelected(id, rest),
    );
  };
  return { Ui, versionOf: (id) => pick(id).version };
};

export interface ParsedOverrides<C extends ComponentMap> {
  readonly overrides: Partial<Manifest<C>>;
  /** Entries that name an unknown id or version, as written. */
  readonly rejected: readonly string[];
}

/**
 * Reads `ui=fp.recipe-card:v2,fp.badge:v1` (one or several `ui` parameters) from a query
 * string. Unknown ids or versions are returned in `rejected`, never guessed.
 */
export const parseOverrides = <C extends ComponentMap>(
  query: string,
  catalogue: Catalogue<C>,
): ParsedOverrides<C> => {
  const overrides: Partial<Record<ComponentId<C>, Version<C>>> = {};
  const rejected: string[] = [];
  const entries = new URLSearchParams(query)
    .getAll('ui')
    .flatMap((value) => value.split(','))
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  for (const entry of entries) {
    const separator = entry.lastIndexOf(':');
    const id = entry.slice(0, separator) as ComponentId<C>;
    const name = entry.slice(separator + 1);
    const versions = separator > 0 && Object.hasOwn(catalogue, id) ? catalogue[id] : undefined;
    const version = versions?.find((candidate) => candidate.version === name);
    if (version) overrides[id] = version;
    else rejected.push(entry);
  }
  return { overrides: overrides as Partial<Manifest<C>>, rejected };
};

export interface CatalogueProblem {
  readonly id: string;
  readonly problem: string;
}

/**
 * Checks what the type system cannot: each version's `id` matches its catalogue key, version
 * names are unique per id, and the manifest selects versions that the catalogue lists.
 */
export const checkCatalogue = <C extends ComponentMap>(
  catalogue: Catalogue<C>,
  manifest?: Manifest<C>,
): readonly CatalogueProblem[] => {
  const problems: CatalogueProblem[] = [];
  for (const id of Object.keys(catalogue) as ComponentId<C>[]) {
    const versions = catalogue[id];
    const names = new Set<string>();
    for (const version of versions) {
      if (version.id !== id)
        problems.push({ id, problem: `lists ${version.id} ${version.version}` });
      if (names.has(version.version)) problems.push({ id, problem: `repeats ${version.version}` });
      names.add(version.version);
    }
    if (manifest && !versions.includes(manifest[id])) {
      problems.push({ id, problem: 'manifest selects a version the catalogue does not list' });
    }
  }
  return problems;
};
