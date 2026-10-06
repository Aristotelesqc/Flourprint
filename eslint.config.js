// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Imports that would break the purity of core/domain (ADR 0001). */
const domainForbidden = [
  {
    group: ['node:*', 'fs', 'path', 'os', 'crypto', 'child_process'],
    message: 'core/domain must not depend on Node.',
  },
  { group: ['zod', 'zod/*'], message: 'Validation schemas belong to core/contracts.' },
  {
    group: ['react', 'react/*', 'react-dom', '@ionic/*', '@capacitor/*'],
    message: 'core/domain must not depend on UI or platform code.',
  },
  { group: ['@flourprint/*'], message: 'core/domain only imports its own modules.' },
  {
    group: ['**/application', '**/application/*', '**/contracts', '**/contracts/*'],
    message: 'core/domain must not import application or contracts.',
  },
];

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'pnpm-lock.yaml'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['packages/core/src/domain/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: domainForbidden }] },
  },
  {
    files: ['packages/core/src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'zod', 'react', '@ionic/*', '@capacitor/*'],
              message: 'Ports only.',
            },
            {
              group: ['**/contracts', '**/contracts/*'],
              message: 'application depends on domain.',
            },
          ],
        },
      ],
    },
  },
);
