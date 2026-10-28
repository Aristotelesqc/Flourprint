---
name: flourprint-device-check
description: Prepare and record a check of a Flourprint build on the owner's Android phone or the desktop shell - which APK, which build name must show, how the dev app loads the latest dev build, and what to verify after a database migration. Use when a change needs device evidence or the owner asks which APK to install; not for browser-only checks.
---

# Flourprint device check

Read `docs/device-testing.md` and ADR 0016 (versions and releases). The owner runs the device;
the agent prepares exact steps and records the result in the issue.

## Which build

- Normal app: the latest GitHub release, `flourprint-<version>.apk`, built from `main`.
- Dev app: the `dev-channel` pre-release, `flourprint-dev.apk`. It loads the `dev` web preview;
  installing it again is needed only when the native shell changes (Capacitor, plugins, icons).
- A PR's APK exists only when CI is dispatched on its branch, as a run artifact.
- Give links as plain code blocks. Install over the previous APK; never uninstall (data loss).

## Is the phone running the right code

1. Find the expected build name: the latest "Web preview" bot comment on the major PR gives the
   label of the current `dev` build (its code name is derived from the commit).
2. The app bar shows the label (for example `v0.2.0-tender-wheat`). If it differs, in the dev app:
   Advanced → "Charger la dernière version dev", or pull the recipe list down.
3. Only then attribute behavior to a change.

## Starting data

New installations have no recipe. On dev, preview and local builds, Advanced → "Charger les
recettes d'exemple" adds Poolish + tangzhong (a recipe already there is kept). Never ask the
owner to delete personal recipes for a test; use the trash for test recipes.

## After a database migration

When a PR bumps the SQLite schema (`schema_meta`), the owner's existing data is the real test:

1. Before updating, note what the device holds (recipes, a finished bake, an active bake).
2. Update by installing over (normal app) or reloading the dev build (dev app).
3. Check: the app opens; recipes, families, history and the active bake are intact; Advanced →
   Device checks passes; a full backup exports and the new data (for example the trash) works.
4. Record model, Android version, build name and results in the issue; a failure is a blocker.

## Agent-driven emulator checks (Android CLI, not yet verified)

Google's [Android CLI](https://developer.android.com/tools/agents/android-cli) lets an agent
drive an emulator or a connected device from the shell. It is a machine tool, not a project
dependency. Status on 2026-10-27: installed on the owner's Windows machine (winget
`Google.AndroidCLI`, 1.1.16717390); no Android SDK or emulator image yet; **no Flourprint check
has been run with it**. Planned first use: when the 0.3 interface is live on `dev`, to take over
part of the owner's phone checks. Update this section with what actually works then.

- Setup: put `--no-metrics` in `%USERPROFILE%\.androidrc` (telemetry is on by default).
  `android sdk install` the platform tools, the emulator and a system image, then
  `android emulator create` and `start`. `android init` installs its own agent skill; ask the
  owner before changing agent configuration.
- Commands that fit our checks: `install` (an APK from CI or the `dev-channel` release),
  `screen capture`, `layout` (UI tree as JSON), `input` (tap, swipe, text, key: hardware Back,
  gestures, the soft keyboard) and `device hub` (a mirrored, controllable window).
- Expected limit: the app is a Capacitor web view. Check how much of the web content `layout`
  exposes before relying on it; Playwright stays the tool for the interface's content.
- Not for us: Compose previews, Android Studio integration, Crashlytics `signals`.
- An emulator run is emulator evidence. It never replaces the owner's phone for a migration on
  real data or a physical-device claim (see Reporting).

## Reporting

Write what was checked, on which build and device, and what was not. Browser or emulator runs
never stand in for a physical-device claim.
