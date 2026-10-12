# UI/UX delta review after the validation slice — 2026-10-12

## Revision and evidence

This refresh supersedes current-state claims in the
[earlier exploration](2026-10-12-material3-exploration.md), while retaining it as historical
evidence. Integrated `dev` is `399af6ae742604c3301367dac205df6074bd4358`, after #57. Four actual
AGY sessions used `gemini-3.8-flash-high`, supplied numbered source at #57 head `57853a6`, then
received the merge update and a bounded correction request. That source has the same reviewed
UI as the merge. Each returned an independent report and corrected addendum; they did not run
browser/native tests or implement changes. Raw prompts/events/reports remain in ignored scratch.
The distinct digests below are reviewed summaries, not verbatim unchecked reports.

Codex independently ran `pnpm check` (636 Vitest and 11 backlog tests), `pnpm build`, mobile
production build and all 39 FR/EN browser tests. Production captures covered 21 settled scenarios
plus help across FR/light/393px, FR/dark/360px and EN/light/393px at 851px height. Recipe, list,
Process and Advanced captures were visually inspected; no native test was performed.

| Observation                        | Current evidence                                      |
| ---------------------------------- | ----------------------------------------------------- |
| First mutation within editing      | 0px primary-anchor shift in all three configurations  |
| Draft footer                       | 88px in clean and dirty editing                       |
| Independent panel scroll           | 650 → 0 → 650                                         |
| Observed horizontal content widths | Equal to 360px / 393px viewports                      |
| Capture page errors                | None                                                  |
| Build label                        | Short `v0.2.0-local`; long CI labels not yet measured |

These measurements establish the tested browser cases, not all focus/contrast behavior or
Android keyboard, back, insets and gestures. No isolated Ionic cost was measured.

## What changed since the previous pass

| Change                           | Current status and remaining distinction                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #36 stable editing               | Integrated; the old first-edit shift and shared-scroll findings remain resolved.                                                                        |
| #57 validation/layout            | Integrated; raw-invalid/domain-refused text blocks save, raw-only discard works, FR360 overflow fixed, French abandonment wording clarified.            |
| #59 build/dev update             | Integrated; inspect long build labels and conditional update affordance, not only the short local build captured here.                                  |
| #53 Preparation lifecycle        | Accepted contracts only; intended outcome, neutral results, reopen/repeat and piece counts still require domain/application implementation.             |
| #61 backlog                      | Integrated; #30's operational view follows issue labels, not manually maintained tables.                                                                |
| Read/edit and Planning ownership | Still open; saved Recipe currently opens editable, the 88px draft bar occupies consultation space, and Process combines projection with step authoring. |
| Theme/component migration        | Light and system warm dark exist; selectable AMOLED and an M3 component strategy remain open.                                                           |

## Reviewer 1 — workflow ownership

Gemini recommends saved revisions opening in consultation, with explicit Edit, Plan and Start,
while new/resumed drafts hydrate directly into editing. Recipe owns authored composition and
method; Planning owns projection inputs and generated results. Step-edit shortcuts must open
the single Recipe editor, retaining the planning context rather than duplicating authoring.

After challenge, it withdrew removal of the existing temporary weighing checklist. Codex retains
that practical aid with explicit scope until an equivalent session-backed facility exists.
Current StartBake begins at tap time; a planning projection is not a scheduled future execution.

## Reviewer 2 — visual hierarchy and reusable blocks

Gemini recommends root DESIGN.md and a Flourprint component layer over the existing Field,
Segmented, Layout, InfoSheet and draft-bar building blocks. Document the warm light/dark baseline,
then validate additional M3 surface/type/state roles and selectable AMOLED in the prototype.
Distinct visible action labels and readable quantities matter more than decorative card count.

It withdrew invented `recipe.savedAt` and an "existing" `/recipes/:id/plan` route, native-back
stability claims and the inference that CSS truncation proves long build labels work. New routes
are proposals; choose initial mode from actual hydrated revisions/drafts. Source-only analysis
cannot validate touch, accessibility or complete M3 behavior.

## Reviewer 3 — interaction and regression challenge

Gemini emphasizes valid-but-pending raw text as well as syntax-invalid and domain-refused text.
The registry blocks invalid saves, but does not by itself track every pending raw modification.
Local raw strings live in mounted Fields; persisted drafts hold domain-accepted edits. Unmounting
for consultation, Planning or navigation must retain this state or guard its loss. Never globally
commit rounded display values. Current unsaved-start confirmation is not a general route guard.

