import { describe, expect, it } from 'vitest';
import {
  cleanupDecision,
  compareVersions,
  createTransferSlot,
  fetchChangedFiles,
  fetchOpenPulls,
  fetchPullState,
  PAGES_HOST,
  parseDataEntries,
  parsePrNumber,
  parsePullState,
  parseVersionId,
  pullNeedsApk,
  staleVersions,
  touchesNative,
  TRANSFER_TTL_MS,
  versionAddress,
  versionOptions,
  versionOfAddress,
  type PullState,
  type VersionId,
} from '../src/dev-versions/index.js';

const json = (body: unknown, status = 200): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const failing = (async () => {
  throw new Error('offline');
}) as unknown as typeof fetch;

describe('version addresses (ADR 0023)', () => {
  it('builds the four forms', () => {
    expect(versionAddress('main')).toBe(`https://${PAGES_HOST}/`);
    expect(versionAddress('dev')).toBe(`https://dev.${PAGES_HOST}/`);
    expect(versionAddress('canary')).toBe(`https://canary.${PAGES_HOST}/`);
    expect(versionAddress('pr-233')).toBe(`https://pr-233.${PAGES_HOST}/`);
  });

  it('round-trips every version through its address', () => {
    for (const version of ['main', 'dev', 'canary', 'pr-1', 'pr-233'] as const) {
      expect(versionOfAddress(versionAddress(version))).toBe(version);
    }
  });

  it('accepts a path, query or fragment on an allowed origin', () => {
    expect(versionOfAddress(`https://pr-7.${PAGES_HOST}/recipes/abc?x=1#y`)).toBe('pr-7');
  });

  it('refuses every other address', () => {
    const refused = [
      `http://dev.${PAGES_HOST}/`,
      `https://dev.${PAGES_HOST}:8443/`,
      `https://user:secret@dev.${PAGES_HOST}/`,
      `https://${PAGES_HOST}.evil.example/`,
      `https://dev.${PAGES_HOST}.evil.example/`,
      `https://evil-${PAGES_HOST}/`,
      `https://xdev.${PAGES_HOST}/`,
      `https://feature-x.${PAGES_HOST}/`,
      `https://branch-dev.${PAGES_HOST}/`,
      `https://pr-.${PAGES_HOST}/`,
      `https://pr-abc.${PAGES_HOST}/`,
      `https://pr-0233.${PAGES_HOST}/`,
      `https://pr-0.${PAGES_HOST}/`,
      `https://pr-12.extra.${PAGES_HOST}/`,
      `https://PR-12x.${PAGES_HOST}/`,
      'https://example.com/',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'app://flourprint/',
      'not a url',
      '',
    ];
    for (const address of refused) expect(versionOfAddress(address), address).toBeUndefined();
  });

  it('is case-insensitive on the host, as DNS is', () => {
    expect(versionOfAddress(`https://DEV.${PAGES_HOST.toUpperCase()}/`)).toBe('dev');
  });

  it('parses stored version ids strictly', () => {
    expect(parseVersionId('main')).toBe('main');
    expect(parseVersionId('pr-12')).toBe('pr-12');
    for (const bad of ['release', 'pr-', 'pr-012', 'pr-1x', 'PR-1', 12, undefined, null, '']) {
      expect(parseVersionId(bad), String(bad)).toBeUndefined();
    }
  });

  it('reads a typed pull request number', () => {
    expect(parsePrNumber('233')).toBe(233);
    expect(parsePrNumber(' #233 ')).toBe(233);
    expect(parsePrNumber('PR 233')).toBe(233);
    for (const bad of ['', '#', 'abc', '0', '-3', '2.5', '007', '1234567890', '12 3']) {
      expect(parsePrNumber(bad), bad).toBeUndefined();
    }
  });

  it('orders dev, canary, main, then pull requests by number', () => {
    const versions: VersionId[] = ['pr-20', 'main', 'pr-3', 'canary', 'dev'];
    expect([...versions].sort(compareVersions)).toEqual(['dev', 'canary', 'main', 'pr-3', 'pr-20']);
  });
});

