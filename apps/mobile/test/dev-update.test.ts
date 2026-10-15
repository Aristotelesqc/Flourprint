import { describe, expect, it } from 'vitest';
import { fetchDeployedBuild, offersDevUpdate } from '../src/services/dev-update';

const respond = (body: unknown, ok = true): typeof fetch =>
  (async () => ({ ok, json: async () => body }) as Response) as typeof fetch;

describe('loading the latest dev build (ADR 0016)', () => {
  it('is offered by every build but a release', () => {
    expect(offersDevUpdate('release')).toBe(false);
    for (const channel of ['dev', 'preview', 'local']) expect(offersDevUpdate(channel)).toBe(true);
  });

  it('reads the deployed build, bypassing the cache', async () => {
    let init: RequestInit | undefined;
    const fetcher = (async (_url: string, options?: RequestInit) => {
      init = options;
      return { ok: true, json: async () => ({ build: '0.2.0-dev.9+abc', label: 'v0.2.0-x-y' }) };
    }) as unknown as typeof fetch;
    expect(await fetchDeployedBuild(fetcher)).toEqual({
      build: '0.2.0-dev.9+abc',
      label: 'v0.2.0-x-y',
    });
    expect(init?.cache).toBe('no-store');
  });

  it('reports an unreachable or malformed manifest as unknown', async () => {
    expect(await fetchDeployedBuild(respond({}, false))).toBeUndefined();
    expect(await fetchDeployedBuild(respond({ build: 3 }))).toBeUndefined();
    const failing = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    expect(await fetchDeployedBuild(failing)).toBeUndefined();
  });
});
