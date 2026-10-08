# Agent instructions (Claude, Codex, others)

## Sources of truth

1. `docs/contracts/`: data and calculation semantics. Do not reconstruct them from issue comments.
2. `docs/adr/`: architecture decisions.
3. Issue #30: record of the arbitration and high-level backlog. Issues describe needs, not contracts.

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
- `dogfood/` holds the owner's personal recipes and their importer. Nothing in `packages/` or
  `apps/` may refer to it; never hard-code those recipes in the product.

## Commands

```bash
pnpm install
pnpm check        # format, lint, typecheck (sources and tests), tests
pnpm build        # tsc -b
pnpm vitest run   # tests only (after a build)
node apps/cli/dist/main.js --version
```

## Development order

Issue #30 is the high-level backlog: it links the other issues and tracks the development order.
When a step advances, update its status there, add a short comment on the issue concerned and keep
the PR body current. No other tracking file.

See ADR 0008. Current step: 6, UI for dogfooding. Step 5 is done: the Capacitor SQLite driver passed
the shared store suite on a Pixel 9 Pro XL ([report on #24](https://github.com/Aristotelesqc/Flourprint/issues/24#issuecomment-6063973643); forced-stop marker
and upgrade still to confirm).
`apps/mobile` follows the #8 mockups: recipe list, Formula, Process and History tabs, and bake mode on
the bake session. Versions stay provisional until spike #23 closes.
