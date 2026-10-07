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
packages/adapters port implementations (memory today; SQLite with step 5)
apps/cli          Commander CLI, a client of the engine
apps/mobile       Ionic React + Capacitor app (browser exploration with memory stores today)
docs/contracts    data semantics and reference fixtures
docs/adr          architecture decisions
examples          sample formula files for the CLI
```

Run the app in a browser with `pnpm build && pnpm --filter @flourprint/mobile dev`. Data lives in
memory until the Capacitor SQLite adapter lands (spike #24). `packages/ui` is extracted when blocks
are shared by several screens.

## Language

The project language is English: code, comments, documentation, commits, issues and pull
requests. The UI is localizable; see ADR 0009.
