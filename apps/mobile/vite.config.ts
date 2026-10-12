import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import rootPackage from '../../package.json' with { type: 'json' };

// ADR 0016: CI sets the build names (scripts/build-id.mjs); a local build is `<version>-local`.
const build = process.env.FLOURPRINT_BUILD ?? `${rootPackage.version}-local`;
const label = process.env.FLOURPRINT_LABEL ?? `v${rootPackage.version}-local`;
const channel = process.env.FLOURPRINT_CHANNEL ?? 'local';

/** Publishes `build.json` next to the app, so a dev build can tell a newer deployment exists. */
const buildManifest = (): Plugin => ({
  name: 'flourprint-build-manifest',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'build.json',
      source: `${JSON.stringify({ build, label, channel })}\n`,
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), buildManifest()],
  define: {
    __APP_BUILD__: JSON.stringify(build),
    __APP_LABEL__: JSON.stringify(label),
    __APP_CHANNEL__: JSON.stringify(channel),
  },
  build: { outDir: 'dist', sourcemap: true },
});
