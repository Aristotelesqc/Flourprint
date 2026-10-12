---
name: flourprint-contract-change
description: Prepare or review Flourprint domain or persisted-contract changes with independent fixtures and an impact assessment across events, migrations, adapters and clients. Use when semantics, units, schemas or replay behavior change; not for ordinary presentation edits.
---

# Flourprint Contract Change

Read `AGENTS.md`, `docs/contracts/README.md`, the affected current contracts and relevant ADRs.
Contracts define semantics; issues provide requirements/decision history, and this skill supplies
the change procedure. Respect the assigned domain/persistence owner and current `dev` workflow.

## Establish what changes

- State a concrete before/after scenario and the owner requirement it serves. Distinguish a bug
  in nonconforming code from a change to the accepted contract. Fixing implementation to match a
  contract does not require rewriting that contract to fit current output.
- Inventory affected commands, errors, fields/units, calculated outputs, invariants and unknown
  values. Check whether the change affects a draft, immutable revision, planned projection,
  actual observation, event or historical snapshot; these have different authority.
- Trace consumers through `core/domain`, application/ports, contracts, adapters, CLI and UI.
  Read [impact.md](references/impact.md) for persisted/event and model-specific questions.
- Mark decisions requiring owner arbitration explicitly. Complexity may change decomposition
  or evidence, not silently remove an essential requirement. Do not resolve open product choices
  by inventing a persisted default or translating unknown legacy data into a known outcome.

## Make the contract reviewable before dependent code

Prepare the dedicated contract PR required by `AGENTS.md`, targeted to current `dev`. Include
the definitions, invariants, structured errors and worked acceptance examples; update the
relevant ADR only if an architectural decision changes. Keep discussion in the linked issue.
Dependent implementation follows the accepted contract; label provisional examples as proposals.

For numeric examples, compute expected values independently of the engine/CLI under test, using
exact arithmetic or an independently justified analytic/integration method and explicit units,
rounding and tolerances. Follow `docs/contracts/fixtures/README.md`; do not regenerate fixtures
from current application output. Separate a science candidate from a shipping equation/domain.

For persisted changes, follow the repository's `CONTRACT_VERSION` and migration/upcaster rules,
and justify whether existing data remain readable. Keep engine/model versions distinct from
the app/release version. A renamed UI label alone does not rename persisted event types.
Assess engine/model version impact for changed calculation behavior even when a persisted shape
is unchanged. Follow the existing policy; propose a decision if it leaves the case undefined,
instead of inventing a blanket version-bump rule.

## Acceptance and handoff

Provide a compatibility/consumer impact note, fixture or scenario evidence, required version
changes and an implementation/verification handoff scoped to the assigned owners. Tests should
exercise invariants and failure/legacy paths, not mirror a new branch of code without evidence.
Replay checks must demonstrate historical values retain their meaning without calling the
current engine; migrations/import/restore checks must cover the real affected storage boundaries.

For an implementation review, compare the actual diff against the accepted definitions and run
the required repository checks. Report old-data, adapter/device and model evidence that is still
missing. Keep issue status and #30's table consistent with current `AGENTS.md`; a merged contract
PR does not certify its dependent feature complete.
