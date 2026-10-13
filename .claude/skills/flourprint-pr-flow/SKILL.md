---
name: flourprint-pr-flow
description: Take a Flourprint change from branch to merged pull request into dev - local checks on a private port, native suites when they apply, CI, strict-branch updates, combined merges and issue labels afterwards. Use for any code or docs PR; not for deciding contract semantics (flourprint-contract-change) or UI acceptance (flourprint-ui-check).
---

Read the canonical [.agents/skills/flourprint-pr-flow/SKILL.md](../../../.agents/skills/flourprint-pr-flow/SKILL.md)
before using this workflow, then load its relevant references. Keep the procedure there rather
than duplicating it here. Resolve repository paths from the repository root. This routing skill
exposes `/flourprint-pr-flow` in Claude Code without granting additional permissions.
