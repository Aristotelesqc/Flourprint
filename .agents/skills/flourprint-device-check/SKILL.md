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

## Agent-driven emulator checks (Android CLI)

Google's [Android CLI](https://developer.android.com/tools/agents/android-cli) lets an agent
drive an emulator or a connected device from the shell. It is a machine tool, not a project
dependency. Verified on the owner's Windows machine on 2026-10-28 (CLI 1.1.16717390, emulator
`medium_phone`, Android 16, `x86_64` Google Play image), with the `dev-channel` APK
(`app.flourprint.dev`, build `v0.3.0-fancy-rye`).

- **Setup.** `winget install Google.AndroidCLI`; put `--no-metrics` in
  `%USERPROFILE%\.androidrc` (telemetry is on by default); `android sdk install platform-tools
emulator`; `android emulator create medium_phone` (it fetches the system image). Windows needs
  the **Windows Hypervisor Platform** feature (admin, then restart):
  `dism /online /enable-feature /featurename:HypervisorPlatform /all`. Without it the emulator
  exits with "x86_64 emulation currently requires hardware acceleration". `android init`
  installs the CLI's own agent skill; ask the owner before changing agent configuration.
- **Run.** `android emulator start medium_phone` (it may not return once booted: check
  `adb devices` and `adb shell getprop sys.boot_completed` instead of waiting on it);
  `android install <apk>`; launch with
  `adb shell monkey -p app.flourprint.dev -c android.intent.category.LAUNCHER 1`.
- **What works.**
  - `android layout` (JSON, `--flat` for a list) **does expose the web view's content**: the app
    bar title and build label, buttons with their accessible names ("New recipe", "Flours",
    "Advanced"), headings and body text, with bounds and clickable state. It needs no
    instrumentation in the app.
  - `android input tap "text=Advanced" --match=first` taps by visible text; the key
    `content-desc` is not a valid selector key.
  - `android input key BACK` exercises hardware Back: from Advanced it returned to Recipes; from
    the root screen it leaves the app, as Android expects.
  - `android screen capture -o <file>.png` gives a full-resolution screenshot.
- **Pitfalls.** Read `layout` after the screen settles: right after a transition it can return
  the system bar only. `input tap` takes a selector, not coordinates.
- **Not for us:** Compose previews, Android Studio integration, Crashlytics `signals`.
- **Who uses what** (owner decision of 2026-10-28). Agents use the emulator as their device
  during development. The owner tests the real app on their own phone. Both are device evidence
  and interchangeable for the app's behaviour; each report names which one ran. Playwright stays
  the tool for the interface's content and journeys; the CLI adds what only Android shows
  (hardware Back, gestures, the soft keyboard, permissions).
- **Migration on real data, in the emulator:** install the previous APK, restore a full backup
  the owner exported from the phone, install the new APK over it, then run "After a database
  migration" below. The owner's phone is never put at risk.
- **Where the emulator can still differ from the owner's phone** (say so when it matters):
  reminders with the app closed and the manufacturer's battery management, the phone's exact
  Android and WebView versions (an emulator at the same versions narrows it), touch feel and
  smoothness, and the final visual judgement, which is the owner's.

## Reporting

Write what was checked, on which build and device (emulator or the owner's phone, with model and
Android version), and what was not. A browser run never stands in for a device claim.
