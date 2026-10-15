import { defineConfig } from '@playwright/test';
import android from './playwright.android.config';

/**
 * Upgrade from 0.1.0 (issue #24): the 0.1.0 APK gets real data through its own interface, then the
 * candidate APK installs over it. Run by .github/workflows/android-upgrade.yml, which provides both
 * APKs (FLOURPRINT_APK_FROM, FLOURPRINT_APK).
 */
export default defineConfig({
  ...android,
  testDir: 'android-upgrade-e2e',
  // One long journey through two versions of the app on a loaded emulator.
  timeout: 900_000,
});
