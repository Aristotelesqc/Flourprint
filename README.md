# Flourprint

Local-first, mobile-first engine for formulating, planning and logging bread bakes. The engine is
the product; the Android app, the CLI and future agent tools are clients of the same engine.

- Requirements and backlog: GitHub issues (reference decisions: #30).
- Data contracts: [`docs/contracts/`](docs/contracts/README.md).
- Architecture decisions: [`docs/adr/`](docs/adr/README.md).
- Agent instructions: [`AGENTS.md`](AGENTS.md).

## Getting started

Requirements: Node ≥ 22, pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm check
node apps/cli/dist/main.js --version
```

## Layout

```text
packages/core     domain (pure calculations), application (use cases, ports), contracts (boundaries)
apps/cli          Commander CLI, a client of the engine
docs/contracts    data semantics and reference fixtures
docs/adr          architecture decisions
```

`packages/ui`, `packages/adapters` and `apps/mobile` arrive with steps 5 and 6 (ADR 0008).

## Language

The project language is English: code, comments, documentation, commits, issues and pull
requests. The UI is localizable; see ADR 0009.
