import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import rootPackage from '../../package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ADR 0016: CI sets the build name (scripts/build-id.mjs); a local build is `<version>-local`.
  define: {
    __APP_BUILD__: JSON.stringify(process.env.FLOURPRINT_BUILD ?? `${rootPackage.version}-local`),
  },
  build: { outDir: 'dist', sourcemap: true },
});
