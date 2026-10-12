# Independent repository audit: Flourprint

**Reviewed:** 2026-10-11  
**Repository:** [Aristotelesqc/Flourprint](https://github.com/Aristotelesqc/Flourprint)  
**Immutable baseline:** [main at \`240450fcb41c3df484101aef841bfe8b93a59993\`](https://github.com/Aristotelesqc/Flourprint/commit/240450fcb41c3df484101aef841bfe8b93a59993)  
**Purpose:** External technical/product assessment, a review input rather than a source of requirements or an authoritative decision.

> **Review limits.** This is a remote static review of repository source, contracts, architecture decisions, issues, PR history and observable GitHub Actions metadata. No fresh local build, test suite, Android-device session or interactive visual walkthrough was performed for this audit. Previously published agent reproductions are identified as such, not represented as independent reproductions. The reviewer had broad product context but did not implement the reviewed baseline. All observations refer to the pinned commit; future changes may supersede them.

## Executive assessment

Flourprint's foundations are substantially more mature than its present user experience. A pure domain engine, application ports, persistent event journals, versioned recipe data and unusually explicit contracts support future development without binding domain semantics to an interface. The main gap is between **capabilities represented by the engine** and **coherent, reliable workflows available to a baker**.

Architecture and domain modelling: strong. Formula mass accounting and provenance: strong, with a declared limit on biological prediction. Persistence: strong on the SQLite path, less durable in the browser-preview snapshot path. Mobile UI/UX: viable proof of concept, not yet a stable kitchen-facing product. Documentation: rigorous on contracts, with operational drift. Backlog: rich but not yet sufficiently normalized for automatic progress reporting.

**Recommended direction:** keep the domain/adapters architecture, React and Capacitor; treat Ionic as an interchangeable presentation/navigation dependency if it becomes a measurable impediment to Material 3/Android UX. Do not rewrite the engine, or block contracted N1/N2 features until biological predictions are validated. Deliver small, complete workflow slices with contract changes first and verifiable acceptance.

## Reviewed surfaces and evidence hierarchy

- **Primary code:** \`packages/core/\`, \`packages/adapters/\`, \`apps/mobile/\`, \`apps/desktop/\`, \`apps/cli/\`, root build/CI configuration, at the pinned commit.
- **Primary written requirements:** \`docs/contracts/\`, \`docs/adr/\`, \`AGENTS.md\`, \`docs/science/\`.
- **Project decisions and prior audits:** [#30](https://github.com/Aristotelesqc/Flourprint/issues/30), [#35](https://github.com/Aristotelesqc/Flourprint/issues/35), [#34](https://github.com/Aristotelesqc/Flourprint/issues/34) and [merged PR #31](https://github.com/Aristotelesqc/Flourprint/pull/31). They explain intentional scope and contain previous reproductions, but do not independently prove a fix.
- **CI metadata:** [post-merge \`main\` run](https://github.com/Aristotelesqc/Flourprint/actions/runs/38163692563), observed as failed; \`e2e\`, \`web\`, \`desktop\` and \`android\` were skipped behind the initial \`check\` job.

### Severity and evidence terms

- **P1:** important delivery, correctness, durability or essential-workflow concern deserving focused attention; not necessarily a release-stopping code defect.
- **P2:** narrower reliability, maintenance, documentation or usability concern.
- **Observation:** behaviour or design directly visible in pinned source or GitHub metadata.
- **Corroborated:** a prior audit measured/reproduced a behaviour; this review inspected the corresponding source but did not re-run the experiment.
- **Risk:** a possible failure mode requiring a focused reproduction.
- **Gap:** accepted product capability not yet completed; not a claim that existing code is incorrect.

**Severity in this document is advisory and does not override the owner's backlog priority.**

## 1. Architecture

### Strengths

1. **Engine first is implemented rather than aspirational.** [ADR 0001](../adr/0001-engine-first-layers.md) and [architecture lint rules](../../eslint.config.js) separate \`domain\`, \`application\`, \`contracts\` and adapters. The calculation surface is not reconstructed in the CLI or screens.
2. **Domain model suits real processes.** The [process contract](../contracts/process.md) supports repeatable steps, DAG dependencies, independent preheats/preparations, projections, model-driven durations and recorded observations.
3. **Persistence is port-based.** [Application ports](../../packages/core/src/application/ports.ts) explicitly separate recipes, flour versions, bake events and restoration. Android/desktop use SQLite while the browser preview uses memory plus IndexedDB backup snapshots.
4. **Revisions and event sourcing preserve meaning.** Recipe versions, immutable bake logs, snapshots, idempotent command IDs and restoration aim to preserve historical reconstruction across later engine changes.
5. **Platform tooling is proportionate to dogfooding.** A CLI and Electron shell reuse the same core/app, not duplicated calculation logic.

### Architectural watchpoints

- The future **Preparation** result model (successful dough with no cooking, several cooking stages, unknown legacy outcomes) must be defined in domain contracts and propagated through events, snapshots, replay, statistics and UI. It must not be a conditional in a single page.
- Keep equipment mappings optional and retain unknown hardware semantics. Structured N1/N2 handling must not be misrepresented as validated N3 thermal predictions.
- Continue extracting *responsibilities*, not arbitrary small components, from the mobile orchestration code.

## 2. Code, calculation and science

### Strong evidence

- [Formula resolution](../../packages/core/src/domain/formula/resolve.ts) validates flour shares, references, component flour-allocation uniqueness, non-dough ingredient restrictions, ingredient properties, locked hydration and allocation budgets. Former PR concerns about duplicate component references and toppings in preferments are rejected by the currently reviewed validator.
- [Formula editing](../../packages/core/src/domain/formula/edit.ts) encodes authoritative commands, including \`SetAnchor\`, \`SetIngredientGrams\`, structural edits and total-water locking.
- [Process scheduling](../../packages/core/src/domain/process/project.ts) uses forward and backward passes and preserves actual step facts during replanning.
- [Field.tsx](../../apps/mobile/src/ui/Field.tsx) avoids committing untouched rounded input, addressing a previously demonstrated feedback-into-domain defect.
- [BakePage.tsx](../../apps/mobile/src/pages/BakePage.tsx) now offers actionable due steps and parallel-running-step completion, rather than only the focused step. This is visible in source but was not independently tested in this audit.

### Scope of the fermentation model

The current model is valuable as an **explainable, bounded estimate**. The [scientific basis](../science/fermentation-model.md) distinguishes measured evidence, independently fitted parameters, assumptions, extrapolation and model-generated references. It expressly does not validate a universal biological endpoint. Ingredient interactions and low-dose/cold regimes have evidence gaps.

The curated [15 sourced recipe templates](https://github.com/Aristotelesqc/Flourprint/issues/34) must remain useful without invoking a biological estimator. Separate published prescriptions, deterministic mathematical projections, and model estimates in both data provenance and presentation.

## 3. Findings register

| ID | Severity | Kind | Short finding | Evidence/related work |
|---|---|---|---|---|
| FP-AUD-001 | P1 | Observation | Post-merge \`main\` CI run failed; dependent jobs skipped. Cause not established. | [Actions run](https://github.com/Aristotelesqc/Flourprint/actions/runs/38163692563), [CI workflow](../../.github/workflows/ci.yml), [#16](https://github.com/Aristotelesqc/Flourprint/issues/16) |
| FP-AUD-002 | P1 | Risk | PR-triggered web job deploys with \`--branch main\`; with secrets present, an unmerged PR build could update the primary Cloudflare Pages channel. | [CI workflow](../../.github/workflows/ci.yml) |
| FP-AUD-003 | P1 | Corroborated | Editing UI has unstable geometry: change summary, dirty footer and shared scroll context displace controls. | [RecipePage](../../apps/mobile/src/pages/RecipePage.tsx), [#35 measurement](https://github.com/Aristotelesqc/Flourprint/issues/35#issuecomment-6110004629) |
| FP-AUD-004 | P1 | Gap | Neutral Preparation lifecycle and precise outcome/statistics semantics are incomplete (raw dough, mixed cooking, legacy unknowns). | [#21](https://github.com/Aristotelesqc/Flourprint/issues/21), [#35](https://github.com/Aristotelesqc/Flourprint/issues/35), [stats](../../packages/core/src/application/stats.ts) |
| FP-AUD-005 | P1 | Gap | Equipment/multi-method cooking N1+N2 acceptance still to be delivered, distinct from N3 predictions. | [#28](https://github.com/Aristotelesqc/Flourprint/issues/28), [capabilities](../contracts/capability-levels.md) |
| FP-AUD-006 | P1 | Gap | Editable flour registry exists, but broader manual ingredient registry N1+N2 is incomplete. | [#26](https://github.com/Aristotelesqc/Flourprint/issues/26), [FloursPage](../../apps/mobile/src/pages/FloursPage.tsx) |
| FP-AUD-007 | P1 | Verification | On-device upgrade, forced-close reminder delivery and full real-bake acceptance remain open. | [#23](https://github.com/Aristotelesqc/Flourprint/issues/23), [#24](https://github.com/Aristotelesqc/Flourprint/issues/24), [#17](https://github.com/Aristotelesqc/Flourprint/issues/17) |
| FP-AUD-008 | P2 | Risk | Browser preview persists whole-store snapshots every 3 seconds; abrupt closure may lose recent changes since the last committed snapshot. | [browser-snapshot.ts](../../apps/mobile/src/services/browser-snapshot.ts), [ADR 0015](../adr/0015-browser-persistence.md) |
| FP-AUD-009 | P2 | Risk | Native reminder replacement cancels the old set before scheduling the new set, creating a potential failure window. | [notifications.ts](../../apps/mobile/src/services/notifications.ts), [#24](https://github.com/Aristotelesqc/Flourprint/issues/24) |
| FP-AUD-010 | P2 | Maintainability | Large mobile page components combine orchestration, persistence, state transitions and rendering. | [RecipePage](../../apps/mobile/src/pages/RecipePage.tsx), [FloursPage](../../apps/mobile/src/pages/FloursPage.tsx), [FormulaEditors](../../apps/mobile/src/blocks/FormulaEditors.tsx) |
| FP-AUD-011 | P2 | Documentation | README and device-testing guide describe obsolete milestones/storage assumptions. | [README](../../README.md), [device guide](../device-testing.md) |
| FP-AUD-012 | P2 | Risk | Android back, overlay dismissal, dirty-draft guards and predictive-back integration need explicit device-level acceptance; Ionic navigation is not evidence of predictive-back fidelity. | [App](../../apps/mobile/src/App.tsx), [#35](https://github.com/Aristotelesqc/Flourprint/issues/35), [#23](https://github.com/Aristotelesqc/Flourprint/issues/23) |
| FP-AUD-013 | P2 | Process | At review time GitHub branch metadata showed \`main\` as unprotected; consider required checks and review rules when permissions permit. | [#30](https://github.com/Aristotelesqc/Flourprint/issues/30) |
| FP-AUD-014 | P2 | Process | Issue status mixes implemented slices, unverified acceptance and future science; richer machine-readable project status is needed. | [#30](https://github.com/Aristotelesqc/Flourprint/issues/30), [#34](https://github.com/Aristotelesqc/Flourprint/issues/34) |

### Focused acceptance proposals

**FP-AUD-001: CI.** Inspect \`check\` job startup / runner / permissions / logs, establish whether failure occurred before checkout, rerun and retain a successful check plus downstream suites on the merged baseline. No attribution to the app without evidence.

**FP-AUD-002: preview deployment.** Restrict production to \`push\` on \`main\` or explicitly configure unique PR preview branches and URLs. Prove that a PR cannot update the \`main\` Pages channel.

**FP-AUD-003: stable editing.** At representative phone sizes and both locales, opening/closing edit state should not move the active anchor field, unexpectedly reflow the viewport, or carry scroll across unrelated tabs. Focus/blur on an untouched nonterminating percentage or subminute duration must emit no domain command.

**FP-AUD-004: lifecycle.** Record a successful uncooked dough preparation; separately record poach then oven cook; record skillet then broiler stages. Verify immutable events, replay, history, statistics and explicit unknown legacy outcomes. Finishing one stage must not imply a completed intended product.

**FP-AUD-005: equipment.** A recipe without registered appliance profiles must still express built-in canonical modes; optional mapping may annotate actual appliance settings. A recipe with several cooking methods must resume after interruption, preserving documented vs approximate vs unknown hardware mappings.

**FP-AUD-006: ingredient registry.** User-created, versioned ingredients (not only flour entries) are editable and reusable offline with property provenance, unknown composition and history snapshot behavior; barcode lookup is optional and outside Alpha.

**FP-AUD-007/009/012: Android.** Test forced-stop/restart, notification scheduling with app backgrounded/closed, installing a newer signed debug APK over older data, system back closing overlays before navigation and preserving drafts. Distinguish emulator checks from physical-device checks.

**FP-AUD-008: browser durability.** Document the preview-only durability guarantee, test forced termination between memory edit and snapshot, and avoid promising SQLite-level durability.

**FP-AUD-010: maintainability.** Extract stable workflows (draft editing, start command, persistence guard and execution state) behind tested hooks/services only as components are reworked; do not manufacture fragmentation merely to reduce line counts.

**FP-AUD-011/014: operational truth.** Update onboarding and add a capability/status crosswalk referencing linked PRs, tests and device evidence. A parent issue stays partially done until all its stated acceptance criteria are fulfilled.

## 4. UX / Material 3 and framework decision

### Product model

- **Recipe:** read-first consultation, explicit editing workspace for ingredients, preparations, operations, conditions and equipment; full advanced control remains accessible.
- **Planning:** generated projections, start/ready targets, dependency visibility, parallel work and explicit edit shortcuts. A projection is not a record of what actually happened.
- **Preparation:** kitchen-friendly execution and logging, independent of whether there are zero, one or multiple cooking stages; resume and outcomes remain explicit.

Presentation must distinguish entered, inherited, calculated, observed and predicted numbers. Rounded display must never silently modify the precise source. Keep the warm Flourprint light/dark/AMOLED identity across the redesign.

### Reconsider Ionic on merit, not inertia

**Retain:** React, TypeScript, Vite, Capacitor, portable domain/adapters, offline operation.  
**Evaluate:** Ionic React navigation and Ionic widgets independently. A Material 3 visual language is not automatically achieved by enabling Ionic's \`md\` mode.

This is not an instruction to stop the in-flight Gemini UI slice. First inventory actual friction against Android behaviour and maintainability. A *bounded in-app comparison* should test:

1. same Recipe screen with primary action, editable decimal field and save/dirty behavior;
2. a multi-step Planning timeline and a bottom sheet/dialog;
3. Preparation screen with concurrent steps, notifications and resumption;
4. system back, overlay dismissal, keyboard/focus, screen reader semantics, FR/EN overflow, reduced motion, light/dark/AMOLED, Android WebView and desktop shell;
5. dependency health, bundle impact, custom styling cost and migration diff.

Compare (A) Ionic navigation + selective custom/Material 3 components, (B) React Router/Capacitor navigation with React accessibility primitives and Material 3-styled components, and (C) a maintained and verified third-party Material 3 component implementation. Pick a solution based on measured friction, not screenshot resemblance.

**Current ecosystem caution as of review:** Google's \`@material/web\` explicitly says it is in maintenance mode pending new maintainers. Material UI's own site says its library still implements Material Design 2. A new M3 component library may be promising but requires scrutiny of maintenance, accessibility and Capacitor integration. Official references:
- [Ionic React navigation](https://ionicframework.com/docs/react/navigation)
- [Material Web README](https://github.com/material-components/material-web)
- [Material UI](https://mui.com/material-ui/)
- [GitHub #35](https://github.com/Aristotelesqc/Flourprint/issues/35)

**Decision rule:** no framework swap without side-by-side evidence, but no prohibition on replacing Ionic if its navigation or component model imposes avoidable complexity. Preserve one reusable Flourprint visual system and canonical Android-back behaviour.

## 5. Documentation and testing

The contracts and ADRs are remarkably explicit, including authoritative percentage/grams edits, water accounting, process dependency semantics, snapshot/replay rules and proof fixtures. The science document carefully labels assumptions and source quality.

The user-facing and contributor onboarding needs to catch up. The README still describes browser data as living only in memory and SQLite as future work, while the reviewed code uses browser IndexedDB snapshots and platform SQLite. The device-testing guide speaks of the "MVP branch" rather than the current post-merge workflow.

Existing tests span unit/property/golden fixtures, shared persistence checks, Playwright browser journeys, Android emulator paths and the Windows shell. This audit did not re-run them. Add cross-layer **complete journeys** (recipe → draft → save → preparation → unexpected closure → resume → outcome → history), with adverse storage conditions and actual Android input/notification behaviour.

## 6. Backlog and governance proposal

Use GitHub Issues for requirements/acceptance, versioned contracts/ADRs for normative semantics, PRs/checks for delivery evidence, and GitHub Projects V2 for operational tracking. An eventual **Backlog Steward** can reconcile them; it must not independently decide user priorities, delete essential acceptance or mark a feature Done based solely on narrative agent claims.

Recommended project fields: \`Status\`, \`Priority\`, \`Milestone\`, \`Area\`, \`Owner\`, \`Verification\`. Define distinction between Done as a verified **issue scope** versus merely merged code. Split large issues into testable slices where helpful without silently reducing the parent commitment. Each status change should cite the PR and evidence that justifies it. See the planned backlog-governance document/issue for a detailed setup proposal.

## 7. Proposed sequence

1. Recover trustworthy green CI on the merged baseline; isolate PR previews from production deployment.
2. Complete the #35 stable-editing slice, then test the three-role Recipe/Planning/Preparation journey with a measured Android interaction baseline.
3. Approve lifecycle/outcome contract changes before introducing those semantics into events, persistence, stats and UI.
4. Deliver equipment/multi-method cooking and manual ingredient registry at the contracted N1+N2 level without pretending N3 is solved.
5. Exercise full journeys, notification/resumption and APK-upgrade acceptance on real Android hardware.
6. Normalize operational documentation and project tracking. Continue bounded scientific research and better source data as explicit workstreams.

## 8. Resolution protocol for this audit

The report is immutable review evidence. A later agent may **confirm, resolve, reject, or narrow** each finding, but should post dated evidence in the linked issue/PR or a subsequent audit appendix. Do not silently rewrite the historical observation to make a fixed bug appear never to have existed. To avoid copying long material into every issue, link this report and post only the locally relevant finding IDs, test suggestions and any independent counter-evidence.

**Scope boundaries:** This document is not a release approval, a CI certification, a usability test with real bakers, nor a substitute for the owner's decisions and accepted contracts.
