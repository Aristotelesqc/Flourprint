/**
 * The agent index (ADR 0021): `packages/ui/CATALOGUE.md`, generated from the guides and
 * catalogues so that agents learn what each item is for before using or adding one. A test
 * keeps the committed file current.
 */
import type { Guide } from '../guides.ts';
import type { Versioned } from '../library.ts';

type Entry = Versioned & { readonly notes: string; readonly kind?: string };
type GuideWithProps = Guide & { readonly props?: Readonly<Record<string, string>> };

export interface CatalogueMarkdownInput {
  readonly components: Readonly<Record<string, readonly Entry[]>>;
  readonly componentGuides: Readonly<Record<string, GuideWithProps>>;
  readonly componentManifest?: Readonly<Record<string, Versioned>>;
  readonly motions: Readonly<Record<string, readonly Entry[]>>;
  readonly motionGuides: Readonly<Record<string, Guide>>;
  readonly motionManifest?: Readonly<Record<string, Versioned>>;
}

const list = (title: string, items: readonly string[]): string[] =>
  items.length === 0 ? [] : [`**${title}**`, '', ...items.map((item) => `- ${item}`), ''];

const section = (
  id: string,
  versions: readonly Entry[],
  guide: GuideWithProps | undefined,
  selected: Versioned | undefined,
): string[] => {
  const lines = [`### \`${id}\``, ''];
  if (!guide) return [...lines, '_No guide._', ''];
  lines.push(guide.purpose, '');
  lines.push(...list('Use when', guide.useWhen));
  lines.push(...list('Avoid when', guide.avoidWhen));
  if (guide.props && Object.keys(guide.props).length > 0) {
    lines.push('**Props**', '', '| Prop | Meaning |', '| --- | --- |');
    for (const [prop, meaning] of Object.entries(guide.props)) {
      lines.push(`| \`${prop}\` | ${meaning} |`);
    }
    lines.push('');
  }
  lines.push(...list('Accessibility', guide.accessibility));
  lines.push(
    ...list(
      'Related',
      guide.related.map((related) => `\`${related}\``),
    ),
  );
  lines.push(
    ...list(
      'Decisions',
      guide.decisions.map(({ label, url }) => `[${label}](${url})`),
    ),
  );
  lines.push(
    ...list(
      'Versions',
      versions.map(
        (version) =>
          `\`${version.version}\`${version.kind ? ` (${version.kind})` : ''}${
            selected === version ? ', default selection' : ''
          }: ${version.notes}`,
      ),
    ),
  );
  return lines;
};

const sections = (
  catalogue: Readonly<Record<string, readonly Entry[]>>,
  guides: Readonly<Record<string, GuideWithProps>>,
  manifest: Readonly<Record<string, Versioned>> | undefined,
): string[] => {
  const ids = Object.keys(catalogue).sort();
  if (ids.length === 0) return ['_None yet._', ''];
  return ids.flatMap((id) => section(id, catalogue[id] ?? [], guides[id], manifest?.[id]));
};

export const catalogueMarkdown = (input: CatalogueMarkdownInput): string =>
  [
    '# Flourprint library index',
    '',
    '<!-- Generated from packages/ui guides and catalogues. Do not edit: run pnpm ui:index. -->',
    '',
    'Read this before using or adding a library item (ADR 0020, ADR 0021). Screens render',
    'components by id and never style their insides; components ask for motions by id and never',
    'write transitions. Every item has a guide; a new item or version ships with its guide.',
    '',
    '## Components',
    '',
    ...sections(input.components, input.componentGuides, input.componentManifest),
    '## Motions',
    '',
    ...sections(input.motions, input.motionGuides, input.motionManifest),
  ]
    .join('\n')
    .replace(/\n+$/, '\n');
