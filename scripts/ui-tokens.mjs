// Generates packages/ui/src/tokens.css and the token sections of DESIGN.md's front matter from
// packages/ui/src/tokens.ts, the only source of token values (ADR 0020).
//   node scripts/ui-tokens.mjs          write both files
//   node scripts/ui-tokens.mjs --check  fail if either differs (run by pnpm check)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { tokensCss, tokensYaml } from '../packages/ui/src/tokens.ts';

const repo = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');

const format = async (text, filepath) =>
  prettier.format(text, { ...(await prettier.resolveConfig(filepath)), filepath });

/** Replaces the front matter from `colors:` up to `components:` with the generated sections. */
const withTokens = (design) => {
  const lines = design.split('\n');
  const end = lines.indexOf('---', 1);
  const from = lines.indexOf('colors:');
  const to = lines.indexOf('components:');
  if (lines[0] !== '---' || end < 0 || from < 0 || to < from || to > end) {
    throw new Error('DESIGN.md front matter must hold colors: … before components:');
  }
  return [...lines.slice(0, from), tokensYaml(), ...lines.slice(to)].join('\n');
};

const targets = [
  { path: `${repo}packages/ui/src/tokens.css`, build: () => tokensCss() },
  { path: `${repo}DESIGN.md`, build: async (current) => withTokens(current) },
];

let stale = 0;
for (const { path, build } of targets) {
  const current = await readFile(path, 'utf8').catch(() => '');
  const expected = await format(await build(current), path);
  if (current === expected) continue;
  if (check) {
    stale += 1;
    console.error(`${path} differs from packages/ui/src/tokens.ts; run node scripts/ui-tokens.mjs`);
  } else {
    await writeFile(path, expected);
    console.log(`wrote ${path}`);
  }
}
process.exit(stale ? 1 : 0);
