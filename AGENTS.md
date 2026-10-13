# Agent instructions (Claude, Codex, others)

## Sources of truth

1. `docs/contracts/`: data and calculation semantics. Do not reconstruct them from issue comments.
2. `docs/adr/`: architecture decisions.
3. Issue #30: record of the arbitration and high-level backlog. Issues describe needs, not contracts.

For interface work, also read root [DESIGN.md](DESIGN.md): visual identity, current tokens and
component/interaction guidance (ADR 0017). Update it with reviewed presentation changes. It does
not override contracts or select a component/router dependency; prototypes remain identified.

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
- **UI verification**: [.agents/skills/flourprint-ui-check/SKILL.md](.agents/skills/flourprint-ui-check/SKILL.md).
  Use for browser/visual acceptance and selecting the native evidence needed for a UI change.
- **UI mockups**: [.agents/skills/flourprint-ui-mockups/SKILL.md](.agents/skills/flourprint-ui-mockups/SKILL.md).
  Use for Gemini-generated visual proposals, Codex verification, hosted galleries and the
  owner's requested approval before redesign implementation; not as a gate for routine fixes.
- **Contract changes**: [.agents/skills/flourprint-contract-change/SKILL.md](.agents/skills/flourprint-contract-change/SKILL.md).
  Use for semantic/persisted changes, independent fixtures and consumer/compatibility impact.
- **Scientific evidence**: [.agents/skills/flourprint-science/SKILL.md](.agents/skills/flourprint-science/SKILL.md).
  Use for source/data/fit audits and prediction limits; research does not approve a model change.
- **Pull request flow**: [.agents/skills/flourprint-pr-flow/SKILL.md](.agents/skills/flourprint-pr-flow/SKILL.md).
  Use for any PR: rebuilt checks on a private e2e port, native suites when they apply,
  up-to-date merges into `dev`, combined merges and issue labels afterwards.
- **Device checks**: [.agents/skills/flourprint-device-check/SKILL.md](.agents/skills/flourprint-device-check/SKILL.md).
  Use when a change needs phone or desktop evidence, a migration must be checked on real data,
  or the owner asks which APK or build to use.
- **Agent handoff**: [.agents/skills/flourprint-agent-handoff/SKILL.md](.agents/skills/flourprint-agent-handoff/SKILL.md).
  Use to write a message the owner relays to another agent, or when work crosses an ownership
  boundary.

These skills also have thin Claude Code routing entrypoints. They reuse current contracts,
ADRs and tools rather than introducing another source of product decisions or a tracking system.

## Commands

Optional checkout-local CodeGraph setup and verified client limitations are documented in
[docs/tooling/codegraph.md](docs/tooling/codegraph.md). It supplements source searches; never
register it globally or treat graph output as a substitute for contracts or tests.

```bash
pnpm install
pnpm check        # format, lint, typecheck (sources and tests), tests
pnpm build        # tsc -b
pnpm build:mobile
pnpm --filter @flourprint/mobile e2e  # full browser Playwright suite, FR and EN
                                      # (FLOURPRINT_E2E_PORT=<port> for a private server)
pnpm vitest run   # tests only (after a build)
node apps/cli/dist/main.js --version
```

The full Playwright run above is the browser suite. Native/emulator/device evidence is selected
for affected behavior under ADR 0016 and `docs/device-testing.md`, not run on every code push.

## Development order

Issue #30 is the high-level backlog: it links the other issues and tracks the development order.
GitHub issues are the only tracking system (owner decision of 2026-10-12: no Projects board, no
tracking file). Its operational view is generated from individual issues and their labels;
the decision history remains editorial. See [docs/governance/generated-backlog.md](docs/governance/generated-backlog.md).

- **New issues** follow `.github/ISSUE_TEMPLATE/` (work item or bug), also when opened through the
  API, and start with `status:backlog`. Pull requests follow `.github/pull_request_template.md`.
- **Status labels**: every open issue has exactly one. `status:backlog` (accepted, not planned),
  `status:ready` (acceptance and evidence clear), `status:in-progress` (someone works on it),
  `status:review` (a pull request awaits review), `status:blocked` (say why in a comment),
  `status:verified` (acceptance shown, awaiting the owner's close). Closed means done.
- **Other labels**, one of each per open issue when known:
  - `priority:p0` to `priority:p3`: set or changed by the owner only; an agent may propose one in
    a comment.
  - `area:engine`, `area:science`, `area:data` (persistence, backup, history), `area:ui`,
    `area:platform` (Android, desktop shell, CI, delivery), `area:docs`, `area:governance`.
  - `milestone:alpha` (Dogfood Alpha), `milestone:engine-mvp`, `milestone:later`.
  - Queries combine them, for example `is:issue is:open label:status:ready label:priority:p1`.
- **Who changes them**: the agent starting work sets `status:in-progress`; opening its pull request
  sets `status:review`. A merged pull request does not finish an issue: it goes back to
  `status:in-progress` while acceptance remains open, or to `status:verified` with the evidence in a
  comment. Only the owner, or an agent with every criterion shown, closes an issue.
- **Generated view**: update the individual issue and its labels, never #30's generated tables.
  The Backlog view workflow maintains one bot-owned comment linked from #30. It reports missing
  or conflicting classifications, without correcting labels, setting priorities or closing issues.
  Keep blockers, acceptance evidence, dependencies and PR links in the issue concerned. Human
  decisions may still be recorded in #30's editorial body; the automation never writes that body.
- **Sub-issues** (owner decision of 2026-10-13): a workstream issue (#35, #28, #26…) is the
  parent; a slice that one pull request can deliver is a GitHub sub-issue of it. One level deep
  only. Each sub-issue keeps its own status, area and milestone labels and its own acceptance; a
  parent is verified only when its own acceptance is shown, not because its sub-issues closed.
  Attach a sub-issue when its body names the parent ("Parent #35"); never move or detach one
  attached by someone else without saying why on both issues.
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