describe('open pull requests', () => {
  it('lists them newest first', async () => {
    const pulls = await fetchOpenPulls(
      json([
        { number: 5, title: 'Five', state: 'open' },
        { number: 233, title: 'Engine', state: 'open' },
      ]),
    );
    expect(pulls).toEqual([
      { number: 233, title: 'Engine' },
      { number: 5, title: 'Five' },
    ]);
  });

  it('gives nothing offline, rate-limited or malformed', async () => {
    expect(await fetchOpenPulls(failing)).toBeUndefined();
    expect(await fetchOpenPulls(json({ message: 'rate limit' }, 403))).toBeUndefined();
    expect(await fetchOpenPulls(json({ not: 'a list' }))).toBeUndefined();
    expect(await fetchOpenPulls(json([{ number: 'x' }]))).toBeUndefined();
  });
});

describe('automatic clean-up decision', () => {
  it('deletes a merged or closed pull request only', () => {
    expect(cleanupDecision('merged')).toBe('delete');
    expect(cleanupDecision('closed')).toBe('delete');
    expect(cleanupDecision('open')).toBe('keep');
    expect(cleanupDecision(undefined)).toBe('keep');
  });

  it('reads a pull request state', () => {
    expect(parsePullState({ state: 'open', merged: false })).toBe('open');
    expect(parsePullState({ state: 'closed', merged: true })).toBe('merged');
    expect(parsePullState({ state: 'closed', merged: false, merged_at: null })).toBe('closed');
    expect(parsePullState({ state: 'closed', merged_at: '2026-11-04T00:00:00Z' })).toBe('merged');
    expect(parsePullState({ state: 'weird' })).toBeUndefined();
    expect(parsePullState(null)).toBeUndefined();
  });

  it('fetches a state, and nothing on any failure', async () => {
    expect(await fetchPullState(9, json({ state: 'closed', merged: true }))).toBe('merged');
    expect(await fetchPullState(9, json({ message: 'Not Found' }, 404))).toBeUndefined();
    expect(await fetchPullState(9, failing)).toBeUndefined();
  });

  it('selects stale pull-request versions among those held', async () => {
    const states: Record<number, PullState | undefined> = {
      1: 'merged',
      2: 'closed',
      3: 'open',
      4: undefined,
    };
    const asked: number[] = [];
    const stale = await staleVersions(
      ['dev', 'canary', 'main', 'pr-1', 'pr-2', 'pr-3', 'pr-4', 'pr-5'],
      async (number) => {
        asked.push(number);
        if (number === 5) throw new Error('boom');
        return states[number];
      },
    );
    expect(stale).toEqual(['pr-1', 'pr-2']);
    // Named versions are never looked up, so never deleted.
    expect(asked).toEqual([1, 2, 3, 4, 5]);
  });

  it('never selects the loaded version', async () => {
    const stale = await staleVersions(['pr-1', 'pr-2'], async () => 'merged', 'pr-2');
    expect(stale).toEqual(['pr-1']);
  });

  it('deletes nothing when every lookup fails', async () => {
    expect(
      await staleVersions(['pr-1', 'pr-2'], async () => {
        throw new Error('offline');
      }),
    ).toEqual([]);
  });
});

