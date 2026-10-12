<img src="apps/mobile/public/favicon.svg" alt="" width="96" height="96" />

# Flourprint

Local-first, mobile-first engine for formulating, planning and logging bread bakes. The engine is
the product; the Android app, the CLI and future agent tools are clients of the same engine.

- Requirements and backlog: GitHub issues (reference decisions: #30).
- Data contracts: [`docs/contracts/`](docs/contracts/README.md).
- Architecture decisions: [`docs/adr/`](docs/adr/README.md).
- Agent instructions: [`AGENTS.md`](AGENTS.md).
- Testing on an Android phone: [`docs/device-testing.md`](docs/device-testing.md).

## Getting started

Requirements: Node ≥ 22, pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm check
node apps/cli/dist/main.js formula calculate examples/poolish-tangzhong.formula.json
node apps/cli/dist/main.js formula scale examples/poolish-tangzhong.formula.json --pieces 2x900
node apps/cli/dist/main.js formula explain examples/enriched-milk-butter.formula.json
```

Add `--json` to any command for machine-readable output.

## Layout

```text
packages/core     domain (pure calculations), application (use cases, ports), contracts (boundaries)
packages/adapters port implementations: memory, and SQLite for Node, Capacitor and the desktop shell
apps/cli          Commander CLI, a client of the engine
apps/mobile       Ionic React + Capacitor app (Android, web preview)
apps/desktop      Electron shell running the same web build on a PC (ADR 0011)
docs/contracts    data semantics and reference fixtures
docs/adr          architecture decisions
examples          sample formula files for the CLI
```

## Trying the app

- **Android, normal app**: the APK of the latest
  [release](https://github.com/Aristotelesqc/Flourprint/releases), built from `main` (ADR 0016).
- **Android, dev channel**: `flourprint-dev.apk` from the `dev-channel` pre-release. It loads the
  `dev` web preview, so it follows the integration branch without reinstalling (ADR 0013).
- **Browser**: `https://dev.flourprint-aristotelesqc.pages.dev` (the `dev` branch), or the
  `pr-<number>` address CI posts on each pull request. Data stays in that browser (IndexedDB,
  ADR 0015).
- **Locally**: `pnpm build && pnpm --filter @flourprint/mobile dev`.

On Android and in the desktop shell, data is stored in SQLite (`docs/contracts/persistence.md`).

## Language

The project language is English: code, comments, documentation, commits, issues and pull
requests. The UI is localizable; see ADR 0009.
