# Testing on an Android phone (spikes #23 and #24)

No Android Studio is needed: CI builds a debug APK for every push to the MVP pull request.

## Install

1. On GitHub, open the repository's **Actions** tab, pick the latest **CI** run of the MVP branch,
   and download the **flourprint-debug-apk** artifact (a zip) from the bottom of the run page.
2. Unzip it (Files by Google can do it) to get `flourprint-<build>.apk`.
3. Open the APK and allow installs from that source when Android asks. Play Protect may warn about
   an unknown app: this is a debug build; choose to install anyway.
4. Later APKs install **over** this one without uninstalling: they share a debug signing key, so the
   app's data is kept. Never uninstall between builds, or the data is lost.

## Run the checks

1. Turn on **airplane mode** (and keep the PC off): the app must open and show the sample recipe.
2. On the recipe list, open **Device checks**.
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
