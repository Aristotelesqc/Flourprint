# Verification surfaces and commands

Read current package scripts and Playwright configuration before running; they are the authority
for command details. From the repository root, the established production-build browser path is:

```text
pnpm check
pnpm build
pnpm build:mobile
pnpm --filter @flourprint/mobile e2e
```

`apps/mobile/playwright.config.ts` starts a Vite preview on port 4173. Its projects run FR and EN;
English-specific journeys use `@en`; the current FR project selects untagged cases by excluding
`@en`. Confirm the actual config/discovery so new locale cases run without assuming an `@fr` tag.
Use a compatible installed browser or install the Playwright-pinned one through the approved
host mechanism. If substituting a local Chrome channel, disclose it; do not change the committed
CI browser configuration to conceal a local download/permission failure.

## Ionic transitions

Ionic keeps cached pages and dismissed overlays in the DOM. During transitions, multiple views
may briefly be visible. Target the routed page (`ion-router-outlet .ion-page:not(.ion-page-hidden)`)
and wait for the intended page/transition state before strict assertions. The template-to-draft
journey demonstrates scoping the style guide to the routed page rather than depending on modal
teardown. Scope sheet controls to the active modal instead of matching every cached copy.

For scroll measurements, use Ionic's public `getScrollElement()` API. Record viewport/content
height, scroll offset and target bounds at the same point before and after the action. Focus or
Playwright's automatic scrolling can change the observation; do not mistake that for app reflow.
Capture after layout/finite transitions settle, and read the resulting image.

## Native/desktop route

- `apps/mobile/playwright.android.config.ts` and `apps/mobile/android-e2e/` drive an installed
  Android APK through its WebView. Consult their prerequisites before running
  `pnpm --filter @flourprint/mobile e2e:android`.
- `docs/device-testing.md` distinguishes the normal offline APK, network-loaded dev APK, existing
  data and upgrade tests. Do not uninstall a user's app to test an upgrade.
- `apps/desktop/README.md` describes the Electron shell and its SQLite data. Desktop touch
  simulation is useful additional evidence, not proof of Android keyboard/back behavior.
- `.github/workflows/ci.yml`, `.github/workflows/android.yml` and ADR 0016 govern which builds and
  emulator checks run on `dev`, `main`, PRs or manual dispatch. Avoid redundant native rebuilds;
  never dispatch or publish outside the authorized task.

A useful report pairs a scenario and expected result with its observed result, build/platform,
capture/trace or test location, and remaining limitation. Screenshots and live models do not
replace persisted-state assertions for a claim about saving or resuming.
