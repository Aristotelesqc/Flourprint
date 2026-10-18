/**
 * Guides (ADR 0021): every component id and motion id says what it is for, when to use it and
 * when not, its props, its accessibility rules, related items and the owner decisions behind
 * it. The catalogue shows them, and `CATALOGUE.md`, the index agents read first, is generated
 * from them.
 */
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import type { ComponentId, ComponentMap } from './library.ts';

export interface Decision {
  readonly label: string;
  readonly url: string;
}

export interface Guide {
  /** One or two sentences: what the item is for. */
  readonly purpose: string;
  readonly useWhen: readonly [string, ...string[]];
  readonly avoidWhen: readonly string[];
  /** Keyboard, screen reader, contrast, touch target and reduced-motion rules. */
  readonly accessibility: readonly [string, ...string[]];
  /** Other component or motion ids used with this one. */
  readonly related: readonly string[];
  readonly decisions: readonly Decision[];
}

/** The keys of `A` when `P` takes all of them (it spreads that element's attributes). */
type Spread<P, A> = [Exclude<keyof A, keyof P>] extends [never]
  ? Exclude<keyof A, 'children'>
  : never;

/**
 * Props a guide documents: every prop of the id, optional ones included, except the standard
 * attributes of a native element whose props the component takes in full (a button's `type`,
 * `onClick`, `aria-*`…). Those are the platform's; `children` stays documented.
 */
export type DocumentedProps<P> = Exclude<
  keyof P,
  Spread<P, ButtonHTMLAttributes<HTMLButtonElement>> | Spread<P, HTMLAttributes<HTMLElement>>
>;

/** A component guide documents every documented prop of the id. */
export interface ComponentGuide<P> extends Guide {
  readonly props: { readonly [K in DocumentedProps<P>]-?: string };
}

/** One guide per component id. A missing id fails to type-check. */
export type ComponentGuides<C extends ComponentMap> = {
  readonly [K in ComponentId<C>]: ComponentGuide<C[K]>;
};

/** One guide per motion id. */
export type MotionGuides<M extends string> = { readonly [I in M]: Guide };

export interface GuideProblem {
  readonly id: string;
  readonly problem: string;
}

const blank = (text: string): boolean => text.trim() === '';

/**
 * What the types cannot see: blank texts, decision links that are not https, and guides for ids
 * that have no versions (or versions without a guide).
 */
export const checkGuides = (
  guides: Readonly<Record<string, Guide & { readonly props?: Readonly<Record<string, string>> }>>,
  ids: readonly string[],
): readonly GuideProblem[] => {
  const problems: GuideProblem[] = [];
  for (const id of ids) if (!Object.hasOwn(guides, id)) problems.push({ id, problem: 'no guide' });
  for (const [id, guide] of Object.entries(guides)) {
    if (!ids.includes(id)) problems.push({ id, problem: 'guide for an id with no versions' });
    const texts: [string, string][] = [
      ['purpose', guide.purpose],
      ...guide.useWhen.map((text): [string, string] => ['useWhen', text]),
      ...guide.avoidWhen.map((text): [string, string] => ['avoidWhen', text]),
      ...guide.accessibility.map((text): [string, string] => ['accessibility', text]),
      ...Object.entries(guide.props ?? {}).map(([prop, text]): [string, string] => [
        `props.${prop}`,
        text,
      ]),
      ...guide.decisions.map((decision): [string, string] => ['decisions', decision.label]),
    ];
    for (const [field, text] of texts)
      if (blank(text)) problems.push({ id, problem: `blank ${field}` });
    for (const decision of guide.decisions) {
      if (!decision.url.startsWith('https://')) {
        problems.push({ id, problem: `decision link is not https: ${decision.url}` });
      }
    }
  }
  return problems;
};
