import { describe, expect, it } from 'vitest';
import {
  contentSize,
  DEFAULT_SETTINGS,
  effectiveSettings,
  parseSettings,
} from '../src/settings.js';
import { en, fr } from '../src/messages.js';

describe('desktop settings', () => {
  it('falls back to the defaults on a missing or broken file', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"disableGpu":"yes","device":"iphone","zoom":3}')).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('keeps valid stored values', () => {
    expect(
      parseSettings('{"disableGpu":true,"forceSrgb":true,"device":"pixel-7","zoom":0.8}'),
    ).toEqual({
      disableGpu: true,
      forceSrgb: true,
      device: 'pixel-7',
      zoom: 0.8,
      webTarget: 'dev',
    });
    expect(parseSettings('{"webTarget":"canary"}').webTarget).toBe('canary');
    expect(parseSettings('{"webTarget":"prod"}').webTarget).toBe('dev');
  });

  it('lets a switch or a variable turn the GPU off for one launch', () => {
    expect(effectiveSettings(DEFAULT_SETTINGS, ['--disable-gpu'], {}).disableGpu).toBe(true);
    expect(effectiveSettings(DEFAULT_SETTINGS, [], { FLOURPRINT_DISABLE_GPU: '1' })).toMatchObject({
      disableGpu: true,
      forceSrgb: false,
    });
    expect(effectiveSettings(DEFAULT_SETTINGS, ['--force-color-profile=srgb'], {}).forceSrgb).toBe(
      true,
    );
  });

  it('sizes the window as the phone at the chosen zoom', () => {
    expect(contentSize(DEFAULT_SETTINGS)).toEqual({ width: 448, height: 998 });
    expect(contentSize({ ...DEFAULT_SETTINGS, device: 'pixel-7', zoom: 0.8 })).toEqual({
      width: 330,
      height: 732,
    });
  });

  it('has the same menu keys in every language', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });
});
