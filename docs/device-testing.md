# Testing on an Android phone (spikes #23 and #24)

No Android Studio is needed: CI builds the APKs and publishes them as GitHub releases (ADR 0016).

## Install

1. On GitHub, open the repository's
   [**Releases**](https://github.com/Aristotelesqc/Flourprint/releases):
   - the latest release holds `flourprint-<version>.apk`, the normal app built from `main`;
   - the `dev-channel` pre-release holds `flourprint-dev.apk`, the dev app (ADR 0013), which loads
     the `dev` web preview and installs beside the normal app with its own data.
     The dev app can load another web version from Advanced → "Version du web" / "Web version":
     `dev` (default), `canary`, `main` or a pull request (ADR 0023). Each version keeps its own data,
     so a pull request starts empty (use "Copy my data to this version" to carry yours over); the
     switch restarts the app. A pull request that changes native code needs its own APK. Long-press
     the dev app icon → "Return to dev" gets back from a version that has no picker.
2. Open the APK and allow installs from that source when Android asks. Play Protect may warn about
   an unknown app: these builds are signed with the shared debug key; choose to install anyway.
3. Later APKs install **over** this one without uninstalling: they share the signing key, so the
   app's data is kept. Never uninstall between builds, or the data is lost.

An APK of a pull request is built only on demand (Actions → CI → Run workflow on its branch) and is
a run artifact, not a release.

## Android upgrade baseline in CI

The [Android 0.1.0 upgrade fixture](https://github.com/Aristotelesqc/Flourprint/releases/tag/android-upgrade-v0.1.0)
supplies `flourprint-0.1.0-upgrade-baseline.apk` for the emulator migration suite (#24, #319).
The fixture release tag points at the source of `v0.1.0`, commit
`240450fcb41c3df484101aef841bfe8b93a59993`, tree `a35934b4f734cd08441a73c4d1d5523cd3cdf9db`.
This is the tree used by PR #31's former APK artifact.

The fixture was rebuilt on Windows with Node 26.12.1, pnpm 10.28.0, Temurin 21.0.13.1 and Android
SDK 36. The build uses the tag's locked dependencies, `pnpm build`, `pnpm build:mobile`, Capacitor
sync and Gradle `assembleDebug`. It uses package `app.flourprint`, versionCode `112`,
versionName `112-240450f` and the shared debug signer's certificate SHA-256
`5ff1d4bb4d5d096fe41982621513b4f9ad7c92f68f038ae3be026befee32a7e9`.

The download's SHA-256 is pinned in [the Android upgrade workflow](../.github/workflows/android-upgrade.yml).
The workflow checks the source tags and file digest, compares the signer with the candidate, and
installs the candidate over the 0.1.0 setup to verify data survives.

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
