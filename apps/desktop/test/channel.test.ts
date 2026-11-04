import { describe, expect, it } from 'vitest';
import { addressOf, DEV_URL, sameApp, shellChannel } from '../src/channel.js';

const ORIGIN = 'app://flourprint';
const DEV_ORIGIN = 'https://dev.flourprint-aristotelesqc.pages.dev';

describe('desktop shell channel', () => {
  it('runs the bundled release app unless the package or the environment says dev', () => {
    expect(shellChannel(undefined, {}).kind).toBe('release');
    expect(shellChannel({ name: 'flourprint' }, {}).kind).toBe('release');
    expect(shellChannel({ flourprintChannel: 'canary' }, {}).kind).toBe('release');
  });

  it('has no address and no version bridge in the release shell', () => {
    const release = shellChannel(undefined, {});
    expect(release).toEqual({ kind: 'release', name: 'Flourprint', appId: 'app.flourprint' });
    expect('dev' in release).toBe(false);
  });

  it('offers main, dev, canary and any pull request at their allowlisted addresses', () => {
    const fromPackage = shellChannel({ flourprintChannel: 'dev' }, {});
    expect(fromPackage).toEqual({
      kind: 'dev',
      name: 'Flourprint Dev',
      appId: 'app.flourprint.dev',
      dev: { url: DEV_URL, origin: DEV_ORIGIN },
    });
    expect(shellChannel(undefined, { FLOURPRINT_SHELL_CHANNEL: 'dev' })).toEqual(fromPackage);
    if (fromPackage.kind !== 'dev') throw new Error('dev expected');
    expect(addressOf(fromPackage, 'dev').origin).toBe(DEV_ORIGIN);
    expect(addressOf(fromPackage, 'main')).toEqual({
      url: 'https://flourprint-aristotelesqc.pages.dev/',
      origin: 'https://flourprint-aristotelesqc.pages.dev',
    });
    expect(addressOf(fromPackage, 'canary').url).toBe(
      'https://canary.flourprint-aristotelesqc.pages.dev/',
    );
    expect(addressOf(fromPackage, 'pr-233').url).toBe(
      'https://pr-233.flourprint-aristotelesqc.pages.dev/',
    );
  });

  it('accepts another http(s) dev address only, for the dev version only', () => {
    const local = shellChannel(
      { flourprintChannel: 'dev' },
      { FLOURPRINT_DEV_URL: 'http://127.0.0.1:4317/' },
    );
    if (local.kind !== 'dev') throw new Error('dev expected');
    expect(local.dev.origin).toBe('http://127.0.0.1:4317');
    expect(addressOf(local, 'canary').url).toBe(
      'https://canary.flourprint-aristotelesqc.pages.dev/',
    );
    expect(addressOf(local, 'pr-9').url).toBe('https://pr-9.flourprint-aristotelesqc.pages.dev/');
    for (const bad of ['file:///C:/x.html', 'javascript:alert(1)', 'not a url']) {
      const channel = shellChannel({ flourprintChannel: 'dev' }, { FLOURPRINT_DEV_URL: bad });
      expect(channel.kind === 'dev' && channel.dev.url).toBe(DEV_URL);
    }
  });

  it('keeps navigation inside the version the window shows', () => {
    const release = shellChannel(undefined, {});
    expect(sameApp(release, 'app://flourprint/recipes', ORIGIN)).toBe(true);
    expect(sameApp(release, 'about:blank', ORIGIN)).toBe(true);
    expect(sameApp(release, `${DEV_ORIGIN}/`, ORIGIN)).toBe(false);
    const dev = shellChannel({ flourprintChannel: 'dev' }, {});
    expect(sameApp(dev, `${DEV_ORIGIN}/recipes`, ORIGIN)).toBe(true);
    expect(sameApp(dev, `${DEV_ORIGIN}/recipes`, ORIGIN, 'canary')).toBe(false);
    expect(
      sameApp(dev, 'https://canary.flourprint-aristotelesqc.pages.dev/recipes', ORIGIN, 'canary'),
    ).toBe(true);
    expect(sameApp(dev, 'https://pr-12.flourprint-aristotelesqc.pages.dev/', ORIGIN, 'pr-12')).toBe(
      true,
    );
    expect(sameApp(dev, 'https://pr-13.flourprint-aristotelesqc.pages.dev/', ORIGIN, 'pr-12')).toBe(
      false,
    );
    expect(sameApp(dev, 'app://flourprint/', ORIGIN)).toBe(false);
    expect(sameApp(dev, 'https://evil.example/', ORIGIN)).toBe(false);
    expect(sameApp(dev, `${DEV_ORIGIN}.evil.example/`, ORIGIN)).toBe(false);
  });
});
