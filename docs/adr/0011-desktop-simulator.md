# ADR 0011: A desktop shell to run the app on a PC

Status: Accepted (owner decision of 2026-10-09).

## Context

The owner wants to use and test the app on a Windows PC, in a phone-sized window with touch
simulated by the mouse and with data that survives a restart. The browser build keeps its data
in memory and needs the developer tools for touch emulation; an Android emulator is heavy to
install. The owner's main monitor is wide gamut, and Electron apps flicker on it with GPU
acceleration on (Claude Desktop does the same); sRGB monitors are not affected.

## Decision

- `apps/desktop` is an **Electron shell** around the same web build as the APK
  (`apps/mobile/dist`). It holds no screen, no business rule and no SQL: one codebase, two
  wrappers (Capacitor for Android, Electron for Windows).
- The window has the size of a phone (Pixel 9 Pro XL by default). The shell turns on touch
  emulation (mouse events become touch events), a mobile user agent and mobile metrics through
  the Chrome DevTools protocol.
- Storage is SQLite through Electron's built-in `node:sqlite` in the main process. The renderer
  reaches it through a narrow bridge exposing the raw driver calls (`execute`, `run`, `query`,
  `begin`, `commit`, `rollback`); the SQL, the migrations and the serialization stay in
  `@flourprint/adapters` (`sqlite-bridge` driver), like the Node and Capacitor drivers.
- Display options, kept across restarts in the shell's settings file and also available as
  command-line switches:
  - **GPU acceleration off** (`--disable-gpu`), the workaround for the wide-gamut flicker;
  - **force the sRGB colour profile** (`--force-color-profile=srgb`), a lighter alternative to
    try first.
- Security: context isolation, sandboxed renderer, no Node integration; the bridge answers only
  the app's own origin; new windows and navigation away from the app are refused.
- Packaging needs no packager dependency: a script copies Electron's Windows distribution,
  renames the executable and adds the app. CI builds it on a Windows runner and publishes the
  folder as an artifact next to the APK.

## Consequences

- One new dependency, `electron`, in `apps/desktop` only. Other CI jobs skip its binary download.
- The shared store suite gains the bridge driver (through an in-process bridge to `node:sqlite`);
  a desktop smoke test launches the packaged shell and checks that a recipe survives a restart.
- The desktop database is separate from the phone's; moving data goes through the existing
  backup and recipe files.
- The shell is a development and dogfooding convenience, not a supported desktop product:
  its window, menus and settings stay minimal and are localized like the app (ADR 0009).
