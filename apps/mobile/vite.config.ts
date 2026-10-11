import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __APP_BUILD__: JSON.stringify(process.env.FLOURPRINT_BUILD ?? 'dev') },
  build: { outDir: 'dist', sourcemap: true },
});
