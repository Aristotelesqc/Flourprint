// Serves or builds the component catalogue page of packages/ui (ADR 0020) with the repository's
// Vite and React plugin, as the app uses them.
//   node scripts/ui-catalogue.mjs serve   http://127.0.0.1:$FLOURPRINT_CATALOGUE_PORT (4271)
//   node scripts/ui-catalogue.mjs build   packages/ui/dist/catalogue
// Comparison overrides are a consumer feature; the catalogue always shows every version.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const root = path.join(repo, 'packages/ui');
const requireMobile = createRequire(path.join(repo, 'apps/mobile/package.json'));
const { build, createServer, preview } = await import(
  pathToFileURL(requireMobile.resolve('vite')).href
);
const { default: react } = await import(
  pathToFileURL(requireMobile.resolve('@vitejs/plugin-react')).href
);

const { default: tailwindcss } = await import(
  pathToFileURL(requireMobile.resolve('@tailwindcss/vite')).href
);

const mode = process.argv[2] ?? 'build';
const port = Number(process.env.FLOURPRINT_CATALOGUE_PORT ?? 4271);
const config = {
  configFile: false,
  root,
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.join(root, 'dist/catalogue'),
    emptyOutDir: true,
    rollupOptions: {
      input:
        process.env.FLOURPRINT_UI_FIXTURES === 'true'
          ? [
              path.join(root, 'catalogue.html'),
              path.join(root, 'test/fixtures/foundation/index.html'),
              path.join(root, 'test/fixtures/overlay-motion/index.html'),
            ]
          : path.join(root, 'catalogue.html'),
    },
  },
  server: { host: '127.0.0.1', port, strictPort: true },
};

if (mode === 'serve') {
  const server = await createServer(config);
  await server.listen();
  server.printUrls();
} else if (mode === 'preview') {
  const server = await preview({
    ...config,
    preview: { host: '127.0.0.1', port, strictPort: true },
  });
  server.printUrls();
} else if (mode === 'build') {
  await build(config);
} else {
  throw new Error(`Unknown mode ${mode}: use serve, preview or build`);
}
