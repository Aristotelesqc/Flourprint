/**
 * Design tokens (ADR 0020): the only source of token values. `tokens.css` and the token
 * sections of DESIGN.md's front matter are generated from this module by
 * `node scripts/ui-tokens.mjs`; `pnpm check` fails when either differs.
 *
 * Colours keep DESIGN.md's flat names: no prefix for Light, `dark-` and `amoled-` for the other
 * themes. Motion durations and easing are round 2's (`22db386`), kept at the owner's request
 * (#134).
 */
export const tokens = {
  colors: {
    'surface-container-high': '#e7e3dc',
    'warning-bg': 'rgb(196 118 12 / 0.12)',
    'warning-border': 'rgb(196 118 12 / 0.38)',
    'warning-ink': '#7a4500',
    'danger-bg': 'rgb(179 38 30 / 0.1)',
    success: '#256b39',
    'success-bg': 'rgb(37 107 57 / 0.12)',
    shadow: 'rgb(28 25 21 / 0.12)',
    backdrop: 'rgb(20 17 14 / 0.52)',
    'dark-surface-container-high': '#3e3832',
    'dark-warning-bg': 'rgb(235 168 64 / 0.13)',
    'dark-warning-border': 'rgb(235 168 64 / 0.36)',
    'dark-warning-ink': '#f6c97e',
    'dark-danger-bg': 'rgb(242 139 130 / 0.14)',
    'dark-success': '#7cc992',
    'dark-success-bg': 'rgb(124 201 146 / 0.14)',
    'dark-shadow': 'rgb(0 0 0 / 0.42)',
    'dark-backdrop': 'rgb(8 7 6 / 0.68)',
    'amoled-warning-bg': 'rgb(235 168 64 / 0.13)',
    'amoled-warning-border': 'rgb(235 168 64 / 0.36)',
    'amoled-warning-ink': '#f6c97e',
    'amoled-danger-bg': 'rgb(242 139 130 / 0.14)',
    'amoled-success': '#7cc992',
    'amoled-success-bg': 'rgb(124 201 146 / 0.14)',
    'amoled-shadow': 'rgb(0 0 0 / 0.84)',
    'amoled-backdrop': 'rgb(0 0 0 / 0.78)',
    primary: '#a9490a',
    'on-primary': '#ffffff',
    background: '#f8f7f4',
    surface: '#ffffff',
    'surface-container': '#f2efe9',
    'on-surface': '#1c1b19',
    muted: '#69645c',
    outline: '#e4e0d8',
    'outline-subtle': '#eae5dc',
    track: '#ebe8e2',
    'field-outline': '#b9b3a8',
    'field-background': '#fbfaf8',
    'action-text': '#9a4209',
    'primary-container': 'rgb(169 73 10 / 0.1)',
    error: '#b3261e',
    'dark-primary': '#cf8a5e',
    'dark-on-primary': '#201d1a',
    'dark-background': '#201d1a',
    'dark-surface': '#2a2622',
    'dark-surface-container': '#332e29',
    'dark-on-surface': '#e9e4dc',
    'dark-muted': '#b1aa9f',
    'dark-outline': '#3b3631',
    'dark-outline-subtle': '#3a342e',
    'dark-track': '#322e29',
    'dark-field-outline': '#625b52',
    'dark-field-background': '#2e2a26',
    'dark-action-text': '#dba27c',
    'dark-primary-container': 'rgb(207 138 94 / 0.16)',
    'dark-error': '#f2b8b5',
    'amoled-primary': '#cf8a5e',
    'amoled-on-primary': '#000000',
    'amoled-background': '#000000',
    'amoled-surface': '#121110',
    'amoled-surface-container': '#1b1917',
    'amoled-surface-container-high': '#24211e',
    'amoled-on-surface': '#e9e4dc',
    'amoled-muted': '#b1aa9f',
    'amoled-outline': '#38322b',
    'amoled-outline-subtle': '#29241f',
    'amoled-track': '#1b1917',
    'amoled-field-outline': '#38322b',
    'amoled-field-background': '#121110',
    'amoled-action-text': '#dba27c',
    'amoled-primary-container': 'rgb(207 138 94 / 0.16)',
    'amoled-error': '#f28b82',
  },
  rounded: {
    sheet: '24px',
    pill: '9999px',
    card: '1rem',
    'segmented-option': '0.75rem',
  },
  spacing: {
    scale: ['0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem', '2rem'],
    compact: '0.375rem',
    control: '0.625rem',
    section: '1.25rem',
    'page-gutter': '1rem',
    touch: '48px',
    'touch-compact': '40px',
    'card-padding': '1rem',
  },
  typography: {
    font: { family: 'system-ui, sans-serif' },
    navigation: { size: '0.6875rem', line: 1.15 },
    heading: { size: '1.125rem', line: '1.5rem', weight: 700 },
    page: { size: '1.5rem', line: '2rem', weight: 700 },
    title: { size: '1.375rem', line: '1.75rem', weight: 700 },
    body: { size: '1rem', line: '1.5rem' },
    supporting: { size: '0.875rem', line: '1.25rem' },
    metadata: { size: '0.75rem', line: '1rem' },
    timer: { size: '3.25rem', line: 1.1, weight: 800 },
  },
  motion: {
    'duration-effect': '150ms',
    'duration-spatial': '220ms',
    'duration-sheet': '260ms',
    'easing-standard': 'cubic-bezier(0.2, 0, 0, 1)',
    'easing-decelerate': 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  },
} as const;

