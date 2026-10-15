# Flourprint motion exploration — 2026-10-12

Status: reviewed exploration for #73 / #35, not shipped animation or a dependency decision.
Source corpus: integrated `dev` `adafdb4f610651918173e463e120858028782bb5`, after #70/#72.
The concurrent #71 Recipe/Planning implementation is a separate workstream.

## Method and evidence

Three actual AGY `gemini-3.8-flash-high` sessions received scoped source snapshots, returned
distinct reports, and revised them after Codex challenged source errors and unsupported claims.
They did not access the filesystem, browse, edit code or run tests. Raw prompts, events and
reports remain in ignored scratch space; the reviewed digests below are the public record.
Consensus is a proposal, not measured runtime evidence.

Caller-verified primary sources:

- [Pinned AndroidX MotionScheme source](https://android.googlesource.com/platform/frameworks/support/+/2dca48e1ea3c7a2cbd2e6e389c347d94a92ec8e0/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MotionScheme.kt)
  separates spatial changes in shape/bounds from color/alpha effects, with standard/expressive
  schemes and speed tiers. This is Compose source, not a React library or web token table.
  Kotlin spring coefficients are not CSS easing equivalents.
- [Material motion overview](https://m3.material.io/styles/motion/overview/how-it-works) returned
  a JavaScript-only shell to the caller's text fetch. Full guidelines were not read; exact
  official web values and comprehensive M3 conformance are not claimed.
- [W3C SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
  is AAA and addresses disabling nonessential interaction-triggered motion. This does not
  establish general WCAG compliance. Automatic motion needs separate examination of the
  applicable Pause, Stop, Hide criteria.
- [MDN reduced-motion documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
  explains the preference query. A CSS preference match does not itself configure imperative
  JavaScript animations; installed Ionic paths must be examined and tested separately.

## Report 1 — Motion language and reusable components

Session `fbecf62c-e9f2-44c8-9187-07ccce0a3149` recommends separating effects from spatial motion
and centralizing reusable presentation policy instead of adding independent screen animations.
Warm identity and the approved logo remain unchanged.

Candidate effects include button/lock surface changes and status emphasis. Candidate spatial
motion includes a segmented indicator and help disclosure. Static indicators with effects alone
remain a valid comparison option. Panel scroll restoration should remain immediate.

Proposed duration ranges are hypotheses: roughly 100–180 ms for effects and 150–250 ms for small
spatial transitions. They are not adopted tokens, official M3 web values or performance promises.
The original narrative/table/code disagreed on values; the revised report replaces them with
one optional range table. Springs versus CSS easing remains a prototype question, not a reason
to install a library now.

Codex rejected blanket GPU claims, a sub-millisecond acceptance promise, categorical rejection
of static fades, and a universal wildcard reset. The report explicitly withdrew them. Local
theme inspection does not inventory every animation imported from Ionic.

## Report 2 — Useful motion in practical journeys

Session `d9eb257c-882a-4720-a493-5a5deb1806b7` recommends immediate press/state feedback, legible
draft status and restrained progressive disclosure. Numerical values should update directly;
no rolling counters, simulated progress or action delayed until decorative motion finishes.

Hydration discoverability is a state/presentation need first: at the reviewed baseline the lock
exists in editing but consultation does not show its state. An animation cannot supply the
missing static information. #71 addresses that distinction separately.

The reviewer corrected several source mistakes: the water breakdown opens `WaterExplanation`
as an Ionic modal; it is not inline expansion. The temporary weighing aid is shared between
Recipe reading/editing, not recorded Preparation data. Recipe method authoring is distinct from
Preparation execution/completion. Production UI must not expose internal prototype names.

The proposed keyed status span with no opacity change did not implement a crossfade and was
withdrawn. Automatic warning pulses on reset checklist items were also withdrawn; any reset
explanation must remain understandable without flashing or animation. Scale, translation and
stroke-drawing cues are spatial, not effects-only.

## Report 3 — Accessibility, interruption and performance challenge

Session `40ea7f2f-62bd-490a-a854-1aeae0e7c430` identifies the need to inspect both CSS and Ionic
JavaScript animation paths, preference changes during a session, interrupted transitions,
focus restoration, cached views, and retained input.

These are verification cases. Claims of native back-stack corruption, severe keyboard jitter,
specific frame-rate drops, battery/resource loss or existing gesture failures were not
demonstrated and were withdrawn. A corrected addendum attributed 48 browser passes to the
new source revision; Codex rejects that attribution too: prior browser evidence belongs to
the earlier #70 application build, not a motion test at this corpus revision.

No runtime API change is selected here. Repeatedly calling `setupIonicReact` after preference
changes has not been validated. CSS rules can affect some shadow/runtime paths; neither a
universal zero-impact claim nor universal coverage is justified. Event-dependent completion
logic must work with motion disabled. Existing instant panel restoration must not be replaced
with waits for decorative transitions.

## Codex arbitration and bounded prototype

Proceed with an effects-first comparison on the shared segmented selection and hydration lock.
Compare the current instant state change against short surface/color feedback with identical
data, labels, geometry and actions. This is a recommended next prototype, not implementation
in #71. Lock state must be visible and understandable before any animation is added.

| Interaction            | Retained direction                                                                 | Alternative / limit                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Button and lock state  | Immediate action; optional short surface effect; static state/label always present | No spin, bounce or reduced hit target; animate only after accepted state changes          |
| Segmented selection    | Compare static surface feedback with optional indicator movement                   | Spatial variant must earn its complexity under rapid taps, FR wrapping and reduced motion |
| Draft feedback         | Stable active-editing geometry, full readable status                               | No number rolling, clipped fixed-height status or unimplemented crossfade                 |
| Help details           | Progressive disclosure remains reachable                                           | Height/grid animation is a later measured option, not a compositor guarantee              |
| Reading/editing mode   | Clear deliberate transition, retained input/focus                                  | The first-mutation stability invariant applies inside editing, not across mode changes    |
| Panel scroll           | Restore independent positions immediately                                          | No smooth restoration or transition-end gating                                            |
| Preparation completion | Static execution fact must remain explicit                                         | Requires the actual execution view/API corpus; authored method is not execution history   |

Prototype acceptance:

- Equivalent outcomes with normal and reduced-motion preferences, including changing the
  preference mid-session; examine Ionic overlays/routes separately from scoped CSS effects.
- Rapid tap/reverse/keyboard activation leaves state and focus correct, without accumulating
  listeners, a stale visual indicator or action blocked behind a transition.
- Inputs retain valid pending, invalid and refused text; first mutation keeps active-editing
  anchors stable. Numbers remain readable throughout.
- FR/EN at 360/393 px, larger text, warm light/dark and applicable future AMOLED; full labels,
  visible focus and sufficient hit areas. Disabled motion preserves information and navigation.
- Inspect stable captures plus browser performance traces. Any Android keyboard, gesture/back
  or WebView frame-pacing claim needs relevant native evidence. Desktop browser emulation alone
  does not prove it.

No production animations, new dependency, router replacement, selectable AMOLED, native
verification or measured frame-performance improvement is delivered by this exploration.
Update DESIGN.md with these reviewed principles; adopt concrete tokens/runtime policy only
after the prototype. Any library/platform decision follows the existing comparison and ADR
process, without blocking the owner-prioritized UI refinement.
