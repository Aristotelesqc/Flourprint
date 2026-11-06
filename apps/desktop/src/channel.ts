import { DEFAULT_VERSION, versionAddress, type VersionId } from '@flourprint/adapters/dev-versions';

/**
 * Which app the shell runs (ADR 0011, #113). Pure: no Electron import, so it is unit-tested.
 *
 * - `release`: the bundled web build, served from `app://flourprint`, with SQLite behind the
 *   bridge, data in `%APPDATA%\Flourprint`.
 * - `dev`: a published web address, loaded at every start so the shell follows its branch like
 *   the dev APK (ADR 0013). The version is chosen in View → Version or in the app's Advanced menu:
 *   `dev` (default), `canary`, `main` or a pull request, each at its allowlisted address (ADR 0023).
 *   The remote page gets no SQLite bridge: it keeps its data as the browser preview does
 *   (ADR 0015), in the folder `%APPDATA%\Flourprint Dev`; each address is its own origin, so each
 *   version has its own data.
 */
export type { VersionId };

export interface WebAddress {
  readonly url: string;
  readonly origin: string;
}

export type ShellChannel =
  | { readonly kind: 'release'; readonly name: 'Flourprint'; readonly appId: 'app.flourprint' }
  | {
      readonly kind: 'dev';
      readonly name: 'Flourprint Dev';
      readonly appId: 'app.flourprint.dev';
      /** Where the `dev` version loads: its standard address, or the one tests point it at. */
      readonly dev: WebAddress;
    };

/** The dev shell's default version. */
export const DEV_URL = versionAddress(DEFAULT_VERSION);

const RELEASE: ShellChannel = { kind: 'release', name: 'Flourprint', appId: 'app.flourprint' };

const address = (text: string | undefined, fallback: string): WebAddress => {
  let url: URL;
  try {
    url = new URL(text ?? fallback);
  } catch {
    url = new URL(fallback);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') url = new URL(fallback);
  return { url: url.href, origin: url.origin };
};

/**
 * The packaged app's `package.json` names its channel (`flourprintChannel`); in the repository,
 * `FLOURPRINT_SHELL_CHANNEL=dev` selects it. `FLOURPRINT_DEV_URL` points the `dev` version at
 * another http(s) address (tests); no other version can be redirected.
 */
export const shellChannel = (
  ownPackage: unknown,
  env: Readonly<Record<string, string | undefined>>,
): ShellChannel => {
  const declared =
    ownPackage && typeof ownPackage === 'object'
      ? (ownPackage as Record<string, unknown>).flourprintChannel
      : undefined;
  if ((env.FLOURPRINT_SHELL_CHANNEL ?? declared) !== 'dev') return RELEASE;
  return {
    kind: 'dev',
    name: 'Flourprint Dev',
    appId: 'app.flourprint.dev',
    dev: address(env.FLOURPRINT_DEV_URL, DEV_URL),
  };
};

/** The address a version of the dev shell loads; always allowlisted, except `dev` in tests. */
export const addressOf = (
  channel: Extract<ShellChannel, { kind: 'dev' }>,
  version: VersionId,
): WebAddress => {
  if (version === 'dev') return channel.dev;
  const url = versionAddress(version);
  return { url, origin: new URL(url).origin };
};

/**
 * Whether a navigation stays in the app the window shows (the dev shell's current version);
 * anything else is refused. Switching versions is a load by the shell, not a navigation.
 */
export const sameApp = (
  channel: ShellChannel,
  target: string,
  releaseOrigin: string,
  current: VersionId = DEFAULT_VERSION,
): boolean => {
  if (target === 'about:blank') return true;
  // Node's URL gives no origin to `app:`, a scheme only the shell registers: compare the prefix.
  if (channel.kind === 'release') return target.startsWith(`${releaseOrigin}/`);
  try {
    return new URL(target).origin === addressOf(channel, current).origin;
  } catch {
    return false;
  }
};
