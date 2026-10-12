# Backlog governance proposal

**Status:** Proposed, non-normative until owner approval.  
**Parent:** [#30](https://github.com/Aristotelesqc/Flourprint/issues/30)  
**Audit:** [2026-10-11 independent review](../audits/2026-10-11-independent-review.md)

## Source-of-truth hierarchy

1. Owner decisions + approved contracts and ADRs define product intent and semantics.
2. Issues enumerate scope and verifiable acceptance; they link contracts and other related issues.
3. PRs and checks establish **implementation evidence**, not automatic completion of a parent feature.
4. GitHub Projects V2 mirrors _operational_ state. It does not independently define requirements.
5. An optional Backlog Steward detects inconsistencies and makes narrowly scoped, sourced proposals.

Do not automatically close/mark Done an issue just because one related PR is merged, especially for N1+N2+N3 split work and on-device verification. Equally, do not mark a slice blocked solely because future numerical prediction remains unvalidated.

## Suggested Projects V2 configuration

**Project title:** Flourprint | Delivery & Verification

| Field        | Type            | Values / policy                                                                                                  |
| ------------ | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| Status       | Single select   | Backlog, Ready, In progress, Review, Verified, Done                                                              |
| Priority     | Single select   | P0, P1, P2, P3. Owner-approved; no unapproved priority changes by agents                                         |
| Milestone    | Single select   | Dogfood Alpha, Engine MVP, Later                                                                                 |
| Area         | Single select   | Architecture, Engine, Science, Recipe UX, Planning UX, Preparation UX, Data, Platform, Documentation, Governance |
| Owner        | Assignee / text | Agent or human responsible for next action (not authoritative code ownership)                                    |
| Verification | Single select   | Missing, Partial, Passed, Not applicable                                                                         |

Keep issue text as the canonical N1/N2/N3 requirement and detailed test-case inventory. Project fields are searchable views, not duplicate contracts.

### Status transitions

- **Backlog:** accepted scope, not planned into a current work slice.
- **Ready:** acceptance, dependencies, owner and likely test evidence are explicit.
- **In progress:** active implementation or investigation with linked branch/PR where possible.
- **Review:** change submitted; feedback and tests pending.
- **Verified:** acceptance evidence for the item exists and has been reviewed, pending admin closure or integration.
- **Done:** evidence confirms the _entire item scope_ and remaining follow-ups are explicitly linked, not silently discarded.

**Automation recommendation:** moving an issue to Review can follow a linked PR, but merged PR must **not** auto-set Done. Native GitHub Project workflows may assist intake and review, with verified close-out decided by evidence.

### Suggested views

- **Now:** Ready/In progress/Review, grouped by Status, sorted Priority.
- **Roadmap:** Milestone group with Area filter.
- **Needs verification:** Review/Verified or Verification = Missing/Partial.
- **Unassigned and stale:** Owner empty or unchanged over a review interval.
- **All by Area:** comprehensive workbench; do not hide partially completed epic scopes.

## PR traceability template

Every substantive PR should specify:

- Linked issues and which acceptance criteria are addressed.
- Contracts/ADR changes or explicit statement that semantics are unchanged.
- Implementation surfaces and necessary migrations.
- Test commands + actual results; distinguish source review, emulator and physical-device proof.
- Incomplete acceptance and follow-ups; do not claim completion on behalf of an entire feature.
- UX changes: focus, back action, overlays, small screens, FR/EN, accessibility, form precision.

This template is a **proposal**, not yet a forced CI gate; amend AGENTS.md only after owner adoption.

## Backlog Steward v0

**Start without new infrastructure.** Run a scheduled or manually triggered GitHub Action, potentially with LLM reasoning, in report-only mode. Use issue/PR/change references, machine-readable findings and owner review before mutations.

Inputs: changed issues, linked PRs, merged commits, contracts/ADRs, tests and Projects status.

Outputs: a concise reconciliation report containing:

- detected drift and exact source URL/SHA/line;
- suggested target issue and action;
- confidence and what evidence remains missing;
- explicit labels: new issue, update acceptance, mark verification, close stale duplicate or no change;
- no autonomous scope/priority decisions.

**Permitted automatic actions only after dry-run validation:** attach known PR references, mark concrete verification missing when tests are absent, and raise reports. Closing issues, redefining acceptance, changing P0–P3 or milestones, deleting historical audit evidence and changing contracts require human approval.

Design the Steward interface as a future Stele orchestration adapter, not a new database of authority. GitHub remains canonical.

## Proposed setup path (GitHub UI)

1. Create an owner-level private Projects V2 board **Flourprint | Delivery & Verification** and connect the Flourprint repository.
2. Add the fields and options above, configure a minimal auto-add workflow, and import all open Flourprint issues.
3. Create the views and test them on #35, #21, #26, #28 and #30.
4. Configure intake/status workflows; do not enable a naive auto-Done rule.
5. Record a link to the actual project in this file and on #30.
6. Run the first Steward reconciliation and review its proposed changes.

**Connector limitation at preparation time (2026-10-11):** the connected GitHub actions can create/edit repository files, issues, branches and PRs, but expose no GitHub Projects V2 mutation for project creation, fields or views. This document does **not** claim the board was created.

## Initial issues to reconcile

- [#35](https://github.com/Aristotelesqc/Flourprint/issues/35): current stable editing slice and M3/Android UX readiness.
- [#21](https://github.com/Aristotelesqc/Flourprint/issues/21), [#28](https://github.com/Aristotelesqc/Flourprint/issues/28), [#26](https://github.com/Aristotelesqc/Flourprint/issues/26): N1/N2 completion and N3 distinction.
- [#16](https://github.com/Aristotelesqc/Flourprint/issues/16), [#24](https://github.com/Aristotelesqc/Flourprint/issues/24): CI and device evidence.
- [#30](https://github.com/Aristotelesqc/Flourprint/issues/30): post-PoC transition and owner signoff.