It withdrew an invented attribution to another reviewer. Its native guard ordering is a proposed
policy to validate, not existing behavior. Codex also separates intentional mode changes from
the 0px first-mutation invariant and rejects reserving dead footer space to hide that distinction.

## Reviewer 4 — component and routing architecture

Gemini supports the consultation/ownership slice within Ionic while testing a separately bundled
React/accessible-primitives candidate. Share business logic, data, precision fields, tokens and
screen composition. Inventory PanelContext scroll, Ionic router lifecycle, NotificationSync
deep links and modal behavior before replacing the shell.

It corrected the projection kind from invented `targetEnd` to actual `readyBy`. It withdrew
claims that an Ionic-hosted pilot route proves Ionic removal savings. A candidate can be mounted
inside Ionic to explore presentation, but cost/navigation evidence needs an independent entry.
Available primitive APIs and selected versions must be checked; neither a library name nor an
unstyled accessible component implies validated M3 sheets or Android snap/back behavior.

## Codex arbitration and next production slice

The next production work is **consultation and explicit editing**, using reusable blocks. It is
useful regardless of the framework comparison and requires no new baking semantics. Then extract
Planning from the Recipe method editor in a separately reviewable slice. Do not combine a full
router migration, lifecycle implementation and visual rewrite into that first change.

1. Initialize mode once after hydration: saved revision → consultation; new/resumed draft → edit.
   Consultation uses actual non-editable quantities and method summaries, no hidden active fields
   masquerading as read-only and no empty 88px footer.
2. Edit enters the existing precise field workflow. Keep its stable status/footer geometry and
   all #57 save/refusal/discard guarantees. Dirty state does not automatically switch modes.
3. Preserve raw text and the weighing aid across panels. A draft preview, if introduced, must
   clearly identify draft values; it cannot pretend to be the saved revision. Save/discard may
   return to consultation intentionally, with clear focus and the correct revision displayed.
4. Separate generated Planning from authored steps. Use actual `startAt`/`readyBy` modes and
   existing projection APIs. Keep one Recipe method editor; a proposed new route is not an API
   that already exists. No fake outcomes, checkpoints, delayed StartBake or session events.
5. Use root [DESIGN.md](../../DESIGN.md) for presentation, contracts for meaning and ADRs for
   architecture. Its token snapshot is not a generated theme or a selected migration library.

### Concrete acceptance

- Saved recipe opens read-first without edit commands or autofocus; new/resumed drafts open editing.
- Intentional Edit transition is understandable; the first mutation inside editing shifts anchor
  controls by 0px. No empty footer reserve is required for consultation.
- Valid pending text, invalid text and refused edits survive tab/Planning transitions or trigger
  an explicit loss guard; save/restore/removal/discard retain #57 semantics and numeric precision.
- The temporary weighing checklist stays accessible and retains its state across view switches.
  It does not claim durable session evidence; a route/reload policy is explicitly documented.
- Planning has no second authoring model; contextual editing returns to the affected Recipe step
  and back without losing plan inputs or independent scroll. Start remains start-now.
- FR/EN 360/393px, larger text, light/warm dark, long build labels, focus return and meaningful
  action labels are verified. AMOLED acceptance follows implementation, not this token snapshot.
- Required local/CI suites pass. Targeted native evidence is required only for affected keyboard,
  system-back, inset or overlay claims; routine visual corrections do not demand repeated APK installs.

## Equal-UX Ionic replacement comparison

Build the same Recipe consultation/editing, help/review sheets and Planning controls in two
independent entries: Ionic baseline and a React/primitives candidate. Compare dependencies,
total/gzip production assets, lifecycle code and maintenance obligations, not the whole-app
bundle attributed to Ionic. Verify route-return refresh, notification/deep-link fallback, draft
write failures, independent scroll, topmost overlay dismissal and focus before recommending a
router choice. Native keyboard/back/insets require Android evidence. Component and navigation
choices may differ; record the eventual selections in a new ADR after evidence.

React, Capacitor, Tailwind v4, core and adapters remain the stable foundations. The current
recommendation is reusable Flourprint blocks and an M3 interpretation, with a serious bounded
test of replacing Ionic. Complexity changes slices and evidence, not delivery of required features.

