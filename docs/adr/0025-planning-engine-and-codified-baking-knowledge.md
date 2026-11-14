# ADR 0025: A planning engine, a codified body of baking knowledge, and one app for every level

Status: Proposed (owner direction of 2026-11-13 and 2026-11-14, given in conversation; awaiting the
owner's approval of this pull request). Relates to ADR 0010 and ADR 0008; amends nothing until
accepted.

## Context

ADR 0010 brought the first fermentation model into the product: time from a yeast dose and
temperatures, and a dose from a schedule. The engine then grew a notion of readiness: a recipe
is "ready" when the model's progress reaches a target, by default the end point of the table the
model was derived from ("about doubled once"). Three findings show that this notion does not
hold:

- The audit of the built-in recipes (2026-11-14) found that 7 of the 15 templates reach 140 % to
  610 % of that end point at the end of their published schedule, and one reaches 63 %.
- The research of 2026-11-14 (`docs/science/fermentation-model.md`, section 15) found that the
  progress reached at the end of 50 scored published schedules has a median of 153 % with
  quartiles of 108 to 207 %, that style medians run from 89 % to 256 %, and that about 62 % of
  the disagreement is scatter that no single target removes.
- The owner, a home baker, gave examples in which readiness is not a volume at all: a mark in a
  tin, a dough that has become smooth and extensible, a finger test before baking, a bagel that
  goes from shaping to the water bath with no rise criterion, a pizza dough usable over a wide
  range of maturity. These examples are being checked against the literature
  (`docs/science/`, readiness criteria); they are recorded as the owner's practice, not as
  authority.

The ledger already says part of this: every forecast is an estimate and the baker's judgement
comes first (L145), and each fermentation step says how to decide that it is done, with cues that
fit what has happened to the dough (L146). `docs/science/fermentation-model.md` section 3 records
that volume is not observable when the dough is folded and that the product must not present a
"doubled" target. No ADR states the scope of the engine, the place of baking knowledge that is
not measured science, or the audience.

## Decision

1. **The fermentation engine is a planning tool.** Its job is to help a baker who writes or
   judges a recipe: how much yeast for a given rising time at room temperature, in the fridge or
   a combination, and the reverse. It reports how far a dough has fermented. It does not decide
   that a dough is ready. It is kept and improved; it is one input among others.
2. **Readiness belongs to the step of a recipe, and to the baker.** A step may carry its own end
   criterion, and criteria differ in kind: a volume ratio since the last degassing, a physical
   mark, a handling or sensory sign, a window of acceptable maturity, or no rise criterion at
   all. Where a calculation needs a target (a dose for a duration implies "to reach what"), the
   target comes from the step's criterion, not from one universal default. Fermentation is one
   condition of readiness; gluten development and the recipe's own criteria are others.
3. **Flourprint carries a codified body of baking knowledge.** Beside measured science, the
   product records what bakers know: the stages, the signs to check with every sense, what each
   sign means, what to do about it, and how ingredients and process interact. This knowledge is
   structured data with its sources and its grade, so that the app can show the right entry at
   the right step. It is not presented as measurement, and its rules of evidence are those of
   `docs/science/craft-knowledge.md` and `docs/science/evidence-classification.md`. A trade term
   is never shown without a definition being available.
4. **One app serves the professional and the first-time baker.** The main flow stays simple and
   never forces guidance on someone who does not need it. Explanations, signs, definitions and
   the basis of a forecast are available on demand, at the step where they are useful. There is
   no separate beginner product.

## Consequences

- **Contracts.** `docs/contracts/fermentation.md` needs a proposal that moves the readiness
  target from a default profile to the step of a recipe, and that says what a stored recipe with
  no criterion does. The proposal of a new default profile (pull request #295) is superseded by
  that work. `docs/contracts/process.md` needs a way for a step to state its end criterion.
  Contracts come before code, each with the owner's approval.
- **Engine.** The forward and inverse calculations stay (ADR 0010). A separate model of dough
  behavior is under study (`docs/science/behavior-model-foundations.md`); it reads the
  fermentation engine and does not change it.
- **Knowledge.** The craft-knowledge register and a catalogue of readiness signs become product
  material. They are filled from sources read and cited, never from memory, and stay apart from
  measurements.
- **Interface.** Screens, components and copy belong to the interface owners and to mockups
  accepted by the owner. This ADR fixes only the principles: no verdict of readiness from the
  engine, cues before clock times (L145, L146), detail on demand, definitions for trade terms.
  Issues #243, #246 and #287 carry the work.
- **Capability levels.** ADR 0008 and `docs/contracts/capability-levels.md` describe formula,
  process and prediction. Guidance from codified knowledge is not one of their levels; whether it
  needs one is decided when the first contract for it is proposed.
- **Not decided here:** the form of a step's criterion, the record format of a knowledge entry,
  how the interface presents levels of detail, and the built-in recipes' own criteria.
