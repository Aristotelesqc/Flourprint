import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * ADR 0020: release builds contain only the versions their manifest selects; builds that allow
 * comparison overrides may load every version. This builds the documented consumer pattern
 * (test/fixtures/consumer) with the repository's Vite, as the app does, both ways.
 */
const repo = fileURLToPath(new URL('../../../', import.meta.url));
/** The part of Vite's API used here; Vite itself is resolved from the app, as scripts do. */
interface Chunk {
  readonly code?: string;
  readonly source?: string | Uint8Array;
}
interface Vite {
  build(config: object): Promise<{ output: Chunk[] } | { output: Chunk[] }[]>;
}
const vite = (await import(
  pathToFileURL(createRequire(`${repo}apps/mobile/package.json`).resolve('vite')).href
)) as Vite;

const bundle = async (overrides: boolean): Promise<string> => {
  const result = await vite.build({
    configFile: false,
    logLevel: 'silent',
    root: fileURLToPath(new URL('./fixtures/consumer/', import.meta.url)),
    define: { 'import.meta.env.VITE_UI_OVERRIDES': JSON.stringify(String(overrides)) },
    build: {
      write: false,
      minify: false,
      target: 'esnext',
      rollupOptions: {
        input: fileURLToPath(new URL('./fixtures/consumer/main.ts', import.meta.url)),
      },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  return outputs
    .flatMap((output) => output.output)
    .map((chunk) => chunk.code ?? String(chunk.source))
    .join('\n');
};

describe('release bundle (ADR 0020)', () => {
  it('holds only the manifest-selected versions without overrides', async () => {
    const code = await bundle(false);
    expect(code).toContain('BADGE_V1_MARKER');
    expect(code).toContain('CARD_V1_MARKER');
    expect(code).not.toContain('BADGE_V2_MARKER');
    expect(code).toContain('FADE_V1_MARKER');
    expect(code).not.toContain('FADE_V2_MARKER');
  });

  it('can load every version when a build allows comparison overrides', async () => {
    const code = await bundle(true);
    expect(code).toContain('BADGE_V2_MARKER');
    expect(code).toContain('FADE_V2_MARKER');
  });
});
