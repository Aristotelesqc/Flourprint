# Architecture decision proposal: Android Material 3 without stack lock-in

**Status:** Investigation request, not an ADR or an instruction to stop ongoing #35 implementation.  
**Related:** [#35](https://github.com/Aristotelesqc/Flourprint/issues/35), [independent audit](../audits/2026-10-11-independent-review.md)

**Exploration update:** The owner authorized the comparison. See the
[four AGY reviewer digests, Codex arbitration and measured current baseline](2026-10-12-material3-exploration.md).
The first stable-editing slice has landed in `dev`; the bounded comparative prototype remains
to implement. No library selection or Ionic replacement is approved by these reports alone.

## Decision to make

Which mobile presentation/navigation approach best implements Flourprint's own warm identity, modern Android Material 3 conventions, precise recipe editing and offline execution, without unnecessary long-term dependence on an Ionic-specific widget/navigation layer?

### Keep stable

- React, TypeScript, Capacitor, domain engine and adapters. These are not equivalent to Ionic, and their usefulness does not depend on keeping Ionic widgets.
- User-selected visual identity: warm orange/brown design tokens with light/dark/AMOLED variants, flour/baking-specific graphic choices and layout.
- Semantic product roles: Recipe, Planning, Preparation.
- Requirements: responsive touch interactions, predictable Android system back, high-precision numerical fields, accessibility, bilingual FR/EN and reliable session resumption.

### Separate three concerns

1. **Android behaviour:** back navigation and gesture semantics, keyboard/insets, dialogs, sheets, focus/selection, active touch targets, reduced motion, accessibility.
2. **M3 design system:** intentional hierarchy, colour/surface/shape/type/motion tokens, patterns and compositional rules.
3. **Flourprint identity:** warm palette, flour/recipe-specific visual language, surface treatment, information architecture.

An Ionic component operating in `md` mode is not by itself proof of comprehensive Material 3 behaviour or visuals. Conversely, hand-designed M3 styles do not prove Android back correctness.

## Options for a bounded spike

| Option                                                                                       | Benefits                                                             | Questions                                                                                                               |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A. Retain Ionic React navigation; use Flourprint tokens and replace only obstructive widgets | Minimum code churn; existing functionality                           | Are IonRouterOutlet, IonContent scroll and overlays creating persistent focus/back/scroll friction?                     |
| B. React Router + Capacitor + accessible React primitives, Flourprint M3 component layer     | Removes Ionic-specific router/screen semantics; full control over UI | How much new navigation/dialog/keyboard/back infrastructure must be maintained?                                         |
| C. React + Capacitor + **verified maintained** Material 3 third-party components             | Potential native-feeling interaction and less custom widget work     | Is the library truly M3, well maintained, accessible, and compatible with React/Capacitor/WebView, FR/EN and app shell? |

**Do not equate Material UI (MUI) with comprehensive M3 out of the box.** Also verify current maintenance status before selecting Google's Material Web web components. A dependency should not be chosen for its name or screenshot alone.

## Minimal side-by-side acceptance matrix

Use real Flourprint forms/data, not a throwaway theme screenshot:

1. Recipe: precision field, touch/keyboard focus, edit-mode entry, undo/cancel, dirty guard, viewport stability and draft save.
2. Planning: scroll restoration and distinct scroll context, dynamic timeline, modal sheet, focus return.
3. Preparation: multiple concurrent steps, navigation away and back, resume after process death, accessible live updates.
4. Platform: physical Android device, back gesture and back button, modal-first dismissal, keyboard back, predictable route history, predictive-back where platform/plugin support can be proven.
5. Presentation: Flourprint light/dark/AMOLED palettes, density, French wrapping, dynamic font scaling, contrast and reduced motion.
6. Engineering: bundle impact, native configuration, test cost, dependency updates and size of migration diff.

## Decision evidence

Require a short reproducible report with screenshots **and recorded interaction cases**, test device/OS, package versions, failing/repaired behaviours, engineering cost and a staged migration option. Do not block the current Gemini #35 stable-editing work on this proposal alone. A failure of one Ionic pattern need not entail replacing every Ionic component; equally, the team must not treat existing investment in Ionic as a reason to keep an objectively obstructive router.

## Guardrail

Architecture choice must follow the owner-approved UX criteria. No agent may re-scope essential app capabilities or declare a complete Material 3 implementation merely by changing a theme or installing a component library.
