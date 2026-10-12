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
- French UI text never addresses the user (no "tu", no "vous"): instructions and actions use the
  infinitive ("Pétrir 8 min à basse vitesse"), explanations an impersonal voice.
- Every commit is pushed. Work lands in focused pull requests (ADR 0008, workflow): one per
  contract change or reviewed implementation slice, never back into #31. They target `dev`, the
  integration branch of the open major pull request (`dev` → `main`), and are merged into it once
  green and reviewed; the dev channel (dev APK, `dev` preview address) follows `dev` (ADR 0013).
  Only the owner decides when the major pull request is merged into `main`.
- Run `pnpm check`, `pnpm build` and the full Playwright run before every push of code; a red push
  is fixed first.
- One writer at a time for overlapping files. The interface (#35) is implemented by Gemini under
  Codex; other agents work in non-overlapping areas unless the owner assigns otherwise.
- Feature priorities belong to the owner. Complexity changes how work is split and what evidence
  it needs, never whether a required feature is delivered; any proposed scope reduction is shown
  to the owner with its reason and an alternative. A real bake is calibration evidence, not a gate
  for N1/N2 features (`docs/contracts/capability-levels.md`).
- Before changing fermentation equations, parameters, domains or end-point semantics, read
  `docs/science/fermentation-model.md` and `docs/contracts/fermentation.md`. A new coefficient needs
  provenance in the science document.
- `dogfood/` holds the owner's personal recipes and their importer. Nothing in `packages/` or
  `apps/` may refer to it; never hard-code those recipes in the product.

## Repository skills

Reusable agent workflows live in `.agents/skills/`; repository contracts and ADRs remain the
sources of truth. Read a skill's entrypoint before using its procedure or helper scripts.

- **AGY / Gemini delegation**: [.agents/skills/agy/SKILL.md](.agents/skills/agy/SKILL.md).
  Use for AGY/Gemini reviews, research or assigned implementation. Codex invocation: `$agy`;
  Claude Code invocation: `/agy` through its thin routing skill; other hosts can read the
  canonical entrypoint directly. The skill does not authorize extra sharing,
  publishing, permission changes or overlapping writers.

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
GitHub issues are the only tracking system (owner decision of 2026-10-12: no Projects board, no
tracking file).

- **New issues** follow `.github/ISSUE_TEMPLATE/` (work item or bug), also when opened through the
  API, and start with `status:backlog`. Pull requests follow `.github/pull_request_template.md`.
- **Status labels**: every open issue has exactly one. `status:backlog` (accepted, not planned),
  `status:ready` (acceptance and evidence clear), `status:in-progress` (someone works on it),
  `status:review` (a pull request awaits review), `status:blocked` (say why in a comment),
  `status:verified` (acceptance shown, awaiting the owner's close). Closed means done.
- **Who changes them**: the agent starting work sets `status:in-progress`; opening its pull request
  sets `status:review`. A merged pull request does not finish an issue: it goes back to
  `status:in-progress` while acceptance remains open, or to `status:verified` with the evidence in a
  comment. Only the owner, or an agent with every criterion shown, closes an issue.
- **Status table**: the body of #30 holds a table of the open issues and their status. Whoever
  changes a status label updates its row, editing the body rather than adding a comment.
- Add a short comment on the issue concerned when a step advances, and keep the PR body current.

See ADR 0008. The proof-of-concept baseline (PR #31: steps 1 to 6 of the first development order,
with the data collection, simulation mode and first fermentation model) is merged into `main`.
Current phase: **hardening, essential-feature completion and interface refinement**, in reviewed
slices. The workstreams and their acceptance are listed on
[#30](https://github.com/Aristotelesqc/Flourprint/issues/30#issuecomment-6110929842): interaction and
visual foundation (#35), Recipe / Planning / Preparation roles, the session lifecycle and outcomes,
multi-method cooking and documented modes (#28), the complete manual registry (#26), and
reliability. Open device checks (#24 upgrade, reminders with the app closed, a real bake) stay
tracked, not claimed done.
