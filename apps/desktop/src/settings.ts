/**
 * Display and window settings of the desktop shell (ADR 0011), kept in `settings.json` in the
 * user data folder. Pure: no Electron import, so it is unit-tested.
 */
export interface Device {
  readonly id: DeviceId;
  readonly label: string;
  /** CSS viewport of the phone. */
  readonly width: number;
  readonly height: number;
}

export type DeviceId = 'pixel-9-pro-xl' | 'pixel-7';

export const DEVICES: readonly Device[] = [
  { id: 'pixel-9-pro-xl', label: 'Pixel 9 Pro XL', width: 448, height: 998 },
  { id: 'pixel-7', label: 'Pixel 7', width: 412, height: 915 },
];

export const ZOOMS: readonly number[] = [1, 0.9, 0.8, 0.67];

export interface Settings {
  /** Workaround for the wide-gamut flicker: no GPU compositing at all. */
  readonly disableGpu: boolean;
  /** Lighter workaround: render in sRGB whatever the monitor's profile. */
  readonly forceSrgb: boolean;
  readonly device: DeviceId;
  readonly zoom: number;
}

export const DEFAULT_SETTINGS: Settings = {
  disableGpu: false,
  forceSrgb: false,
  device: 'pixel-9-pro-xl',
  zoom: 1,
};

/** Reads stored settings; anything missing or malformed falls back to its default. */
export const parseSettings = (text: string | undefined): Settings => {
  let raw: unknown;
  try {
    raw = text === undefined ? {} : JSON.parse(text);
  } catch {
    raw = {};
  }
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const flag = (key: 'disableGpu' | 'forceSrgb') =>
    typeof value[key] === 'boolean' ? value[key] : DEFAULT_SETTINGS[key];
  return {
    disableGpu: flag('disableGpu'),
    forceSrgb: flag('forceSrgb'),
    device: DEVICES.some((d) => d.id === value.device)
      ? (value.device as DeviceId)
      : DEFAULT_SETTINGS.device,
    zoom: ZOOMS.includes(value.zoom as number) ? (value.zoom as number) : DEFAULT_SETTINGS.zoom,
  };
};

/**
 * Command-line switches and environment variables win over stored settings for one launch:
 * `--disable-gpu` or `FLOURPRINT_DISABLE_GPU=1`, `--force-color-profile=srgb` or
 * `FLOURPRINT_FORCE_SRGB=1`.
 */
export const effectiveSettings = (
  stored: Settings,
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
): Settings => ({
  ...stored,
  disableGpu:
    stored.disableGpu || argv.includes('--disable-gpu') || env.FLOURPRINT_DISABLE_GPU === '1',
  forceSrgb:
    stored.forceSrgb ||
    argv.includes('--force-color-profile=srgb') ||
    env.FLOURPRINT_FORCE_SRGB === '1',
});

export const deviceOf = (settings: Settings): Device =>
  DEVICES.find((d) => d.id === settings.device) ?? (DEVICES[0] as Device);

/** Window content size in device pixels of the PC: the phone's CSS size at the chosen zoom. */
export const contentSize = (settings: Settings): { width: number; height: number } => {
  const device = deviceOf(settings);
  return {
    width: Math.round(device.width * settings.zoom),
    height: Math.round(device.height * settings.zoom),
  };
};
