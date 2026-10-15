/**
 * Which app the shell runs (ADR 0011, #113). Pure: no Electron import, so it is unit-tested.
 *
 * - `release`: the bundled web build, served from `app://flourprint`, with SQLite behind the
 *   bridge, data in `%APPDATA%\Flourprint`.
 * - `dev`: the dev address, loaded at every start so the shell follows `dev` like the dev APK
 *   (ADR 0013). The remote page gets no SQLite bridge: it keeps its data as the browser preview
 *   does (ADR 0015), in its own folder `%APPDATA%\Flourprint Dev`.
 */
export type ShellChannel =
  | { readonly kind: 'release'; readonly name: 'Flourprint'; readonly appId: 'app.flourprint' }
  | {
      readonly kind: 'dev';
      readonly name: 'Flourprint Dev';
      readonly appId: 'app.flourprint.dev';
      readonly url: string;
      readonly origin: string;
    };

export const DEV_URL = 'https://dev.flourprint-aristotelesqc.pages.dev/';

const RELEASE: ShellChannel = { kind: 'release', name: 'Flourprint', appId: 'app.flourprint' };

/**
 * The packaged app's `package.json` names its channel (`flourprintChannel`); in the repository,
 * `FLOURPRINT_SHELL_CHANNEL=dev` selects it. `FLOURPRINT_DEV_URL` points the dev shell at another
 * http(s) address (tests, a pull request preview).
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
  let url: URL;
  try {
    url = new URL(env.FLOURPRINT_DEV_URL ?? DEV_URL);
  } catch {
    url = new URL(DEV_URL);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') url = new URL(DEV_URL);
  return {
    kind: 'dev',
    name: 'Flourprint Dev',
    appId: 'app.flourprint.dev',
    url: url.href,
    origin: url.origin,
  };
};

/** Whether a navigation stays in the shell's app; anything else is refused. */
export const sameApp = (channel: ShellChannel, target: string, releaseOrigin: string): boolean => {
  if (target === 'about:blank') return true;
  // Node's URL gives no origin to `app:`, a scheme only the shell registers: compare the prefix.
  if (channel.kind === 'release') return target.startsWith(`${releaseOrigin}/`);
  try {
    return new URL(target).origin === channel.origin;
  } catch {
    return false;
  }
};
