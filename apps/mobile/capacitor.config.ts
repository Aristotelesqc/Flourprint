import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The APK embeds the built bundle (`dist`); it never needs the development PC (#12, #17).
 * The dev channel (ADR 0013) is the same shell loading the web preview instead: `cap sync` with
 * FLOURPRINT_DEV_URL set, then Gradle with `-PflourprintChannel=dev`.
 */
const devUrl = process.env.FLOURPRINT_DEV_URL;

const config: CapacitorConfig = {
  appId: 'app.flourprint',
  appName: 'Flourprint',
  webDir: 'dist',
  ...(devUrl ? { server: { url: devUrl, cleartext: false } } : {}),
};

export default config;
