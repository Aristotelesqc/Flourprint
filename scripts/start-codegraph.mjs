// Checkout-local developer tool. Never registered globally or loaded by app builds.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const cwd = realpathSync(process.cwd());
const relative = path.relative(root, cwd);
if (relative.startsWith('..') || path.isAbsolute(relative)) {
  throw new Error('CodeGraph is enabled only from this Flourprint checkout.');
}
const gitRoot = realpathSync(
  execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(),
);
const origin = execFileSync('git', ['remote', 'get-url', 'origin'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
if (
  gitRoot !== root ||
  !/^(?:https:\/\/github\.com\/|git@github\.com:)Aristotelesqc\/Flourprint(?:\.git)?$/i.test(origin)
) {
  throw new Error('CodeGraph requires the Aristotelesqc/Flourprint repository root.');
}
const binary = path.join(root, '.codegraph-local', 'bin', 'v0.21.0', 'codegraph-server.exe');
if (process.platform !== 'win32' || !existsSync(binary)) {
  throw new Error(
    'Install the pinned local CodeGraph Windows engine first; see docs/tooling/codegraph.md.',
  );
}
const excluded = [
  'dogfood',
  '.agy-runs',
  '.codegraph-local',
  '.codex',
  '.claude',
  '.agents',
  'coverage',
  'test-results',
  'playwright-report',
];
const args = [
  '--workspace',
  root,
  '--graph-only',
  '--profile',
  'core',
  ...excluded.flatMap((directory) => ['--exclude', directory]),
];
const extra = process.argv.slice(2);
if (extra.length === 0) args.push('--mcp');
else if (extra.length === 3 && extra[0] === '--query' && /^codegraph_[a-z_]+$/.test(extra[1])) {
  // One-shot structural inspection. Never allow caller-provided workspace/profile flags.
  const parameters = JSON.parse(extra[2]);
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters))
    throw new Error('Expected query object.');
  const allowed = [
    'codegraph_symbol_search',
    'codegraph_get_detailed_symbol',
    'codegraph_get_callers',
    'codegraph_get_dependency_graph',
    'codegraph_get_module_summary',
  ];
  if (!allowed.includes(extra[1])) throw new Error('Unsupported structural query.');
  args.push('--run-tool', extra[1], '--tool-args', extra[2]);
} else throw new Error('Unsupported CodeGraph launcher arguments.');
const child = spawn(binary, args, { cwd: root, stdio: 'inherit', windowsHide: true });
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill());