describe('native changes', () => {
  const file = (filename: string, patch?: string) => ({ filename, ...(patch ? { patch } : {}) });

  it('flags the Android project, Capacitor and the desktop main process', () => {
    for (const filename of [
      'apps/mobile/android/app/src/main/java/app/flourprint/MainActivity.java',
      'apps/mobile/capacitor.config.ts',
      'apps/desktop/src/main.ts',
      'apps/desktop/scripts/package.mjs',
      'apps/desktop/package.json',
    ]) {
      expect(touchesNative([file(filename)]), filename).toBe(true);
    }
    expect(
      touchesNative([file('apps/mobile/package.json', '+    "@capacitor/camera": "^8.0.0",')]),
    ).toBe(true);
  });

  it('does not flag web code, docs, or non-Capacitor dependency changes', () => {
    expect(
      touchesNative([
        file('apps/mobile/src/pages/AdvancedPage.tsx'),
        file('docs/adr/0023-dev-app-version-picker.md'),
        file('apps/desktop/test/channel.test.ts'),
        file('apps/mobile/package.json', '+    "react-hook-form": "^7.90.0",'),
      ]),
    ).toBe(false);
  });

  it('fetches the files across pages and reports unreadable as unknown', async () => {
    const page = (names: string[]) => names.map((filename) => ({ filename }));
    const full = page(Array.from({ length: 100 }, (_, i) => `docs/${i}.md`));
    let calls = 0;
    const paged = (async () => {
      calls += 1;
      return new Response(
        JSON.stringify(calls === 1 ? full : page(['apps/mobile/android/build.gradle'])),
      );
    }) as unknown as typeof fetch;
    expect(await pullNeedsApk(4, paged)).toBe(true);
    expect(calls).toBe(2);
    expect(await fetchChangedFiles(4, failing)).toBeUndefined();
    expect(await pullNeedsApk(4, json({ message: 'rate limit' }, 403))).toBeUndefined();
  });
});

describe('versions holding data', () => {
  it('keeps known versions with a size, sorted', () => {
    expect(
      parseDataEntries([
        { version: 'pr-9', bytes: 10 },
        { version: 'main', bytes: 5.4 },
        { version: 'dev', bytes: 1000 },
        { version: 'pr-0', bytes: 1 },
        { version: 'canary', bytes: -1 },
        { version: 'evil', bytes: 1 },
        'x',
      ]),
    ).toEqual([
      { version: 'dev', bytes: 1000 },
      { version: 'main', bytes: 5 },
      { version: 'pr-9', bytes: 10 },
    ]);
    expect(parseDataEntries(undefined)).toEqual([]);
  });
});

describe('copy to a version: the pending hand-off', () => {
  it('is released once, to the target version only', () => {
    const slot = createTransferSlot(() => 0);
    slot.stash('pr-5', '{"a":1}');
    expect(slot.take('dev')).toBeUndefined();
    expect(slot.take('pr-5')).toBe('{"a":1}');
    expect(slot.take('pr-5')).toBeUndefined();
  });

  it('expires and is replaced by a newer copy', () => {
    let now = 0;
    const slot = createTransferSlot(() => now);
    slot.stash('pr-5', 'old');
    slot.stash('pr-6', 'new');
    expect(slot.take('pr-5')).toBeUndefined();
    now = TRANSFER_TTL_MS + 1;
    expect(slot.take('pr-6')).toBeUndefined();
    slot.stash('pr-6', 'again');
    expect(slot.take('pr-6')).toBe('again');
  });
});

describe('the version dropdown', () => {
  it('lists dev, canary and main first, then the open pull requests', () => {
    const options = versionOptions([
      { number: 233, title: 'Engine' },
      { number: 5, title: 'Five' },
    ]);
    expect(options.map((o) => o.version)).toEqual(['dev', 'canary', 'main', 'pr-233', 'pr-5']);
    expect(options[3]).toEqual({ version: 'pr-233', title: 'Engine' });
    expect(options[0]).toEqual({ version: 'dev' });
  });

  it('holds only the fixed entries when the list could not be fetched', () => {
    expect(versionOptions(undefined).map((o) => o.version)).toEqual(['dev', 'canary', 'main']);
    expect(versionOptions([]).map((o) => o.version)).toEqual(['dev', 'canary', 'main']);
  });

  it('keeps a loaded pull request that is not listed, in number order', () => {
    const options = versionOptions([{ number: 9, title: 'Nine' }], 'pr-12');
    expect(options.map((o) => o.version)).toEqual(['dev', 'canary', 'main', 'pr-12', 'pr-9']);
    expect(versionOptions(undefined, 'pr-12').map((o) => o.version)).toContain('pr-12');
    // A named loaded version adds nothing.
    expect(versionOptions([], 'canary')).toHaveLength(3);
  });
});
