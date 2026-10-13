# Testing on an Android phone (spikes #23 and #24)

No Android Studio is needed: CI builds the APKs and publishes them as GitHub releases (ADR 0016).

## Install

1. On GitHub, open the repository's
   [**Releases**](https://github.com/Aristotelesqc/Flourprint/releases):
   - the latest release holds `flourprint-<version>.apk`, the normal app built from `main`;
   - the `dev-channel` pre-release holds `flourprint-dev.apk`, the dev app (ADR 0013), which loads
     the `dev` web preview and installs beside the normal app with its own data.
2. Open the APK and allow installs from that source when Android asks. Play Protect may warn about
   an unknown app: these builds are signed with the shared debug key; choose to install anyway.
3. Later APKs install **over** this one without uninstalling: they share the signing key, so the
   app's data is kept. Never uninstall between builds, or the data is lost.

An APK of a pull request is built only on demand (Actions → CI → Run workflow on its branch) and is
a run artifact, not a release.

## Run the checks

1. With the normal app, turn on **airplane mode** (and keep the PC off): the app must open and
   show its recipes (a new installation has none; dev builds can load the sample recipes from
   Advanced). The dev app needs the network to load the preview.
2. Open **Advanced** (the ⋯ menu) → **Device checks**.
3. **Run the storage checks**: every check must pass (9 of 9). They use a scratch database, never
   your recipes.
4. **Write a marker now**, then force-stop the app (Android settings → Apps → Flourprint → Force
   stop), reopen it and return to Device checks: the same time must be shown.
5. Go through **To check by hand** (offline start, `2,2` and `2.2` input, keyboard, draft kept after
   going back, light and dark mode).
6. **Copy the report** and paste it in a comment on #24, with the phone model, the Android version
   and anything from the manual list that did not work (for #23).
7. When a newer APK is available, install it over the current one and check that the marker and
   your recipes are still there.

## What the report tells us

- Build, platform, WebView version and SQLite version: the versions to record in ADR 0002.
- Storage contract results on the real Capacitor driver: whether `@capacitor-community/sqlite` can
  replace the memory stores (persistence contract, `docs/contracts/persistence.md`).
- The marker: durability across a forced stop and a reinstall.