export type Tokens = typeof tokens;

const THEMES = ['dark', 'amoled'] as const;

const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Light colours: names without a theme prefix. */
const lightColours = (t: Tokens): [string, string][] =>
  Object.entries(t.colors).filter(
    ([name]) => !THEMES.some((theme) => name.startsWith(`${theme}-`)),
  );

const themeColours = (t: Tokens, theme: (typeof THEMES)[number]): [string, string][] =>
  Object.entries(t.colors)
    .filter(([name]) => name.startsWith(`${theme}-`))
    .map(([name, value]) => [name.slice(theme.length + 1), value]);

const block = (selector: string, declarations: [string, string | number][]): string =>
  `${selector} {\n${declarations.map(([name, value]) => `  --fp-${name}: ${value};`).join('\n')}\n}\n`;

/** The CSS custom properties of every theme, `--fp-` prefixed. */
export const tokensCss = (t: Tokens = tokens): string => {
  const motion = Object.entries(t.motion);
  const instant = motion
    .filter(([name]) => name.startsWith('duration-'))
    .map(([name]): [string, string] => [name, '0ms']);
  const base: [string, string | number][] = [
    ...lightColours(t).map(([name, value]): [string, string] => [`color-${name}`, value]),
    ...Object.entries(t.rounded).map(([name, value]): [string, string] => [
      `rounded-${name}`,
      value,
    ]),
    ...t.spacing.scale.map((value, index): [string, string] => [`spacing-${index + 1}`, value]),
    ...Object.entries(t.spacing)
      .filter(([name]) => name !== 'scale')
      .map(([name, value]): [string, string] => [`spacing-${name}`, String(value)]),
    ...Object.entries(t.typography).flatMap(([name, role]) =>
      Object.entries(role).map(([field, value]): [string, string | number] => [
        `type-${name}-${kebab(field)}`,
        value,
      ]),
    ),
    ...motion,
  ];
  const dark = (theme: (typeof THEMES)[number]) =>
    themeColours(t, theme).map(([name, value]): [string, string] => [`color-${name}`, value]);
  return [
    '/* Generated from packages/ui/src/tokens.ts by scripts/ui-tokens.mjs. Do not edit. */\n',
    block(":root,\n[data-theme='light']", base),
    block("[data-theme='dark']", dark('dark')),
    block("[data-theme='amoled']", dark('amoled')),
    `@media (prefers-color-scheme: dark) {\n${block(':root:not([data-theme])', dark('dark'))
      .split('\n')
      .map((line) => (line ? `  ${line}` : line))
      .join('\n')}}\n`,
    `@media (prefers-reduced-motion: reduce) {\n${block(':root', instant)
      .split('\n')
      .map((line) => (line ? `  ${line}` : line))
      .join('\n')}}\n`,
    block("[data-motion='reduced']", instant),
  ].join('\n');
};

const yamlScalar = (value: string | number): string =>
  typeof value === 'number' || /^[\w.-]+$/.test(value) ? String(value) : `'${value}'`;

/** The token sections of DESIGN.md's front matter, in its existing format. */
export const tokensYaml = (t: Tokens = tokens): string =>
  [
    'colors:',
    ...Object.entries(t.colors).map(([name, value]) => `  ${name}: '${value}'`),
    'rounded:',
    ...Object.entries(t.rounded).map(([name, value]) => `  ${name}: ${yamlScalar(value)}`),
    'spacing:',
    ...Object.entries(t.spacing).map(([name, value]) =>
      typeof value === 'string'
        ? `  ${name}: ${yamlScalar(value)}`
        : `  ${name}: [${value.join(', ')}]`,
    ),
    'typography:',
    ...Object.entries(t.typography).map(
      ([name, role]) =>
        `  ${name}: { ${Object.entries(role)
          .map(([field, value]) => `${field}: ${yamlScalar(value)}`)
          .join(', ')} }`,
    ),
    'motion:',
    ...Object.entries(t.motion).map(([name, value]) => `  ${name}: ${yamlScalar(value)}`),
  ].join('\n');
