import { describe, expect, it } from 'vitest';
import { DEV_URL, sameApp, shellChannel } from '../src/channel.js';

const ORIGIN = 'app://flourprint';

describe('desktop shell channel', () => {
  it('runs the bundled release app unless the package or the environment says dev', () => {
    expect(shellChannel(undefined, {}).kind).toBe('release');
    expect(shellChannel({ name: 'flourprint' }, {}).kind).toBe('release');
    expect(shellChannel({ flourprintChannel: 'canary' }, {}).kind).toBe('release');
  });

  it('loads the dev address in its own app, from the package or the environment', () => {
    const fromPackage = shellChannel({ flourprintChannel: 'dev' }, {});
    expect(fromPackage).toEqual({
      kind: 'dev',
      name: 'Flourprint Dev',
      appId: 'app.flourprint.dev',
      url: DEV_URL,
      origin: 'https://dev.flourprint-aristotelesqc.pages.dev',
    });
    expect(shellChannel(undefined, { FLOURPRINT_SHELL_CHANNEL: 'dev' })).toEqual(fromPackage);
  });

  it('accepts another http(s) dev address only', () => {
    const local = shellChannel(
      { flourprintChannel: 'dev' },
      { FLOURPRINT_DEV_URL: 'http://127.0.0.1:4317/' },
    );
    expect(local.kind === 'dev' && local.origin).toBe('http://127.0.0.1:4317');
    for (const bad of ['file:///C:/x.html', 'javascript:alert(1)', 'not a url']) {
      const channel = shellChannel({ flourprintChannel: 'dev' }, { FLOURPRINT_DEV_URL: bad });
      expect(channel.kind === 'dev' && channel.url).toBe(DEV_URL);
    }
  });

  it('keeps navigation inside the channel’s own app', () => {
    const release = shellChannel(undefined, {});
    expect(sameApp(release, 'app://flourprint/recipes', ORIGIN)).toBe(true);
    expect(sameApp(release, 'about:blank', ORIGIN)).toBe(true);
    expect(sameApp(release, 'https://dev.flourprint-aristotelesqc.pages.dev/', ORIGIN)).toBe(false);
    const dev = shellChannel({ flourprintChannel: 'dev' }, {});
    expect(sameApp(dev, 'https://dev.flourprint-aristotelesqc.pages.dev/recipes', ORIGIN)).toBe(
      true,
    );
    expect(sameApp(dev, 'app://flourprint/', ORIGIN)).toBe(false);
    expect(sameApp(dev, 'https://evil.example/', ORIGIN)).toBe(false);
    expect(
      sameApp(dev, 'https://dev.flourprint-aristotelesqc.pages.dev.evil.example/', ORIGIN),
    ).toBe(false);
  });
});