## Open domain dependencies

#53 settled the lifecycle contract. Its implementation remains separate: successful frozen,
given or sold dough, intended outcome and reopen/repeat/statistics must use real core commands.
#28 covers structured cooking modes/equipment and optional appliance profiles; #26 covers the
editable manual ingredient registry. No cooking, registry or outcome feature is dropped by this
UI sequencing. A planned duration is not biological certainty and unknown data remains unknown.

## Additional open-PR delta caught during this review

While the four baseline reviews were running, new candidate PRs appeared. The workflow and
interaction Gemini sessions received the exact #63/#64 diffs and returned separate additional
reviews. Codex checked their claims against source and the accepted contracts. These are
**prospective source reviews**, not independently executed tests of the candidates:

| Candidate                                  | Reviewed revision | Status at capture                                                         |
| ------------------------------------------ | ----------------- | ------------------------------------------------------------------------- |
| #62 equipment contract                     | `a076260`         | Open; metadata reviewed only, no full contract audit here.                |
| #63 Preparation outcomes/reopening/cooking | `d7271cf`         | Open; real domain and UI implementation proposed, not only documentation. |
| #64 dev/preview list refresher             | `f288310`         | Open; real UI proposal, not integrated in baseline captures.              |

The owner assigned Claude the #63 interface work as well, according to its PR record. This
refresh accommodates it rather than declaring an ownership violation or ignoring it.

**#63 — supported findings:** the new Finish/Other result controls remain gated by `view.allDone`.
The contract and proposed domain FinishBake allow a usable dough result without requiring every
planned step to complete. A baker keeping dough before a later cooking step needs a reachable
successful Finish action, without fabricated step completions or abandonment. Preserve the
one-tap default and provide an explicit alternate result where needed.

`OUTCOME_CHOICES` does not cover all accepted result/disposition combinations: for example,
`cookedAndDough` with `refrigerated`, `given`, `sold` or `other`, and `dough` with `other`.
An imported valid value has no matching select option or checked picker entry. Preserve/display
such values and support valid selection without silently replacing them. Intended outcome belongs
to Recipe authoring, is read-only during consultation/Planning, and should remain readily
discoverable rather than only below a long step list. Actual outcome, correction and reopening
belong to Preparation. Keep the neutral terminology change in #35.

**#63 — hypotheses requiring evidence:** long compound French Finish labels next to Other result
in a non-wrapping flex row may crowd the 360px layout; test all outcomes and larger text. Eight
alert radio choices require scroll/label/focus checks, but their existence does not prove gesture
failure or require an immediate sheet rewrite. The candidate's reported tests are not Codex's
baseline results and should not be combined into a fictitious suite count.

**#64 — supported source risk:** the newer-build branch launches a toast without awaiting its
presentation and immediately reloads. Visible feedback is not assured. The browser snapshot is
asynchronous every three seconds, with no public awaited flush in the current service; cached
editor raw strings are not persisted. Check the latest accepted draft writes and await a durable
snapshot before an app-initiated reload, or keep an explicit update-available action until safe.
Do not claim a reproduced loss on Android or SQLite corruption from this source observation.
The existing Advanced update action should share the same policy. Native refresh gesture behavior
remains a separate targeted check; release builds render no refresher.

Codex rejects the reviewers' suggested arbitrary 500ms delay as a durability barrier and the
invented global `services.writes.busy` API. A true coordinator/flush or explicit safe-update
policy is required. Returning null in releases avoids rendering the refresher, not its bundled
dependency cost. Neither omission of a valid outcome nor delay-based storage safety is accepted
as a harmless staging shortcut.

## Design-document validation

Gemini's visual reviewer approved the supplied DESIGN.md, ADR 0017 and baseline synthesis after
checking them against its original source corpus. Codex independently ran the official
`@google/design.md` validator pinned at `0.4.0`, in an isolated npm cache with no repository
dependency change: zero errors, 14 orphan-token warnings and two informational findings. The
warnings reflect the partial component-token inventory; the palette is also mapped in prose.
Typography is explicitly omitted until the prototype. This format result does not establish
runtime drift detection, full component coverage or accessibility. The additional open-PR delta
above remains separately attributed to the workflow/interaction reviews and Codex arbitration.
