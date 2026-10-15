# Material 3 and workflow exploration — 2026-10-12

**Status:** Reviewed exploration, not a stack decision or implemented migration. Related:
[#35](https://github.com/Aristotelesqc/Flourprint/issues/35),
[#43](https://github.com/Aristotelesqc/Flourprint/pull/43),
[comparison request](material3-stack-evaluation.md).

**Historical baseline:** the measurements and unresolved findings below describe `5bf75ab`.
Read the [post-#57 delta review](2026-10-12-ui-refresh.md) for current state at `399af6a`:
validation/save and FR360 overflow are fixed; #53 lifecycle contracts are accepted, with their
implementation still pending. Root [DESIGN.md](../../DESIGN.md) is the shared presentation brief.

The owner authorized the Ionic replacement comparison. Four actual AGY sessions using
`gemini-3.8-flash-high` reviewed caller-supplied source at clean `dev`
`5bf75abdedcd514971523db36160f96ec7343352`. Each returned a separate report, then revised it
after Codex challenged unsupported claims. They ran no repository/browser/native tests and
made no edits. The digests below retain their distinct perspectives; Codex's arbitration
determines the proposed next work. Raw prompts and reports remain in ignored local scratch.

## Independent baseline verification

Codex built the production web app and ran all 33 browser tests successfully using installed
Chrome `154.0.8037.98`, with the existing FR/EN Playwright projects. The local configuration
selected installed Chrome rather than Playwright's bundled Chromium; these results do not
establish Android behavior. Twelve settled screen captures and a help-sheet capture covered
FR/light/393 px, FR/dark/360 px and EN/light/393 px, at 851 px height. Light and dark Recipe
captures were visually inspected.

| Measurement                | Current result                                 | Meaning                                                          |
| -------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| First anchor change        | 0 px control shift in all three configurations | The old 97 px defect remains resolved.                           |
| Draft footer               | 88 px, clean and dirty                         | Stable within editing; still consumes space during consultation. |
| Panel scroll               | Formula 650 → Process 0 → Formula 650          | Independent scroll preservation works.                           |
| Content width              | 393 px at FR/EN 393 px; 366 px at FR 360 px    | A 6 px narrow-screen overflow remains.                           |
| Page errors in capture run | None                                           | This does not prove all interactions or accessibility.           |
| Main JavaScript chunk      | 1703.33 kB; gzip 399.55 kB                     | Whole-app baseline, not Ionic's isolated cost.                   |

The fixed fermentation selector in `apps/mobile/src/blocks/Fermentation.tsx` is the existing
identified source of narrow-screen overflow. Fix and remeasure it without inferring a router
defect. The theme currently implements light and warm dark, not a separately selectable AMOLED
appearance. Preserve the warm identity and owner-approved logo.

### Additional Codex reproduction: invalid text and saving

In a disposable FR browser context, open the `Poolish + tangzhong` template recipe, set salt
to 22 g, then enter `abc` in Water and blur. Water is visibly invalid, but Save v2 remains
enabled. Saving shows Version 2 and a clean draft status while Water still displays invalid
`abc`. Navigating out and back shows 750 g, the original valid water quantity.

The domain correctly rejected the invalid input; this is an ambiguous editor/save result,
not evidence that invalid water entered the formula. The next editor slice should explicitly
account for unresolved raw input before claiming the displayed edit is saved. Test save,
cancel, recovery and locale parsing together. Current tests separately cover invalid text and
valid saves, but do not protect this combined case.

## Reviewer 1 — workflow ownership and consultation

Gemini recommends saved recipes opening in a read-first presentation with explicit **Edit**
and **Plan** actions; new drafts open directly for editing. Recipe owns ingredients, components,
conditions, methods and ordered/dependent steps. Planning displays projections and time/target
controls, with contextual shortcuts to the relevant Recipe editor. Preparation owns actual
execution, parallel work and observations.

It identifies the final-mix weighing checklist as currently ephemeral state in FormulaSection.
Its suggested temporary placement in Recipe avoids inventing persistence events, but leaves
execution work in an authoring view. Codex prefers reusable ingredient quantities available in
Recipe and a session checklist in Preparation once its recording semantics are agreed.

Its proposed read/edit separation can proceed using existing drafts and revisions. Its sample
layouts and times are illustrative, not numerical fixtures or proof of new lifecycle support.
Opening edit mode must enable actual editing explicitly; simply removing input borders would
leave invisible editable fields and would not satisfy read-first behavior.

## Reviewer 2 — reusable blocks and visual language

Gemini recommends a Flourprint component layer with common buttons, precision fields, section
surfaces, sheets and status chips. Existing Field, Segmented and Layout already provide useful
React/Tailwind building blocks. Extend these rather than independently styling every screen.

Separate semantic tokens for surface, text, outline, action and status across warm light, warm
dark and optional AMOLED. Proposed hex colors remain unvalidated candidates. M3 should provide
hierarchy and interaction patterns while preserving practical recipe density.

Codex retains visible labels for primary actions, progressive help, responsive rows and stable
edit-session geometry. Essential labels must remain understandable visually; `aria-label` or
`title` alone does not make an ellipsized touch action discoverable. Compact visible controls
must have adequate non-overlapping touch targets. Avoid a global Ionic-widget ban or bespoke
gesture/accessibility implementations before comparing available primitives.

## Reviewer 3 — component and navigation architecture

Gemini favors investigating React Router plus accessible primitives and a Flourprint M3 layer.
It notes that precision fields and segmented selectors are already ordinary React controls;
removing Ionic would mainly affect screen layout, routing, scroll, lifecycle, buttons and overlays.
`NotificationSync` also navigates through Ionic and belongs in the migration inventory.

Concrete replacement obligations include notification/deep-link fallback, refreshing data on
route return, async draft-save queues, raw invalid/incomplete text across unmounting, independent
scroll, topmost overlay dismissal, keyboard/insets and accessibility. Capacitor's back event does
not supply these policies automatically. A general navigation guard is a proposed UX policy;
the existing unsaved-start confirmation is not proof that every route exit is guarded.

Codex accepts React Aria Components as a justified candidate for the spike, not an adopted
dependency or a verified M3 implementation. The revised report still overstated "exact" M3 and
"zero" long-term lock-in for a custom layer; those outcomes require implementation and maintenance.
Component selection and routing selection are separate decisions.

## Reviewer 4 — independent acceptance challenge

Gemini emphasizes preserving raw invalid text, decimal precision, focus and scroll, while testing
keyboard/back/overlay ordering and parallel execution. The A/B cases must use identical screen
composition, tokens, data and business logic so a theme or workflow improvement is not wrongly
attributed to a framework replacement.

Codex rejects its arbitrary 80 kB gzip-savings threshold and treats its suggested native guard
order as a policy to test, not an existing guarantee. Existing
`stable-recipe-editing.spec.ts` already protects invalid text across panel switches; the review
initially lacked that file. Extend meaningful coverage for route unmounting and the combined
invalid-input/save case, rather than treating that existing coverage as absent.

## Primary-source checks and limits

Codex read the current primary pages on 2026-10-12:

- [Material Web README](https://github.com/material-components/material-web): implements M3,
  but reports maintenance mode pending new maintainers. This is an adoption risk, not proof
  that the components fail at runtime.
- [MUI supported components](https://mui.com/material-ui/getting-started/supported-components/):
  foundational entries reference MD2. MUI's name does not establish comprehensive M3;
  customization remains possible and its comparative cost has not been measured here.
- [React Aria](https://react-aria.adobe.com/): unstyled accessible components; its
  [Modal](https://react-aria.adobe.com/Modal) and [Sheet](https://react-aria.adobe.com/Sheet)
  documentation covers dismissal, visual viewport and sheet snap/swipe behavior. Verify these
  APIs in the selected package version/WebView before adoption. Ionic and React Aria snap-point
  percentages need not mean the same thing.
- [Ionic hardware back](https://ionicframework.com/docs/developing/hardware-back-button):
  documents handler priorities for overlays/navigation. Cached DOM and asynchronous focus
  restoration are not inherently bugs.
- [Capacitor App](https://capacitorjs.com/docs/apis/app): registering `backButton` disables the
  default handler and leaves navigation/exit behavior to the application. It does not prove
  predictive-back animations or correct keyboard behavior.

No exhaustive survey of every M3 library, candidate install, candidate bundle comparison,
Android measurement or contrast audit occurred. Neither missing predictive back nor general
Ionic accessibility failure was established. Four-agent agreement does not fill these gaps.

## Codex recommendation and next slices

1. **Common UI composition first.** Add explicit read/edit composition and clear Recipe/Planning
   ownership using reusable blocks. Keep default editing behavior for new drafts. Preserve raw
   input and a stable footer within an editing session; a deliberate read→edit transition is
   distinct from a surprise shift on the first modification. Fix FR/360 overflow and ambiguous
   FR discard wording. Account for invalid raw input when saving. Planning edit shortcuts must
   return to the affected step without losing time controls or scroll.
2. **Bounded equal-UX comparison.** Implement the same Recipe edit/consultation and help/review
   sheets with (A) Ionic shell and Flourprint blocks, and (B) React routing, accessible primitives
   and the same blocks. Keep this isolated from the production entry point. Add a Planning
   projection and the currently supported parallel execution/resumption journey after the editor
   comparison. Avoid a whole-app rewrite before the first measured result.
3. **Decide from evidence, then document.** Choose component behavior and navigation separately.
   Record the selected strategy in a new ADR only after review; amend ADR 0002 only where its
   stack decision changes. Focused implementation PRs target `dev` and feed #43. #35 stays open.

The immediate recommendation is a Flourprint interpretation of Material 3 with reusable React
blocks, and a serious test of replacing Ionic. Ionic remains the comparison baseline. React,
Capacitor, Tailwind v4, core and adapters remain stable foundations.

### Comparative acceptance

| Case         | Required evidence                                                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Precision    | Untouched rounded fields emit no edit; FR comma/EN decimal and partial/invalid text retain semantics; no UI baking math.                                                      |
| Editor state | First valid edit does not shift controls; save cannot ambiguously claim unresolved raw text was stored; discard/cancel and route return preserve the intended draft state.    |
| Navigation   | History, notification deep links and first-entry fallback; rapid route/panel switches; save-queue failure handling; policy for raw text before unmounting.                    |
| Sheets       | Keyboard/Escape and touch dismissal, nested topmost overlay, focus containment and return, independent scroll and edit preservation.                                          |
| Android      | IME open/close, system back and gesture, modal before route, route/root fallback, inset behavior. Native evidence required; browser-dispatched events alone are insufficient. |
| Presentation | FR/EN at 360/393 px, large text, light/warm dark/AMOLED, measured contrast, reduced motion, no clipped essential actions or horizontal page overflow.                         |
| Execution    | Current parallel steps and observations; committed session state after force-stop/relaunch; elapsed time from timestamps, not timer ticks.                                    |
| Cost         | Same production build settings, total and gzip assets, dependency/native diff, code size and upkeep; separate mixed A/B harness from a standalone replacement build.          |

A failing case is repaired or changes the choice; it does not remove an essential feature.
Web/emulator automation covers repeatable cases, with a targeted physical-device pass for claims
that remain unproved. No request for repeated APK installs is needed for routine CSS changes.

### Contract boundaries

Existing generic operations can represent more than oven baking, and the browser suite already
tests bagel boiling. That does not establish complete structured appliance/mode support or
neutral terminal outcomes. Successful frozen/given/sold dough, cooking-result statistics and
new lifecycle commands need the dedicated #21 contract work. Structured cooking equipment and
documented portable modes need #28; appliance profiles remain optional. The manual ingredient
registry remains #26. Layout and component exploration can proceed while these contracts evolve;
production must not substitute fake outcomes, pauses or invented events.

The three roles need no forced wizard: a baker may consult a recipe, plan explicitly, or start
an existing saved recipe now. Planning arithmetic, manually chosen duration, model estimate and
actual observation must stay distinguishable. A predicted end time is not a promised biological
result. Preparation should expose concurrent tasks and uncertainty rather than a single timer
that hides parallel work.
