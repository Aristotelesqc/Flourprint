# Process actions: core-backed review slice

PR #133, 0.3.0; partial UI delivery for #123. This is the disposable review consumer, not the production app. Owner visual approval, merge and full #123 acceptance remain open.

[Interactive A](https://aristotelesqc.github.io/Flourprint/review-2026-10-18-process-actions/mockup.html?screen=recipe&recipe=shokupan&mode=edit&section=steps&nav=A&lang=fr&capture=1) · [Interactive B](https://aristotelesqc.github.io/Flourprint/review-2026-10-18-process-actions/mockup.html?screen=recipe&recipe=shokupan&mode=edit&section=steps&nav=B&lang=fr&capture=1) · [Process screenshots](https://aristotelesqc.github.io/Flourprint/review-2026-10-18-process-actions/process.html)

## Problem and resulting behavior

The previous prototype swapped adjacent array entries for moves and copied the whole step through `insertStepAfter`. It could neither preview a valid chain rewrite nor distinguish a reviewed copy from a literal clone.

- Arrow actions now call `moveStep` with the actual selected step and destination. Order-only moves apply without confirmation and retain their graph/times. Chain moves stage the complete domain result for review. Typed refusals leave the draft unchanged and offer explicit editing; no downward move is converted into an upward move.
- Duplicate calls `duplicateStep` with a new operation-prefixed id. It opens a review editor without changing the draft. The returned omitted fields are listed; the copy can be renamed or edited before acceptance. A copy with no duration remains unknown rather than becoming zero. The preview calls the existing core-backed projection path.
- The shared preview composition uses `fp.group-card` and the existing sheet; it does not calculate a schedule. It lists changed dependencies and projected dates/times, preparation windows and the complete proposed order. Window summaries reuse the existing grouped view's display aggregation of core projection results; component classification is unchanged pending #106. Before/After blocks avoid the browser's default nested list/definition indentation, preserving room at 360 px / 130%.
- Apply validates through the existing draft path. Accepted results join the same history as formula edits. Cancel, Escape and refusals add no draft edit. A stale pending proposal cannot overwrite a newer process.
- Step change announcements are exposed through a polite status region. Existing tap/keyboard arrow controls remain available in the owner's A/B exploration.

## Operated reference examples

1. **Chain:** move Division above Pointage in the Shokupan fixture. The engine rewrites Division, Pointage and Façonnage dependencies; the preview shows Division changing from 10:34–10:44 to 09:19–09:29 and Pointage from 09:19–10:34 to 09:29–10:44. Nothing changes before Apply. Undo restores the original chain; Redo restores the accepted result.
2. **Order only:** move independent Préchauffage upward. Display order changes; its 11:09–11:39 interval and 30-minute duration remain identical.
3. **Refusal:** move Pointage downward across its dependent Division. `MoveBreaksDependencies` is displayed with an explanation and disabled Apply. It never invokes a reverse move to bypass the refusal.
4. **Manual copy:** review a second 75-minute Pointage; downstream Division shifts from 10:34 to 11:49. Cancel leaves ten steps. Changing the copy to 90 minutes, naming it and accepting creates eleven; Undo/Redo and save/reopen retain the accepted result.
5. **Unknown:** remove the original duration through the existing editor, then duplicate it. The copy asks for a duration, downstream times stay unknown, and no zero-minute estimate appears.
6. **Not duplicable:** Préchauffage is `alap`; core refuses duplication with `NotDuplicable` and leaves ten steps.

These clock examples use the fixed prototype origin on 16 October, not the owner's actual preparation. No personal recipe or preparation is touched.

## Evidence and reproduction

The focused suite has thirteen cases: chain confirmation/undo/redo in Light/Dark/AMOLED at 393/100 and 360/130, plus refusal, order-only, manual-copy cancellation, edited-copy history/save/reopen, unknown duration, alap refusal and English narrow keyboard/focus/duplicate cancellation. It captures current before/preview/after states and asserts no horizontal overflow in the change panel.

The cases are part of the ordinary mockup suite and its CI discovery. No separate runner or new dependency is required. Set `FLOURPRINT_MOCKUP_PORT` to a private port and, when needed, `FLOURPRINT_TEST_BROWSER`; optional `FLOURPRINT_REVIEW_EVIDENCE` captures review images in a caller-owned directory.

```text
pnpm build:mockups
pnpm test:mockups
# Focus only this slice when diagnosing a failure:
pnpm test:mockups --grep "core-backed process actions"
```

The existing duplication scenario also requires the review dialog, verifies that the process remains at ten steps before Apply, then retains its eleven-step and Undo assertions. Existing unit tests cover core model-driven copy/reset semantics; the interactive unknown-duration example above is a manual-duration case and is not described as a model-driven UI test.

## Gemini contribution and limits

One direct `gemini-3.8-flash-high` assignment read real checkout files but hit its 180-second print timeout with no written component and an empty success envelope. No tool denial was observed. One bounded tool-free follow-up on that exact conversation returned the component source successfully. Codex reviewed and integrated it, removed message-key casts/raw-id fallbacks, corrected unknown evidence handling, and refined its narrow layout/date presentation. Gemini did not edit the checkout or run browser acceptance. No further recovery or reviewer cohort was launched.

## Still open

- Full pointer/touch dragging, lift/autoscroll/placeholder behavior, collapsed/cross-group interaction and the owner's handle/submode choice remain #123 work. This slice binds the existing tap/keyboard controls; it does not declare the entire issue done.
- The existing Reset action still lacks the named baseline and confirmation required by the contract and the adopted `docs/ux/requirements.md` L65. The new bindings use the existing complete-draft history; their Undo/Redo paths were operated, but this slice does not claim complete L65 acceptance.
- Claude's audit of the previous `45b848b` interactive build identifies broader outstanding UX failures. This slice addresses L72's missing dependency/time/window previews and reviewed duplication, plus action announcements; it does not resolve or supersede the full audit.
- Explicit component subjects/phases, target-relative preheat and the related examples require the #106 contract implementation; this slice never infers or changes a subject from dragging.
- The descendant/downward-chain policy remains an owner question. Current refusals are preserved.
- Production draft persistence, native Android/Electron acceptance and adoption of this library by the production screens are not demonstrated by this in-memory prototype.
- The existing shared motion mechanism requests on #134 remain with Claude. No shared motion, registry, core or CI mechanism file is changed here.
