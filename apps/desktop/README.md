# Flourprint desktop shell

The app as on the phone, in a Windows window (ADR 0011): same web build as the APK, touch
simulated by the mouse, data in SQLite in the user data folder (`%APPDATA%\Flourprint`).

## Run the CI build

1. Download the `flourprint-desktop-windows` artifact of a CI run and unzip it.
2. Run `Flourprint.exe`. No installation; the folder can live anywhere.

## Dev shell (#113)

`flourprint-dev-windows.zip` on the `dev-channel` pre-release: unzip it and run
`FlourprintDev.exe`. It loads https://dev.flourprint-aristotelesqc.pages.dev at every start, like
the dev APK, so a restart (or Reload) takes the latest `dev` build; the zip itself only changes
with the shell. It needs the network. The remote page gets no SQLite bridge: its data stays in the
browser-preview storage (ADR 0015) of its own folder, `%APPDATA%\Flourprint Dev`, apart from the
release shell's.

## Display options (menu View)

- **Phone**: Pixel 9 Pro XL or Pixel 7 viewport. **Window size**: 100 % to 67 % for small screens.
- **Disable GPU acceleration**: workaround for the flicker of Electron apps on wide-gamut
  monitors. Applies after a restart.
- **Force the sRGB colour profile**: a lighter workaround to try first.

For one launch only: `Flourprint.exe --disable-gpu`, `Flourprint.exe --force-color-profile=srgb`,
or the variables `FLOURPRINT_DISABLE_GPU=1` and `FLOURPRINT_FORCE_SRGB=1`.

## Develop

```bash
pnpm build && pnpm build:mobile
pnpm --filter @flourprint/desktop start      # runs the shell on apps/mobile/dist
pnpm build:desktop                           # packages out/Flourprint-<platform>-<arch>
pnpm build:desktop -- --channel=dev          # the dev shell, out/Flourprint-Dev-<platform>-<arch>
pnpm --filter @flourprint/desktop e2e        # smoke tests of both packaged shells
```

Mouse input becomes touch input in the window; scroll with a drag or the wheel.
