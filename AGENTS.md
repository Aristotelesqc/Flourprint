# Agent instructions (Claude, Codex, others)

## Sources of truth

1. `docs/contracts/`: data and calculation semantics. Do not reconstruct them from issue comments.
2. `docs/adr/`: architecture decisions.
3. Issue #30: record of the arbitration. Issues describe needs, not contracts.

An implementation that contradicts a contract is wrong. A contract that must change is changed in
a dedicated pull request, before the code that depends on it.

## Rules

- No baking math outside `packages/core/domain` (not in UI, CLI, adapters or SQL).
- `core/domain` imports neither Node, Zod, UI/platform code nor `application`/`contracts`
  (enforced by lint and an architecture test).
- Fixtures in `docs/contracts/fixtures/` are computed outside the engine. Never regenerate them
  from engine or CLI output.
- Persisted units: grams, °C, seconds, UTC instants, percentages in points.
- No new dependency without a demonstrated need.
- English everywhere: code, comments, docs, commit messages, issues, pull requests.
- No user-facing text hard-coded in UI components; use message keys (ADR 0009).
- Every commit is pushed and lands in the MVP pull request.

## Commands

```bash
pnpm install
pnpm check        # format, lint, typecheck (sources and tests), tests
pnpm build        # tsc -b
pnpm vitest run   # tests only (after a build)
node apps/cli/dist/main.js --version
```

## Development order

See ADR 0008. Current step: 5, persistence. The Android driver waits for spike #24 (real device); the
SQLite Node adapter and the shared repository contract tests can start.
