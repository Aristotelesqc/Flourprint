// Packages the desktop shell without a packager (ADR 0011): Electron's own distribution for
// this platform, its executable renamed, and the app (shell, web build, workspace packages) in
// resources/app. Run after `pnpm build` and `pnpm build:mobile`.
//
// `--channel=dev` packages the dev shell (#113), which loads the dev address and needs no web
// build. `--platform=win32` packages for Windows from another system, once Electron's Windows
// distribution is installed (`ELECTRON_INSTALL_PLATFORM=win32 node node_modules/electron/install.js`).
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
import { Data, NtExecutable, NtExecutableResource, Resource } from 'resedit';

const here = resolve(import.meta.dirname, '..');
const repo = resolve(here, '..', '..');
const require = createRequire(join(here, 'package.json'));
const electronDist = join(dirname(require.resolve('electron/package.json')), 'dist');
if (!existsSync(electronDist)) throw new Error(`Electron binary missing in ${electronDist}`);

const option = (name) =>
  process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const dev = option('channel') === 'dev';
if (option('channel') !== undefined && !dev) throw new Error('--channel accepts dev only.');
const platform = option('platform') ?? process.platform;
const productName = dev ? 'Flourprint Dev' : 'Flourprint';
const out = join(
  here,
  'out',
  `${dev ? 'Flourprint-Dev' : 'Flourprint'}-${platform}-${process.arch}`,
);
rmSync(out, { recursive: true, force: true });
cpSync(electronDist, out, { recursive: true, verbatimSymlinks: true });

const executable = {
  win32: ['electron.exe', dev ? 'FlourprintDev.exe' : 'Flourprint.exe'],
  linux: ['electron', dev ? 'flourprint-dev' : 'flourprint'],
}[platform];
if (executable) {
  if (!existsSync(join(out, executable[0])))
    throw new Error(`Electron's ${platform} distribution is not installed in ${electronDist}`);
  renameSync(join(out, executable[0]), join(out, executable[1]));
}
const icon = join(here, 'resources', dev ? 'icon-dev' : 'icon');

/**
 * The Windows executable shows the Flourprint logo and name (Explorer, taskbar, Task Manager)
 * instead of Electron's. Rewriting its resources drops Electron's signature; the zip is unsigned
 * either way (ADR 0016).
 */
const brandWindowsExecutable = (path, version) => {
  const exe = NtExecutable.from(readFileSync(path), { ignoreCert: true });
  const resources = NtExecutableResource.from(exe);
  const iconFile = Data.IconFile.from(readFileSync(`${icon}.ico`));
  for (const group of Resource.IconGroupEntry.fromEntries(resources.entries)) {
    Resource.IconGroupEntry.replaceIconsForResource(
      resources.entries,
      group.id,
      group.lang,
      iconFile.icons.map((item) => item.data),
    );
  }
  const [info] = Resource.VersionInfo.fromEntries(resources.entries);
  if (!info) throw new Error('No version information in the Electron executable');
  for (const language of info.getAllLanguagesForStringValues()) {
    info.setStringValues(language, {
      CompanyName: 'Flourprint',
      FileDescription: productName,
      InternalName: productName,
      OriginalFilename: executable[1],
      ProductName: productName,
      LegalCopyright: '',
    });
  }
  info.setFileVersion(version);
  info.setProductVersion(version);
  info.outputToResourceEntries(resources.entries);
  resources.outputResource(exe);
  writeFileSync(path, Buffer.from(exe.generate()));
};

rmSync(join(out, 'resources', 'default_app.asar'), { force: true });

const app = join(out, 'resources', 'app');
mkdirSync(app, { recursive: true });
const own = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
writeFileSync(
  join(app, 'package.json'),
  `${JSON.stringify(
    {
      name: dev ? 'flourprint-dev' : 'flourprint',
      productName,
      version: own.version,
      type: 'module',
      main: 'dist/main.js',
      ...(dev ? { flourprintChannel: 'dev' } : {}),
    },
    null,
    2,
  )}\n`,
);
cpSync(join(here, 'dist'), join(app, 'dist'), { recursive: true });
// The window's icon (main.ts).
cpSync(`${icon}.png`, join(app, 'icon.png'));
if (!dev) {
  const web = join(repo, 'apps', 'mobile', 'dist');
  if (!existsSync(join(web, 'index.html'))) throw new Error('Build the mobile app first.');
  cpSync(web, join(app, 'web'), { recursive: true });
}
for (const name of ['core', 'adapters']) {
  const source = join(repo, 'packages', name);
  const target = join(app, 'node_modules', '@flourprint', name);
  mkdirSync(target, { recursive: true });
  cpSync(join(source, 'package.json'), join(target, 'package.json'));
  cpSync(join(source, 'dist'), join(target, 'dist'), { recursive: true });
}
if (platform === 'win32') {
  // The app's version (root package.json), not the shell package's placeholder.
  const { version } = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
  brandWindowsExecutable(join(out, executable[1]), version);
}
console.log(out);
