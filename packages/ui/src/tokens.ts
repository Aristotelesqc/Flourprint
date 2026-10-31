/**
 * Design tokens (ADR 0020, ADR 0022): the only source of token values. `tokens.css` and
 * the token sections of DESIGN.md's front matter are generated from this module by
 * `node scripts/ui-tokens.mjs`; `pnpm check` fails when either differs.
 *
 * Colours keep DESIGN.md's flat names: no prefix for Light, `dark-` and `amoled-` for the other
 * themes. Motion durations and easing are round 2's (`22db386`), kept at the owner's request
 * (#134). Native Tailwind v4 @theme declarations replace legacy --fp-* variables.
 */
export const tokens = {
  colors: {
    primary: '#a9490a',
    'on-primary': '#ffffff',
    background: '#f8f7f4',
    surface: '#ffffff',
    'surface-container': '#f2efe9',
    'surface-container-high': '#eae5dc',
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
    'dark-surface-container-high': '#3d3731',
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
    card: '1rem',
    pill: '9999px',
    'segmented-option': '0.75rem',
  },
  spacing: {
    scale: ['0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem', '2rem'],
    'page-gutter': '1rem',
    touch: '3rem',
    'card-padding': '1rem',
    'button-paint': '2.5rem',
  },
  typography: {
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
  ionic: {
    light: {
      'primary-rgb': '169, 73, 10',
      'primary-contrast-rgb': '255, 255, 255',
      'primary-shade': '#95400a',
      'primary-tint': '#b25b23',
      'background-rgb': '248, 247, 244',
      'text-rgb': '28, 27, 25',
    },
    dark: {
      'primary-rgb': '207, 138, 94',
      'primary-contrast-rgb': '32, 29, 26',
      'primary-shade': '#b67953',
      'primary-tint': '#d4966e',
      'background-rgb': '32, 29, 26',
      'text-rgb': '233, 228, 220',
    },
    amoled: {
      'primary-rgb': '207, 138, 94',
      'primary-contrast-rgb': '0, 0, 0',
      'primary-shade': '#b67953',
      'primary-tint': '#d4966e',
      'background-rgb': '0, 0, 0',
      'text-rgb': '233, 228, 220',
    },
  },
} as const;

export type Tokens = typeof tokens;

const THEMES = ['dark', 'amoled'] as const;

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
  `${selector} {\n${declarations.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}\n`;

const lightColorDecls = (t: Tokens): [string, string][] =>
  lightColours(t).map(([name, value]): [string, string] => [`--color-${name}`, value]);

const themeColorDecls = (t: Tokens, theme: (typeof THEMES)[number]): [string, string][] =>
  themeColours(t, theme).map(([name, value]): [string, string] => [`--color-${name}`, value]);

const ionicHelpers = (t: Tokens, theme: 'light' | 'dark' | 'amoled'): [string, string][] => [
  ['--ionic-primary-rgb', t.ionic[theme]['primary-rgb']],
  ['--ionic-primary-contrast-rgb', t.ionic[theme]['primary-contrast-rgb']],
  ['--ionic-primary-shade', t.ionic[theme]['primary-shade']],
  ['--ionic-primary-tint', t.ionic[theme]['primary-tint']],
  ['--ionic-background-rgb', t.ionic[theme]['background-rgb']],
  ['--ionic-text-rgb', t.ionic[theme]['text-rgb']],
];

/** The CSS custom properties and utilities of every theme, native Tailwind v4 tokens. */
export const tokensCss = (t: Tokens = tokens): string => {
  const SPACING_SCALE_MAP: Record<number, string> = {
    0: '1',
    1: '2',
    2: '3',
    3: '4',
    4: '6',
    5: '8',
  };

  const themeDeclarations: [string, string | number][] = [
    ...lightColorDecls(t),
    ...t.spacing.scale.map((value, index): [string, string] => [
      `--spacing-${SPACING_SCALE_MAP[index] ?? index + 1}`,
      value,
    ]),
    ...Object.entries(t.spacing)
      .filter(([name]) => name !== 'scale')
      .map(([name, value]): [string, string] => [`--spacing-${name}`, String(value)]),
    ...Object.entries(t.rounded).map(([name, value]): [string, string] => [
      `--radius-${name}`,
      value,
    ]),
    ...Object.entries(t.typography).flatMap(([name, role]) => {
      const decls: [string, string | number][] = [[`--text-${name}`, role.size]];
      if ('line' in role) {
        decls.push([`--text-${name}--line-height`, role.line]);
      }
      if ('weight' in role) {
        decls.push([`--text-${name}--font-weight`, role.weight]);
      }
      return decls;
    }),
    ...Object.entries(t.motion)
      .filter(([name]) => name.startsWith('duration-'))
      .map(([name, value]): [string, string] => [`--${name}`, value]),
    ...Object.entries(t.motion)
      .filter(([name]) => name.startsWith('easing-'))
      .map(([name, value]): [string, string] => [`--ease-${name.slice(7)}`, value]),
  ];

  const instant: [string, string][] = Object.keys(t.motion)
    .filter((name) => name.startsWith('duration-'))
    .map((name) => [`--${name}`, '0ms']);

  const ionicBridge: [string, string][] = [
    ['--ion-color-primary', 'var(--color-primary)'],
    ['--ion-color-primary-rgb', 'var(--ionic-primary-rgb)'],
    ['--ion-color-primary-contrast', 'var(--color-on-primary)'],
    ['--ion-color-primary-contrast-rgb', 'var(--ionic-primary-contrast-rgb)'],
    ['--ion-color-primary-shade', 'var(--ionic-primary-shade)'],
    ['--ion-color-primary-tint', 'var(--ionic-primary-tint)'],
    ['--ion-background-color', 'var(--color-background)'],
    ['--ion-background-color-rgb', 'var(--ionic-background-rgb)'],
    ['--ion-text-color', 'var(--color-on-surface)'],
    ['--ion-text-color-rgb', 'var(--ionic-text-rgb)'],
    ['--ion-toolbar-background', 'var(--color-background)'],
    ['--ion-toolbar-border-color', 'var(--color-outline)'],
    ['--ion-item-background', 'transparent'],
    ['--ion-border-color', 'var(--color-outline)'],
    ['--ion-card-background', 'var(--color-surface)'],
    ['--ion-overlay-background-color', 'var(--color-surface)'],
  ];

  return [
    '/* Generated from packages/ui/src/tokens.ts by scripts/ui-tokens.mjs. Do not edit. */\n',
    block('@theme', themeDeclarations),
    block(":root,\n[data-theme='light']", [...lightColorDecls(t), ...ionicHelpers(t, 'light')]),
    block("[data-theme='dark']", [...themeColorDecls(t, 'dark'), ...ionicHelpers(t, 'dark')]),
    block("[data-theme='amoled']", [...themeColorDecls(t, 'amoled'), ...ionicHelpers(t, 'amoled')]),
    `@media (prefers-color-scheme: dark) {\n${block(
      ":root:not([data-theme]),\n[data-theme='system']",
      [...themeColorDecls(t, 'dark'), ...ionicHelpers(t, 'dark')],
    )
      .split('\n')
      .map((line) => (line ? `  ${line}` : line))
      .join('\n')}}\n`,
    `@media (prefers-reduced-motion: reduce) {\n${block(':root', instant)
      .split('\n')
      .map((line) => (line ? `  ${line}` : line))
      .join('\n')}}\n`,
    block("[data-motion='reduced']", instant),
    block('@utility fp-ionic', ionicBridge),
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
