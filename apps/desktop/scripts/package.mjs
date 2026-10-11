// Packages the desktop shell without a packager (ADR 0011): Electron's own distribution for
// this platform, its executable renamed, and the app (shell, web build, workspace packages) in
// resources/app. Run after `pnpm build` and `pnpm build:mobile`.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const here = resolve(import.meta.dirname, '..');
const repo = resolve(here, '..', '..');
const require = createRequire(join(here, 'package.json'));
const electronDist = join(dirname(require.resolve('electron/package.json')), 'dist');
if (!existsSync(electronDist)) throw new Error(`Electron binary missing in ${electronDist}`);

const platform = process.platform;
const out = join(here, 'out', `Flourprint-${platform}-${process.arch}`);
rmSync(out, { recursive: true, force: true });
cpSync(electronDist, out, { recursive: true, verbatimSymlinks: true });

const executable = { win32: ['electron.exe', 'Flourprint.exe'], linux: ['electron', 'flourprint'] }[
  platform
];
if (executable) renameSync(join(out, executable[0]), join(out, executable[1]));
rmSync(join(out, 'resources', 'default_app.asar'), { force: true });

const app = join(out, 'resources', 'app');
mkdirSync(app, { recursive: true });
const own = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
writeFileSync(
  join(app, 'package.json'),
  `${JSON.stringify({ name: 'flourprint', productName: 'Flourprint', version: own.version, type: 'module', main: 'dist/main.js' }, null, 2)}\n`,
);
cpSync(join(here, 'dist'), join(app, 'dist'), { recursive: true });
const web = join(repo, 'apps', 'mobile', 'dist');
if (!existsSync(join(web, 'index.html'))) throw new Error('Build the mobile app first.');
cpSync(web, join(app, 'web'), { recursive: true });
for (const name of ['core', 'adapters']) {
  const source = join(repo, 'packages', name);
  const target = join(app, 'node_modules', '@flourprint', name);
  mkdirSync(target, { recursive: true });
  cpSync(join(source, 'package.json'), join(target, 'package.json'));
  cpSync(join(source, 'dist'), join(target, 'dist'), { recursive: true });
}
console.log(out);
