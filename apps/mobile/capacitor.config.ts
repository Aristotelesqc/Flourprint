import type { CapacitorConfig } from '@capacitor/cli';

/** The APK embeds the built bundle (`dist`); it never needs the development PC (#12, #17). */
const config: CapacitorConfig = {
  appId: 'app.flourprint',
  appName: 'Flourprint',
  webDir: 'dist',
};

export default config;
