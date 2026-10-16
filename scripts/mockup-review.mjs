import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const root = path.join(repo, 'docs/mockups/0.3-ux');
const mobile = path.join(repo, 'apps/mobile');
const requireMobile = createRequire(path.join(mobile, 'package.json'));
const { build, createServer, preview } = await import(
  pathToFileURL(requireMobile.resolve('vite')).href
);
const { default: react } = await import(
  pathToFileURL(requireMobile.resolve('@vitejs/plugin-react')).href
);

async function sourceHash() {
  const hash = createHash('sha256');
  const files = ['index.html', 'mockup.html', 'mark.svg'];
  async function visit(directory) {
    for (const entry of (await readdir(path.join(root, directory), { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await visit(relative);
      else files.push(relative);
    }
  }
  await visit('src');
  for (const file of files) {
    hash.update(file);
    hash.update(await readFile(path.join(root, file)));
    hash.update('\0');
  }
  async function domainFiles(directory) {
    for (const entry of (await readdir(path.join(repo, directory), { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await domainFiles(relative);
      else {
        hash.update(relative);
        hash.update(await readFile(path.join(repo, relative)));
        hash.update('\0');
      }
    }
  }
  await domainFiles('packages/core/src');
  for (const file of [
    'pnpm-lock.yaml',
    'apps/mobile/src/i18n/messages.ts',
    'apps/mobile/src/i18n/help.ts',
    'scripts/mockup-review.mjs',
  ]) {
    hash.update(file);
    hash.update(await readFile(path.join(repo, file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

const mode = process.argv[2] ?? 'build';
const port = Number(process.env.FLOURPRINT_MOCKUP_PORT ?? 4263);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const sourceSha256 = await sourceHash();
const config = {
  configFile: false,
  root,
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react(?=\/|$)/, replacement: path.join(mobile, 'node_modules/react') },
      { find: /^react-dom(?=\/|$)/, replacement: path.join(mobile, 'node_modules/react-dom') },
      {
        find: '@flourprint/core/domain',
        replacement: path.join(repo, 'packages/core/src/domain/index.ts'),
      },
      {
        find: '@flourprint/core/application',
        replacement: path.join(repo, 'packages/core/src/application/index.ts'),
      },
    ],
  },
  define: {
    __MOCKUP_REVISION__: JSON.stringify(revision),
    __MOCKUP_SOURCE_HASH__: JSON.stringify(sourceSha256),
  },
  server: { host: '127.0.0.1', port, strictPort: true },
  preview: { host: '127.0.0.1', port, strictPort: true },
  build: {
    outDir: path.join(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: { gallery: path.join(root, 'index.html'), mockup: path.join(root, 'mockup.html') },
    },
  },
};

if (mode === 'build') {
  await build(config);
  await cp(path.join(root, 'mark.svg'), path.join(root, 'dist/mark.svg'));
  await writeFile(
    path.join(root, 'dist/review-build.json'),
    `${JSON.stringify({ revision, sourceSha256 }, null, 2)}\n`,
  );
} else if (mode === 'serve') {
  const server = await createServer(config);
  await server.listen();
  server.printUrls();
} else if (mode === 'preview') {
  const server = await preview(config);
  server.printUrls();
} else if (mode === 'export') {
  const destination = process.env.FLOURPRINT_MOCKUP_EXPORT;
  if (!destination)
    throw new Error('Set FLOURPRINT_MOCKUP_EXPORT to an explicit publication directory');
  await mkdir(destination, { recursive: true });
  await cp(path.join(root, 'dist'), destination, { recursive: true });
} else {
  throw new Error('Expected build, serve, preview or export');
}
