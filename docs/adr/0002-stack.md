# ADR 0002: technology stack

Status: Accepted (#22, #30). Native versions and drivers to be completed after #23 and #24.

## Decision

pnpm workspaces, strict TypeScript, Vite, React + Ionic React, Capacitor (Android), Tailwind CSS v4
with a shared theme, Zod 4 at boundaries, React Hook Form, Commander (CLI), Vitest + fast-check,
ESLint (typescript-eslint) + Prettier. SQLite behind asynchronous repositories.

Deferred: Zustand, Storybook, Playwright, ORM/query builder, LAN updater (#12), Drive (#11).

## Versions chosen at scaffold time

- Node ≥ 22 (the final runtime is chosen in #24, notably for `node:sqlite`).
- TypeScript `~6.0`: typescript-eslint does not support TypeScript 7 yet.
- pnpm 10.

## Consequences

Spikes #23 (Android UI) and #24 (SQLite) settle the versions of React, Ionic, Capacitor, Tailwind,
the SQLite drivers and Android prerequisites; they complete this ADR. The i18n library is chosen
with #23 (ADR 0009).
