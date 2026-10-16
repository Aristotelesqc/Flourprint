import { describe, expect, it } from 'vitest';
import { sameApp, shellChannel, WEB_URLS } from '../src/channel.js';

const ORIGIN = 'app://flourprint';
const DEV_ORIGIN = 'https://dev.flourprint-aristotelesqc.pages.dev';

describe('desktop shell channel', () => {
  it('runs the bundled release app unless the package or the environment says dev', () => {
    expect(shellChannel(undefined, {}).kind).toBe('release');
    expect(shellChannel({ name: 'flourprint' }, {}).kind).toBe('release');
    expect(shellChannel({ flourprintChannel: 'canary' }, {}).kind).toBe('release');
  });

  it('offers the release, dev and canary addresses in the dev shell', () => {
    const fromPackage = shellChannel({ flourprintChannel: 'dev' }, {});
    expect(fromPackage).toEqual({
      kind: 'dev',
      name: 'Flourprint Dev',
      appId: 'app.flourprint.dev',
      targets: {
        release: { url: WEB_URLS.release, origin: 'https://flourprint-aristotelesqc.pages.dev' },
        dev: { url: WEB_URLS.dev, origin: DEV_ORIGIN },
        canary: {
          url: WEB_URLS.canary,
          origin: 'https://canary.flourprint-aristotelesqc.pages.dev',
        },
      },
    });
    expect(shellChannel(undefined, { FLOURPRINT_SHELL_CHANNEL: 'dev' })).toEqual(fromPackage);
  });

  it('accepts another http(s) dev address only, for the dev version only', () => {
    const local = shellChannel(
      { flourprintChannel: 'dev' },
      { FLOURPRINT_DEV_URL: 'http://127.0.0.1:4317/' },
    );
    expect(local.kind === 'dev' && local.targets.dev.origin).toBe('http://127.0.0.1:4317');
    expect(local.kind === 'dev' && local.targets.canary.url).toBe(WEB_URLS.canary);
    for (const bad of ['file:///C:/x.html', 'javascript:alert(1)', 'not a url']) {
      const channel = shellChannel({ flourprintChannel: 'dev' }, { FLOURPRINT_DEV_URL: bad });
      expect(channel.kind === 'dev' && channel.targets.dev.url).toBe(WEB_URLS.dev);
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
    expect(sameApp(dev, `${WEB_URLS.canary}recipes`, ORIGIN, 'canary')).toBe(true);
    expect(sameApp(dev, 'app://flourprint/', ORIGIN)).toBe(false);
    expect(sameApp(dev, 'https://evil.example/', ORIGIN)).toBe(false);
    expect(sameApp(dev, `${DEV_ORIGIN}.evil.example/`, ORIGIN)).toBe(false);
  });
});
