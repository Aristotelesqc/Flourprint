# ADR 0002: technology stack

Status: Accepted (#22, #30). Native versions and drivers to be completed after #23 and #24.

## Decision

pnpm workspaces, strict TypeScript, Vite, React + Ionic React, Capacitor (Android), Tailwind CSS v4
with a shared theme, Zod 4 at boundaries, React Hook Form, Commander (CLI), Vitest + fast-check,
ESLint (typescript-eslint) + Prettier. SQLite behind asynchronous repositories.

Deferred: Zustand, Storybook, ORM/query builder, LAN updater (#12), Drive (#11).

Playwright (`@playwright/test`, pinned) was deferred at scaffold time and is adopted now that real
UI journeys exist (PR #31 audit): browser journeys run on the web build in CI, in French and
English, with screenshots and traces as artifacts.

## Versions chosen at scaffold time

- Node ≥ 22 (the final runtime is chosen in #24, notably for `node:sqlite`).
- TypeScript `~6.0`: typescript-eslint does not support TypeScript 7 yet.
- pnpm 10.
- SQLite on Node (CLI, tests): the built-in `node:sqlite` module, **provisionally**. It needs no
  native compilation, which matters for Windows. It is still flagged experimental on Node 22 and
  prints a warning; spike #24 confirms or replaces it, together with the Capacitor driver.

- Mobile app, **provisional until spike #23 runs on the device**: React 19.3, Ionic React 9.0 with
  `@ionic/react-router` 9 (which requires React Router 6.x), Capacitor 8.5, Tailwind CSS 4.3
  without Preflight, Vite 8, React Hook Form 7, `react-intl` 12.

## Consequences

Spikes #23 (Android UI) and #24 (SQLite) settle the versions of React, Ionic, Capacitor, Tailwind,
the SQLite drivers and Android prerequisites; they complete this ADR. The i18n library is chosen
with #23 (ADR 0009).

## Verification policy

| Layer                       | Covers                                                                  |
| --------------------------- | ----------------------------------------------------------------------- |
| Vitest / fast-check         | engine invariants, commands, decoding, view logic, store contracts      |
| Playwright on the web build | UI journeys, input behavior, double taps, locales, light/dark captures  |
| Device checks in the APK    | Capacitor SQLite contract, forced-stop marker, offline start (#23, #24) |
| The owner's phone           | keyboard, touch comfort, device quirks, milestone acceptance            |

A small UI correction comes with an automated regression; the owner is asked to install an APK only
for new native or device behavior, milestone acceptance, or a defect automation cannot reproduce.
An emulator harness for native persistence (force-stop, upgrade) is still to be built.
